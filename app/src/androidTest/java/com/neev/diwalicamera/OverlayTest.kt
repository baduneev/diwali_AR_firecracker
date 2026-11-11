package com.neev.diwalicamera
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.view.View
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OverlayTest {
    @Test fun placedArtworkDoesNotInheritTheContactShadowsTransparency() {
        val instrumentation=InstrumentationRegistry.getInstrumentation()
        instrumentation.runOnMainSync {
            val scene=Scene().apply {
                placed=true;x=.5f;y=.6f
                spec=EffectSpec(Kind.ANAR,"anar","Anar","अनार","",Color.YELLOW,5.0,1.0,2.0)
            }
            val audio=AudioEngine()
            try {
                val overlay=SceneOverlay(instrumentation.targetContext,scene,audio) { _,_-> }
                overlay.measure(View.MeasureSpec.makeMeasureSpec(400,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(600,View.MeasureSpec.EXACTLY))
                overlay.layout(0,0,400,600)
                val image=Bitmap.createBitmap(400,600,Bitmap.Config.ARGB_8888)
                overlay.draw(Canvas(image))
                assertEquals("The cracker body should be opaque",255,Color.alpha(image.getPixel(200,330)))
                image.recycle()
            } finally { audio.release() }
        }
    }
}
