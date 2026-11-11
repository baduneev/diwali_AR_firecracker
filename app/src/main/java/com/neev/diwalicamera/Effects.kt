package com.neev.diwalicamera

import android.content.Context
import android.graphics.Color
import org.json.JSONObject

enum class Kind { ANAR, SUTLI, CHAKRI, SKY, LADI, PHULJHADI }
data class EffectSpec(val kind: Kind, val id: String, val name: String, val hindi: String,
    val description: String, val color: Int, val duration: Double, val main: Double, val peak: Double,
    val burstTimes: DoubleArray=doubleArrayOf())

object Catalog {
    fun load(context: Context): List<EffectSpec> {
        val json=JSONObject(context.assets.open("audio-manifest.json").bufferedReader().use { it.readText() })
        val entries=listOf(
            Triple("anar","Anar","अनार") to "A golden fountain of sparks",
            Triple("sutli","Sutli bomb","सुतली बम") to "A fuse, a flash, a single bang",
            Triple("chakri","Chakri","चकरी") to "A spinning circle of light",
            Triple("sky","Sky shot","स्काई शॉट") to "A trail into a golden sky burst",
            Triple("ladi","Ladi","लड़ी") to "A string of little celebrations",
            Triple("phuljhadi","Phuljhadi","फुलझड़ी") to "A gentle shower of tiny sparks"
        )
        val colors=intArrayOf(0xFFFFC36A.toInt(),0xFF9DD8A4.toInt(),0xFFFF987E.toInt(),0xFFB8B6FF.toInt(),0xFFFF8AA0.toInt(),0xFFFFE2A0.toInt())
        return entries.mapIndexed { i,(labels,desc) ->
            val meta=json.getJSONObject(labels.first)
            val cues=meta.optJSONArray("burst_times")
            EffectSpec(Kind.entries[i],labels.first,labels.second,labels.third,desc,colors[i],meta.getDouble("duration"),meta.getDouble("main_start"),meta.getDouble("peak"),DoubleArray(cues?.length() ?: 0) { cues!!.getDouble(it) })
        }
    }
}
