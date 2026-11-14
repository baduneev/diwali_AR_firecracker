import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {initialSession,reduceSession,type Event} from '../src/core';

// Only the native host boundary is replaced; React hooks and all app logic run.
const require=createRequire(import.meta.url);
const nativeModule=Module as unknown as {_load:(...args:any[])=>any};
const originalLoad=nativeModule._load;
let meshSubmissions=0;
let highlightSubmissions=0;
let nativeHitQuery:(x:number,y:number)=>Promise<unknown[]>=async()=>[];
const NativeARScene=React.forwardRef(function NativeARScene(props:any,ref:any){
 React.useImperativeHandle(ref,()=>({performARHitTestWithPoint:(x:number,y:number)=>nativeHitQuery(x,y)}),[]);
 return React.createElement('ViroARScene',props);
});
function NativeMesh(props:Record<string,unknown>){meshSubmissions++;return React.createElement('Viro3DObject',props);}
function NativeQuad(props:any){if(props.materials?.includes('plane'))highlightSubmissions++;return React.createElement('ViroQuad',props);}
nativeModule._load=function(name:string,...args:any[]){
 if(name==='react-native')return {Platform:{OS:'android'}};
 if(name==='@reactvision/react-viro')return new Proxy({
  ViroMaterials:{createMaterials:()=>{}},ViroAnimations:{registerAnimations:()=>{}},
  ViroTrackingStateConstants:{TRACKING_NORMAL:3},
  Viro3DObject:NativeMesh,
  ViroQuad:NativeQuad,
  ViroARScene:NativeARScene,
 },{get:(target,key)=>Reflect.get(target,key)??String(key)});
 return originalLoad.call(this,name,...args);
};
for(const extension of ['.png','.obj','.wav'])require.extensions[extension]=(module,file)=>{module.exports=file;};
const {ARScene}=require('../src/Scenes') as typeof import('../src/Scenes');
nativeModule._load=originalLoad;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;

for(const [kind,end] of [['anar',19.744],['chakri',13]] as const){
 test(`${kind} builds to a stronger middle then loses height and emission before burnout`,()=>{
  const app=mount();try{
   app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
   app.dispatch({type:'select',kind});app.dispatch({type:'ignite'});
   const sample=(t:number)=>{
    app.advance(t);
    const sparks=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run&&n.props.blendMode==='Add');
    return {rate:sparks.reduce((sum,n)=>sum+n.props.spawnBehavior.emissionRatePerSecond[1],0),speed:Math.max(...sparks.map(n=>Math.hypot(...n.props.particlePhysics.velocity.initialRange[1])))};
   };
   const start=sample(1.2),middle=sample((1+end)/2),tail=sample(end-.3);
   assert.ok(middle.rate>start.rate*2,'A fuse must not jump straight to full output');
   assert.ok(middle.speed>start.speed*1.5,'The middle must throw sparks farther/higher');
   assert.ok(tail.rate<middle.rate*.4,'Emission must fade before the recording ends');
   assert.ok(tail.speed<middle.speed*.6,'The last sparks must lose energy');
  }finally{app.close();}
 });
}

test('Sutli keeps its fuse until the recorded bang and only flashes briefly at detonation',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
  app.dispatch({type:'select',kind:'sutli'});app.dispatch({type:'ignite'});
  const flash=()=>app.renderer().root.findAllByType('ViroSphere' as any).filter(n=>n.props.materials?.includes('blastFlash'));
  app.advance(1.04);assert.equal(flash().length,0);
  const before=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run&&n.props.blendMode==='Add');
  assert.ok(before.every(n=>!n.props.spawnBehavior.emissionBurst?.length),'Only the fuse emits before the bang');
  app.advance(1.10);assert.equal(flash().length,1);
  app.advance(1.35);assert.equal(flash().length,0);
  const sparks=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run&&n.props.blendMode==='Add');
  assert.ok(sparks.every(n=>n.props.loop===false&&n.props.spawnBehavior.emissionRatePerSecond.every((v:number)=>v===0)),'The bang must not leave a continuous fountain');
 }finally{app.close();}
});

