import React,{memo,useCallback,useEffect,useRef,useState} from 'react';
import {ViroARScene,ViroScene,ViroCamera,ViroNode,ViroQuad,ViroSphere,Viro3DObject,ViroAmbientLight,ViroSpotLight,ViroOmniLight,ViroParticleEmitter,ViroBox,ViroMaterials,ViroTrackingStateConstants} from '@reactvision/react-viro';
import {cameraPose,type StudioView} from './studio-camera';
import {sampleBurn,sparkVelocity,type Session,type Vec3,type Event,type Kind} from './core';
import {timing} from './catalog';
import {burnEnergy,spinAngle} from './effects';
import type {AerialShot} from './aerial-pool';
import {MODELS} from './models';
import {groundPlacement,horizontalSurface,pointOnSurface,sameSurface,type Surface} from './ar-surfaces';

const PAPER=require('../assets/models/paper.png');
const NORMAL=require('../assets/models/paper-normal.png');
const colors:Record<string,string>={red:'#aa2f22',gold:'#c69235',green:'#285344',rope:'#938471',blue:'#28485b',pink:'#bc4f55',paper:'#a68a5e',metal:'#989c9c',coating:'#55574f'};
ViroMaterials.createMaterials(Object.fromEntries(Object.entries(colors).map(([name,color])=>[name,{lightingModel:'PBR',diffuseColor:color,diffuseTexture:PAPER,normalTexture:NORMAL,roughness:name==='metal'?.36:.88,metalness:name==='metal'?.82:0}])));
ViroMaterials.createMaterials(Object.fromEntries(Object.entries(colors).map(([name,color])=>[`ar_${name}`,{lightingModel:'Lambert',diffuseColor:color,diffuseTexture:PAPER,normalTexture:NORMAL}])));
ViroMaterials.createMaterials({
 char:{lightingModel:'PBR',diffuseTexture:require('../assets/models/char.png'),roughness:1},
 ar_char:{lightingModel:'Lambert',diffuseTexture:require('../assets/models/char.png')},
 floor:{lightingModel:'PBR',diffuseColor:'#3a3935',diffuseTexture:PAPER,roughness:1},
 plane:{lightingModel:'Constant',diffuseColor:'rgba(255, 206, 121, 0.35)',blendMode:'Alpha',cullMode:'None',writesToDepthBuffer:false},
 shadow:{lightingModel:'Constant',diffuseTexture:require('../assets/models/contact.png'),blendMode:'Alpha',writesToDepthBuffer:false},
 // A distant inward shell darkens only the camera background. Opaque virtual
 // geometry keeps its depth; additive sparks render after the shell.
 night:{lightingModel:'Constant',diffuseColor:'#000000',blendMode:'Alpha',writesToDepthBuffer:false,readsFromDepthBuffer:true},
 blastFlash:{lightingModel:'Constant',diffuseColor:'#ffe9c4',blendMode:'Add',writesToDepthBuffer:false},
});
export type ARDiagnostics={state:number;reason:number;found:number;updated:number;removed:number;maxJsDelayMs:number};
export type GroundTap={id:number;run:number;x:number;y:number;near:Vec3;far:Vec3};
export type SceneData={session:Session;groundTap?:GroundTap;assistedPlacement?:boolean;placementHeight?:number;onPlacementMiss?:()=>void;aerialShots?:AerialShot[];aerialConcurrent?:boolean;diagnostics?:ARDiagnostics;elapsed:number;reduceFlashes:boolean;dimBackground?:boolean;objectScale?:number;studio:boolean;studioView:StudioView;dispatch:(e:Event)=>void;onDistance:(v:number)=>void;onModelReady:(id:string,ready:boolean)=>void;onSurfacesChanged?:(count:number)=>void;onSurfaceRecovery?:(count:number)=>void};
type SceneProps={sceneNavigator:{viroAppProps:SceneData}};
const SPARK={source:require('../assets/models/spark.png'),height:.012,width:.006,bloomThreshold:.3};
const SMOKE={source:require('../assets/models/smoke.png'),height:.1,width:.1,bloomThreshold:-1};
const FOUNTAIN={...SPARK,height:.026,width:.012};
const AERIAL_SPARK={...SPARK,height:.06,width:.035};
const FLAME={...SPARK,height:.16,width:.055};
const BLAST_SPARK={...SPARK,height:.045,width:.025};
const SPINNER_SPARK={...SPARK,height:.024,width:.011};
const COLOUR_TEXTURES=[require('../assets/models/spark-gold.png'),require('../assets/models/spark-red.png'),require('../assets/models/spark-green.png'),require('../assets/models/spark-blue.png')];
const COLOUR_VALUES=['#ffad24','#ff305e','#35ff86','#4b86ff'];

