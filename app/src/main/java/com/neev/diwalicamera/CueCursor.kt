package com.neev.diwalicamera
class CueCursor(private val times: DoubleArray) {
    private var index=0
    fun advance(seconds: Double): Int {
        val before=index
        while(index<times.size && times[index]<=seconds) index++
        return index-before
    }
    fun reset() { index=0 }
}
class FrameClock {
    private var token=Long.MIN_VALUE
    private var last=0.0
    fun position(run: Long, frames: Double, limit: Int): Double {
        if(token!=run) { token=run;last=0.0 }
        last=kotlin.math.max(last,frames.coerceIn(0.0,limit.toDouble()))
        return last
    }
}
