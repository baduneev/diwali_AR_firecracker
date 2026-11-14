import {useCallback,useEffect,useRef,useState} from 'react';
export type RendererMode='checking'|'ar'|'unsupported'|'studio'|'permission'|'switching';
const active=(mode:RendererMode)=>mode==='ar'||mode==='studio';

/** Viro's Android renderer owns process-global asset/GL state. Retire its view
 * in a separate commit before another navigator starts creating textures. */
export function useRendererMode():[RendererMode,(mode:RendererMode)=>void]{
 const [mode,commit]=useState<RendererMode>('checking');
 const current=useRef(mode),retired=useRef(-Infinity),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 current.current=mode;
 useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);},[]);
 const change=useCallback((next:RendererMode)=>{
  if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}
  if(current.current===next)return;
  if(active(current.current))retired.current=Date.now();
  const remaining=500-(Date.now()-retired.current);
  if(active(next)&&remaining>0){
   current.current='switching';commit('switching');
   timer.current=setTimeout(()=>{timer.current=null;current.current=next;commit(next);},remaining);
  }else{current.current=next;commit(next);}
 },[]);
 return [mode,change];
}