const MeshPart=memo(function MeshPart({kind,index,material,visible,heightScale,onReady}:{kind:Exclude<Kind,'aerial'>;index:number;material:string;visible:boolean;heightScale:number;onReady:SceneData['onModelReady']}){
 const id=`${kind}-${index}`;
 const onLoadEnd=useCallback(()=>onReady(id,true),[id,onReady]);
 const onError=useCallback(()=>onReady(id,false),[id,onReady]);
 return <Viro3DObject source={MODELS[kind][index]!.source} type="OBJ" materials={[material]} visible={visible}
  scale={[1,heightScale,1]} onLoadEnd={onLoadEnd} onError={onError}/>;
});

function Combustion({data}:{data:SceneData}) {
 const {session,elapsed,reduceFlashes}=data;const spec=timing(session.kind);const burning=session.phase==='burning';
 if(data.aerialConcurrent)spec.main=spec.peak-1.2;
 const t=session.phase==='spent'?spec.duration:elapsed;
 const b=sampleBurn(session.kind,t,spec);const active=burning && b.emitting;const k=session.kind;
 const scale=data.objectScale??1;const air=k==='sky'||k==='aerial';
 if(k==='aerial'){
  const progress=Math.max(0,Math.min(1,(t-spec.main)/(spec.peak-spec.main)));
  b.emitter=(session.flight??[0,4,-7]).map(v=>v*progress) as Vec3;
 }else if(k==='sky')b.emitter[1]+=.12*(scale-1);
 else b.emitter=b.emitter.map(v=>v*scale) as Vec3;
 const fuse=burning && t<(k==='sutli'?spec.peak:spec.main);
 const continuous=k==='anar'||k==='chakri'||k==='phuljhadi';
 const power=continuous?Math.max(.02,Math.round(burnEnergy(k,t,spec)*20)/20):1;
 const blastAge=t-spec.peak;
 const flash=burning&&k==='sutli'&&blastAge>=0&&blastAge<.09&&!reduceFlashes;
 const fusePosition:Vec3=k==='anar'?[.005,.158,0]:k==='sutli'?[.012,.09,0]:k==='phuljhadi'?[0,.006,-.13]:k==='ladi'?[0,.005,-.16]:[.043,.01,0];
 const sparkPosition:Vec3=fuse?(k==='aerial'?[0,-.2,0]:fusePosition.map(v=>v*scale) as Vec3):b.emitter;
 const velocity:number[][]=fuse?[[-.05,.03,-.05],[.05,.15,.05]]:sparkVelocity(k,t,spec);
 const explosive=(k==='sutli'||air) && t>=spec.peak;
 const ladiBurst=k==='ladi'&&b.consumed>0;
 // Viro 2.52's declaration says one object; its native API takes an array.
 const lifetime=fuse?[120,240]:air?[1400,2200]:k==='anar'?[120+580*power,220+780*power]:k==='chakri'?[70+70*power,100+200*power]:k==='phuljhadi'?[40+80*power,60+120*power]:k==='sutli'?[90,450]:[160,700];
 const life=lifetime[1]!;
 const rate=reduceFlashes?[80,100]:k==='anar'?[420,540]:k==='chakri'?[520,720]:[120,190];
 const spawnBase={particleLifetime:lifetime.map(Math.round),emissionRatePerSecond:explosive||ladiBurst?[0,0]:fuse?[25,40]:rate.map(n=>Math.round(n*power)),emissionBurst:explosive||ladiBurst?[{time:0,min:reduceFlashes?45:ladiBurst?35:air?(data.aerialConcurrent?160:380):160,max:reduceFlashes?70:ladiBurst?50:air?(data.aerialConcurrent?220:480):220,cycles:1}]:[],maxParticles:reduceFlashes?100:k==='anar'?650:air?(data.aerialConcurrent?250:500):350,spawnVolume:{shape:'sphere',params:[.002],spawnOnSurface:false}};
 const textures=fuse?[SPARK.source]:air?COLOUR_TEXTURES:k==='anar'?[SPARK.source]:[COLOUR_TEXTURES[0]];
 const spawn={...spawnBase,emissionRatePerSecond:spawnBase.emissionRatePerSecond.map(n=>Math.ceil(n/textures.length)),maxParticles:Math.ceil(spawnBase.maxParticles/textures.length),emissionBurst:spawnBase.emissionBurst.map(b=>({...b,min:Math.floor(b.min/textures.length),max:Math.ceil(b.max/textures.length)}))} as unknown as React.ComponentProps<typeof ViroParticleEmitter>['spawnBehavior'];
 const smokeRun=burning && t>=(k==='sutli'?spec.peak:spec.main);
 // Native particle pool; particles retain their own world birth position.
 return <ViroNode>
  <ViroNode scale={[scale,scale,scale]} rotation={k==='chakri'?[0,spinAngle(t,spec)%360,0]:undefined}>
   {k==='aerial'?null:MODELS[k].map((part,i)=>{
    const used=k==='ladi'&&part.role==='charge'?i<b.consumed:t>=spec.main&&b.progress>=part.burn;
    const visible=part.role==='fuse'?t<spec.main:k==='sutli'?b.bodyVisible:true;
    const collapse=k==='anar'&&b.progress>.9?1-(b.progress-.9)*3.5:1;
    const material=used?'char':part.material;
    return <MeshPart key={`${k}-${i}`} kind={k} index={i} material={data.studio?material:`ar_${material}`} visible={visible}
      heightScale={part.role==='charge'&&used&&k==='ladi'?.18:collapse} onReady={data.onModelReady}/>;
   })}
  </ViroNode>
  {k==='sutli'&&!b.bodyVisible?Array.from({length:12},(_,i)=><ViroBox key={i} position={[Math.cos(i*2.4)*(.03+i*.004),.002,Math.sin(i*2.4)*(.03+i*.004)]} rotation={[0,i*47,8]} width={.012} height={.003} length={.008} materials={[data.studio?'char':'ar_char']}/>):null}
  {flash?<ViroSphere position={b.emitter} radius={.055+.07*blastAge/.09} widthSegmentCount={8} heightSegmentCount={6} materials={['blastFlash']} opacity={.8*(1-blastAge/.09)} ignoreEventHandling/>:null}
  {textures.map((texture,index)=><ViroParticleEmitter key={`sparks-${session.run}-${fuse}-${explosive}-${k==='ladi'?b.consumed:0}-${index}`} position={sparkPosition} image={{...(fuse?SPARK:air?AERIAL_SPARK:k==='anar'?FOUNTAIN:k==='chakri'?SPINNER_SPARK:k==='sutli'?BLAST_SPARK:SPARK),source:texture}} run={fuse||active} loop={!explosive&&!ladiBurst} duration={explosive||ladiBurst?80:400}
   fixedToEmitter={false} blendMode="Add" spawnBehavior={spawn}
   particleAppearance={{color:{initialRange:fuse?['#ffda90','#ffda90']:k==='anar'?['#ffd17a','#ffb83d']:[COLOUR_VALUES[index]!,COLOUR_VALUES[index]!]},opacity:{initialRange:[.65,.9],interpolation:[{interval:[life*.4,life],endValue:0}]},scale:{initialRange:[[.6,.6,.6],air?[2,2,2]:[1.4,1.4,1.4]],interpolation:[{interval:[life*.5,life],endValue:[0,0,0]}]}}}
   particlePhysics={{velocity:{initialRange:velocity},acceleration:{initialRange:air?[[0,-1.2,0],[0,-1.6,0]]:k==='anar'?[[0,-5.2,0],[.04,-4.8,.04]]:[[.02,-3.5,.02],[.08,-2.8,.06]]}}}/>)}
  {(k==='anar'||k==='chakri')&&!reduceFlashes?<ViroParticleEmitter key={`flame-${session.run}`} position={b.emitter} image={k==='anar'?{...FLAME,source:COLOUR_TEXTURES[0]}:{...SPARK,height:.055,width:.018}} run={active} loop duration={500} fixedToEmitter={false} blendMode="Add"
   spawnBehavior={{particleLifetime:k==='anar'?[120,200]:[70,120],emissionRatePerSecond:(k==='anar'?[45,70]:[100,150]).map(n=>Math.round(n*power)),maxParticles:k==='anar'?24:32}}
   particleAppearance={{color:{initialRange:['#ffffff','#ffb632']},opacity:{initialRange:[.3,.5],interpolation:[{interval:[60,200],endValue:0}]},scale:{initialRange:[[.5,.8,.5],[.8,1.2,.8]],interpolation:[{interval:[60,200],endValue:[.1,.2,.1]}]}}}
   particlePhysics={{velocity:{initialRange:k==='anar'?[[-.08,.2+.9*power,-.08],[.08,.3+1.7*power,.08]]:sparkVelocity(k,t,spec)}}}/>:null}
  <ViroParticleEmitter key={`smoke-${session.run}`} position={b.emitter} image={SMOKE} run={smokeRun} loop duration={1500} fixedToEmitter={false} blendMode="Alpha"
   spawnBehavior={{particleLifetime:[1200,2200],emissionRatePerSecond:k==='sutli'?[0,0]:[Math.ceil(7*power),Math.ceil(12*power)],...(k==='sutli'?{emissionBurst:[{time:0,min:12,max:20,cycles:1}]}:{}),maxParticles:data.aerialConcurrent?16:32} as unknown as React.ComponentProps<typeof ViroParticleEmitter>['spawnBehavior']}
   particleAppearance={{opacity:{initialRange:[.06,.12],interpolation:[{interval:[200,1800],endValue:0}]},scale:{initialRange:[[.2,.2,.2],[.4,.4,.4]],interpolation:[{interval:[0,1800],endValue:[2,2,2]}]},rotation:{initialRange:[0,360]}}}
   particlePhysics={{velocity:{initialRange:k==='sutli'?[[-.35,.12,-.35],[.35,.5,.35]]:[[-.015,.05,-.015],[.03,.14,.03]]},acceleration:{initialRange:[[.015,.02,0],[.025,.04,.01]]}}}/>
  {active&&!reduceFlashes&&!data.aerialConcurrent&&(k!=='sutli'||flash)?<ViroOmniLight position={b.emitter} color={k==='sutli'?'#fff0da':'#ffbc62'} intensity={(data.studio?16+Math.sin(t*28)*3.5:350+Math.sin(t*28)*60)*power*(k==='sutli'?2.5:1)} attenuationStartDistance={.05} attenuationEndDistance={k==='sutli'?2:1}/>:null}
 </ViroNode>;
}
const GroundedObject=memo(function GroundedObject({data,position}:{data:SceneData;position:Vec3}) {
 return <ViroNode position={position}>
  {data.session.kind!=='aerial'?<ViroSpotLight position={[.5,1,.3]} direction={[-.5,-1,-.3]} intensity={data.studio?50:350} color="#fff4df" castsShadow={data.studio} shadowMapSize={1024} shadowOpacity={.38} shadowNearZ={.1} shadowFarZ={3} innerAngle={10} outerAngle={75}/>:null}
  {data.studio&&data.session.kind!=='aerial'?<ViroQuad position={[0,.0005,0]} rotation={[-90,0,0]} width={1.5} height={1.5} materials={['floor']} ignoreEventHandling/>:null}
  {data.session.kind!=='aerial'?<ViroQuad position={[0,.001,0]} rotation={[-90,0,0]} scale={[data.objectScale??1,data.objectScale??1,1]} width={data.session.kind==='ladi'?.15:.13} height={data.session.kind==='ladi'?.36:.13} materials={['shadow']} ignoreEventHandling/>:null}
  <Combustion data={data}/>
 </ViroNode>;
},(a,b)=>a.position.every((n,i)=>n===b.position[i])&&a.data.session.kind===b.data.session.kind&&a.data.session.phase===b.data.session.phase&&a.data.session.run===b.data.session.run&&a.data.elapsed===b.data.elapsed&&a.data.objectScale===b.data.objectScale&&a.data.reduceFlashes===b.data.reduceFlashes&&a.data.studio===b.data.studio&&a.data.onModelReady===b.data.onModelReady);