test('reduced flashes removes the Sutli flash and light but retains a bounded blast and smoke',()=>{
 const app=mount({reduceFlashes:true});try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
  app.dispatch({type:'select',kind:'sutli'});app.dispatch({type:'ignite'});app.advance(1.10);
  assert.equal(app.renderer().root.findAllByType('ViroSphere' as any).filter(n=>n.props.materials?.includes('blastFlash')).length,0);
  assert.equal(app.renderer().root.findAllByType('ViroOmniLight' as any).length,0);
  const emitters=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run);
  assert.ok(emitters.some(n=>n.props.blendMode==='Alpha'));
  assert.ok(emitters.every(n=>n.props.spawnBehavior.maxParticles<=100));
 }finally{app.close();}
});

test('low-power ground sparks expire before falling through the detected surface',()=>{
 for(const kind of ['anar','chakri','phuljhadi'] as const){
  const app=mount();try{
   app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
   app.dispatch({type:'select',kind});app.dispatch({type:'ignite'});
   for(const t of [1.2,3,7,12.7]){
    app.advance(t);
    for(const n of app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run&&n.props.blendMode==='Add'&&n.props.particlePhysics.acceleration)){
     const p=n.props,seconds=p.spawnBehavior.particleLifetime[1]/1000;
     const minHeight=p.position[1]+p.particlePhysics.velocity.initialRange[0][1]*seconds+.5*p.particlePhysics.acceleration.initialRange[0][1]*seconds*seconds;
     assert.ok(minHeight>=-.005,`${kind} must not leave visible sparks below the floor at ${t}s`);
    }
   }
  }finally{app.close();}
 }
});

test('background dimming only runs during combustion and restores after clear',()=>{
 const app=mount({dimBackground:true});try{
  const dim=()=>app.renderer().root.findAllByType('ViroSphere' as any).filter(n=>n.props.materials?.includes('night'));
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
  assert.equal(dim().length,0);app.dispatch({type:'ignite'});assert.equal(dim().length,1);
  assert.equal(dim()[0]!.props.ignoreEventHandling,true);
  app.dispatch({type:'clear'});assert.equal(dim().length,0);
 }finally{app.close();}
});

test('larger models retain the same ground contact point and the fuse starts at the enlarged cone tip',()=>{
 const app=mount({objectScale:2.5});try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);app.dispatch({type:'ignite'});
  const mesh=app.renderer().root.findAllByType('Viro3DObject' as any)[0]!;
  let parent=mesh.parent;while(parent&&parent.type!==('ViroNode' as any))parent=parent.parent;
  assert.deepEqual(parent!.props.scale,[2.5,2.5,2.5]);
  const spark=app.renderer().root.findAllByType('ViroParticleEmitter' as any).find(n=>n.props.image?.width===.006)!;
  assert.equal(spark.props.position[1],.395);
 }finally{app.close();}
});

test('an aerial shot hides floor targets and emits its burst at its world target without a model',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.dispatch({type:'select',kind:'aerial'});
  assert.equal(app.targets().length,0);
  app.dispatch({type:'launch',run:app.session.run,origin:[0,1,0],target:[2,5,-6]});app.advance(4.6);
  assert.equal(app.renderer().root.findAllByType('Viro3DObject' as any).length,0);
  const particles=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run);
  assert.ok(particles.some(n=>JSON.stringify(n.props.position)==='[2,4,-6]'));
  assert.ok(particles.some(n=>n.props.spawnBehavior.particleLifetime[1]>=1400));
 }finally{app.close();}
});

test('reduced flashes caps the denser fountain and disables its flame core and dynamic light',()=>{
 const app=mount({reduceFlashes:true});try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);app.dispatch({type:'ignite'});app.advance(3);
  const emitters=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run);
  assert.ok(emitters.every(n=>n.props.spawnBehavior.maxParticles<=100));
  assert.equal(app.renderer().root.findAllByType('ViroOmniLight' as any).length,0);
 }finally{app.close();}
});

