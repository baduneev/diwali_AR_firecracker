package com.neev.diwalicamera
import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.widget.FrameLayout
import java.util.concurrent.atomic.AtomicBoolean

/** Internal debug-only GPU test fixture; no synthetic recording is bundled. */
class RenderHarnessActivity: Activity() {
    val failed=AtomicBoolean(false)
    private val audio=AudioEngine()
    private val scene=Scene()
    lateinit var particles: ParticleView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        scene.spec=EffectSpec(Kind.ANAR,"anar","Anar","अनार","",Color.YELLOW,8.0,0.0,1.0)
        val root=FrameLayout(this);root.setBackgroundColor(Color.rgb(16,21,28));setContentView(root)
        particles=ParticleView(this,scene,audio) { failed.set(true) };root.addView(particles,FrameLayout.LayoutParams(-1,-1))
        root.post { scene.viewportHeight=root.height;scene.y=.8f;scene.placed=true;scene.playing=true;scene.runId=1;audio.play(PcmWave(ShortArray(48000*8)),{}, {failed.set(true)}) }
    }
    override fun onDestroy() { audio.release();super.onDestroy() }
}
