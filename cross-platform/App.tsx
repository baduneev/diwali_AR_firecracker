import React,{useCallback,useEffect,useReducer,useRef,useState} from 'react';
import {AccessibilityInfo,ActivityIndicator,Alert,AppState,Linking,PanResponder,PermissionsAndroid,Platform,Pressable,ScrollView,StatusBar,StyleSheet,Switch,Text,View,type GestureResponderEvent} from 'react-native';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAudioPlayer,setAudioModeAsync} from 'expo-audio';
import {ViroARSceneNavigator,Viro3DSceneNavigator,isARSupportedOnDevice} from '@reactvision/react-viro';
import {initialSession,reduceSession,playbackSample,canIgnite,type Kind} from './src/core';
import {AUDIO,KINDS,NAMES,timing} from './src/catalog';
import {ARScene,StudioScene,type SceneData} from './src/Scenes';
import {MODELS} from './src/models';
import {styles} from './src/styles';
import {NOTICES} from './src/notices';
import {DEFAULT_VIEW,orbitView,zoomView,beginGesture,moveGesture,isPlacementTap,type StudioGesture} from './src/studio-camera';
const hints:Record<Kind,string>={anar:'A paper cone, a rising golden fountain.',sutli:'A wrapped shell, a single recorded bang.',chakri:'A flat coil that spins against the ground.',sky:'A launch tube with a rising aerial burst.',ladi:'36 paper crackers burn in sequence.',phuljhadi:'Sparks travel along the coated metal wire.'};
function Button({label,onPress,disabled=false,primary=false}:{label:string;onPress:()=>void;disabled?:boolean;primary?:boolean}) {
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,primary?styles.primary:null,{opacity:disabled?.4:pressed?.7:1}]}><Text style={[styles.buttonText,primary?styles.primaryText:null]}>{label}</Text></Pressable>;
}
function Experience(){
 const insets=useSafeAreaInsets();const [session,dispatch]=useReducer(reduceSession,undefined,initialSession);
 const [mode,setMode]=useState<'checking'|'ar'|'unsupported'|'studio'|'permission'>('checking');
 const [muted,setMuted]=useState(false),[reduced,setReduced]=useState(false),[elapsed,setElapsed]=useState(0),[distance,setDistance]=useState(1);
 const [modelVersion,setModelVersion]=useState(0);const loaded=useRef(new Set<string>());const [modelError,setModelError]=useState(false);
 const [backgrounded,setBackgrounded]=useState(false);
 const [studioView,setStudioView]=useState(DEFAULT_VIEW);
 const [headerHeight,setHeaderHeight]=useState(0),[trayHeight,setTrayHeight]=useState(0);
 const studioViewport={...StyleSheet.absoluteFillObject,top:headerHeight,bottom:trayHeight};
 const viewRef=useRef(studioView);viewRef.current=studioView;
 const gesture=useRef<StudioGesture|null>(null);
 const points=(e:GestureResponderEvent)=>[...e.nativeEvent.touches].sort((a,b)=>Number(a.identifier)-Number(b.identifier)).map(t=>({x:t.pageX,y:t.pageY}));
 const studioTouches=useRef(PanResponder.create({
  onStartShouldSetPanResponder:()=>true,
  onMoveShouldSetPanResponder:()=>true,
  onPanResponderGrant:e=>{gesture.current=beginGesture(viewRef.current,points(e),Date.now());},
  onPanResponderStart:e=>{if(gesture.current)gesture.current=moveGesture(gesture.current,points(e));},
  onPanResponderMove:e=>{if(!gesture.current)return;gesture.current=moveGesture(gesture.current,points(e));viewRef.current=gesture.current.view;setStudioView(gesture.current.view);},
  onPanResponderEnd:e=>{if(gesture.current&&e.nativeEvent.touches.length)gesture.current=moveGesture(gesture.current,points(e));},
  onPanResponderRelease:()=>{
   if(gesture.current&&isPlacementTap(gesture.current,Date.now())&&!stateRef.current.anchor)dispatch({type:'place',anchor:{id:'studio',position:[0,0,0],normal:[0,1,0]}});
   gesture.current=null;
  },
  onPanResponderTerminate:()=>{gesture.current=null;},
  onPanResponderTerminationRequest:()=>false,
 })).current;
 const player=useAudioPlayer(AUDIO[session.kind],{updateInterval:100});const [audioReady,setAudioReady]=useState(false);
 useEffect(()=>{
  // Loading may finish before the SDK event listener subscribes. Read native state too.
  setAudioReady(false);
  const check=()=>{try{setAudioReady(player.currentStatus.isLoaded);}catch{setAudioReady(false);}};
  check();const poll=setInterval(check,150);return ()=>clearInterval(poll);
 },[player]);
 const stateRef=useRef(session);stateRef.current=session;
 useEffect(()=>{AccessibilityInfo.isReduceMotionEnabled().then(setReduced);setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false,interruptionMode:'doNotMix',interruptionModeAndroid:'doNotMix'}).catch(()=>{});},[]);
 const check=useCallback(async()=>{
  setMode('checking');
  if(Platform.OS==='android'){
   const granted=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
   if(granted!==PermissionsAndroid.RESULTS.GRANTED){setMode('permission');return;}
  }
  for(let i=0;i<5;i++){
   try {const supported=await isARSupportedOnDevice();setMode(supported.isARSupported?'ar':'unsupported');return;}
   catch(e){if(!String(e).includes('TRANSIENT')&&!String(e).includes('UNKNOWN'))break;await new Promise(r=>setTimeout(r,700));}
  }
  setMode('unsupported');
 },[]);
 useEffect(()=>{void check();},[check]);
 useEffect(()=>{player.muted=muted;player.volume=.65*Math.max(.2,Math.min(1,1/Math.max(.5,distance)));},[player,muted,distance]);
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',state=>{
   if(state!=='active'){player.pause();dispatch({type:'tracking',normal:false});dispatch({type:'clear'});setBackgrounded(true);}
   else {setBackgrounded(false);if(mode==='studio')dispatch({type:'tracking',normal:true});}
  });return ()=>subscription.remove();
 },[mode,player]);
 useEffect(()=>{if(session.phase!=='burning'){player.pause();return;}
  const run=session.run;const start=Date.now();let old=0;
  const id=setInterval(()=>{
   const sample=playbackSample(old,player.currentTime,timing(session.kind).duration,player.playing,Date.now()-start);
   old=sample.time;setElapsed(old);
   if(sample.complete){dispatch({type:'complete',run});return;}
   if(sample.interrupted){dispatch({type:'tracking',normal:false});}
  },40);return ()=>clearInterval(id);
 },[session.phase,session.run,session.kind,player]);
 useEffect(()=>{setElapsed(0);setModelError(false);},[session.kind]);
 const modelReady=loaded.current.has(`${session.kind}:complete`);void modelVersion;
 const onModelReady=useCallback((id:string,ok:boolean)=>{
  if(!ok){setModelError(true);return;}
  loaded.current.add(id);const k=stateRef.current.kind;
  if(MODELS[k].every((_,i)=>loaded.current.has(`${k}-${i}`))){loaded.current.add(`${k}:complete`);setModelVersion(v=>v+1);}
 },[]);
 const clear=()=>{player.pause();setElapsed(0);setModelError(false);dispatch({type:'clear'});};
 const choose=(kind:Kind)=>{if(session.phase==='burning')return;player.pause();setElapsed(0);dispatch({type:'select',kind});};
 const ignite=async()=>{
  if(!canIgnite(session,modelReady,player.currentStatus.isLoaded))return;
  try{await player.seekTo(0);setElapsed(0);player.play();dispatch({type:'ignite'});}
  catch {Alert.alert('Sound unavailable','The recording could not start. Clear and try again.');}
 };
 const startStudio=()=>{dispatch({type:'clear'});dispatch({type:'tracking',normal:true});setStudioView(DEFAULT_VIEW);setMode('studio');};
 const data:SceneData={session,elapsed,reduceFlashes:reduced,studio:mode==='studio',studioView,dispatch,onDistance:setDistance,onModelReady};
 let status=session.phase==='burning'?'Watch it burn':session.phase==='spent'?'Spent. Clear, or choose another firecracker.':session.phase==='interrupted'?'Tracking or audio interrupted. Clear to start again.':!session.tracking?'Move your phone slowly to find the floor':!session.anchor?'Tap a highlighted horizontal surface':modelError?'Model could not load. Clear and retry.':!modelReady?'Loading the 3D model…':!audioReady?'Preparing the recording…':'Placed. Move around it, then light.';
 if(mode==='studio')status=session.anchor?(session.phase==='placed'&&modelReady&&audioReady?'Placed. Drag to orbit · Pinch to zoom.':status):'Tap the studio floor to place. Drag to orbit · Pinch to zoom.';
 return <View style={styles.root}><StatusBar barStyle="light-content"/>
  {!backgrounded&&mode==='ar'?<ViroARSceneNavigator style={StyleSheet.absoluteFill} initialScene={{scene:ARScene as never}} viroAppProps={data} autofocus worldAlignment="Gravity" hdrEnabled pbrEnabled bloomEnabled={!reduced} shadowsEnabled multisamplingEnabled/>:null}
  {!backgrounded&&mode==='studio'?<View style={studioViewport}><Viro3DSceneNavigator style={{flex:1}} initialScene={{scene:StudioScene as never}} viroAppProps={data} debug={false} onExitViro={()=>{}} hdrEnabled pbrEnabled bloomEnabled={!reduced} shadowsEnabled multisamplingEnabled/></View>:null}
  {!backgrounded&&mode==='studio'?<View style={studioViewport} {...studioTouches.panHandlers} accessible={false}/>:null}
  {mode==='checking'?<View style={styles.center}><ActivityIndicator color="#ffd18b"/><Text style={styles.body}>Checking AR support…</Text></View>:null}
  {mode==='unsupported'||mode==='permission'?<View style={[styles.center,{paddingHorizontal:28}]}>
   <Text style={styles.big}>{mode==='permission'?'Camera access needed':'AR is unavailable here'}</Text>
   <Text style={styles.body}>{mode==='permission'?'Allow the camera so AR can detect a surface.':'This phone could not start ARKit or ARCore. The 3D studio lets you try the models and combustion on a virtual floor.'}</Text>
   <Button label={mode==='permission'?'Open settings':'Retry AR check'} onPress={()=>mode==='permission'?void Linking.openSettings():void check()}/>
   <Button label="Open 3D studio" primary onPress={startStudio}/>
  </View>:null}
  <View pointerEvents="box-none" onLayout={e=>setHeaderHeight(e.nativeEvent.layout.height)} style={[styles.header,{paddingTop:insets.top+10}]}>
   <View style={styles.topRow}><View><Text style={styles.brand}>Diwali</Text><Text style={styles.eyebrow}>{mode==='studio'?'3D STUDIO':'A LITTLE LIGHT, RIGHT HERE'}</Text></View>
    <Button label={muted?'Sound off':'Sound on'} onPress={()=>setMuted(!muted)}/></View>
   {mode==='ar'||mode==='studio'?<View style={styles.status}><Text style={styles.statusText} accessibilityLiveRegion="polite">{status}</Text></View>:null}
  </View>
  {mode==='ar'||mode==='studio'?<View onLayout={e=>setTrayHeight(e.nativeEvent.layout.height)} style={[styles.tray,{paddingBottom:insets.bottom+12}]}>
   <View style={styles.topRow}><Text style={styles.selectedName}>{NAMES[session.kind]}</Text><Text style={styles.mode}>{mode==='ar'?'SURFACE AR':'STUDIO PREVIEW'}</Text></View>
   <Text style={styles.hint}>{hints[session.kind]}</Text>
   {mode==='studio'?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewControls}>
    <Button label="Reset view" onPress={()=>setStudioView(DEFAULT_VIEW)}/>
    <Button label="Zoom in" onPress={()=>setStudioView(v=>zoomView(v,1.25))}/><Button label="Zoom out" onPress={()=>setStudioView(v=>zoomView(v,.8))}/>
    <Button label="View left" onPress={()=>setStudioView(v=>orbitView(v,90,0))}/><Button label="View right" onPress={()=>setStudioView(v=>orbitView(v,-90,0))}/>
    <Button label="View higher" onPress={()=>setStudioView(v=>orbitView(v,0,45))}/><Button label="View lower" onPress={()=>setStudioView(v=>orbitView(v,0,-45))}/>
   </ScrollView>:null}
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
    {KINDS.map(kind=><Pressable key={kind} accessibilityRole="button" accessibilityState={{selected:kind===session.kind,disabled:session.phase==='burning'}} onPress={()=>choose(kind)} disabled={session.phase==='burning'} style={[styles.chip,kind===session.kind?styles.chipSelected:null]}><Text style={[styles.chipText,kind===session.kind?styles.chipTextSelected:null]}>{NAMES[kind]}</Text></Pressable>)}
   </ScrollView>
   <View style={styles.actionRow}><Button label="Clear" onPress={clear}/><View style={{flex:1}}><Button label={session.phase==='burning'?'Burning…':'Light firecracker'} primary onPress={()=>void ignite()} disabled={!canIgnite(session,modelReady,audioReady)||modelError}/></View></View>
   <View style={styles.footer}><Text style={styles.small}>Reduce flashes</Text><Switch accessibilityLabel="Reduce flashes" value={reduced} onValueChange={setReduced}/><Pressable accessibilityRole="button" onPress={()=>Alert.alert('About this version','Real recorded audio with documented variants. Sutli is a generic Diwali bang; chakri is a spinning-bee recording; ladi is an edited sequence. Original 3D meshes and textures. Surface tracking may drift or fail in dim rooms. No camera recordings are saved.',[{text:'Credits & licenses',onPress:()=>Alert.alert('Recordings & open source',NOTICES,[{text:'Done'}])},{text:mode==='ar'?'3D studio':'Try AR',onPress:()=>{clear();if(mode==='ar')startStudio();else void check();}},{text:'Done'}])} style={styles.about}><Text style={styles.small}>About & modes</Text></Pressable></View>
  </View>:null}
 </View>;
}
export default function App(){return <SafeAreaProvider><Experience/></SafeAreaProvider>;}
