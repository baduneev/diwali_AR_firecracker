package com.neev.diwalicamera

import android.media.*
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.*

/** A single real-recording stream, with the presentation clock obtained from AudioTrack. */
class AudioEngine {
    private val worker=Executors.newSingleThreadExecutor()
    private val generation=AtomicLong()
    @Volatile private var track: AudioTrack?=null
    @Volatile private var submitted=0
    @Volatile private var total=0
    @Volatile var muted=false
        set(value) { field=value; try { track?.setVolume(if(value) 0f else .65f) } catch(_:IllegalStateException) {} }
    @Volatile var running=false; private set
    private val timestamp=AudioTimestamp()
    private val frameClock=FrameClock()
    @Volatile private var trackRun=0L
    @Synchronized fun seconds(): Double {
        val t=track ?: return 0.0
        // During cancellation fade, a new effect must not borrow the old track's clock.
        if(trackRun!=generation.get()) return 0.0
        return try {
            val head=if(t.getTimestamp(timestamp) && System.nanoTime()-timestamp.nanoTime in 0..500_000_000L) {
                timestamp.framePosition.toDouble()+(System.nanoTime()-timestamp.nanoTime)*48000.0/1e9
            } else (t.playbackHeadPosition.toLong() and 0xffffffffL).toDouble()
            frameClock.position(trackRun,head,min(submitted,total))/48000.0
        } catch(_:IllegalStateException) { 0.0 }
    }
    fun play(pcm: PcmWave, finished: ()->Unit, failed: (Exception)->Unit) {
        val gen=generation.incrementAndGet()
        worker.execute {
            if(gen!=generation.get()) return@execute
            var audio: AudioTrack?=null
            try {
                val min=AudioTrack.getMinBufferSize(48000,AudioFormat.CHANNEL_OUT_MONO,AudioFormat.ENCODING_PCM_16BIT)
                require(min>0) { "No compatible audio output" }
                audio=AudioTrack.Builder().setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                    .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(48000).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setTransferMode(AudioTrack.MODE_STREAM).setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY).setBufferSizeInBytes(max(min,4096)).build()
                require(audio.state==AudioTrack.STATE_INITIALIZED)
                submitted=0;total=pcm.samples.size;trackRun=gen;track=audio; running=true
                audio.setVolume(if(muted) 0f else .65f); audio.play()
                while(submitted<total && gen==generation.get()) {
                    val n=audio.write(pcm.samples,submitted,min(1024,total-submitted),AudioTrack.WRITE_BLOCKING)
                    check(n>0) { "Audio output interrupted ($n)" };submitted+=n
                }
                while(gen==generation.get() && (audio.playbackHeadPosition.toLong() and 0xffffffffL)<total) Thread.sleep(8)
                if(gen!=generation.get()) {
                    for(i in 9 downTo 0) { audio.setVolume(if(muted) 0f else .65f*i/10);Thread.sleep(10) }
                } else finished()
            } catch(e:Exception) { if(gen==generation.get()) failed(e) }
            finally {
                if(track===audio) { running=false;track=null }
                try { audio?.pause();audio?.flush();audio?.release() } catch(_:Exception) {}
            }
        }
    }
    fun stop() { generation.incrementAndGet() }
    fun release() { stop();worker.shutdown() }
}
