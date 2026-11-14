import React,{useCallback,useEffect,useReducer,useRef,useState} from 'react';
import {AccessibilityInfo,ActivityIndicator,Alert,AppState,Linking,Modal,PanResponder,PermissionsAndroid,PixelRatio,Platform,Pressable,ScrollView,Share,StatusBar,StyleSheet,Switch,Text,View,type GestureResponderEvent} from 'react-native';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAudioPlayer,setAudioModeAsync} from 'expo-audio';
import {ViroARSceneNavigator,Viro3DSceneNavigator,isARSupportedOnDevice} from '@reactvision/react-viro';
import {initialSession,reduceSession,playbackSample,canIgnite,type Kind,type Vec3} from './src/core';
import {targetOnRay} from './src/aerial';
import {playbackVolume} from './src/effects';
import {useAerialShow} from './src/use-aerial-show';
import {useRendererMode} from './src/use-renderer-mode';
import {AUDIO,KINDS,NAMES,timing} from './src/catalog';
import {ARScene,StudioScene,type SceneData,type ARDiagnostics,type GroundTap} from './src/Scenes';
import {MODELS} from './src/models';
import {styles} from './src/styles';
import {NOTICES} from './src/notices';
import appConfig from './app.json';
import {DEFAULT_VIEW,orbitView,zoomView,beginGesture,moveGesture,isPlacementTap,type StudioGesture} from './src/studio-camera';
const hints:Record<Kind,string>={anar:'A paper cone, a rising golden fountain.',sutli:'A wrapped shell, a single recorded bang.',chakri:'A flat coil that spins against the ground.',sky:'Light the tube, then tilt up to watch the golden burst.',aerial:'Aim at the sky and tap the camera view. No floor needed.',ladi:'36 paper crackers burn in sequence.',phuljhadi:'Sparks travel along the coated metal wire.'};
function Button({label,onPress,disabled=false,primary=false,accessibilityLabel=label}:{label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;accessibilityLabel?:string}) {
 return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,primary?styles.primary:null,{opacity:disabled?.4:pressed?.7:1}]}><Text style={[styles.buttonText,primary?styles.primaryText:null]}>{label}</Text></Pressable>;
}
function Experience(){
 const insets=useSafeAreaInsets();const [session,dispatch]=useReducer(reduceSession,undefined,initialSession);
 const [mode,setMode]=useRendererMode();
 const [muted,setMuted]=useState(false),[reduced,setReduced]=useState(false),[elapsed,setElapsed]=useState(0),[distance,setDistance]=useState(1);
 const [objectScale,setObjectScale]=useState(1.25),[dimBackground,setDimBackground]=useState(true);
 const [optionsOpen,setOptionsOpen]=useState(false);
 const [assistedPlacement,setAssistedPlacement]=useState(true),[placementHeight,setPlacementHeight]=useState(1.2);
 const [groundTap,setGroundTap]=useState<GroundTap|undefined>();
 const [placementMiss,setPlacementMiss]=useState(false);const groundRequest=useRef(0);
 const onPlacementMiss=useCallback(()=>setPlacementMiss(true),[]);
 const arNavigator=useRef<ViroARSceneNavigator|null>(null);
 const studioLaunch=useRef<()=>void>(()=>{});
 const [modelVersion,setModelVersion]=useState(0);const loaded=useRef(new Set<string>());const [modelError,setModelError]=useState(false);
 const [backgrounded,setBackgrounded]=useState(false);
 const aerialShow=useAerialShow(session.kind==='aerial'&&(mode==='ar'||mode==='studio')&&!backgrounded,session.tracking,muted);
 const [surfaceCount,setSurfaceCount]=useState(0);
 const [recoveringCount,setRecoveringCount]=useState(0);
 const diagnostics=useRef<ARDiagnostics>({state:1,reason:1,found:0,updated:0,removed:0,maxJsDelayMs:0});
 useEffect(()=>{
  let previous=Date.now();
  const timer=setInterval(()=>{const now=Date.now();diagnostics.current.maxJsDelayMs=Math.max(diagnostics.current.maxJsDelayMs,Math.max(0,now-previous-1000));previous=now;},1000);
  return ()=>clearInterval(timer);
 },[]);
 const [studioView,setStudioView]=useState(DEFAULT_VIEW);
 const [trayHeight,setTrayHeight]=useState(0);
 const studioViewport={...StyleSheet.absoluteFillObject,top:0,bottom:trayHeight};
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
   if(gesture.current&&isPlacementTap(gesture.current,Date.now())){
    if(stateRef.current.kind==='aerial')studioLaunch.current();
    else if(!stateRef.current.anchor)dispatch({type:'place',anchor:{id:'studio',position:[0,0,0],normal:[0,1,0]}});
   }
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
  diagnostics.current={state:1,reason:1,found:0,updated:0,removed:0,maxJsDelayMs:0};
  dispatch({type:'tracking',normal:false});setSurfaceCount(0);setRecoveringCount(0);
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
 useEffect(()=>{if(mode==='studio')dispatch({type:'tracking',normal:true});},[mode]);
 const volume=Math.round(playbackVolume(session.kind,distance,elapsed,timing(session.kind))*100)/100;
 useEffect(()=>{player.muted=muted;player.volume=volume;},[player,muted,volume]);
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',state=>{
   if(state!=='active'){player.pause();aerialShow.clear();dispatch({type:'tracking',normal:false});dispatch({type:'clear'});setSurfaceCount(0);setRecoveringCount(0);setBackgrounded(true);}
   else {setBackgrounded(false);if(mode==='studio')dispatch({type:'tracking',normal:true});}
  });return ()=>subscription.remove();
 },[mode,player,aerialShow.clear]);
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
 const modelReady=session.kind==='aerial'||loaded.current.has(`${session.kind}:complete`);void modelVersion;
 const onModelReady=useCallback((id:string,ok:boolean)=>{
  if(!ok){setModelError(true);return;}
  loaded.current.add(id);const k=stateRef.current.kind;
  if(k!=='aerial'&&MODELS[k].every((_,i)=>loaded.current.has(`${k}-${i}`))){loaded.current.add(`${k}:complete`);setModelVersion(v=>v+1);}
 },[]);
 const clear=()=>{groundRequest.current++;setGroundTap(undefined);setPlacementMiss(false);player.pause();aerialShow.clear();setElapsed(0);setModelError(false);dispatch({type:'clear'});};
 const choose=(kind:Kind)=>{if(session.phase==='burning')return;player.pause();aerialShow.clear();setElapsed(0);dispatch({type:'select',kind});if(mode==='studio')setStudioView(kind==='aerial'?{...DEFAULT_VIEW,distance:6}:DEFAULT_VIEW);};
 const skyTap=async(e?:GestureResponderEvent)=>{
  const before=stateRef.current;
  if(before.kind!=='aerial'||!before.tracking||!aerialShow.ready)return;
  try{
   let origin:Vec3=[0,0,0],target:Vec3=[0,1.2,0];
   if(mode==='ar'){
    if(!e||!arNavigator.current)return;
    // Android's renderer consumes physical pixels; iOS VROView consumes points.
    const pixelScale=Platform.OS==='android'?PixelRatio.get():1;
    const x=e.nativeEvent.pageX*pixelScale,y=e.nativeEvent.pageY*pixelScale;
    const [near,far]=await Promise.all([arNavigator.current._unproject([x,y,0]),arNavigator.current._unproject([x,y,.95])]);
    const aim=targetOnRay(near.position,far.position);if(!aim)throw new Error('No camera ray');
    origin=near.position;target=aim;
   }
   await aerialShow.launch(origin,target,()=>{const s=stateRef.current;return s.kind==='aerial'&&s.tracking&&s.run===before.run;});
  }catch{Alert.alert('Launch unavailable','Keep the camera steady, then tap the sky again.');}
 };
 const placeTap=async(e:GestureResponderEvent)=>{
  const before=stateRef.current,request=++groundRequest.current;
  if(!before.tracking||before.anchor||before.kind==='aerial'||!arNavigator.current)return;
  setPlacementMiss(false);
  try{
   const scale=Platform.OS==='android'?PixelRatio.get():1;
   const x=Math.round(e.nativeEvent.pageX*scale),y=Math.round(e.nativeEvent.pageY*scale);
   const [near,far]=await Promise.all([arNavigator.current._unproject([x,y,0]),arNavigator.current._unproject([x,y,.95])]);
   const now=stateRef.current;
   if(request!==groundRequest.current||now.run!==before.run||!now.tracking||now.anchor)return;
   setGroundTap({id:request,run:before.run,x,y,near:near.position,far:far.position});
  }catch{if(request===groundRequest.current)setPlacementMiss(true);}
 };
 studioLaunch.current=()=>void skyTap();
 const ignite=async()=>{
  if(!canIgnite(session,modelReady,player.currentStatus.isLoaded))return;
  try{await player.seekTo(0);setElapsed(0);player.play();dispatch({type:'ignite'});}
  catch {Alert.alert('Sound unavailable','The recording could not start. Clear and try again.');}
 };
 const startStudio=()=>{dispatch({type:'clear'});dispatch({type:'tracking',normal:true});setStudioView(DEFAULT_VIEW);setMode('studio');};
 const showTrackingInfo=()=>{
  const d=diagnostics.current;
  const reason=({1:'none',2:'excessive motion',3:'insufficient visual features'} as Record<number,string>)[d.reason]??`code ${d.reason}`;
  const tracking=({1:'unavailable',2:'limited',3:'normal'} as Record<number,string>)[d.state]??`code ${d.state}`;
  const info=`Version: ${appConfig.expo.version}\nPlatform: ${Platform.OS} ${Platform.Version}\nMode: ${mode}\nTracking: ${mode==='studio'?'Studio simulation':tracking}\nNative reason: ${mode==='studio'?'not applicable':reason}\nLive / cached surfaces: ${surfaceCount} / ${recoveringCount}\nPlacement: ${!session.anchor?'none':session.anchor.available===false?'independent of retired plane':'placed'}\nPlane events received: ${d.found} found, ${d.updated} updated, ${d.removed} removed\nMax JS scheduling delay: ${Math.round(d.maxJsDelayMs)} ms\nAR graphics: lightweight; native event coalescing (Android)\n\nScheduling delay is not camera or GPU FPS. Backgrounding can inflate this value.`;
  Alert.alert('Tracking info',info,[{text:'Share diagnostics',onPress:()=>{void Share.share({message:info});}},{text:'Done'}]);
 };
 const data:SceneData={session,groundTap,assistedPlacement,placementHeight,onPlacementMiss,aerialShots:aerialShow.shots,diagnostics:diagnostics.current,elapsed,reduceFlashes:reduced,dimBackground,objectScale,studio:mode==='studio',studioView,dispatch,onDistance:setDistance,onModelReady,onSurfacesChanged:setSurfaceCount,onSurfaceRecovery:setRecoveringCount};
 let status=session.phase==='burning'?'Watch it burn':session.phase==='spent'?'Spent. Clear, or choose another firecracker.':session.phase==='interrupted'?'Tracking or audio interrupted. Clear to start again.':!session.tracking?'Move your phone slowly to find the floor':!session.anchor?'Tap a highlighted horizontal surface':modelError?'Model could not load. Clear and retry.':!modelReady?'Loading the 3D model…':!audioReady?'Preparing the recording…':'Placed. Move around it, then light.';
 if(mode==='studio')status=session.anchor?(session.phase==='placed'&&modelReady&&audioReady?'Placed. Drag to orbit · Pinch to zoom.':status):'Tap the studio floor to place. Drag to orbit · Pinch to zoom.';
 if(mode==='ar'&&!session.anchor)status=!session.tracking?'Recovering camera tracking. Aim near an edge or patterned area; add light if very dark.':assistedPlacement?'Aim down and tap a floor or table. No full surface scan needed.':`${surfaceCount} horizontal surface${surfaceCount===1?'':'s'} found. Tap the surface to place.`;
 if(mode==='ar'&&!session.anchor&&recoveringCount>0&&surfaceCount===0&&session.tracking)status='Last detected horizontal surface kept. Tap its highlight to place, or scan another surface.';
 if(mode==='ar'&&session.anchor?.available===false&&session.tracking&&session.phase==='placed')status='Placed on the last detected surface. Move around it, then light.';
 if(mode==='ar'&&!session.anchor&&session.tracking&&placementMiss)status=assistedPlacement?'Aim farther down and tap again. For a table, reduce fallback height in Options.':'No horizontal hit yet. Enable assisted placement in Options for incomplete scans.';
 if(mode==='ar'&&session.anchor?.estimated&&session.phase==='placed'&&session.tracking&&modelReady&&audioReady)status='Estimated surface. Adjust height in Options if floating, then light.';
 if(session.kind==='sky'&&session.phase==='burning')status=elapsed<timing('sky').main?'Fuse lit. Tilt up above the tube.':elapsed<timing('sky').peak?'Follow the rising trail above the tube.':'Golden burst above the tube.';
 if(session.kind==='aerial')status=!session.tracking?'Move slowly in good light to start camera tracking. No floor scan needed.':!aerialShow.ready?'Preparing sky audio…':aerialShow.shots.length?`${aerialShow.shots.length} sky shot${aerialShow.shots.length===1?'':'s'} in flight. ${aerialShow.shots.length<4?'Tap again to launch another.':'A new slot opens as each shot fades.'}`:'Aim at the sky and tap to launch. Up to 4 shots at once.';
 return <View style={styles.root}><StatusBar barStyle="light-content"/>
  {!backgrounded&&mode==='ar'?<ViroARSceneNavigator ref={arNavigator} style={StyleSheet.absoluteFill} initialScene={{scene:ARScene as never}} viroAppProps={data} autofocus worldAlignment="Gravity" hdrEnabled={false} pbrEnabled={false} bloomEnabled={false} shadowsEnabled={false} multisamplingEnabled={false}/>:null}
  {!backgrounded&&mode==='studio'?<View style={studioViewport}><Viro3DSceneNavigator style={{flex:1}} initialScene={{scene:StudioScene as never}} viroAppProps={data} debug={false} onExitViro={()=>{}} hdrEnabled pbrEnabled bloomEnabled={!reduced} shadowsEnabled multisamplingEnabled/></View>:null}
  {!backgrounded&&mode==='studio'?<View style={studioViewport} {...studioTouches.panHandlers} accessible={false}/>:null}
  {!backgrounded&&mode==='ar'&&session.kind==='aerial'?<Pressable style={studioViewport} accessibilityRole="button" accessibilityLabel="Launch sky burst where you tap" disabled={!session.tracking||!aerialShow.ready} onPress={e=>void skyTap(e)}/>:null}
  {!backgrounded&&mode==='ar'&&session.kind!=='aerial'&&!session.anchor?<Pressable style={studioViewport} accessibilityRole="button" accessibilityLabel="Place firecracker on the surface you tap" disabled={!session.tracking} onPress={e=>void placeTap(e)}/>:null}
  {mode==='checking'?<View style={styles.center}><ActivityIndicator color="#ffd18b"/><Text style={styles.body}>Checking AR support…</Text></View>:null}
  {mode==='switching'?<View style={styles.center}><ActivityIndicator color="#ffd18b"/><Text style={styles.body}>Switching view…</Text></View>:null}
  {mode==='unsupported'||mode==='permission'?<View style={[styles.center,{paddingHorizontal:28}]}>
   <Text style={styles.big}>{mode==='permission'?'Camera access needed':'AR is unavailable here'}</Text>
   <Text style={styles.body}>{mode==='permission'?'Allow the camera so AR can detect a surface.':'This phone could not start ARKit or ARCore. The 3D studio lets you try the models and combustion on a virtual floor.'}</Text>
   <Button label={mode==='permission'?'Open settings':'Retry AR check'} onPress={()=>mode==='permission'?void Linking.openSettings():void check()}/>
   <Button label="Open 3D studio" primary onPress={startStudio}/>
  </View>:null}
  {mode==='ar'||mode==='studio'?<View onLayout={e=>setTrayHeight(e.nativeEvent.layout.height)} style={[styles.tray,{paddingBottom:insets.bottom+8}]}>
   <Text style={styles.statusText} numberOfLines={2} accessibilityLiveRegion="polite" accessibilityLabel={status}>{status}</Text>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
    {KINDS.map(kind=><Pressable key={kind} accessibilityRole="button" accessibilityState={{selected:kind===session.kind,disabled:session.phase==='burning'}} onPress={()=>choose(kind)} disabled={session.phase==='burning'} style={[styles.chip,kind===session.kind?styles.chipSelected:null]}><Text style={[styles.chipText,kind===session.kind?styles.chipTextSelected:null]}>{NAMES[kind]}</Text></Pressable>)}
   </ScrollView>
   <View style={styles.actionRow}>
    <Button label="Clear" onPress={clear}/>
    <View style={{flex:1}}><Button label={session.kind==='aerial'?'Tap sky':session.phase==='burning'?'Burning…':'Light'} accessibilityLabel={session.kind==='aerial'?'Tap sky to launch':session.phase==='burning'?'Burning':'Light firecracker'} primary onPress={()=>void ignite()} disabled={session.kind==='aerial'||!canIgnite(session,modelReady,audioReady)||modelError}/></View>
    <Button label="Options" onPress={()=>setOptionsOpen(true)}/>
   </View>
  </View>:null}
  <Modal visible={optionsOpen} transparent animationType="slide" onRequestClose={()=>setOptionsOpen(false)}>
   <View style={styles.modalRoot}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close options" onPress={()=>setOptionsOpen(false)}/>
    <View accessibilityViewIsModal style={[styles.settings,{paddingBottom:insets.bottom+12,maxHeight:'85%'}]}>
     <View style={styles.topRow}><Text accessibilityRole="header" style={styles.selectedName}>Options</Text><Button label="Done" onPress={()=>setOptionsOpen(false)}/></View>
     <ScrollView contentContainerStyle={styles.settingsContent}>
      <Text style={styles.body}>{NAMES[session.kind]} · {hints[session.kind]}</Text>
      <View style={styles.settingRow}><Text style={styles.settingLabel}>Sound</Text><Switch accessibilityLabel="Sound" value={!muted} onValueChange={v=>setMuted(!v)}/></View>
      <View style={styles.settingRow}><Text style={styles.settingLabel}>Dim surroundings while burning</Text><Switch accessibilityLabel="Dim surroundings while burning" value={dimBackground} onValueChange={setDimBackground}/></View>
      <View style={styles.settingRow}><Text style={styles.settingLabel}>Reduce flashes</Text><Switch accessibilityLabel="Reduce flashes" value={reduced} onValueChange={setReduced}/></View>
      {mode==='ar'&&session.kind!=='aerial'?<>
       <View style={styles.settingRow}><Text style={styles.settingLabel}>Assisted placement</Text><Switch accessibilityLabel="Assisted placement" value={assistedPlacement} onValueChange={setAssistedPlacement}/></View>
       <Text style={styles.small}>Uses horizontal hits first. In incomplete scans, uses an estimated level surface. Camera tracking is still required.</Text>
       {session.anchor?.estimated?<View style={styles.settingButtons}>
        <Button label="Raise object 5 cm" disabled={session.phase!=='placed'} onPress={()=>dispatch({type:'adjustHeight',delta:.05})}/>
        <Button label="Lower object 5 cm" disabled={session.phase!=='placed'} onPress={()=>dispatch({type:'adjustHeight',delta:-.05})}/>
       </View>:!session.anchor&&assistedPlacement?<>
        <Text style={styles.small}>Fallback surface: {placementHeight.toFixed(1)} m below the phone. Use a smaller value for a tabletop.</Text>
        <View style={styles.settingButtons}><Button label="Surface closer" onPress={()=>setPlacementHeight(v=>Math.max(.2,Math.round((v-.1)*10)/10))}/><Button label="Surface farther" onPress={()=>setPlacementHeight(v=>Math.min(2,Math.round((v+.1)*10)/10))}/></View>
       </>:null}
      </>:null}
      <Button label={`Size: ${objectScale===1.25?'natural':objectScale===2.5?'large':'extra large'}`} disabled={session.phase==='burning'||session.kind==='aerial'} onPress={()=>setObjectScale(s=>s===1.25?2.5:s===2.5?4:1.25)}/>
      {mode==='studio'?<>
       <Text style={styles.small}>Drag the scene to orbit · Pinch to zoom</Text>
       <View style={styles.settingButtons}><Button label="Reset view" onPress={()=>setStudioView(DEFAULT_VIEW)}/><Button label="Zoom in" onPress={()=>setStudioView(v=>zoomView(v,1.25))}/><Button label="Zoom out" onPress={()=>setStudioView(v=>zoomView(v,.8))}/></View>
       <View style={styles.settingButtons}><Button label="View left" onPress={()=>setStudioView(v=>orbitView(v,90,0))}/><Button label="View right" onPress={()=>setStudioView(v=>orbitView(v,-90,0))}/><Button label="View higher" onPress={()=>setStudioView(v=>orbitView(v,0,45))}/><Button label="View lower" onPress={()=>setStudioView(v=>orbitView(v,0,-45))}/></View>
      </>:null}
      <Button label={mode==='ar'?'Open 3D studio':'Try AR'} onPress={()=>{setOptionsOpen(false);clear();if(mode==='ar')startStudio();else void check();}}/>
      <Button label="Tracking info" onPress={showTrackingInfo}/>
      <Button label="Credits & licenses" onPress={()=>Alert.alert('Recordings & open source',NOTICES,[{text:'Done'}])}/>
      <Text style={styles.small}>Diwali AR {appConfig.expo.version} · {mode==='ar'?'Surface AR':'Studio preview'}. Tracking needs visible detail and light. No camera recordings are saved.</Text>
     </ScrollView>
    </View>
   </View>
  </Modal>
 </View>;
}
export default function App(){return <SafeAreaProvider><Experience/></SafeAreaProvider>;}
