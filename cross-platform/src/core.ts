import {burnEnergy,spinAngle} from './effects';
export type Kind='anar'|'sutli'|'chakri'|'sky'|'ladi'|'phuljhadi'|'aerial';
export type Vec3=[number,number,number];
export type Anchor={id:string;position:Vec3;normal:Vec3;available?:boolean;estimated?:boolean};
export type Session={kind:Kind;phase:'scanning'|'placed'|'burning'|'spent'|'interrupted';anchor:Anchor|null;tracking:boolean;run:number;flight?:Vec3};
export type Event={type:'select';kind:Kind}|{type:'tracking';normal:boolean}|{type:'place';anchor:Anchor}|{type:'adjustHeight';delta:number}|{type:'surface';id:string;available:boolean;replacementId?:string}|{type:'ignite'}|{type:'launch';run:number;origin:Vec3;target:Vec3}|{type:'complete';run:number}|{type:'clear'};
export type Timing={duration:number;main:number;peak:number;cues:number[]};
export function sparkVelocity(kind:Kind,time:number,timing:Timing):number[][] {
 // Quantize native modifier changes to 5% power steps. Existing particles keep
 // their birth velocity; changing power must not remount their native pool.
 const e=Math.round(burnEnergy(kind,time,timing)*20)/20;
 if(kind==='anar')return [[-(.1+.9*e),.35+2.5*e,-(.1+.9*e)],[.1+.9*e,.6+4.6*e,.1+.9*e]];
 if(kind==='chakri'){
  // A single tangential jet sweeps around the flat coil, leaving a low fan.
  const angle=spinAngle(time,timing)*Math.PI/180,speed=.15+3*e,spread=.03+.3*e;
  const x=-Math.sin(angle)*speed,z=Math.cos(angle)*speed;
  return [[x-spread,.14+.42*e,z-spread],[x+spread,.18+.48*e,z+spread]];
 }
 if(kind==='phuljhadi')return [[-(.06+.34*e),.1+.25*e,-(.06+.34*e)],[.06+.34*e,.15+.45*e,.06+.34*e]];
 if(kind==='sutli')return [[-3,.8,-3],[3,2.4,3]];
 if(kind==='sky'||kind==='aerial')return time<timing.peak?[[-.08,-.5,-.08],[.08,-.12,.08]]:[[-2.4,-2.4,-2.4],[2.4,2.4,2.4]];
 return [[-1.1,.1,-1.1],[1.1,1.1,1.1]];
}
export const initialSession=():Session=>({kind:'anar',phase:'scanning',anchor:null,tracking:false,run:0});
export const horizontalAlignment=(os:string):'Horizontal'|'HorizontalUpward'=>os==='android'?'HorizontalUpward':'Horizontal';
export const canIgnite=(s:Session,models:boolean,audio:boolean)=>s.phase==='placed'&&s.tracking&&s.anchor!==null&&models&&audio;
export function playbackSample(last:number,current:number,duration:number,playing:boolean,age:number) {
 const time=Math.max(last,Number.isFinite(current)?Math.max(0,Math.min(duration,current)):last);
 const complete=time>=duration-.02;
 return {time,complete,interrupted:!complete&&!playing&&age>1000};
}
export function reduceSession(s:Session,e:Event):Session {
 switch(e.type) {
  case 'clear': return {...s,phase:'scanning',anchor:null,flight:undefined,run:s.run+1};
  case 'select': {
   if(s.phase==='burning')return s;
   const anchor=s.kind==='aerial'||e.kind==='aerial'?null:s.anchor;
   return {...s,kind:e.kind,anchor,flight:undefined,phase:anchor?'placed':'scanning',run:s.run+1};
  }
  case 'launch': {
   if(s.kind!=='aerial'||!s.tracking||s.phase==='burning'||s.run!==e.run||![...e.origin,...e.target].every(Number.isFinite))return s;
   return {...s,anchor:{id:`air-${s.run}`,position:e.origin,normal:[0,1,0]},flight:e.target.map((x,i)=>x-e.origin[i]!) as Vec3,phase:'burning',run:s.run+1};
  }
  case 'tracking': return !e.normal && s.phase==='burning'?{...s,tracking:false,phase:'interrupted',run:s.run+1}:{...s,tracking:e.normal};
  case 'place': return !s.tracking || s.phase==='burning' || e.anchor.normal[1]<.98?s:{...s,anchor:e.anchor,phase:'placed',run:s.run+1};
  case 'adjustHeight': return s.phase!=='placed'||!s.anchor?.estimated||!Number.isFinite(e.delta)||Math.abs(e.delta)>.25?s:{...s,anchor:{...s.anchor,position:[s.anchor.position[0],s.anchor.position[1]+e.delta,s.anchor.position[2]]}};
  case 'surface': {
   if(!s.anchor||s.anchor.id!==e.id)return s;
   const id=e.replacementId??e.id;
   if(s.anchor.available===e.available&&s.anchor.id===id)return s;
   // The discovery plane and Viro's independently anchored object have separate
   // lifetimes. Retiring a plane must not interrupt the object's playback.
   return {...s,anchor:{...s.anchor,id,available:e.available}};
  }
  case 'ignite': return s.tracking && s.anchor && s.phase==='placed'?{...s,phase:'burning',run:s.run+1}:s;
  case 'complete': return e.run===s.run && s.phase==='burning'?{...s,phase:'spent'}:s;
 }
}
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function sampleBurn(k:Kind,t:number,s:Timing) {
 const progress=clamp((t-s.main)/Math.max(.01,s.duration-s.main-.25));
 const consumed=s.cues.filter(c=>c<=t).length;
 let emitter:Vec3=[0,.155,0];
 if(k==='phuljhadi')emitter=[0,.006,-.13+.18*progress];
 if(k==='chakri'){const a=spinAngle(t,s)*Math.PI/180;emitter=[Math.cos(a)*.038,.012,Math.sin(a)*.038];}
 if(k==='sutli')emitter=[0,.055,0];
 if(k==='sky')emitter=[0,.12+2.4*clamp((t-s.main)/(s.peak-s.main)),0];
 if(k==='ladi')emitter=[consumed%2===0?-.023:.023,.009,-.144+Math.floor(Math.min(consumed,35)/2)*.016];
 return {progress,consumed,emitter,emitting:t>=s.main && t<s.duration-.25,bodyVisible:k!=='sutli'||t<s.peak};
}
/** Inverse quaternion transform: hits remain in the detected plane's coordinate frame. */
export function localPoint(p:Vec3,o:Vec3,q:[number,number,number,number]):Vec3 {
 const v:Vec3=[p[0]-o[0],p[1]-o[1],p[2]-o[2]];
 const n=q.reduce((a,x)=>a+x*x,0);if(n<1e-12)return v;
 const x=-q[0]/Math.sqrt(n),y=-q[1]/Math.sqrt(n),z=-q[2]/Math.sqrt(n),w=q[3]/Math.sqrt(n);
 const tx=2*(y*v[2]-z*v[1]),ty=2*(z*v[0]-x*v[2]),tz=2*(x*v[1]-y*v[0]);
 return [v[0]+w*tx+y*tz-z*ty,v[1]+w*ty+z*tx-x*tz,v[2]+w*tz+x*ty-y*tx];
}
