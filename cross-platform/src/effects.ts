import type {Kind,Timing} from './core';

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const u=clamp(x);return u*u*(3-2*u);};
const shape=(kind:Kind)=>kind==='anar'?[.26,.63]:kind==='chakri'?[.19,.76]:[.09,.84];

/** Artistic envelopes inferred from demonstration footage, timed to our audio edits.
 * The recording's largest sample is not the fountain/spinner's physical peak. */
export function burnEnergy(kind:Kind,time:number,spec:Timing):number {
 if(time<spec.main||time>=spec.duration-.25)return 0;
 const p=clamp((time-spec.main)/(spec.duration-spec.main-.25));
 const [attack,release]=shape(kind) as [number,number];
 return smooth(p/attack)*smooth((1-p)/(1-release));
}

/** Integrating power keeps Chakri phase continuous as its spin speeds up and
 * slows down, including when the native audio clock skips a sample. */
export function spinAngle(time:number,spec:Timing):number {
 const length=spec.duration-spec.main-.25,p=clamp((time-spec.main)/length),a=.19,r=.76;
 const integral=(u:number)=>u*u*u-.5*u*u*u*u;
 let area:number;
 if(p<a)area=a*integral(p/a);
 else if(p<r)area=a*.5+p-a;
 else area=a*.5+r-a+(1-r)*(.5-integral((1-p)/(1-r)));
 return area*length*2057;
}

export function playbackVolume(kind:Kind,distance:number,time:number,spec:Timing):number {
 if(time>=spec.duration-.25)return 0;
 const attenuation=Math.max(.2,Math.min(1,1/Math.max(.5,distance)));
 const continuous=kind==='anar'||kind==='chakri'||kind==='phuljhadi';
 const envelope=continuous&&time>=spec.main?.18+.82*burnEnergy(kind,time,spec):1;
 return (kind==='sutli'?1:.65)*attenuation*envelope;
}
