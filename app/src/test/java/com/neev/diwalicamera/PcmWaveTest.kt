package com.neev.diwalicamera
import org.junit.Test
import org.junit.Assert.*
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
class PcmWaveTest {
    private fun fixture(channels: Short = 1, rate: Int = 48000, truncate: Boolean = false): ByteArray {
        val b = ByteBuffer.allocate(58).order(ByteOrder.LITTLE_ENDIAN)
        b.put("RIFF".toByteArray()); b.putInt(50); b.put("WAVE".toByteArray())
        b.put("JUNK".toByteArray()); b.putInt(1); b.put(9); b.put(0)
        b.put("fmt ".toByteArray()); b.putInt(16); b.putShort(1); b.putShort(channels)
        b.putInt(rate); b.putInt(rate*2); b.putShort(2); b.putShort(16)
        b.put("data".toByteArray()); b.putInt(4); b.putShort(123); b.putShort(-456)
        return if(truncate) b.array().copyOf(56) else b.array()
    }
    @Test fun readsPcmAfterOddLengthMetadataChunk() {
        val pcm=PcmWave.read(fixture())
        assertArrayEquals(shortArrayOf(123,-456),pcm.samples)
        assertEquals(2.0/48000,pcm.duration,1e-9)
    }
    @Test(expected=IllegalArgumentException::class) fun refusesStereoAssets() { PcmWave.read(fixture(channels=2)) }
    @Test(expected=IllegalArgumentException::class) fun refusesWrongSampleRate() { PcmWave.read(fixture(rate=44100)) }
    @Test(expected=IllegalArgumentException::class) fun refusesTruncatedChunk() { PcmWave.read(fixture(truncate=true)) }
}
