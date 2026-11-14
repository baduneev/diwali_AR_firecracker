import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialSession, reduceSession, sampleBurn, localPoint,playbackSample,canIgnite,horizontalAlignment,sparkVelocity} from '../src/core';
const ground={id:'floor-1',position:[1,0,-2] as [number,number,number],normal:[0,1,0] as [number,number,number]};
test('retiring the source plane does not invalidate an independent point placement',()=>{
 let s=reduceSession(reduceSession(initialSession(),{type:'tracking',normal:true}),{type:'place',anchor:ground});
 s=reduceSession(s,{type:'surface',id:'floor-1',available:false});
 assert.deepEqual(s.anchor?.position,[1,0,-2]);assert.equal(canIgnite(s,true,true),true);
 assert.equal(reduceSession(s,{type:'ignite'}).phase,'burning');
 s=reduceSession(s,{type:'surface',id:'floor-1',replacementId:'floor-2',available:true});
 assert.equal(canIgnite(s,true,true),true);assert.equal(s.anchor?.id,'floor-2');
});
test('aerial bursts spread downward as well as upward while ground bursts start above the floor',()=>{
 const timing={duration:7,main:1,peak:4,cues:[]};
 const aerial=sparkVelocity('sky',4,timing),ground=sparkVelocity('sutli',4,timing);
 for(let axis=0;axis<3;axis++){assert.ok(aerial[0]![axis]!<0);assert.equal(aerial[0]![axis],-aerial[1]![axis]!);}
 assert.ok(ground[0]![1]!>=0);
 assert.ok(sparkVelocity('sky',2,timing)[1]![1]!<0,'The rising shell leaves its trail behind it');
});
test('iPhone uses the supported horizontal mode and Android can filter upward planes',()=>{
 assert.equal(horizontalAlignment('ios'),'Horizontal');
 assert.equal(horizontalAlignment('android'),'HorizontalUpward');
});
test('lighting requires both the native recording and the complete model to be ready',()=>{
 const s=reduceSession(reduceSession(initialSession(),{type:'tracking',normal:true}),{type:'place',anchor:ground});
 assert.equal(canIgnite(s,true,false),false);assert.equal(canIgnite(s,false,true),false);
 assert.equal(canIgnite(s,true,true),true);
 assert.equal(canIgnite(reduceSession(s,{type:'tracking',normal:false}),true,true),false);
 assert.equal(canIgnite(reduceSession(s,{type:'ignite'}),true,true),false);
});
test('a delayed first native-clock sample still advances combustion',()=>{
 assert.equal(playbackSample(0,.7,5,true,700).time,.7);
 assert.equal(playbackSample(.7,.6,5,true,750).time,.7);
 assert.equal(playbackSample(.7,Number.NaN,5,true,800).time,.7);
});
test('native clock distinguishes finished audio from an external pause',()=>{
 assert.equal(playbackSample(4.9,5,5,false,5000).complete,true);
 assert.equal(playbackSample(1,1,5,false,2000).interrupted,true);
 assert.equal(playbackSample(0,0,5,false,100).interrupted,false);
});
test('ignition needs a horizontal anchor and healthy tracking',()=>{
 let s=initialSession();
 assert.equal(reduceSession(s,{type:'ignite'}).phase,'scanning');
 s=reduceSession(s,{type:'tracking',normal:true});
 assert.equal(reduceSession(s,{type:'place',anchor:{...ground,normal:[1,0,0]}}).anchor,null);
 s=reduceSession(s,{type:'place',anchor:ground});
 assert.equal(s.phase,'placed');
 assert.equal(reduceSession(s,{type:'ignite'}).phase,'burning');
});
test('burning locks selection and retains anchor after completion',()=>{
 let s=reduceSession(reduceSession(initialSession(),{type:'tracking',normal:true}),{type:'place',anchor:ground});
 s=reduceSession(s,{type:'ignite'});
 const active=s.run;
 assert.equal(reduceSession(s,{type:'select',kind:'ladi'}).kind,'anar');
 assert.equal(reduceSession(s,{type:'complete',run:active-1}).phase,'burning');
 s=reduceSession(s,{type:'complete',run:active});
 assert.equal(s.phase,'spent');assert.deepEqual(s.anchor,ground);
});
test('tracking loss stops playback and invalidates late completion',()=>{
 let s=reduceSession(reduceSession(initialSession(),{type:'tracking',normal:true}),{type:'place',anchor:ground});
 s=reduceSession(s,{type:'ignite'});const run=s.run;
 s=reduceSession(s,{type:'tracking',normal:false});
 assert.equal(s.phase,'interrupted');assert.ok(s.run>run);
 assert.equal(reduceSession(s,{type:'complete',run}).phase,'interrupted');
 assert.equal(reduceSession(s,{type:'ignite'}).phase,'interrupted');
});
test('clear invalidates callbacks and removes the placed object',()=>{
 let s=reduceSession(initialSession(),{type:'clear'});
 assert.equal(s.anchor,null);assert.equal(s.phase,'scanning');assert.equal(s.run,1);
});
test('ladi consumes each cracker on its recorded pop rather than a generic rate',()=>{
 const spec={duration:4,main:1,peak:2,cues:[1.1,1.7,2.2]};
 assert.equal(sampleBurn('ladi',1.69,spec).consumed,1);
 assert.equal(sampleBurn('ladi',1.7,spec).consumed,2);
 assert.equal(sampleBurn('ladi',4,spec).consumed,3);
});
test('sparkler burning front moves down the grounded wire and leaves spent coating',()=>{
 const spec={duration:15,main:1,peak:5,cues:[]};
 const start=sampleBurn('phuljhadi',1,spec),end=sampleBurn('phuljhadi',15,spec);
 assert.equal(start.progress,0);assert.equal(end.progress,1);
 assert.ok(start.emitter[2]<end.emitter[2]);assert.equal(end.emitting,false);
 assert.equal(end.bodyVisible,true);
});
test('sutli body disappears at recorded detonation and fountain retains its shell',()=>{
 const spec={duration:4,main:1,peak:1.3,cues:[]};
 assert.equal(sampleBurn('sutli',1.29,spec).bodyVisible,true);
 assert.equal(sampleBurn('sutli',1.3,spec).bodyVisible,false);
 assert.equal(sampleBurn('anar',4,spec).bodyVisible,true);
});
test('world hit is transformed into anchor-local space without camera position',()=>{
 const q=[0,Math.SQRT1_2,0,Math.SQRT1_2] as [number,number,number,number];
 const p=localPoint([2,0,-2],[1,0,-2],q);
 assert.ok(Math.abs(p[0])<1e-6);assert.ok(Math.abs(p[2]-1)<1e-6);
});
