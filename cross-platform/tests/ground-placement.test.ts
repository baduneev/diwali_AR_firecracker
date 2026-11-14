import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as surfaces from '../src/ar-surfaces';
import {initialSession,reduceSession} from '../src/core';
const solve=(surfaces as any).groundPlacement;
const near=[0,1.2,0],far=[0,0,-1.2];
const hit=(type:string,position:number[],rotation=[0,0,0])=>({type,transform:{position,rotation,scale:[1,1,1]}});

test('a horizontal tap hit places before any plane discovery callback',()=>{
 const r=solve([hit('EstimatedHorizontalPlane',[0,0,-1.2])],near,far,[],false,1.2);
 assert.deepEqual(r.position,[0,0,-1.2]);assert.equal(r.estimated,true);
});
test('a measured horizontal hit outranks feature estimates and rejects walls',()=>{
 const r=solve([hit('FeaturePoint',[0,.4,-.8]),hit('ExistingPlaneUsingExtent',[0,.3,-.9],[0,0,90]),hit('ExistingPlane',[0,0,-1.2])],near,far,[],true,1.2);
 assert.deepEqual(r.position,[0,0,-1.2]);assert.equal(r.estimated,false);
});
test('assisted placement uses a tapped feature but does not call it a detected plane',()=>{
 const r=solve([hit('FeaturePoint',[0,.4,-.8])],near,far,[],true,1.2);
 assert.deepEqual(r.position,[0,.4,-.8]);assert.equal(r.estimated,true);
 assert.equal(solve([hit('FeaturePoint',[0,.4,-.8])],near,far,[],false,1.2),null);
});
test('assisted placement works without plane geometry using an adjustable horizontal height',()=>{
 assert.deepEqual(solve([],near,far,[],true,1.2).position,[0,0,-1.2]);
 assert.deepEqual(solve([],near,far,[],true,.6).position,[0,.6,-.6]);
 assert.equal(solve([],near,far,[],false,1.2),null);
});
test('placement rejects sky rays, invalid coordinates and far away floor estimates',()=>{
 for(const f of [[0,2,-1],[0,1.19,-3],[NaN,0,-1],[0,1.2,0]])assert.equal(solve([],near,f,[],true,1.2),null);
 assert.equal(solve([hit('ExistingPlane',[NaN,0,-1])],near,far,[],false,1.2),null);
});
test('an estimated placed height can be corrected without relighting or moving during combustion',()=>{
 let s=reduceSession(initialSession(),{type:'tracking',normal:true});
 s=reduceSession(s,{type:'place',anchor:{id:'assisted',position:[0,0,-1.2],normal:[0,1,0],estimated:true} as any});
 s=reduceSession(s,{type:'adjustHeight',delta:.05} as any);assert.deepEqual(s.anchor?.position,[0,.05,-1.2]);
 const burning=reduceSession(s,{type:'ignite'});
 assert.deepEqual(reduceSession(burning,{type:'adjustHeight',delta:.05} as any),burning);
 assert.deepEqual(reduceSession(s,{type:'adjustHeight',delta:NaN} as any),s);
});
