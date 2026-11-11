package com.neev.diwalicamera
import android.graphics.*
import android.content.Context
import android.view.*
import kotlin.math.*

object CrackerArt {
    fun bitmap(kind: Kind, pixels: Int=160): Bitmap {
        val image=Bitmap.createBitmap(pixels,pixels,Bitmap.Config.ARGB_8888)
        val c=Canvas(image);c.scale(pixels/100f,pixels/100f)
        val p=Paint(Paint.ANTI_ALIAS_FLAG)
        fun line(x: Float,y: Float,x2: Float,y2: Float,color: Int,width: Float=2f) { p.color=color;p.strokeWidth=width;p.style=Paint.Style.STROKE;c.drawLine(x,y,x2,y2,p);p.style=Paint.Style.FILL }
        val gold=Color.rgb(255,195,106);val cream=Color.rgb(255,240,199)
        when(kind) {
            Kind.ANAR -> {
                p.shader=LinearGradient(25f,50f,74f,50f,intArrayOf(0xffd45a4c.toInt(),0xffffb56d.toInt(),0xffb53937.toInt()),null,Shader.TileMode.CLAMP)
                val path=Path();path.moveTo(50f,16f);path.lineTo(77f,86f);path.quadTo(50f,96f,23f,86f);path.close();c.drawPath(path,p);p.shader=null
                p.color=0xff215d56.toInt();c.drawOval(25f,79f,75f,91f,p)
                line(37f,53f,64f,53f,gold,5f);line(30f,72f,70f,72f,gold,4f)
                p.color=cream;c.drawCircle(50f,63f,4f,p);line(50f,17f,48f,9f,cream,2f)
            }
            Kind.SUTLI -> {
                p.color=0xff385d4b.toInt();c.drawRoundRect(21f,30f,79f,87f,20f,20f,p)
                for(i in 0..9) line(23f,35f+i*5,77f,35f+i*5,0xff73a47a.toInt(),2f)
                p.color=0xffd57165.toInt();c.drawRect(21f,52f,79f,66f,p)
                line(21f,52f,79f,52f,gold);line(21f,66f,79f,66f,gold)
                line(53f,31f,53f,13f,cream,3f);line(53f,13f,64f,8f,cream,3f)
            }
            Kind.CHAKRI -> {
                p.color=0xffc5544d.toInt();c.drawCircle(50f,54f,32f,p)
                p.style=Paint.Style.STROKE;p.strokeWidth=5f
                for(r in intArrayOf(29,22,15)) { p.color=if(r==22) cream else 0xff7199a7.toInt();c.drawCircle(50f,54f,r.toFloat(),p) }
                p.style=Paint.Style.FILL;p.color=gold;c.drawCircle(50f,54f,9f,p)
                line(78f,40f,88f,33f,cream,3f)
            }
            Kind.SKY -> {
                p.color=0xff55578b.toInt();c.drawRoundRect(37f,54f,63f,88f,3f,3f,p)
                p.color=gold;c.drawOval(37f,51f,63f,59f,p)
                for(i in 0..11) { val a=i/12.0*PI*2;line(50f+cos(a).toFloat()*7,27f+sin(a).toFloat()*7,50f+cos(a).toFloat()*27,27f+sin(a).toFloat()*23,if(i%2==0) gold else cream,2f) }
                line(50f,51f,50f,37f,cream,1f)
            }
            Kind.LADI -> {
                line(18f,23f,78f,85f,cream,3f)
                for(i in 0..6) {
                    c.save();c.translate(24f+i*7,30f+i*7);c.rotate(-40f)
                    p.color=if(i%2==0) 0xffd96979.toInt() else 0xfff48b95.toInt();c.drawRoundRect(-16f,-5f,16f,5f,2f,2f,p)
                    p.color=gold;c.drawRect(-13f,-5f,-10f,5f,p);c.drawRect(10f,-5f,13f,5f,p);c.restore()
                }
            }
            Kind.PHULJHADI -> {
                line(70f,90f,37f,30f,0xffb2bdc6.toInt(),3f);line(64f,92f,32f,35f,0xff67727e.toInt(),3f)
                for(i in 0..9) { val a=i/10.0*PI*2;line(37f+cos(a).toFloat()*6,29f+sin(a).toFloat()*6,37f+cos(a).toFloat()*25,29f+sin(a).toFloat()*23,if(i%2==0) cream else gold,2f) }
                p.color=Color.WHITE;c.drawCircle(37f,29f,4f,p)
            }
        }
        return image
    }
}

