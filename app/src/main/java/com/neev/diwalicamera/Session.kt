package com.neev.diwalicamera

enum class Stage { LOADING, READY, PLACED, PLAYING, INTERRUPTED }
class Session {
    var stage = Stage.LOADING; private set
    var position: Pair<Float,Float>? = null; private set
    var runId = 0L; private set
    private var audioReady = false
    fun ready() { audioReady = true; stage = if (position == null) Stage.READY else Stage.PLACED }
    fun place(x: Float, y: Float) {
        if (stage == Stage.PLAYING || stage == Stage.INTERRUPTED) return
        position = x.coerceIn(0f,1f) to y.coerceIn(0f,1f)
        if (audioReady) stage = Stage.PLACED
    }
    fun light(): Boolean {
        if (!audioReady || stage != Stage.PLACED || position == null) return false
        runId++; stage = Stage.PLAYING; return true
    }
    fun clear() { runId++; position = null; stage = if (audioReady) Stage.READY else Stage.LOADING }
    fun select(index: Int): Boolean {
        if (stage == Stage.PLAYING || index !in 0..5) return false
        clear(); audioReady = false; stage = Stage.LOADING; return true
    }
    fun complete(id: Long) { if (id == runId && stage == Stage.PLAYING) clear() }
    fun interrupt() { clear(); audioReady = false; stage = Stage.INTERRUPTED }
}
