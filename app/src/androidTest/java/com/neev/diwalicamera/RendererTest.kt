package com.neev.diwalicamera

import android.app.Activity
import android.os.Bundle
import android.content.Intent
import android.graphics.Color
import android.widget.FrameLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicBoolean

@RunWith(AndroidJUnit4::class)
class RendererTest {
    @Test fun glesCompositesVisibleParticlesOverTransparentTexture() {
        val context=InstrumentationRegistry.getInstrumentation().targetContext
        val intent=Intent(context,RenderHarnessActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ActivityScenario.launch<RenderHarnessActivity>(intent).use { scenario ->
            Thread.sleep(2500)
            scenario.onActivity { activity ->
                assertFalse("EGL/shader/audio setup must succeed",activity.failed.get())
                val image=activity.particles.bitmap
                assertNotNull(image)
                var sparks=0
                for(y in 0 until image!!.height step 3) for(x in 0 until image.width step 3) {
                    val color=image.getPixel(x,y)
                    if(Color.red(color)>120 && Color.green(color)>30) sparks++
                }
                assertTrue("Rendered texture must contain warm spark pixels, got $sparks",sparks>8)
                image.recycle()
            }
        }
    }
}
