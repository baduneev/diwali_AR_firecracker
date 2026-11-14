import type {Vec3,Session,Event} from './core';
export function targetOnRay(near:Vec3,far:Vec3):Vec3|null {
 if(!Array.isArray(near)||!Array.isArray(far)||near.length!==3||far.length!==3||![...near,...far].every(Number.isFinite))return null;
 const ray=far.map((v,i)=>v-near[i]!);const length=Math.hypot(...ray);
 return length<.001?null:near.map((v,i)=>v+ray[i]!/length*8) as Vec3;
}
export type LaunchRequest={run:number;origin:Vec3;target:Vec3;getSession:()=>Session;seek:()=>Promise<void>;play:()=>void;dispatch:(event:Event)=>void};
export async function fireAerial(r:LaunchRequest):Promise<boolean>{
 const valid=()=>{const s=r.getSession();return s.kind==='aerial'&&s.tracking&&s.phase!=='burning'&&s.run===r.run;};
 if(!valid())return false;
 await r.seek();
 if(!valid())return false;
 r.play();r.dispatch({type:'launch',run:r.run,origin:r.origin,target:r.target});return true;
}
