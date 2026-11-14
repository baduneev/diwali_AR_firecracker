import type {Vec3} from './core';
import {playbackSample} from './core';
export type AerialShot={id:number;origin:Vec3;flight:Vec3;elapsed:number};
export type ShotAudio={isLoaded:boolean;currentTime:number;playing:boolean;muted:boolean;volume:number;seekTo:(seconds:number)=>Promise<void>;play:()=>void;pause:()=>void;remove:()=>void};
type Slot={player:ShotAudio;ticket:number;reserved:boolean;shot?:AerialShot;started:number};

/** Preloaded independent players: reserve before awaiting native work, and use
 * tickets so Clear/selection cannot resurrect a delayed launch. */
export class AerialPool {
 private slots:Slot[];private serial=0;private disposed=false;private muted=false;
 constructor(players:ShotAudio[],private now=()=>Date.now(),private startTime=0){
  this.slots=players.map(player=>({player,ticket:0,reserved:false,started:0}));
 }
 get ready(){return !this.disposed&&this.slots.some(s=>s.player.isLoaded);}
 private mix(){
  const voices=Math.max(1,this.slots.filter(s=>s.reserved).length);
  for(const s of this.slots){s.player.volume=.45/Math.sqrt(voices);s.player.muted=this.muted;}
 }
 setMuted(muted:boolean){this.muted=muted;this.mix();}
 async launch(origin:Vec3,target:Vec3,valid:()=>boolean):Promise<boolean>{
  if(this.disposed||!valid()||origin.length!==3||target.length!==3||![...origin,...target].every(Number.isFinite))return false;
  const slot=this.slots.find(s=>!s.reserved&&s.player.isLoaded);if(!slot)return false;
  const ticket=++this.serial;slot.ticket=ticket;slot.reserved=true;this.mix();
  try{
   await slot.player.seekTo(this.startTime);
   if(this.disposed||slot.ticket!==ticket)return false;
   if(!valid()){slot.reserved=false;this.mix();return false;}
   slot.shot={id:ticket,origin:[...origin],flight:target.map((v,i)=>v-origin[i]!) as Vec3,elapsed:this.startTime};
   slot.started=this.now();slot.player.play();return true;
  }catch{
   if(slot.ticket===ticket){slot.reserved=false;slot.shot=undefined;slot.player.pause();this.mix();}
   return false;
  }
 }
 snapshot(duration:number):AerialShot[]{
  const shots:AerialShot[]=[];let released=false;
  for(const s of this.slots){
   if(!s.shot)continue;
   const clock=playbackSample(s.shot.elapsed,s.player.currentTime,duration,s.player.playing,this.now()-s.started);
   if(clock.complete||clock.interrupted){s.player.pause();s.reserved=false;s.shot=undefined;released=true;continue;}
   s.shot={...s.shot,elapsed:clock.time};shots.push(s.shot);
  }
  if(released)this.mix();return shots;
 }
 clear(){
  for(const s of this.slots){s.ticket=++this.serial;s.reserved=false;s.shot=undefined;s.player.pause();}
  this.mix();
 }
 dispose(){this.clear();this.disposed=true;for(const s of this.slots)s.player.remove();}
}
