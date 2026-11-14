import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
import {burnEnergy,spinAngle,playbackVolume} from '../src/effects';
import type {Kind} from '../src/core';
import manifest from '../assets/audio-manifest.json';

test('continuous burn power rises and falls smoothly rather than restarting at full strength',()=>{
 const spec={main:1,duration:13.25,peak:1.5,cues:[]};
 for(const kind of ['anar','chakri','phuljhadi'] as const){
  assert.equal(burnEnergy(kind,.9,spec),0);assert.equal(burnEnergy(kind,13,spec),0);
  assert.ok(burnEnergy(kind,7,spec)>.95);
  assert.ok(burnEnergy(kind,1.1,spec)<.2);assert.ok(burnEnergy(kind,12.9,spec)<.1);
  let previous=0;
  for(let t=1;t<=13;t+=.04){const e=burnEnergy(kind,t,spec);assert.ok(e>=0&&e<=1);assert.ok(Math.abs(e-previous)<.06);previous=e;}
 }
});

test('Chakri accelerates and coasts to rest without changing its ground position',()=>{
 const spec={main:1,duration:13.25,peak:1.5,cues:[]};
 const speed=(t:number)=>spinAngle(t+.05,spec)-spinAngle(t,spec);
 assert.ok(speed(7)>speed(1.1)*5);assert.ok(speed(12.8)<speed(7)*.1);
 assert.equal(spinAngle(13,spec),spinAngle(20,spec));
});

test('audio follows the fountain envelope and distance attenuation still applies',()=>{
 const spec={main:1,duration:13.25,peak:1.5,cues:[]};
 const mid=playbackVolume('anar',1,7,spec);
 assert.ok(playbackVolume('anar',1,1.1,spec)<mid*.5);
 assert.ok(playbackVolume('anar',1,12.9,spec)<mid*.5);
 assert.equal(playbackVolume('anar',1,13.25,spec),0);
 assert.equal(playbackVolume('sutli',2,1.1,spec),playbackVolume('sutli',1,1.1,spec)/2);
});

function waveform(kind:string){
 const buffer=readFileSync(new URL(`../assets/audio/${kind}.wav`,import.meta.url));
 let offset=12;
 while(buffer.toString('ascii',offset,offset+4)!=='data')offset+=8+buffer.readUInt32LE(offset+4)+(buffer.readUInt32LE(offset+4)%2);
 const size=buffer.readUInt32LE(offset+4),samples=[];
 for(let i=offset+8;i<offset+8+size;i+=2)samples.push(buffer.readInt16LE(i)/32768);
 return samples;
}
test('the actual Sutli recording has the loudest peak and short transient at equal distance, without clipping',()=>{
 const levels=new Map<string,{peak:number;transient:number}>();
 for(const kind of ['anar','chakri','phuljhadi','sky','sutli','ladi'] as const){
  const pcm=waveform(kind),m=manifest[kind],spec={main:m.main_start,duration:m.duration,peak:m.peak,cues:[]};
  let peak=0,sum=0,transient=0;
  for(let i=0;i<pcm.length;i++){
   assert.ok(Math.abs(pcm[i]!)<.98,'Keep headroom in mastered WAVs');
   const v=pcm[i]!*playbackVolume(kind as Kind,1,i/48000,spec);peak=Math.max(peak,Math.abs(v));sum+=v*v;
   if(i>=4800)sum-=(pcm[i-4800]!*playbackVolume(kind,1,(i-4800)/48000,spec))**2;
   transient=Math.max(transient,Math.sqrt(Math.max(0,sum)/4800));
  }
  levels.set(kind,{peak,transient});
 }
 assert.ok(levels.get('sutli')!.transient>.22,'The strengthened master needs a full-bodied transient, not just a tall isolated peak');
 for(const [kind,level] of levels){if(kind==='sutli')continue;assert.ok(levels.get('sutli')!.peak>level.peak*1.5);assert.ok(levels.get('sutli')!.transient>level.transient*1.15,`Sutli must have a stronger brief bang than ${kind}`);}
});