class SceneOverlay(context: Context,private val scene: Scene,private val audio: AudioEngine,
    private val place: (Float,Float)->Unit): View(context) {
    private val paint=Paint(Paint.ANTI_ALIAS_FLAG)
    private val images=Kind.entries.associateWith { CrackerArt.bitmap(it,200) }
    private val target=RectF()
    private var lastNanos=0L;private var dim=0f
    init { contentDescription="Camera placement area. Tap to place the selected virtual firecracker.";isClickable=true }
    override fun performClick(): Boolean { super.performClick();return true }
    override fun onTouchEvent(e: MotionEvent): Boolean {
        if(scene.playing) return true
        if(e.action==MotionEvent.ACTION_DOWN || e.action==MotionEvent.ACTION_MOVE || e.action==MotionEvent.ACTION_UP) {
            place((e.x/width).coerceIn(.08f,.92f),(e.y/height).coerceIn(.16f,.92f))
            if(e.action==MotionEvent.ACTION_UP) performClick()
            return true
        };return true
    }
    override fun onDraw(c: Canvas) {
        super.onDraw(c)
        val now=System.nanoTime();val dt=if(lastNanos==0L) .016f else ((now-lastNanos)/1e9f).coerceAtMost(.1f);lastNanos=now
        val desired=if(scene.playing && scene.contrast) (.08f+scene.brightness*.17f) else 0f
        dim+=(desired-dim)*min(1f,dt*3)
        if(dim>.001f) c.drawColor(Color.argb((dim*255).toInt(),0,0,0))
        if(scene.placed) {
            val x=scene.x*width;val y=scene.y*height;val s=width/400f
            val spec=scene.spec
            if(scene.playing && !scene.reduceFlashes) {
                val t=audio.seconds()
                val pulse=if(spec?.kind==Kind.SUTLI || spec?.kind==Kind.SKY) max(0.0,1-abs(t-(spec?.peak ?: 0.0))/.22).toFloat() else if(t>1) .32f else .12f
                paint.shader=RadialGradient(x,y,110*s,intArrayOf(Color.argb((pulse*45).toInt(),255,181,79),Color.TRANSPARENT),null,Shader.TileMode.CLAMP)
                c.drawCircle(x,y,110*s,paint);paint.shader=null
            }
            paint.color=0x50000000; c.drawOval(x-34*s,y-5*s,x+34*s,y+8*s,paint)
            val hide=scene.playing && (spec?.kind==Kind.SUTLI && audio.seconds()>spec.peak || spec?.kind==Kind.SKY && audio.seconds()>1)
            if(!hide && spec!=null) {
                val size=if(spec.kind==Kind.LADI) 125*s else 90*s
                target.set(x-size/2,y-size*.9f,x+size/2,y+size*.1f)
                paint.alpha=255
                c.drawBitmap(images.getValue(spec.kind),null,target,paint)
            }
            if(!scene.playing) {
                paint.color=0xffffd18a.toInt();paint.style=Paint.Style.STROKE;paint.strokeWidth=1.5f*s
                c.drawOval(x-42*s,y-12*s,x+42*s,y+12*s,paint);paint.style=Paint.Style.FILL
                paint.color=0xffffe6bd.toInt();paint.textSize=12*s;paint.textAlign=Paint.Align.CENTER
                c.drawText("Drag to position",x,y+34*s,paint)
            }
        }
        if(scene.playing || abs(dim-desired)>.002f) postInvalidateOnAnimation()
    }
}
