import {useCallback,useEffect,useRef,useState} from 'react';
import {createAudioPlayer} from 'expo-audio';
import {AUDIO,timing} from './catalog';
import {AerialPool,type AerialShot} from './aerial-pool';
import type {Vec3} from './core';

export function useAerialShow(enabled:boolean,tracking:boolean,muted:boolean){
 const pool=useRef<AerialPool|null>(null),mute=useRef(muted);mute.current=muted;
 const [state,setState]=useState<{shots:AerialShot[];ready:boolean}>({shots:[],ready:false});
 useEffect(()=>{
  if(!enabled){setState({shots:[],ready:false});return;}
  const active=new AerialPool(Array.from({length:4},()=>createAudioPlayer(AUDIO.aerial,{updateInterval:100})),()=>Date.now(),timing('aerial').peak-1.2);
  pool.current=active;active.setMuted(mute.current);
  const timer=setInterval(()=>{
   const shots=active.snapshot(timing('aerial').duration),ready=active.ready;
   setState(old=>shots.length||old.shots.length||old.ready!==ready?{shots,ready}:old);
  },40);
  return ()=>{clearInterval(timer);pool.current=null;active.dispose();};
 },[enabled]);
 const clear=useCallback(()=>{pool.current?.clear();setState(old=>({...old,shots:[]}));},[]);
 useEffect(()=>{if(!tracking)clear();},[tracking,clear]);
 useEffect(()=>{pool.current?.setMuted(muted);},[muted]);
 const launch=useCallback(async(origin:Vec3,target:Vec3,valid:()=>boolean)=>{
  const active=pool.current;if(!active)return false;
  const ok=await active.launch(origin,target,valid);
  if(active===pool.current)setState({shots:active.snapshot(timing('aerial').duration),ready:active.ready});
  return ok;
 },[]);
 return {...state,clear,launch};
}