function shotData(data:SceneData,shot:AerialShot):SceneData {
 return {...data,aerialConcurrent:true,elapsed:shot.elapsed,session:{...data.session,kind:'aerial',phase:'burning',run:shot.id,flight:shot.flight,anchor:{id:`sky-${shot.id}`,position:shot.origin,normal:[0,1,0]}}};
}
type TrackedSurface=Surface&{available:boolean};
export function ARScene(props:SceneProps) {
 const data=props.sceneNavigator.viroAppProps;
 const current=useRef(data);current.current=data;
 const known=useRef(new Map<string,TrackedSurface>());
 const nativeScene=useRef<ViroARScene|null>(null);
 const handledTap=useRef<number|undefined>(undefined);
 useEffect(()=>{
  const tap=data.groundTap;if(!tap||handledTap.current===tap.id)return;
  handledTap.current=tap.id;
  let cancelled=false;
  const valid=()=>{const s=current.current.session;return !cancelled&&s.run===tap.run&&s.tracking&&!s.anchor&&s.kind!=='aerial';};
  if(!valid())return;
  void (async()=>{
   let hits:unknown=[];
   let deadline:ReturnType<typeof setTimeout>|undefined;
   try{hits=await Promise.race([nativeScene.current?.performARHitTestWithPoint(tap.x,tap.y)??Promise.resolve([]),new Promise<unknown[]>(resolve=>{deadline=setTimeout(()=>resolve([]),450);})]);}
   catch{/* Assisted placement also works when the SDK has no hit result. */}
   finally{if(deadline!==undefined)clearTimeout(deadline);}
   if(!valid())return;
   const latest=current.current;
   const result=groundPlacement(hits,tap.near,tap.far,[...known.current.values()],latest.assistedPlacement??false,latest.placementHeight??1.2);
   if(result)latest.dispatch({type:'place',anchor:{id:result.surfaceId??`tap-${tap.id}`,position:result.position,normal:[0,1,0],estimated:result.estimated}});
   else latest.onPlacementMiss?.();
  })();
  return ()=>{cancelled=true;};
 },[data.groundTap,data.session.run,data.session.tracking]);
 const [surfaces,setSurfaces]=useState<TrackedSurface[]>([]);
 const [light,setLight]=useState(650);const pendingLight=useRef(650);
 const publishTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const lastDistance=useRef(0);
 const publish=()=>{
  if(publishTimer.current!==null){clearTimeout(publishTimer.current);publishTimer.current=null;}
  setSurfaces([...known.current.values()]);
  setLight(previous=>Math.abs(previous-pendingLight.current)>=40?pendingLight.current:previous);
 };
 const queuePublish=()=>{
  if(publishTimer.current===null)publishTimer.current=setTimeout(publish,100);
 };
 useEffect(()=>()=>{
  if(publishTimer.current!==null)clearTimeout(publishTimer.current);
 },[]);
 const availableCount=surfaces.filter(p=>p.available).length;
 useEffect(()=>{data.onSurfacesChanged?.(availableCount);},[availableCount,data.onSurfacesChanged]);
 const recoveringCount=surfaces.length-availableCount;
 useEffect(()=>{data.onSurfaceRecovery?.(recoveringCount);},[recoveringCount,data.onSurfaceRecovery]);
 const upsert=(anchor:unknown)=>{
  const next=horizontalSurface(anchor);if(!next)return;
  const previous=known.current.get(next.anchorId);
  // Preserve already observed bounds through short-lived extent shrinkage.
  const plane=previous?{...next,width:Math.max(previous.width,next.width),height:Math.max(previous.height,next.height)}:next;
  const selected=current.current.session.anchor;
  if(selected&&(selected.id===plane.anchorId||selected.available===false&&pointOnSurface(plane,selected.position))){
   current.current.dispatch({type:'surface',id:selected.id,replacementId:plane.anchorId,available:true});
  }
  if(previous?.available&&sameSurface(previous,plane))return;
  known.current.set(plane.anchorId,{...plane,available:true});
  // Bound preview work even if the native tracker creates many small patches.
  while(known.current.size>8){
   const oldest=[...known.current.keys()].find(id=>id!==current.current.session.anchor?.id&&id!==plane.anchorId);
   if(!oldest)break;
   known.current.delete(oldest);
  }
  if(!previous||!previous.available)publish();else queuePublish();
 };
 const remove=(id:string)=>{
  const previous=known.current.get(id);if(!previous?.available)return;
  known.current.set(id,{...previous,available:false});
  const selected=current.current.session.anchor;
  // ARCore can announce the merged plane before retiring its predecessor.
  // Reassociate in one event so an ongoing burn is not interrupted.
  const replacement=selected?.id===id?[...known.current.values()].find(plane=>plane.available&&pointOnSurface(plane,selected.position)):undefined;
  current.current.dispatch({type:'surface',id,replacementId:replacement?.anchorId,available:!!replacement});
  // Keep the last observed horizontal patch for this AR session. Its Viro
  // scene-root node has its own native anchor; retiring the detection plane
  // does not invalidate that patch. Camera tracking still gates every tap.
  publish();
 };
 const select=(displayed:Surface,world:Vec3,run:number)=>{
  const latest=current.current,session=latest.session;
  if(!known.current.has(displayed.anchorId)||!session.tracking||session.anchor||session.run!==run)return;
  // Viro already hit-tested the visible quad, including native anchor pose
  // corrections. Rechecking old plane bounds can reject that valid hit.
  if(!Array.isArray(world)||world.length!==3||!world.every(Number.isFinite))return;
  latest.dispatch({type:'place',anchor:{id:displayed.anchorId,position:[...world],normal:[0,1,0],...(known.current.get(displayed.anchorId)?.available?{}:{available:false})}});
 };
 return <ViroARScene ref={nativeScene} anchorDetectionTypes={['PlanesHorizontal']}
   onTrackingUpdated={(state,reason)=>{
    const latest=current.current;if(latest.diagnostics){latest.diagnostics.state=state;latest.diagnostics.reason=reason;}
    latest.dispatch({type:'tracking',normal:state===ViroTrackingStateConstants.TRACKING_NORMAL});
   }}
   onAnchorFound={anchor=>{if(current.current.diagnostics)current.current.diagnostics.found++;upsert(anchor);}}
   onAnchorUpdated={anchor=>{if(current.current.diagnostics)current.current.diagnostics.updated++;upsert(anchor);}}
   onAnchorRemoved={anchor=>{if(current.current.diagnostics)current.current.diagnostics.removed++;if(anchor?.anchorId)remove(anchor.anchorId);}}
   onAmbientLightUpdate={info=>{if(Number.isFinite(info.intensity)){pendingLight.current=Math.max(350,Math.min(850,info.intensity*.65));queuePublish();}}}
   onCameraTransformUpdate={data.session.anchor?camera=>{
    if(Date.now()-lastDistance.current>300){lastDistance.current=Date.now();const p=camera.position,a=current.current.session.anchor;
     if(a)current.current.onDistance(Math.hypot(p[0]-a.position[0],p[1]-a.position[1],p[2]-a.position[2]));}
   }:undefined}>
  <ViroAmbientLight color="#fff7e9" intensity={light}/>
  {data.dimBackground&&(data.session.phase==='burning'||!!data.aerialShots?.length)?<ViroSphere radius={8} widthSegmentCount={12} heightSegmentCount={8} facesOutward={false} materials={['night']} opacity={.58} renderingOrder={-100} ignoreEventHandling/>:null}
  {!data.session.anchor&&data.session.kind!=='aerial'?surfaces.map(plane=><ViroNode key={plane.anchorId} position={plane.position} rotation={plane.rotation} scale={plane.scale}>
   <ViroQuad position={plane.center} rotation={[-90,0,0]} width={plane.width} height={plane.height} materials={['plane']} opacity={plane.available?1:.75}
    onClick={(world:Vec3)=>select(plane,world,data.session.run)}/>
  </ViroNode>):null}
  {data.session.anchor?<GroundedObject data={data} position={data.session.anchor.position}/>:null}
  {data.session.kind==='aerial'?data.aerialShots?.map(shot=><GroundedObject key={shot.id} data={shotData(data,shot)} position={shot.origin}/>):null}
 </ViroARScene>;
}
export function StudioScene(props:SceneProps) {
 const data=props.sceneNavigator.viroAppProps;
 const camera=cameraPose(data.studioView);
 return <ViroScene><ViroCamera active position={camera.position} rotation={camera.rotation} fieldOfView={50}/>
  <ViroAmbientLight color="#d7dfed" intensity={40}/>
  <ViroQuad rotation={[-90,0,0]} width={20} height={20} materials={['floor']}/>
  {data.session.anchor?<GroundedObject data={data} position={[0,0,0]}/>:null}
  {data.session.kind==='aerial'?data.aerialShots?.map(shot=><GroundedObject key={shot.id} data={shotData(data,shot)} position={shot.origin}/>):null}
 </ViroScene>;
}
