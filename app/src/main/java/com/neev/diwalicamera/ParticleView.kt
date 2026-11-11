package com.neev.diwalicamera

import android.content.Context
import android.graphics.SurfaceTexture
import android.opengl.*
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.view.Choreographer
import android.view.TextureView
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.*
import kotlin.random.Random

class Scene {
    @Volatile var spec: EffectSpec?=null
    @Volatile var x=.5f
    @Volatile var y=.6f
    @Volatile var placed=false
    @Volatile var playing=false
    @Volatile var runId=0L
    @Volatile var reduceFlashes=false
    @Volatile var contrast=true
    @Volatile var brightness=.5f
    @Volatile var viewportHeight=1
}

/** Transparent GLES TextureView: UI and PreviewView retain ordinary view ordering. */
class ParticleView(context: Context, private val scene: Scene, private val audio: AudioEngine,
    private val renderError: ()->Unit): TextureView(context), TextureView.SurfaceTextureListener {
    private var thread: HandlerThread?=null
    private var handler: Handler?=null
    private val surfaceGeneration=AtomicLong()
    @Volatile private var surfaceWidth=1
    @Volatile private var surfaceHeight=1
    private val cap=600
    private val px=FloatArray(cap); private val py=FloatArray(cap)
    private val vx=FloatArray(cap); private val vy=FloatArray(cap)
    private val life=FloatArray(cap); private val maxLife=FloatArray(cap)
    private val size=FloatArray(cap); private val hue=FloatArray(cap)
    private val vertices=ByteBuffer.allocateDirect(cap*7*4).order(ByteOrder.nativeOrder()).asFloatBuffer()
    private val rng=Random(817)
    private var lastRun=-1L; private var lastTime=0.0; private var credit=0.0
    private var burst=false; private var ladiStep=-1
    private var ladiCues: CueCursor?=null
    private var program=0;private var bufferId=0;private var posLoc=0;private var colorLoc=0;private var sizeLoc=0;private var passLoc=0
    private var frames=0;private var reportAt=0L
    init { isOpaque=false;surfaceTextureListener=this;isClickable=false;importantForAccessibility=IMPORTANT_FOR_ACCESSIBILITY_NO }
    override fun onSurfaceTextureAvailable(surface: SurfaceTexture,w: Int,h: Int) {
        surfaceWidth=w;surfaceHeight=h;val generation=surfaceGeneration.incrementAndGet()
        val t=HandlerThread("DiwaliParticles");t.start();thread=t
        handler=Handler(t.looper).also { it.post { render(surface,generation) } }
    }
    override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture,w: Int,h: Int) { surfaceWidth=w;surfaceHeight=h }
    override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean { surfaceGeneration.incrementAndGet();return false }
    override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}
    @Synchronized private fun render(texture: SurfaceTexture,generation: Long) {
        var display=EGL14.EGL_NO_DISPLAY;var eglSurface=EGL14.EGL_NO_SURFACE;var eglContext=EGL14.EGL_NO_CONTEXT
        try {
            display=EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
            check(EGL14.eglInitialize(display,IntArray(2),0,IntArray(2),1))
            val configs=arrayOfNulls<EGLConfig>(1)
            check(EGL14.eglChooseConfig(display,intArrayOf(EGL14.EGL_RENDERABLE_TYPE,0x40,EGL14.EGL_RED_SIZE,8,EGL14.EGL_GREEN_SIZE,8,EGL14.EGL_BLUE_SIZE,8,EGL14.EGL_ALPHA_SIZE,8,EGL14.EGL_NONE),0,configs,0,1,IntArray(1),0))
            eglContext=EGL14.eglCreateContext(display,configs[0],EGL14.EGL_NO_CONTEXT,intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION,3,EGL14.EGL_NONE),0)
            eglSurface=EGL14.eglCreateWindowSurface(display,configs[0],texture,intArrayOf(EGL14.EGL_NONE),0)
            check(EGL14.eglMakeCurrent(display,eglSurface,eglSurface,eglContext))
            EGL14.eglSwapInterval(display,1)
            initGl()
            while(generation==surfaceGeneration.get()) {
                val begin=System.nanoTime()
                drawFrame()
                check(EGL14.eglSwapBuffers(display,eglSurface))
                frames++
                if(begin-reportAt>5_000_000_000L) { if(reportAt!=0L) Log.d("DiwaliFrames","renderer fps=${frames*1e9/(begin-reportAt)}");reportAt=begin;frames=0 }
                val wait=16_666_667L-(System.nanoTime()-begin)
                if(wait>0) Thread.sleep(wait/1_000_000,(wait%1_000_000).toInt())
            }
        } catch(e:Exception) { Log.e("DiwaliParticles","Renderer failed",e);post(renderError) }
        finally {
            if(display!=EGL14.EGL_NO_DISPLAY) {
                GLES30.glDeleteProgram(program);GLES30.glDeleteBuffers(1,intArrayOf(bufferId),0)
                EGL14.eglMakeCurrent(display,EGL14.EGL_NO_SURFACE,EGL14.EGL_NO_SURFACE,EGL14.EGL_NO_CONTEXT)
                EGL14.eglDestroySurface(display,eglSurface);EGL14.eglDestroyContext(display,eglContext);EGL14.eglTerminate(display)
            }
            texture.release();(Thread.currentThread() as? HandlerThread)?.quitSafely()
        }
    }
    private fun shader(type: Int,source: String): Int {
        val shader=GLES30.glCreateShader(type);GLES30.glShaderSource(shader,source);GLES30.glCompileShader(shader)
        val status=IntArray(1);GLES30.glGetShaderiv(shader,GLES30.GL_COMPILE_STATUS,status,0)
        check(status[0]!=0) { GLES30.glGetShaderInfoLog(shader) };return shader
    }
    private fun initGl() {
        val v=shader(GLES30.GL_VERTEX_SHADER,"""#version 300 es
            in vec2 aPosition; in float aSize; in vec4 aColor; out vec4 vColor;
            void main(){ gl_Position=vec4(aPosition,0.,1.); gl_PointSize=aSize; vColor=aColor; }
        """.trimIndent())
        val f=shader(GLES30.GL_FRAGMENT_SHADER,"""#version 300 es
            precision mediump float; in vec4 vColor; uniform int uPass; out vec4 frag;
            void main(){ float d=length(gl_PointCoord-vec2(.5))*2.; if(d>1.)discard;
              float a=pow(max(0.,1.-d),uPass==0 ? 1.7 : 5.);
              vec3 c=uPass==0 ? vColor.rgb : mix(vColor.rgb,vec3(1.),.8);
              frag=vec4(c*a*vColor.a,a*vColor.a); }
        """.trimIndent())
        program=GLES30.glCreateProgram();GLES30.glAttachShader(program,v);GLES30.glAttachShader(program,f);GLES30.glLinkProgram(program)
        GLES30.glDeleteShader(v);GLES30.glDeleteShader(f)
        val status=IntArray(1);GLES30.glGetProgramiv(program,GLES30.GL_LINK_STATUS,status,0);check(status[0]!=0) { GLES30.glGetProgramInfoLog(program) }
        posLoc=GLES30.glGetAttribLocation(program,"aPosition");sizeLoc=GLES30.glGetAttribLocation(program,"aSize");colorLoc=GLES30.glGetAttribLocation(program,"aColor");passLoc=GLES30.glGetUniformLocation(program,"uPass")
        GLES30.glEnable(GLES30.GL_BLEND)
        val ids=IntArray(1);GLES30.glGenBuffers(1,ids,0);bufferId=ids[0]
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER,bufferId)
        GLES30.glBufferData(GLES30.GL_ARRAY_BUFFER,cap*28,null,GLES30.GL_DYNAMIC_DRAW)
    }
    private fun spawn(x: Float,y: Float,dx: Float,dy: Float,seconds: Float,radius: Float,tint: Float=0f) {
        for(i in 0 until cap) if(life[i]<=0f) {
            px[i]=x;py[i]=y;vx[i]=dx;vy[i]=dy;life[i]=seconds;maxLife[i]=seconds;size[i]=radius;hue[i]=tint;return
        }
    }
    private fun drawFrame() {
        val w=surfaceWidth.toFloat();val h=surfaceHeight.toFloat();val scale=w/400f
        GLES30.glViewport(0,0,surfaceWidth,surfaceHeight);GLES30.glClearColor(0f,0f,0f,0f);GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT)
        val s=scene.spec ?: return
        val t=if(scene.playing) audio.seconds() else 0.0
        if(lastRun!=scene.runId || !scene.playing || t<lastTime) { life.fill(0f);lastTime=0.0;lastRun=scene.runId;credit=0.0;burst=false;ladiStep=-1;ladiCues=if(scene.playing && s.kind==Kind.LADI) CueCursor(s.burstTimes) else null }
        val dt=(t-lastTime).coerceIn(0.0,.05).toFloat();lastTime=t
        if(!scene.playing) return
        val x=scene.x*w;val y=scene.y*scene.viewportHeight
        val main=(t-s.main).toFloat()
        val burning=main>=0 && t<s.duration-.35
        var count=0
        if(main<0 && t>0) {
            credit+=dt*25;count=credit.toInt();credit-=count
            repeat(count) { spawn(x,y-30*scale,(rng.nextFloat()-.5f)*45*scale,-30*scale,.3f,8*scale) }
        } else if(burning) {
            val rate=when(s.kind) { Kind.ANAR->165;Kind.CHAKRI->155;Kind.PHULJHADI->85;Kind.SKY->75;else->0 }
            credit+=dt*rate;count=credit.toInt();credit-=count
            repeat(count) {
                when(s.kind) {
                    Kind.ANAR -> { val taper=min(1f,((s.duration-t)/1.5).toFloat());spawn(x,y-67*scale,(rng.nextFloat()-.5f)*150*scale,-(170+rng.nextFloat()*350)*scale*taper,.8f+rng.nextFloat()*.6f,(7+rng.nextFloat()*9)*scale) }
                    Kind.CHAKRI -> { val a=main*32+rng.nextFloat()*.35f;spawn(x+cos(a)*14*scale,y+sin(a)*5*scale,cos(a)*240*scale,sin(a)*65*scale,.55f+rng.nextFloat()*.5f,10*scale) }
                    Kind.PHULJHADI -> { val a=rng.nextFloat()*6.283f;val speed=(45+rng.nextFloat()*170)*scale;spawn(x,y-65*scale+main*2*scale,cos(a)*speed,sin(a)*speed,.3f+rng.nextFloat()*.4f,8*scale) }
                    Kind.SKY -> if(t<s.peak) { val u=((t-s.main)/(s.peak-s.main).coerceAtLeast(.2)).toFloat().coerceIn(0f,1f);val top=max(90*scale,y-300*scale);spawn(x,y+(top-y)*u,(rng.nextFloat()-.5f)*22*scale,65*scale,.55f,10*scale) }
                    else -> Unit
                }
            }
        }
        if(s.kind==Kind.SUTLI && t>=s.peak && !burst) {
            burst=true
            repeat(110) { val a=rng.nextFloat()*6.283f;val speed=(30+rng.nextFloat()*220)*scale;spawn(x,y,cos(a)*speed,sin(a)*speed,.25f+rng.nextFloat()*.65f,(6+rng.nextFloat()*13)*scale) }
        }
        if(s.kind==Kind.SKY && t>=s.peak && !burst) {
            burst=true;val top=max(90*scale,y-300*scale)
            repeat(220) { val a=it/220f*6.283f;val speed=(55+rng.nextFloat()*145)*scale;spawn(x,top,cos(a)*speed,sin(a)*speed,1.3f+rng.nextFloat()*1.2f,(6+rng.nextFloat()*8)*scale,if(it%5==0) 1f else 0f) }
        }
        if(s.kind==Kind.LADI && burning) {
            repeat(ladiCues?.advance(t) ?: 0) {
                ladiStep++
                val at=x-55*scale+(ladiStep%12)*10*scale
                repeat(17) { spawn(at,y,(rng.nextFloat()-.5f)*180*scale,-rng.nextFloat()*180*scale,.2f+rng.nextFloat()*.35f,8*scale,1f) }
            }
        }
        vertices.clear();var live=0
        for(i in 0 until cap) if(life[i]>0f) {
            life[i]-=dt;px[i]+=vx[i]*dt;py[i]+=vy[i]*dt
            vy[i]+=when(s.kind) { Kind.CHAKRI->25f;Kind.SKY->58f;else->220f }*scale*dt
            vx[i]*=1-dt*.25f
            val a=(life[i]/maxLife[i]).coerceIn(0f,1f)
            vertices.put(px[i]/w*2-1);vertices.put(1-py[i]/h*2);vertices.put(size[i])
            vertices.put(1f);vertices.put(if(hue[i]>0) .35f else .66f+a*.24f);vertices.put(if(hue[i]>0) .22f else .18f+a*.3f);vertices.put(a)
            live++
        }
        vertices.flip();GLES30.glUseProgram(program)
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER,bufferId);GLES30.glBufferSubData(GLES30.GL_ARRAY_BUFFER,0,live*28,vertices)
        GLES30.glVertexAttribPointer(posLoc,2,GLES30.GL_FLOAT,false,28,0);GLES30.glEnableVertexAttribArray(posLoc)
        GLES30.glVertexAttribPointer(sizeLoc,1,GLES30.GL_FLOAT,false,28,8);GLES30.glEnableVertexAttribArray(sizeLoc)
        GLES30.glVertexAttribPointer(colorLoc,4,GLES30.GL_FLOAT,false,28,12);GLES30.glEnableVertexAttribArray(colorLoc)
        GLES30.glBlendFunc(GLES30.GL_ONE,GLES30.GL_ONE_MINUS_SRC_ALPHA);GLES30.glUniform1i(passLoc,0);GLES30.glDrawArrays(GLES30.GL_POINTS,0,live)
        GLES30.glBlendFunc(GLES30.GL_ONE,GLES30.GL_ONE);GLES30.glUniform1i(passLoc,1);GLES30.glDrawArrays(GLES30.GL_POINTS,0,live)
    }
}
