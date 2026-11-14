import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialSession,reduceSession} from '../src/core';
import * as aerial from '../src/aerial';

test('a screen ray places its burst eight metres away in the tapped direction',()=>{
 assert.deepEqual(aerial.targetOnRay([1,2,3],[1,5,-1]),[1,6.8,-3.4000000000000004]);
 assert.equal(aerial.targetOnRay([0,0,0],[0,0,0]),null);
 assert.equal(aerial.targetOnRay([0,0,0],[NaN,0,0]),null);
});

test('aerial launch needs camera tracking but no detected floor and invalidates old completions',()=>{
 let s=reduceSession(initialSession(),{type:'select',kind:'aerial'});
 const launch={type:'launch',run:s.run,origin:[0,1,0],target:[0,5,-7]} as const;
 assert.equal(reduceSession(s,launch as any).phase,'scanning');
 s=reduceSession(s,{type:'tracking',normal:true});s=reduceSession(s,launch as any);
 assert.equal(s.phase,'burning');assert.deepEqual(s.anchor?.position,[0,1,0]);
 assert.deepEqual(s.flight,[0,4,-7]);assert.equal(reduceSession(s,launch as any),s);
 assert.equal(reduceSession(s,{type:'complete',run:launch.run}).phase,'burning');
 s=reduceSession(s,{type:'clear'});assert.equal(s.flight,undefined);
 assert.equal(reduceSession(s,launch as any).anchor,null);
});

test('switching between sky taps and ground fireworks requires a fresh placement',()=>{
 let s=reduceSession(initialSession(),{type:'tracking',normal:true});
 s=reduceSession(s,{type:'place',anchor:{id:'floor',normal:[0,1,0],position:[1,0,-2]}});
 s=reduceSession(s,{type:'select',kind:'aerial'});assert.equal(s.anchor,null);
 s=reduceSession(s,{type:'select',kind:'anar'});assert.equal(s.anchor,null);
});

test('clearing while audio seeks cancels the pending sky launch without playing audio',async()=>{
 let s=reduceSession(reduceSession(initialSession(),{type:'select',kind:'aerial'}),{type:'tracking',normal:true});
 const run=s.run;let finish!:()=>void;let plays=0;
 const pending=aerial.fireAerial({run,origin:[0,0,0],target:[0,4,-7],getSession:()=>s,seek:()=>new Promise<void>(r=>finish=r),play:()=>plays++,dispatch:e=>{s=reduceSession(s,e);}});
 s=reduceSession(s,{type:'clear'});finish();assert.equal(await pending,false);assert.equal(plays,0);assert.equal(s.anchor,null);
});

test('a ready sky launch starts playback and combustion together',async()=>{
 let s=reduceSession(reduceSession(initialSession(),{type:'select',kind:'aerial'}),{type:'tracking',normal:true});let plays=0;
 assert.equal(await aerial.fireAerial({run:s.run,origin:[0,0,0],target:[0,4,-7],getSession:()=>s,seek:async()=>{},play:()=>plays++,dispatch:e=>{s=reduceSession(s,e);}}),true);
 assert.equal(plays,1);assert.equal(s.phase,'burning');
});

test('tracking loss during an audio seek prevents a launch',async()=>{
 let s=reduceSession(reduceSession(initialSession(),{type:'select',kind:'aerial'}),{type:'tracking',normal:true});let plays=0;
 const launched=await aerial.fireAerial({run:s.run,origin:[0,0,0],target:[0,4,-7],getSession:()=>s,seek:async()=>{s=reduceSession(s,{type:'tracking',normal:false});},play:()=>plays++,dispatch:e=>{s=reduceSession(s,e);}});
 assert.equal(launched,false);assert.equal(plays,0);assert.equal(s.anchor,null);
});
