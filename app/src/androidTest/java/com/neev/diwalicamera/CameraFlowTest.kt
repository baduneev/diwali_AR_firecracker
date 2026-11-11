package com.neev.diwalicamera

import android.Manifest
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.*
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.uiautomator.*
import org.hamcrest.Matchers.not
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class CameraFlowTest {
    @get:Rule val cameraPermission: GrantPermissionRule=GrantPermissionRule.grant(Manifest.permission.CAMERA)
    private val instrumentation=InstrumentationRegistry.getInstrumentation()
    private val device=UiDevice.getInstance(instrumentation)
    @Before fun preferences() {
        // A cold-boot infrastructure ANR can obscure the target app on this host.
        device.findObject(By.text("Wait"))?.click()
        instrumentation.targetContext.getSharedPreferences("diwali",0).edit().putBoolean("welcome",true).putInt("selected",0).putBoolean("muted",false).commit()
    }
    private fun ready() {
        val ready=device.wait(Until.hasObject(By.text("Tap a spot in the camera view")),30000)
        if(!ready)screenshot("readiness-failure")
        assertTrue("Camera and selected audio should become ready",ready)
    }
    private fun screenshot(name: String) {
        val dir=File(instrumentation.targetContext.getExternalFilesDir(null),"qa");dir.mkdirs();device.takeScreenshot(File(dir,"$name.png"))
    }
    @Test fun allSixPlaceLightAndClear() {
        ActivityScenario.launch(MainActivity::class.java).use {
            ready();screenshot("camera-ready")
            onView(withText("Light firecracker")).check(matches(not(isEnabled())))
            for(label in listOf("Anar, अनार","Sutli bomb, सुतली बम","Chakri, चकरी","Sky shot, स्काई शॉट","Ladi, लड़ी","Phuljhadi, फुलझड़ी")) {
                onView(withContentDescription(label)).perform(scrollTo(),click());ready()
                onView(withContentDescription("Camera placement area. Tap to place the selected virtual firecracker.")).perform(click())
                onView(withText("Light firecracker")).check(matches(isEnabled())).perform(click())
                assertTrue(device.wait(Until.hasObject(By.text("Enjoy the light")),5000))
                // Wait for the recorded fuse and main emitter, not just the button state.
                Thread.sleep(1500);screenshot(label.substringBefore(','))
                onView(withText("Clear")).perform(click());ready()
            }
            screenshot("all-six-cleared")
        }
    }
    @Test fun backgroundCancelsRunAndPreferencesPersist() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            ready();onView(withText("Sound on")).perform(click())
            onView(withContentDescription("Camera placement area. Tap to place the selected virtual firecracker.")).perform(click())
            onView(withText("Light firecracker")).perform(click())
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)
            ready();onView(withText("Sound off")).check(matches(isDisplayed()))
            onView(withText("Light firecracker")).check(matches(not(isEnabled())))
            scenario.recreate();ready();onView(withText("Sound off")).check(matches(isDisplayed()))
        }
    }
    @Test fun audioAssetsDecodeAndContainSignal() {
        for(spec in Catalog.load(instrumentation.targetContext)) {
            val pcm=instrumentation.targetContext.assets.open("audio/${spec.id}.wav").use { PcmWave.read(it.readBytes()) }
            assertTrue(spec.id,pcm.samples.any { kotlin.math.abs(it.toInt())>100 })
            assertEquals(spec.duration,pcm.duration,.001)
            assertTrue(spec.peak>=spec.main && spec.peak<pcm.duration)
        }
    }
    @Test fun eachEffectFinishesAndReturnsToPlacement() {
        ActivityScenario.launch(MainActivity::class.java).use {
            ready()
            for(spec in Catalog.load(instrumentation.targetContext)) {
                onView(withContentDescription("${spec.name}, ${spec.hindi}")).perform(scrollTo(),click());ready()
                onView(withContentDescription("Camera placement area. Tap to place the selected virtual firecracker.")).perform(click())
                onView(withText("Light firecracker")).perform(click())
                assertTrue(spec.id,device.wait(Until.hasObject(By.text("Tap a spot in the camera view")),(spec.duration*1000+10000).toLong()))
                onView(withText("Light firecracker")).check(matches(not(isEnabled())))
            }
        }
    }
}