test('coloured sky streams share a bounded particle budget instead of multiplying the workload',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.dispatch({type:'select',kind:'aerial'});
  app.dispatch({type:'launch',run:app.session.run,origin:[0,1,0],target:[0,5,-7]});app.advance(4.6);
  const emitters=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run);
  const hues=new Set(emitters.map(n=>n.props.image.source));
  assert.ok(hues.size>=3,'Use distinct coloured textures so additive blending retains different hues');
  assert.ok(emitters.reduce((n,e)=>n+e.props.spawnBehavior.maxParticles,0)<=750);
 }finally{app.close();}
});

test('Anar uses predominantly golden sparks while Chakri has a dense bright jet',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);app.dispatch({type:'ignite'});app.advance(8);
  const sparks=()=>app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run&&n.props.blendMode==='Add');
  assert.ok(sparks().every(n=>!String(n.props.image.source).match(/spark-(red|green|blue)/)),'Anar is a gold fountain, not simultaneous RGB streams');
  app.dispatch({type:'complete',run:app.session.run});app.dispatch({type:'select',kind:'chakri'});app.dispatch({type:'ignite'});app.advance(7);
  assert.ok(sparks().reduce((n,e)=>n+e.props.spawnBehavior.emissionRatePerSecond[1],0)>=650,'The spinner needs a visibly dense jet at full power');
 }finally{app.close();}
});

test('several sky taps render independent bursts without a floor and with bounded total particles',()=>{
 const app=mount({aerialShots:Array.from({length:4},(_,i)=>({id:i,origin:[i,1,0],flight:[0,4,-7],elapsed:4.6}))});try{
  app.send('onTrackingUpdated',3);app.dispatch({type:'select',kind:'aerial'});
  const emitters=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run);
  const bursts=emitters.filter(n=>n.props.spawnBehavior.emissionBurst?.length&&n.props.blendMode==='Add');
  assert.equal(bursts.length,16,'Each of four targets needs its own four coloured streams');
  assert.ok(emitters.reduce((n,e)=>n+e.props.spawnBehavior.maxParticles,0)<=1150);
  assert.equal(app.targets().length,0);
 }finally{app.close();}
});

test('sky burst streams send distinct saturated colour modifiers instead of one white modifier',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.dispatch({type:'select',kind:'aerial'});
  app.dispatch({type:'launch',run:app.session.run,origin:[0,0,0],target:[0,4,-7]});app.advance(4.6);
  const streams=app.renderer().root.findAllByType('ViroParticleEmitter' as any).filter(n=>n.props.run&&n.props.spawnBehavior.emissionBurst?.length);
  const colours=new Set(streams.map(n=>n.props.particleAppearance.color.initialRange[0]));
  assert.ok(colours.size>=3,'The native shader needs distinct colour modifiers as well as coloured texture sources');
  assert.ok(!colours.has('#ffffff'));
 }finally{app.close();}
});

