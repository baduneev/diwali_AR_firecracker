package com.neev.diwalicamera

import android.Manifest
import android.app.AlertDialog
import android.content.*
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.hardware.SensorManager
import android.media.*
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.*
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

class MainActivity: ComponentActivity() {
    private val ink=0xff10151c.toInt();private val panel=0xf5171f2a.toInt();private val gold=0xffffc36a.toInt();private val mutedInk=0xffacb7c5.toInt()
    private val session=Session();private val scene=Scene();private val audio=AudioEngine()
    private val assetsWorker=Executors.newSingleThreadExecutor();private val cameraWorker=Executors.newSingleThreadExecutor()
    private val prefs by lazy { getSharedPreferences("diwali",MODE_PRIVATE) }
    private lateinit var root: FrameLayout;private lateinit var preview: PreviewView
    private lateinit var overlay: SceneOverlay;private lateinit var particles: ParticleView
    private lateinit var tray: LinearLayout;private lateinit var status: TextView;private lateinit var title: TextView
    private lateinit var subtitle: TextView;private lateinit var light: Button;private lateinit var sound: Button
    private lateinit var permissionPanel: LinearLayout
    private var items=emptyList<EffectSpec>();private val cards=ArrayList<LinearLayout>()
    private var selected=0;private var pcm: PcmWave?=null;private var loadId=0
    private var cameraReady=false;private var startingCamera=false;private var resumed=false;private var destroyed=false
    private var provider: ProcessCameraProvider?=null
    private var audioFocus: AudioFocusRequest?=null
    private val audioManager by lazy { getSystemService(AUDIO_SERVICE) as AudioManager }
    private var currentRoute=""
    private val routes=object: AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) { routeChanged() }
        override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) { routeChanged() }
    }
    private val permission=registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if(granted) { permissionPanel.visibility=View.GONE;session.select(selected);loadSelected();startCamera();showWelcome() }
        else showPermission()
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor=Color.TRANSPARENT;window.navigationBarColor=ink
        window.decorView.systemUiVisibility=View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        audio.muted=prefs.getBoolean("muted",false)
        scene.contrast=prefs.getBoolean("contrast",true);scene.reduceFlashes=prefs.getBoolean("reduce",false)
        try { items=Catalog.load(this) } catch(e:Exception) {
            Log.e("Diwali","Catalog unavailable",e)
            setContentView(TextView(this).apply { text="The bundled effects could not be loaded. Please reinstall the APK.";setPadding(32,100,32,32);setTextColor(Color.WHITE);setBackgroundColor(ink) });return
        }
        selected=prefs.getInt("selected",0).coerceIn(items.indices)
        buildUi()
        currentRoute=routeKey();audioManager.registerAudioDeviceCallback(routes,android.os.Handler(mainLooper))
        val sensors=getSystemService(SENSOR_SERVICE) as SensorManager
        Log.i("DiwaliDevice","Sensors: "+sensors.getSensorList(android.hardware.Sensor.TYPE_ALL).joinToString { it.name })
    }
    private fun dp(n: Int)=(n*resources.displayMetrics.density+.5f).toInt()
    private fun bg(color: Int,radius: Int=18,stroke: Int=Color.TRANSPARENT)=GradientDrawable().apply { setColor(color);cornerRadius=dp(radius).toFloat();setStroke(dp(1),stroke) }
    private fun text(value: String,size: Float=14f,color: Int=Color.WHITE)=TextView(this).apply { text=value;textSize=size;setTextColor(color);includeFontPadding=false }
    private fun button(label: String,primary: Boolean=false)=Button(this).apply {
        text=label;isAllCaps=false;textSize=15f;typeface=Typeface.create("sans-serif-medium",Typeface.NORMAL)
        setTextColor(if(primary) ink else Color.WHITE);background=bg(if(primary) gold else 0xff293342.toInt(),16)
        minHeight=dp(52);minimumHeight=dp(52);stateListAnimator=null;setPadding(dp(16),0,dp(16),0)
    }
    private fun buildUi() {
        root=FrameLayout(this).apply { setBackgroundColor(ink) };setContentView(root)
        preview=PreviewView(this).apply { implementationMode=PreviewView.ImplementationMode.COMPATIBLE;scaleType=PreviewView.ScaleType.FILL_CENTER }
        root.addView(preview,FrameLayout.LayoutParams(-1,-1))
        overlay=SceneOverlay(this,scene,audio) { x,y -> if(cameraReady) { session.place(x,y);syncScene();updateControls() } }
        root.addView(overlay,FrameLayout.LayoutParams(-1,-1))
        particles=ParticleView(this,scene,audio) { interrupt("Effects paused. Reopen the app to restart the graphics.") }
        root.addView(particles,FrameLayout.LayoutParams(-1,-1))
        val top=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;setPadding(dp(20),dp(36),dp(20),dp(48));background=GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,intArrayOf(0xe610151c.toInt(),0x9010151c.toInt(),Color.TRANSPARENT)) }
        val topRow=LinearLayout(this).apply { gravity=Gravity.CENTER_VERTICAL }
        val brand=text("Diwali",29f).apply { typeface=Typeface.create("sans-serif-medium",Typeface.NORMAL) }
        topRow.addView(brand,LinearLayout.LayoutParams(0,-2,1f))
        sound=button(if(audio.muted) "Sound off" else "Sound on").apply { contentDescription="Toggle firecracker sound";setOnClickListener { audio.muted=!audio.muted;prefs.edit().putBoolean("muted",audio.muted).apply();text=if(audio.muted) "Sound off" else "Sound on" } }
        topRow.addView(sound,LinearLayout.LayoutParams(-2,dp(48)))
        val settings=button("Options").apply { setOnClickListener { showOptions() } }
        topRow.addView(settings,LinearLayout.LayoutParams(-2,dp(48)).apply { leftMargin=dp(8) })
        top.addView(topRow)
        root.addView(top,FrameLayout.LayoutParams(-1,-2,Gravity.TOP))
        status=text("Point your camera, then tap to place",13f).apply { gravity=Gravity.CENTER;setPadding(dp(14),dp(10),dp(14),dp(10));background=bg(0xb510151c.toInt(),24) }
        root.addView(status,FrameLayout.LayoutParams(-2,-2,Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply { topMargin=dp(145);leftMargin=dp(16);rightMargin=dp(16) })
        tray=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;setPadding(dp(20),dp(18),dp(20),dp(18));background=bg(panel,26) }
        val selectedRow=LinearLayout(this).apply { gravity=Gravity.CENTER_VERTICAL }
        title=text("Choose a little celebration",19f).apply { typeface=Typeface.create("sans-serif-medium",Typeface.NORMAL) }
        selectedRow.addView(title,LinearLayout.LayoutParams(0,-2,1f))
        selectedRow.addView(text("6 firecrackers",12f,mutedInk))
        tray.addView(selectedRow)
        subtitle=text("",12f,mutedInk);tray.addView(subtitle,LinearLayout.LayoutParams(-1,-2).apply { topMargin=dp(6);bottomMargin=dp(14) })
        val scroll=HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled=false;clipToPadding=false }
        val row=LinearLayout(this)
        for((i,spec) in items.withIndex()) {
            val card=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(dp(6),dp(8),dp(6),dp(8));isClickable=true;isFocusable=true;contentDescription="${spec.name}, ${spec.hindi}";setOnClickListener { choose(i) } }
            val icon=ImageView(this).apply { setImageBitmap(CrackerArt.bitmap(spec.kind));importantForAccessibility=View.IMPORTANT_FOR_ACCESSIBILITY_NO }
            card.addView(icon,LinearLayout.LayoutParams(dp(60),dp(60)))
            card.addView(text(spec.name,12f).apply { gravity=Gravity.CENTER;typeface=Typeface.DEFAULT_BOLD })
            card.addView(text(spec.hindi,11f,mutedInk).apply { gravity=Gravity.CENTER },LinearLayout.LayoutParams(-1,-2).apply { topMargin=dp(4) })
            row.addView(card,LinearLayout.LayoutParams(dp(101),dp(115)).apply { rightMargin=dp(9) });cards+=card
        }
        scroll.addView(row);tray.addView(scroll,LinearLayout.LayoutParams(-1,dp(119)))
        val actions=LinearLayout(this).apply { gravity=Gravity.CENTER_VERTICAL }
        val clear=button("Clear").apply { setOnClickListener { audio.stop();session.clear();abandonFocus();syncScene();updateControls() } }
        actions.addView(clear,LinearLayout.LayoutParams(dp(90),dp(52)))
        light=button("Light firecracker",true).apply { setOnClickListener { ignite() } }
        actions.addView(light,LinearLayout.LayoutParams(0,dp(52),1f).apply { leftMargin=dp(10) })
        tray.addView(actions,LinearLayout.LayoutParams(-1,dp(52)).apply { topMargin=dp(14) })
        root.addView(tray,FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM))
        permissionPanel=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(dp(28),dp(36),dp(28),dp(36));setBackgroundColor(ink) }
        root.addView(permissionPanel,FrameLayout.LayoutParams(-1,-1))
        root.addOnLayoutChangeListener { _,_,_,_,_,_,_,_,_ ->
            val available=(root.height-tray.height).coerceAtLeast(1)
            if(overlay.layoutParams.height!=available) { overlay.layoutParams=FrameLayout.LayoutParams(-1,available);scene.viewportHeight=available }
        }
        root.setOnApplyWindowInsetsListener { _,insets ->
            top.setPadding(dp(20),insets.systemWindowInsetTop+dp(12),dp(20),dp(48))
            tray.setPadding(dp(20),dp(18),dp(20),insets.systemWindowInsetBottom+dp(14));insets
        }
        updateControls()
    }
    private fun choose(i: Int) {
        if(!session.select(i)) return
        audio.stop();abandonFocus();selected=i;prefs.edit().putInt("selected",i).apply();loadSelected()
    }
    private fun loadSelected() {
        if(items.isEmpty()) return
        val request=++loadId;pcm=null
        scene.spec=items[selected];syncScene();updateControls()
        assetsWorker.execute {
            try {
                val data=assets.open("audio/${items[selected].id}.wav").use { PcmWave.read(it.readBytes()) }
                runOnUiThread { if(request==loadId && resumed && !destroyed) { pcm=data;session.ready();syncScene();updateControls() } }
            } catch(e:Exception) { runOnUiThread { if(request==loadId) { status.text="This sound could not load. Select another firecracker.";Log.e("DiwaliAudio","Asset error",e) } } }
        }
    }
    private fun syncScene() {
        val pos=session.position
        scene.playing=session.stage==Stage.PLAYING;scene.placed=pos!=null;scene.runId=session.runId
        if(pos!=null) { scene.x=pos.first;scene.y=pos.second };overlay.invalidate()
    }
    private fun updateControls() {
        if(!::light.isInitialized) return
        val playing=session.stage==Stage.PLAYING
        light.isEnabled=session.stage==Stage.PLACED && cameraReady && pcm!=null
        light.alpha=if(light.isEnabled) 1f else .45f
        light.text=if(playing) "Enjoy the light" else "Light firecracker"
        for((i,card) in cards.withIndex()) { card.isEnabled=!playing;card.alpha=if(playing && i!=selected) .45f else 1f;card.background=bg(if(i==selected) 0xff37342e.toInt() else 0xff222c39.toInt(),16,if(i==selected) gold else Color.TRANSPARENT);card.isSelected=i==selected }
        if(items.isNotEmpty()) { title.text=items[selected].name;subtitle.text=items[selected].description }
        status.text=when {
            !cameraReady -> "Opening your camera…"
            playing -> "A little Diwali, right here"
            session.stage==Stage.LOADING -> "Preparing the recording…"
            session.position!=null -> "Ready when you are. Tap Light."
            else -> "Tap a spot in the camera view"
        }
    }
    private fun ignite() {
        val recording=pcm ?: return
        if(!cameraReady || session.stage!=Stage.PLACED) return
        val focus=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).build())
            .setOnAudioFocusChangeListener { change -> if(change<0) interrupt("Playback paused by another app. Tap to place again.") }.build()
        if(audioManager.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { status.text="Audio is busy. Try again in a moment.";return }
        audioFocus=focus
        if(!session.light()) { abandonFocus();return }
        val id=session.runId;syncScene();updateControls()
        audio.play(recording,{ runOnUiThread { if(session.runId==id) { session.complete(id);abandonFocus();syncScene();updateControls() } } },{ error -> runOnUiThread { if(session.runId==id) { Log.e("DiwaliAudio","Playback failed",error);interrupt("Sound was interrupted. Select a firecracker to try again.") } } })
    }
    private fun abandonFocus() { audioFocus?.let { audioManager.abandonAudioFocusRequest(it) };audioFocus=null }
    private fun interrupt(message: String) {
        if(!::overlay.isInitialized) return
        audio.stop();session.clear();abandonFocus();syncScene();updateControls();status.text=message
    }
    private fun routeKey()=audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).joinToString { "${it.id}:${it.type}" }
    private fun routeChanged() { val route=routeKey();if(route!=currentRoute && session.stage==Stage.PLAYING) interrupt("Audio output changed. Tap to place again.");currentRoute=route }
    private fun showPermission() {
        permissionPanel.removeAllViews();permissionPanel.visibility=View.VISIBLE
        permissionPanel.addView(ImageView(this).apply { setImageBitmap(CrackerArt.bitmap(Kind.ANAR,240)) },LinearLayout.LayoutParams(dp(120),dp(120)))
        permissionPanel.addView(text("Make a little light",27f).apply { gravity=Gravity.CENTER },LinearLayout.LayoutParams(-1,-2).apply { topMargin=dp(16) })
        permissionPanel.addView(text("Use your camera as the backdrop for virtual Diwali firecrackers. Camera footage stays on your phone and is never saved by this app.",15f,mutedInk).apply { gravity=Gravity.CENTER;setLineSpacing(dp(5).toFloat(),1f) },LinearLayout.LayoutParams(-1,-2).apply { topMargin=dp(16);bottomMargin=dp(24) })
        val permanent=prefs.getBoolean("permissionAsked",false) && !shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)
        permissionPanel.addView(button(if(permanent) "Open settings" else "Enable camera",true).apply {
            setOnClickListener { if(permanent) startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:$packageName"))) else { prefs.edit().putBoolean("permissionAsked",true).apply();permission.launch(Manifest.permission.CAMERA) } }
        },LinearLayout.LayoutParams(-1,dp(54)))
    }
    private fun showWelcome() {
        if(prefs.getBoolean("welcome",false) || !resumed) return
        prefs.edit().putBoolean("welcome",true).apply()
        AlertDialog.Builder(this).setTitle("Your own little Diwali").setMessage("Virtual firecrackers over your camera view. Placement stays on your screen as you move.\n\nChoose a firecracker, tap a spot, then tap Light.").setPositiveButton("Let's begin",null).show()
    }
    private fun showOptions() {
        val layout=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;setPadding(dp(24),dp(12),dp(24),dp(12)) }
        fun toggle(label: String,value: Boolean,changed: (Boolean)->Unit) { layout.addView(Switch(this).apply { text=label;isChecked=value;setPadding(0,dp(10),0,dp(10));minHeight=dp(52);setOnCheckedChangeListener { _,v->changed(v);this@MainActivity.overlay.invalidate() } }) }
        toggle("Enhanced contrast",scene.contrast) { scene.contrast=it;prefs.edit().putBoolean("contrast",it).apply() }
        toggle("Reduce flashes",scene.reduceFlashes) { scene.reduceFlashes=it;prefs.edit().putBoolean("reduce",it).apply() }
        layout.addView(text("Camera overlay simulation. Effects do not track real surfaces.\n\nOriginal artwork with real recordings licensed through Pixabay. Sound credits explain the recording variants and edits.",13f,mutedInk).apply { setPadding(0,dp(16),0,dp(12)) })
        AlertDialog.Builder(this).setTitle("Make it yours").setView(layout).setPositiveButton("Done",null).setNeutralButton("Sound credits") { _,_->
            val credits=assets.open("credits.txt").bufferedReader().use { it.readText() }
            AlertDialog.Builder(this).setTitle("Recordings & credits").setMessage(credits).setPositiveButton("Done",null).show()
        }.show()
    }
    private fun startCamera() {
        if(startingCamera || !resumed || checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED) return
        startingCamera=true
        val f=ProcessCameraProvider.getInstance(this)
        f.addListener({
            startingCamera=false
            if(!resumed || destroyed) return@addListener
            try {
                val cameraProvider=f.get();provider=cameraProvider;cameraProvider.unbindAll()
                val view=Preview.Builder().build().apply { setSurfaceProvider(preview.surfaceProvider) }
                val analysis=ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
                var last=0L
                analysis.setAnalyzer(cameraWorker) { image ->
                    try {
                        val now=System.nanoTime()
                        if(now-last>500_000_000L) {
                            last=now;val plane=image.planes[0];val b=plane.buffer;var sum=0;var count=0
                            for(y in 0 until image.height step 24) for(x in 0 until image.width step 24) { val i=y*plane.rowStride+x*plane.pixelStride;if(i<b.limit()) { sum+=b.get(i).toInt() and 255;count++ } }
                            if(count>0) scene.brightness=sum/(count*255f)
                        }
                    } finally { image.close() }
                }
                val camera=cameraProvider.bindToLifecycle(this,CameraSelector.DEFAULT_BACK_CAMERA,view,analysis)
                camera.cameraInfo.cameraState.observe(this) { state ->
                    if(state.error!=null) { cameraReady=false;interrupt("Camera unavailable. Close other camera apps, then reopen this app.") }
                    else if(state.type==CameraState.Type.OPEN) { cameraReady=true;updateControls() }
                }
            } catch(e:Exception) { cameraReady=false;Log.e("DiwaliCamera","Camera unavailable",e);interrupt("Camera unavailable. Reopen the app to try again.") }
        },ContextCompat.getMainExecutor(this))
    }
    override fun onResume() {
        super.onResume();resumed=true
        if(!::root.isInitialized) return
        if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED) {
            permissionPanel.visibility=View.GONE;session.select(selected);loadSelected();startCamera();showWelcome()
        } else showPermission()
    }
    override fun onPause() {
        resumed=false;loadId++;audio.stop();abandonFocus();session.interrupt()
        if(::overlay.isInitialized) syncScene()
        provider?.unbindAll();cameraReady=false
        super.onPause()
    }
    override fun onDestroy() {
        destroyed=true;audioManager.unregisterAudioDeviceCallback(routes);audio.release();assetsWorker.shutdown();cameraWorker.shutdown();super.onDestroy()
    }
}
