import {localPoint,type Vec3} from './core';

export type Surface={anchorId:string;position:Vec3;rotation:Vec3;scale:Vec3;center:Vec3;width:number;height:number};
const vector=(value:unknown):value is Vec3=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);

// Viro's native bridge sends Euler degrees, including equivalent rotations such
// as [180, 0, 180] for a level floor. Keep all three axes (Viro's Rz * Ry * Rx).
export function surfaceQuaternion(rotation:Vec3):[number,number,number,number]{
 const [x,y,z]=rotation.map(degrees=>degrees*Math.PI/360) as Vec3;
 const sx=Math.sin(x),cx=Math.cos(x),sy=Math.sin(y),cy=Math.cos(y),sz=Math.sin(z),cz=Math.cos(z);
 return [sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz,cx*cy*cz+sx*sy*sz];
}

export function horizontalSurface(value:unknown):Surface|null{
 if(!value||typeof value!=='object')return null;
 const a=value as Record<string,unknown>;
 if(a.type!=='plane'||typeof a.anchorId!=='string'||!a.anchorId||!vector(a.position)||!vector(a.rotation))return null;
 if(a.alignment!=='Horizontal'&&a.alignment!=='HorizontalUpward')return null;
 if(a.classification==='Ceiling'||typeof a.width!=='number'||typeof a.height!=='number'||!Number.isFinite(a.width)||!Number.isFinite(a.height)||a.width<0||a.height<0)return null;
 // Trust ARKit/ARCore's horizontal classification. A second angle test rejects
 // usable tables and floors while their initial pose estimate is settling.
 const scale=vector(a.scale)?a.scale:[1,1,1] as Vec3;
 if(scale.some(s=>s<=0))return null;
 return {anchorId:a.anchorId,position:a.position,rotation:a.rotation,scale,center:vector(a.center)?a.center:[0,0,0],width:Math.max(.12,a.width),height:Math.max(.12,a.height)};
}

export function sameSurface(a:Surface|undefined,b:Surface):boolean{
 return !!a&&a.anchorId===b.anchorId&&a.width===b.width&&a.height===b.height&&
  (['position','rotation','scale','center'] as const).every(key=>a[key].every((n,i)=>n===b[key][i]));
}

export function surfaceLocalPoint(surface:Surface,world:Vec3):Vec3{
 const local=localPoint(world,surface.position,surfaceQuaternion(surface.rotation)).map((n,i)=>n/surface.scale[i]!) as Vec3;
 return [local[0],surface.center[1],local[2]];
}

export function surfaceWorldPoint(surface:Surface,local:Vec3):Vec3{
 const q=surfaceQuaternion(surface.rotation);
 const scaled=local.map((n,i)=>n*surface.scale[i]!) as Vec3;
 const rotated=localPoint(scaled,[0,0,0],[-q[0],-q[1],-q[2],q[3]]);
 return rotated.map((n,i)=>n+surface.position[i]!) as Vec3;
}

export function pointOnSurface(surface:Surface,world:unknown):Vec3|null{
 if(!vector(world))return null;
 const local=localPoint(world,surface.position,surfaceQuaternion(surface.rotation)).map((n,i)=>n/surface.scale[i]!) as Vec3;
 // Native clicks originate on the displayed quad. Allow initial pose/bounds
 // refinement and finger imprecision instead of requiring centimeter accuracy.
 if(Math.abs(local[0]-surface.center[0])>surface.width/2+.15||Math.abs(local[2]-surface.center[2])>surface.height/2+.15||Math.abs(local[1]-surface.center[1])>.15)return null;
 return [local[0],surface.center[1],local[2]];
}

export type GroundPlacement={position:Vec3;estimated:boolean;surfaceId?:string};
// Called only on a tap. A visual feature/depth hit has no certified horizontal
// normal; assisted mode explicitly treats it as an estimated level surface.
export function groundPlacement(hits:unknown,near:Vec3,far:Vec3,surfaces:Surface[],assisted:boolean,height:number):GroundPlacement|null{
 if(!vector(near)||!vector(far))return null;
 const ray=far.map((v,i)=>v-near[i]!) as Vec3,length=Math.hypot(...ray);
 if(length<.001||ray[1]/length>-.12)return null;
 const within=(p:Vec3)=>p[1]<near[1]-.08&&Math.hypot(...p.map((v,i)=>v-near[i]!))>=.15&&Math.hypot(...p.map((v,i)=>v-near[i]!))<=5;
 const candidates=(Array.isArray(hits)?hits:[]).flatMap((h:any)=>{
  if(!vector(h?.transform?.position)||!within(h.transform.position))return [];
  const p=h.transform.position as Vec3;
  if(['ExistingPlaneUsingExtent','ExistingPlane','EstimatedHorizontalPlane'].includes(h.type)&&vector(h.transform.rotation)){
   const q=surfaceQuaternion(h.transform.rotation);
   const up=localPoint([0,1,0],[0,0,0],[-q[0],-q[1],-q[2],q[3]]);
   if(up[1]<.9)return [];
   return [{position:p,estimated:h.type==='EstimatedHorizontalPlane',rank:h.type==='EstimatedHorizontalPlane'?1:0}];
  }
  if(assisted&&(h.type==='FeaturePoint'||h.type==='DepthPoint')&&(h.type!=='DepthPoint'||!Number.isFinite(h.depthConfidence)||h.depthConfidence>=.5))return [{position:p,estimated:true,rank:2}];
  return [];
 });
 candidates.sort((a,b)=>a.rank-b.rank||Math.hypot(...a.position.map((v,i)=>v-near[i]!))-Math.hypot(...b.position.map((v,i)=>v-near[i]!)));
 const measured=candidates.find(c=>c.rank<2);
 if(measured)return {position:[...measured.position],estimated:measured.estimated};
 // Reuse observed geometry even if native hit testing has temporarily stopped
 // returning that plane. Do not expand it to an imaginary infinite floor.
 for(const surface of surfaces){
  const localNear=localPoint(near,surface.position,surfaceQuaternion(surface.rotation));
  const localFar=localPoint(far,surface.position,surfaceQuaternion(surface.rotation));
  const dy=localFar[1]-localNear[1];if(Math.abs(dy)<.001)continue;
  const t=(surface.center[1]*surface.scale[1]-localNear[1])/dy;if(t<=0)continue;
  const p=near.map((v,i)=>v+ray[i]!*t) as Vec3;
  if(within(p)&&pointOnSurface(surface,p))return {position:p,estimated:false,surfaceId:surface.anchorId};
 }
 if(candidates[0])return {position:[...candidates[0].position],estimated:true};
 if(!assisted||!Number.isFinite(height)||height<.2||height>2)return null;
 const t=-height/ray[1],p=near.map((v,i)=>v+ray[i]!*t) as Vec3;
 return within(p)?{position:p,estimated:true}:null;
}