const plane=(id='floor',extra:Record<string,unknown>={})=>({anchorId:id,type:'plane',position:[1,0,-2],rotation:[0,0,0],scale:[1,1,1],center:[0,0,0],width:.24,height:.3,alignment:'HorizontalUpward',...extra});
test('a screen tap places on a native horizontal estimate without waiting for plane callbacks',async()=>{
 const options:any={assistedPlacement:true};const app=mount(options);
 nativeHitQuery=async(x,y)=>{assert.equal(x,540);assert.equal(y,900);return [{type:'EstimatedHorizontalPlane',transform:{position:[0,0,-1.2],rotation:[0,0,0],scale:[1,1,1]}}];};
 try{
  app.send('onTrackingUpdated',3);
  options.groundTap={id:1,run:app.session.run,x:540,y:900,near:[0,1.2,0],far:[0,0,-1.2]};
  await act(async()=>app.refresh());app.refresh();
  assert.equal(app.session.phase,'placed');assert.deepEqual(app.session.anchor?.position,[0,0,-1.2]);
  assert.equal(app.session.anchor?.estimated,true);assert.equal(app.surfaces.at(-1),0);
 }finally{app.close();nativeHitQuery=async()=>[];}
});
test('Clear invalidates an unfinished placement query instead of resurrecting an old object',async()=>{
 let finish!:(r:unknown[])=>void;let calls=0;
 nativeHitQuery=()=>{calls++;return new Promise(resolve=>finish=resolve);};
 const options:any={assistedPlacement:true};const app=mount(options);
 try{
  app.send('onTrackingUpdated',3);
  options.groundTap={id:1,run:app.session.run,x:540,y:900,near:[0,1.2,0],far:[0,0,-1.2]};
  app.refresh();assert.equal(calls,1);app.dispatch({type:'clear'});
  await act(async()=>finish([]));app.refresh();assert.equal(app.session.anchor,null);
 }finally{app.close();nativeHitQuery=async()=>[];}
});
test('a failed native query can use assisted height but never place while tracking is lost',async()=>{
 nativeHitQuery=async()=>{throw Error('Native hit unavailable');};
 const options:any={assistedPlacement:true,placementHeight:.6};const app=mount(options);
 try{
  app.send('onTrackingUpdated',3);
  options.groundTap={id:1,run:app.session.run,x:540,y:900,near:[0,1.2,0],far:[0,0,-1.2]};
  await act(async()=>app.refresh());app.refresh();
  assert.deepEqual(app.session.anchor?.position,[0,.6,-.6]);
  app.dispatch({type:'clear'});app.send('onTrackingUpdated',2);
  options.groundTap={...options.groundTap,id:2,run:app.session.run};
  await act(async()=>app.refresh());app.refresh();assert.equal(app.session.anchor,null);
 }finally{app.close();nativeHitQuery=async()=>[];}
});
test('an unanswered native query does not leave assisted placement waiting indefinitely',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 nativeHitQuery=()=>new Promise(()=>{});
 const options:any={assistedPlacement:true};const app=mount(options);
 try{
  app.send('onTrackingUpdated',3);
  options.groundTap={id:1,run:app.session.run,x:540,y:900,near:[0,1.2,0],far:[0,0,-1.2]};app.refresh();
  await act(async()=>t.mock.timers.tick(600));app.refresh();
  assert.equal(app.session.phase,'placed');assert.equal(app.session.anchor?.estimated,true);
 }finally{app.close();nativeHitQuery=async()=>[];}
});
test('tracking loss invalidates a pending tap even if tracking returns before its native result',async()=>{
 let finish!:(r:unknown[])=>void;let calls=0;
 nativeHitQuery=()=>{calls++;return new Promise(resolve=>finish=resolve);};
 const options:any={assistedPlacement:true};const app=mount(options);
 try{
  app.send('onTrackingUpdated',3);
  options.groundTap={id:1,run:app.session.run,x:540,y:900,near:[0,1.2,0],far:[0,0,-1.2]};app.refresh();
  app.send('onTrackingUpdated',2);app.send('onTrackingUpdated',3);
  await act(async()=>finish([]));app.refresh();
  assert.equal(app.session.anchor,null);assert.equal(calls,1);
 }finally{app.close();nativeHitQuery=async()=>[];}
});
function mount(options:Record<string,unknown>={}){
 let session=initialSession();
 let elapsed=0;
 const events:Event[]=[];const surfaces:number[]=[];
 const onModelReady=()=>{};
 let renderer:ReactTestRenderer;
 const render=()=>renderer.update(React.createElement(ARScene,{sceneNavigator:{viroAppProps:{session,elapsed,reduceFlashes:false,studio:false,studioView:{azimuth:0,elevation:0,distance:1},dispatch:(e:Event)=>{events.push(e);session=reduceSession(session,e);},onDistance:()=>{},onModelReady,onSurfacesChanged:(n:number)=>surfaces.push(n),...options}}} as any));
 act(()=>{renderer=create(React.createElement('initial'));render();});
 const scene=()=>renderer.root.findByType('ViroARScene' as any);
 const send=(name:string,value:any)=>act(()=>{
  const callback=scene().props[name];assert.equal(typeof callback,'function',`AR scene must handle ${name}`);callback(value);render();
 });
 const refresh=()=>act(render);
 const emit=(name:string,value:any)=>act(()=>scene().props[name](value));
 const targets=()=>renderer.root.findAllByType('ViroQuad' as any).filter(node=>typeof node.props.onClick==='function');
 const highlights=()=>renderer.root.findAllByType('ViroQuad' as any).filter(node=>node.props.materials?.includes('plane'));
 const tap=(index:number,point:number[])=>act(()=>{targets()[index]!.props.onClick(point);render();});
 const dispatch=(event:Event)=>act(()=>{session=reduceSession(session,event);render();});
 const advance=(time:number)=>act(()=>{elapsed=time;render();});
 return {scene,send,emit,refresh,targets,highlights,tap,events,surfaces,dispatch,advance,get session(){return session;},renderer:()=>renderer,close:()=>act(()=>renderer.unmount())};
}
test('normal native tracking enables the placement gate',()=>{
 const app=mount();try{app.send('onTrackingUpdated',3);assert.equal(app.session.tracking,true);}finally{app.close();}
});
test('a newly detected small floor is selectable without waiting for a 40 cm extent',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());
  assert.equal(app.targets().length,1);assert.equal(app.surfaces.at(-1),1);
  app.tap(0,[1.05,0,-2.04]);assert.equal(app.session.phase,'placed');assert.equal(app.session.anchor?.id,'floor');
 }finally{app.close();}
});
test('multiple detected surfaces remain selectable and a wall or ceiling is excluded',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);
  app.send('onAnchorFound',plane('table'));app.send('onAnchorFound',plane('floor',{position:[2,-.7,-3]}));
  app.send('onAnchorFound',plane('wall',{alignment:'Vertical'}));
  app.send('onAnchorFound',plane('ceiling',{alignment:'HorizontalDownward'}));
  assert.equal(app.targets().length,2);
  app.tap(1,[2,-.7,-3]);assert.equal(app.session.anchor?.id,'floor');assert.equal(app.targets().length,0);
 }finally{app.close();}
});
test('a rotated plane produces the same grounded world placement point',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('floor',{rotation:[180,0,180],width:1,height:1}));
  app.tap(0,[1.1,0,-1.8]);
  const grounded=app.renderer().root.findAll(node=>typeof node.type==='function'&&node.type.name==='GroundedObject')[0]!;
  assert.ok(Math.abs(grounded.props.position[0]-1.1)<1e-6);assert.ok(Math.abs(grounded.props.position[2]+1.8)<1e-6);
 }finally{app.close();}
});
test('removing an unrelated plane preserves placement and normal camera tracking',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('floor'));app.send('onAnchorFound',plane('other'));
  app.tap(0,[1,0,-2]);app.send('onAnchorRemoved',plane('other'));
  assert.equal(app.session.anchor?.id,'floor');assert.equal(app.session.tracking,true);
  app.send('onAnchorRemoved',plane('floor'));
  assert.equal(app.session.anchor?.id,'floor');assert.equal(app.session.anchor?.available,false);assert.equal(app.session.tracking,true);
 }finally{app.close();}
});
test('tracking loss blocks taps and Clear invalidates an earlier surface callback',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());
  const oldTap=app.targets()[0]!.props.onClick;
  app.send('onTrackingUpdated',2);act(()=>oldTap([1,0,-2]));app.refresh();assert.equal(app.session.anchor,null);
  app.send('onTrackingUpdated',3);app.dispatch({type:'clear'});
  act(()=>oldTap([1,0,-2]));app.refresh();assert.equal(app.session.anchor,null);
 }finally{app.close();}
});
test('plane refinement preserves the placed world location even if its bounds shrink',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('floor',{width:1,height:1}));app.tap(0,[1.1,0,-1.8]);
  // Equivalent 180-degree floor orientation and a revised plane origin/extent.
  app.send('onAnchorUpdated',plane('floor',{position:[1.4,0,-2],rotation:[180,0,180],width:.1,height:.1}));
  const grounded=app.renderer().root.findAll(node=>typeof node.type==='function'&&node.type.name==='GroundedObject')[0]!;
  assert.ok(Math.abs(grounded.props.position[0]-1.1)<1e-6);assert.ok(Math.abs(grounded.props.position[2]+1.8)<1e-6);
  app.dispatch({type:'clear'});assert.equal(app.targets().length,1);
 }finally{app.close();}
});
test('ARKit horizontal planes work and malformed native hit coordinates are rejected',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('ios-floor',{alignment:'Horizontal',center:[.4,0,.2],width:1,height:1}));
  app.tap(0,[NaN,0,-2]);assert.equal(app.session.anchor,null);
  app.tap(0,[1.4,0,-1.8]);assert.deepEqual(app.session.anchor,{id:'ios-floor',position:[1.4,0,-1.8],normal:[0,1,0]});
 }finally{app.close();}
});
test('native-classified horizontal tabletops are selectable while the pose estimate is still tilted',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);
  app.send('onAnchorFound',plane('table',{classification:'Table',rotation:[15,0,0]}));
  assert.equal(app.targets().length,1);
  app.tap(0,[1,0,-2]);assert.equal(app.session.anchor?.id,'table');
 }finally{app.close();}
});
test('early horizontal anchors with zero extents offer a small placement target',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('early',{width:0,height:0}));
  assert.equal(app.targets().length,1);assert.ok(app.targets()[0]!.props.width>0);
  app.tap(0,[1,0,-2]);assert.equal(app.session.anchor?.id,'early');
 }finally{app.close();}
});
test('a valid highlighted-surface tap tolerates an evolving surface boundary and height estimate',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());
  app.tap(0,[1.18,.06,-1.82]);assert.equal(app.session.phase,'placed');
 }finally{app.close();}
});
test('a tap delivered during plane refinement is validated against the surface that was displayed',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('floor',{width:1,height:1}));
  const displayedTap=app.targets()[0]!.props.onClick;
  app.send('onAnchorUpdated',plane('floor',{width:.1,height:.1}));
  act(()=>displayedTap([1.35,0,-2]));app.refresh();assert.equal(app.session.phase,'placed');
 }finally{app.close();}
});
test('plane refinements and camera UI refreshes do not resubmit unchanged OBJ meshes',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
  const before=meshSubmissions;assert.ok(before>0);
  for(let i=0;i<60;i++)app.send('onAnchorUpdated',plane('floor',{width:.24+i*.001,position:[1+i*.00001,0,-2]}));
  for(let i=0;i<20;i++)app.refresh();
  assert.equal(meshSubmissions-before,0,'Unchanged model parts must not be sent through the native mesh boundary again');
  app.dispatch({type:'select',kind:'sutli'});assert.ok(meshSubmissions>before,'Selecting a different firecracker must still load its model');
 }finally{app.close();}
});
test('mesh caching still updates combustion materials, remnants and particle playback',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
  const meshes=()=>app.renderer().root.findAllByType('Viro3DObject' as any);
  assert.equal(meshes().filter(m=>m.props.materials[0].endsWith('char')).length,0);
  app.dispatch({type:'ignite'});app.advance(3);
  assert.ok(app.renderer().root.findAllByType('ViroParticleEmitter' as any).some(p=>p.props.run));
  app.advance(100);
  assert.ok(meshes().some(m=>m.props.materials[0].endsWith('char')));
  app.dispatch({type:'complete',run:app.session.run});
  assert.ok(meshes().length>0);assert.ok(app.renderer().root.findAllByType('ViroParticleEmitter' as any).every(p=>!p.props.run));
 }finally{app.close();}
});
test('a retired plane retains a usable cached surface while camera tracking is normal',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());
  app.send('onAnchorRemoved',plane());
  assert.equal(app.highlights().length,1,'Keep the last observed surface visible during recovery');
  assert.equal(app.targets().length,1,'Retiring a plane does not invalidate its last observed horizontal patch');
  act(()=>t.mock.timers.tick(10000));assert.equal(app.highlights().length,1);
  app.tap(0,[1,0,-2]);assert.equal(app.session.phase,'placed');app.dispatch({type:'clear'});
  app.send('onAnchorFound',plane());act(()=>t.mock.timers.tick(3000));
  assert.equal(app.highlights().length,1);assert.equal(app.targets().length,1);
 }finally{app.close();}
});
test('an independently anchored firecracker can still ignite after its source plane retires',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
  const before=meshSubmissions;
  app.send('onAnchorRemoved',plane());act(()=>t.mock.timers.tick(4000));app.refresh();
  assert.equal(app.session.anchor?.id,'floor');assert.equal(app.session.anchor?.available,false);
  assert.ok(app.renderer().root.findAllByType('Viro3DObject' as any).length>0);
  assert.equal(meshSubmissions,before,'Losing a plane must not remount the model');
  app.dispatch({type:'ignite'});assert.equal(app.session.phase,'burning');
  app.dispatch({type:'clear'});assert.equal(app.highlights().length,1);
 }finally{app.close();}
});
test('a replacement plane at the placed point restores availability without clearing or moving the model',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('old'));app.tap(0,[1,0,-2]);
  const before=meshSubmissions;
  app.send('onAnchorRemoved',plane('old'));app.send('onAnchorFound',plane('replacement',{width:1,height:1}));
  assert.equal(app.session.anchor?.id,'replacement');assert.equal(app.session.anchor?.available,true);
  assert.deepEqual(app.session.anchor?.position,[1,0,-2]);assert.equal(meshSubmissions,before);
 }finally{app.close();}
});
test('a plane merge uses an already discovered replacement without interrupting combustion',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('old'));app.tap(0,[1,0,-2]);
  app.dispatch({type:'ignite'});const run=app.session.run;
  app.send('onAnchorFound',plane('replacement',{width:1,height:1}));app.send('onAnchorRemoved',plane('old'));
  assert.equal(app.session.anchor?.id,'replacement');assert.equal(app.session.phase,'burning');assert.equal(app.session.run,run);
 }finally{app.close();}
});
test('surface and light update bursts publish a bounded number of preview frames',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());
  const before=highlightSubmissions;
  for(let i=0;i<60;i++){
   app.emit('onAnchorUpdated',plane('floor',{width:.24+i*.01}));
   app.emit('onAmbientLightUpdate',{intensity:i%2?800:100});
  }
  act(()=>t.mock.timers.tick(150));
  assert.ok(highlightSubmissions-before<=2,`Expected at most 2 preview submissions, received ${highlightSubmissions-before}`);
  assert.ok(app.targets()[0]!.props.width>.8,'The published snapshot must include the newest estimate');
 }finally{app.close();}
});
test('a plane extent wobble does not shrink an already observed placement area',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane('floor',{width:1,height:1}));
  app.emit('onAnchorUpdated',plane('floor',{width:.12,height:.12}));act(()=>t.mock.timers.tick(150));
  assert.equal(app.targets()[0]!.props.width,1);assert.equal(app.targets()[0]!.props.height,1);
 }finally{app.close();}
});

// The Android Viro bridge automatically creates point anchors for scene-root
// nodes. Plane retirement is independent of those object anchors.
test('retiring a source plane during a burn does not interrupt the independently anchored model',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());app.tap(0,[1,0,-2]);
  app.dispatch({type:'ignite'});const run=app.session.run;
  app.send('onAnchorRemoved',plane());
  assert.equal(app.session.phase,'burning');assert.equal(app.session.run,run);
  app.send('onTrackingUpdated',2);assert.equal(app.session.phase,'interrupted');
 }finally{app.close();}
});
test('native quad hits are not rejected using a stale plane pose after native anchor correction',()=>{
 const app=mount();try{
  app.send('onTrackingUpdated',3);app.send('onAnchorFound',plane());
  // This point comes from the actual visible quad, after its native point
  // anchor has corrected the displayed position beyond the old .15 m check.
  app.tap(0,[1.4,.05,-2]);
  assert.equal(app.session.phase,'placed');assert.deepEqual(app.session.anchor?.position,[1.4,.05,-2]);
 }finally{app.close();}
});
