import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AerialPool,type ShotAudio} from '../src/aerial-pool';

function audio(){
 return {isLoaded:true,currentTime:0,playing:false,muted:false,volume:0,removed:false,
  async seekTo(t:number){this.currentTime=t;},play(){this.playing=true;},pause(){this.playing=false;},remove(){this.removed=true;}};
}
const origin:[number,number,number]=[0,1,0];
test('direct sky taps skip the ground fuse and begin at the short launch lead-in',async()=>{
 const p=audio(),pool=new AerialPool([p],()=>0,3.25);
 await pool.launch(origin,[0,5,-7],()=>true);
 assert.equal(p.currentTime,3.25);assert.equal(pool.snapshot(7.25)[0]!.elapsed,3.25);
});
test('rapid sky taps overlap independent clocks and targets, within a bounded pool',async()=>{
 const players=Array.from({length:4},audio),pool=new AerialPool(players);
 const results=await Promise.all([0,1,2,3,4].map(x=>pool.launch(origin,[x,5,-7],()=>true)));
 assert.deepEqual(results,[true,true,true,true,false]);
 players[0]!.currentTime=2;players[1]!.currentTime=.7;
 const shots=pool.snapshot(7.25);
 assert.equal(shots.length,4);assert.equal(shots[0]!.elapsed,2);assert.equal(shots[1]!.elapsed,.7);
 assert.deepEqual(shots.map(s=>s.flight[0]),[0,1,2,3]);
 assert.ok(players.every(p=>p.playing));
 assert.ok(players.reduce((sum,p)=>sum+p.volume*.5,0)<.95,'Overlapping identical burst peaks need mixer headroom');
 players[0]!.currentTime=7.25;pool.snapshot(7.25);
 assert.equal(await pool.launch(origin,[8,5,-7],()=>true),true,'A completed slot must immediately be reusable');
 pool.dispose();assert.ok(players.every(p=>p.removed&&!p.playing));
});

test('clear cancels every pending seek and a late completion cannot steal a newer shot',async()=>{
 const p=audio();let finish!:()=>void;
 p.seekTo=()=>new Promise<void>(r=>finish=r);
 const pool=new AerialPool([p]);const old=pool.launch(origin,[0,5,-7],()=>true);
 pool.clear();p.seekTo=async()=>{};
 assert.equal(await pool.launch(origin,[2,5,-7],()=>true),true);
 finish();assert.equal(await old,false);assert.equal(pool.snapshot(7.25).length,1);
 assert.deepEqual(pool.snapshot(7.25)[0]!.flight,[2,4,-7]);assert.equal(p.playing,true);
});

test('tracking loss during unprojection/seek and invalid rays cannot start sound',async()=>{
 const p=audio();let valid=true;p.seekTo=async()=>{valid=false;};
 const pool=new AerialPool([p]);
 assert.equal(await pool.launch(origin,[0,5,-7],()=>valid),false);
 assert.equal(p.playing,false);assert.equal(pool.snapshot(7.25).length,0);
 assert.equal(await pool.launch(origin,[NaN,5,-7],()=>true),false);
});

test('mute applies to current and subsequent simultaneous shots',async()=>{
 const players=[audio(),audio()],pool=new AerialPool(players as ShotAudio[]);
 await pool.launch(origin,[0,5,-7],()=>true);pool.setMuted(true);
 await pool.launch(origin,[1,5,-7],()=>true);
 assert.ok(players.every(p=>p.muted));pool.setMuted(false);assert.ok(players.every(p=>!p.muted));
 pool.clear();assert.equal(pool.snapshot(7.25).length,0);assert.ok(players.every(p=>!p.playing));
});
