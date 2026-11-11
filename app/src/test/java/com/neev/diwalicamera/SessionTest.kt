package com.neev.diwalicamera

import org.junit.Assert.*
import org.junit.Test

class SessionTest {
    @Test fun cannotLightWithoutReadyAudioAndPlacement() {
        val s = Session()
        assertFalse(s.light())
        s.place(.5f, .6f)
        assertFalse(s.light())
        s.ready()
        assertTrue(s.light())
        assertFalse(s.light())
    }
    @Test fun clearInvalidatesQueuedCompletionFromPreviousRun() {
        val s = Session(); s.ready(); s.place(.5f,.6f); s.light()
        val old = s.runId
        s.clear(); s.place(.4f,.7f); s.light()
        s.complete(old)
        assertEquals(Stage.PLAYING, s.stage)
        s.complete(s.runId)
        assertEquals(Stage.READY, s.stage)
        assertNull(s.position)
    }
    @Test fun playbackLocksPlacementAndSwitching() {
        val s = Session(); s.ready(); s.place(.2f,.3f); s.light()
        s.place(.8f,.9f)
        assertEquals(.2f, s.position!!.first, .001f)
        assertFalse(s.select(2))
        s.clear()
        assertTrue(s.select(2))
        assertEquals(Stage.LOADING, s.stage)
    }
    @Test fun backgroundingRequiresFreshAudioReadiness() {
        val s = Session(); s.ready(); s.place(.4f,.6f); s.light()
        s.interrupt()
        assertEquals(Stage.INTERRUPTED, s.stage)
        assertNull(s.position)
        assertFalse(s.light())
        s.ready(); assertEquals(Stage.READY, s.stage)
    }
}
