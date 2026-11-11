package com.neev.diwalicamera
import org.junit.Assert.*
import org.junit.Test
class TimelineTest {
    @Test fun emitsEveryCrossedPopOnceEvenAfterALateFrame() {
        val cues=CueCursor(doubleArrayOf(1.1,1.2,1.3))
        assertEquals(0,cues.advance(1.0));assertEquals(2,cues.advance(1.25))
        assertEquals(0,cues.advance(1.25));assertEquals(1,cues.advance(1.4))
    }
    @Test fun clockJitterDoesNotReplayPopsButNewRunDoes() {
        val cues=CueCursor(doubleArrayOf(1.1,1.2))
        assertEquals(1,cues.advance(1.15));assertEquals(0,cues.advance(1.12))
        cues.reset();assertEquals(1,cues.advance(1.15))
    }
    @Test fun playbackClockDoesNotRegressWithinARun() {
        val clock=FrameClock()
        assertEquals(480.0,clock.position(1,480.0,960),0.0)
        assertEquals(480.0,clock.position(1,475.0,960),0.0)
        assertEquals(960.0,clock.position(1,990.0,960),0.0)
        assertEquals(0.0,clock.position(2,0.0,1000),0.0)
    }
}
