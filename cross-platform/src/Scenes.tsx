import React,{useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import {ViroARScene,ViroARPlane,ViroScene,ViroCamera,ViroNode,ViroQuad,Viro3DObject,ViroAmbientLight,ViroSpotLight,ViroOmniLight,ViroParticleEmitter,ViroBox,ViroMaterials,ViroAnimations} from '@reactvision/react-viro';
import {cameraPose,type StudioView} from './studio-camera';
import {localPoint,sampleBurn,horizontalAlignment,sparkVelocity,type Session,type Vec3,type Event} from './core';
import {timing} from './catalog';
import {MODELS} from './models';

const PAPER=require('../assets/models/paper.png');
const NORMAL=require('../assets/models/paper-normal.png');
const colors:Record<string,string>={red:'#aa2f22',gold:'#c69235',green:'#285344',rope:'#938471',blue:'#28485b',pink:'#bc4f55',paper:'#a68a5e',metal:'#989c9c',coating:'#55574f'};
ViroMaterials.createMaterials(Object.fromEntries(Object.entries(colors).map(([name,color])=>[name,{lightingModel:'PBR',diffuseColor:color,diffuseTexture:PAPER,normalTexture:NORMAL,roughness:name==='metal'?.36:.88,metalness:name==='metal'?.82:0}])));
ViroMaterials.createMaterials({
 char:{lightingModel:'PBR',diffuseTexture:require('../assets/models/char.png'),roughness:1},
 floor:{lightingModel:'PBR',diffuseColor:'#3a3935',diffuseTexture:PAPER,roughness:1},
 plane:{lightingModel:'Constant',diffuseColor:'#ffce7955',blendMode:'Alpha',writesToDepthBuffer:false},
 shadow:{lightingModel:'Constant',diffuseTexture:require('../assets/models/contact.png'),blendMode:'Alpha',writesToDepthBuffer:false},
});
ViroAnimations.registerAnimations({spin:{properties:{rotateY:'+=360'},duration:175,easing:'Linear'}});
export type SceneData={session:Session;elapsed:number;reduceFlashes:boolean;studio:boolean;studioView:StudioView;dispatch:(e:Event)=>void;onDistance:(v:number)=>void;onModelReady:(id:string,ready:boolean)=>void};
type SceneProps={sceneNavigator:{viroAppProps:SceneData}};
const SPARK={source:require('../assets/models/spark.png'),height:.012,width:.006,bloomThreshold:.3};
const SMOKE={source:require('../assets/models/smoke.png'),height:.1,width:.1,bloomThreshold:-1};

function Combustion({data}:{data:SceneData}) {
 const {session,elapsed,reduceFlashes}=data;const spec=timing(session.kind);const burning=session.phase==='burning';
 const t=session.phase==='spent'?spec.duration:elapsed;
 const b=sampleBurn(session.kind,t,spec);const active=burning && b.emitting;const k=session.kind;
 const fuse=burning && t<spec.main;
 const sparkPosition:Vec3=fuse?(k==='anar'?[.005,.158,0]:k==='sutli'?[.012,.09,0]:k==='phuljhadi'?[0,.006,-.13]:k==='ladi'?[0,.005,-.16]:[.043,.01,0]):b.emitter;
 const velocity:number[][]=fuse?[[-.05,.03,-.05],[.05,.15,.05]]:sparkVelocity(k,t,spec);
 const explosive=(k==='sutli'||k==='sky') && t>=spec.peak;
 const ladiBurst=k==='ladi'&&b.consumed>0;
 // Viro 2.52's declaration says one object; its native API takes an array.
 const spawn={particleLifetime:fuse?[120,240]:[160,700],emissionRatePerSecond:explosive||ladiBurst?[0,0]:fuse?[25,40]:[120,190],emissionBurst:explosive||ladiBurst?[{time:0,min:ladiBurst?35:100,max:ladiBurst?50:140,cycles:1}]:[],maxParticles:reduceFlashes?100:350,spawnVolume:{shape:'sphere',params:[.002],spawnOnSurface:false}} as unknown as React.ComponentProps<typeof ViroParticleEmitter>['spawnBehavior'];
 const smokeRun=burning && t>=spec.main;
 // Native particle pool; particles retain their own world birth position.
 return <ViroNode>
  <ViroNode animation={k==='chakri'?{name:'spin',run:active,loop:true}:undefined}>
   {MODELS[k].map((part,i)=>{
    const used=k==='ladi'&&part.role==='charge'?i<b.consumed:t>=spec.main&&b.progress>=part.burn;
    const visible=part.role==='fuse'?t<spec.main:k==='sutli'?b.bodyVisible:true;
    const collapse=k==='anar'&&b.progress>.9?1-(b.progress-.9)*3.5:1;
    return <Viro3DObject key={`${k}-${i}`} source={part.source} type="OBJ" materials={[used?'char':part.material]} visible={visible}
      scale={[1,part.role==='charge'&&used&&k==='ladi'?.18:collapse,1]} onLoadEnd={()=>data.onModelReady(`${k}-${i}`,true)} onError={()=>data.onModelReady(`${k}-${i}`,false)}/>;
   })}
  </ViroNode>
  {k==='sutli'&&!b.bodyVisible?Array.from({length:12},(_,i)=><ViroBox key={i} position={[Math.cos(i*2.4)*(.03+i*.004),.002,Math.sin(i*2.4)*(.03+i*.004)]} rotation={[0,i*47,8]} width={.012} height={.003} length={.008} materials={['char']}/>):null}
  <ViroParticleEmitter key={`sparks-${session.run}-${explosive}-${k==='ladi'?b.consumed:0}`} position={sparkPosition} image={SPARK} run={fuse||active} loop={!explosive&&!ladiBurst} duration={explosive||ladiBurst?80:400}
   fixedToEmitter={false} blendMode="Add" spawnBehavior={spawn}
   particleAppearance={{color:{initialRange:['#fff0c0','#ffad37'],interpolation:[{interval:[100,450],endValue:'#d74513'}]},opacity:{initialRange:[.8,1],interpolation:[{interval:[150,700],endValue:0}]},scale:{initialRange:[[.4,.4,.4],[1,1,1]],interpolation:[{interval:[150,700],endValue:[0,0,0]}]}}}
   particlePhysics={{velocity:{initialRange:velocity},acceleration:{initialRange:[[.02,-3.5,.02],[.08,-2.8,.06]]}}}/>
  <ViroParticleEmitter key={`smoke-${session.run}`} position={b.emitter} image={SMOKE} run={smokeRun} loop duration={1500} fixedToEmitter={false} blendMode="Alpha"
   spawnBehavior={{particleLifetime:[1200,2200],emissionRatePerSecond:[7,12],maxParticles:32}}
   particleAppearance={{opacity:{initialRange:[.06,.12],interpolation:[{interval:[200,1800],endValue:0}]},scale:{initialRange:[[.2,.2,.2],[.4,.4,.4]],interpolation:[{interval:[0,1800],endValue:[2,2,2]}]},rotation:{initialRange:[0,360]}}}
   particlePhysics={{velocity:{initialRange:[[-.015,.05,-.015],[.03,.14,.03]]},acceleration:{initialRange:[[.015,.02,0],[.025,.04,.01]]}}}/>
  {active&&!reduceFlashes?<ViroOmniLight position={b.emitter} color="#ffbc62" intensity={16+Math.sin(t*28)*3.5} attenuationStartDistance={.05} attenuationEndDistance={1}/>:null}
 </ViroNode>;
}
function GroundedObject({data,position}:{data:SceneData;position:Vec3}) {
 return <ViroNode position={position}>
  <ViroSpotLight position={[.5,1,.3]} direction={[-.5,-1,-.3]} intensity={50} color="#fff4df" castsShadow shadowMapSize={1024} shadowOpacity={.38} shadowNearZ={.1} shadowFarZ={3} innerAngle={10} outerAngle={75}/>
  <ViroQuad position={[0,.0005,0]} rotation={[-90,0,0]} width={1.5} height={1.5} arShadowReceiver={!data.studio} materials={data.studio?['floor']:undefined} ignoreEventHandling/>
  <ViroQuad position={[0,.001,0]} rotation={[-90,0,0]} width={data.session.kind==='ladi'?.15:.13} height={data.session.kind==='ladi'?.36:.13} materials={['shadow']} ignoreEventHandling/>
  <Combustion data={data}/>
 </ViroNode>;
}
export function ARScene(props:SceneProps) {
 const data=props.sceneNavigator.viroAppProps;
 const [plane,setPlane]=useState<any>(null);const [point,setPoint]=useState<Vec3>([0,0,0]);const light=useRef(45);const lastDistance=useRef(0);
 return <ViroARScene anchorDetectionTypes={['PlanesHorizontal']} onTrackingUpdated={state=>data.dispatch({type:'tracking',normal:state===3})}
   onAmbientLightUpdate={info=>{light.current=Math.max(15,Math.min(85,info.intensity*.1));}}
   onCameraTransformUpdate={camera=>{if(data.session.anchor && Date.now()-lastDistance.current>300){lastDistance.current=Date.now();const p=camera.position,a=data.session.anchor.position;data.onDistance(Math.hypot(p[0]-a[0],p[1]-a[1],p[2]-a[2]));}}}>
  <ViroAmbientLight color="#fff7e9" intensity={light.current}/>
  <ViroARPlane alignment={horizontalAlignment(Platform.OS)} minHeight={.4} minWidth={.4}
    onAnchorFound={a=>setPlane(a)} onAnchorUpdated={a=>setPlane(a)}
    onAnchorRemoved={()=>{setPlane(null);data.dispatch({type:'tracking',normal:false});data.dispatch({type:'clear'});}}>
   {plane&&!data.session.anchor?<ViroQuad position={plane.center??[0,0,0]} rotation={[-90,0,0]} width={plane.width??.5} height={plane.height??.5} materials={['plane']}
    onClick={(world:Vec3)=>{
     if(!data.session.tracking)return;
     const rotation=(plane.rotation??[0,0,0])[1]*Math.PI/180;
     const local=localPoint(world,plane.position??[0,0,0],[0,Math.sin(rotation/2),0,Math.cos(rotation/2)]);local[1]=0;
     setPoint(local);data.dispatch({type:'place',anchor:{id:plane.anchorId??'horizontal-plane',position:world,normal:[0,1,0]}});
    }}/>:null}
   {data.session.anchor?<GroundedObject data={data} position={point}/>:null}
  </ViroARPlane>
 </ViroARScene>;
}
export function StudioScene(props:SceneProps) {
 const data=props.sceneNavigator.viroAppProps;
 const camera=cameraPose(data.studioView);
 return <ViroScene><ViroCamera active position={camera.position} rotation={camera.rotation} fieldOfView={50}/>
  <ViroAmbientLight color="#d7dfed" intensity={40}/>
  <ViroQuad rotation={[-90,0,0]} width={20} height={20} materials={['floor']}/>
  {data.session.anchor?<GroundedObject data={data} position={[0,0,0]}/>:null}
 </ViroScene>;
}
