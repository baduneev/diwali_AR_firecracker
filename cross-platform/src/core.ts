export type Kind='anar'|'sutli'|'chakri'|'sky'|'ladi'|'phuljhadi';
export type Vec3=[number,number,number];
export type Anchor={id:string;position:Vec3;normal:Vec3};
export type Session={kind:Kind;phase:'scanning'|'placed'|'burning'|'spent'|'interrupted';anchor:Anchor|null;tracking:boolean;run:number};
export type Event={type:'select';kind:Kind}|{type:'tracking';normal:boolean}|{type:'place';anchor:Anchor}|{type:'ignite'}|{type:'complete';run:number}|{type:'clear'};
export type Timing={duration:number;main:number;peak:number;cues:number[]};
export function sparkVelocity(kind:Kind,time:number,timing:Timing):number[][] {
 if(kind==='anar')return [[-.3,1.4,-.3],[.3,3.1,.3]];
 if(kind==='chakri')return [[-1.8,.1,-1.8],[1.8,.32,1.8]];
 if(kind==='phuljhadi')return [[-.4,.1,-.4],[.4,.6,.4]];
 if(kind==='sky')return time<timing.peak?[[-.05,-.4,-.05],[.05,-.1,.05]]:[[-1.1,-1.1,-1.1],[1.1,1.1,1.1]];
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
  case 'clear': return {...s,phase:'scanning',anchor:null,run:s.run+1};
  case 'select': return s.phase==='burning'?s:{...s,kind:e.kind,phase:s.anchor?'placed':'scanning',run:s.run+1};
  case 'tracking': return !e.normal && s.phase==='burning'?{...s,tracking:false,phase:'interrupted',run:s.run+1}:{...s,tracking:e.normal};
  case 'place': return !s.tracking || s.phase==='burning' || e.anchor.normal[1]<.98?s:{...s,anchor:e.anchor,phase:'placed',run:s.run+1};
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
 if(k==='chakri'){const a=(t-s.main)*36;emitter=[Math.cos(a)*.038,.012,Math.sin(a)*.038];}
 if(k==='sutli')emitter=[0,.055,0];
 if(k==='sky')emitter=[0,t<s.peak?.12+(Math.max(0,t-1)/(s.peak-1))*4:4,0];
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
