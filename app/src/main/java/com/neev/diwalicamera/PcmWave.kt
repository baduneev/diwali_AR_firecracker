package com.neev.diwalicamera
data class PcmWave(val samples: ShortArray) {
    val duration get() = samples.size.toDouble()/48000
    companion object {
        fun read(bytes: ByteArray): PcmWave {
            val b=java.nio.ByteBuffer.wrap(bytes).order(java.nio.ByteOrder.LITTLE_ENDIAN)
            fun tag(offset: Int)=String(bytes,offset,4,Charsets.US_ASCII)
            require(bytes.size>=12 && tag(0)=="RIFF" && tag(8)=="WAVE") { "Invalid WAV header" }
            var cursor=12; var validFormat=false; var pcm: ShortArray?=null
            while(cursor+8<=bytes.size) {
                val id=tag(cursor); val size=b.getInt(cursor+4)
                require(size>=0 && cursor.toLong()+8+size<=bytes.size) { "Truncated WAV chunk" }
                val data=cursor+8
                if(id=="fmt ") {
                    require(size>=16 && b.getShort(data).toInt()==1 && b.getShort(data+2).toInt()==1 && b.getInt(data+4)==48000 && b.getShort(data+14).toInt()==16) { "Expected 48 kHz mono PCM16" }
                    validFormat=true
                } else if(id=="data") {
                    require(size>0 && size%2==0)
                    pcm=ShortArray(size/2) { b.getShort(data+it*2) }
                }
                cursor=data+size+(size%2)
            }
            require(validFormat && pcm!=null) { "Missing PCM data" }
            return PcmWave(pcm)
        }
    }
}
