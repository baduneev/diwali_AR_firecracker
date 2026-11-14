import {test} from 'node:test';
import assert from 'node:assert/strict';
import React,{useEffect} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {useRendererMode,type RendererMode} from '../src/use-renderer-mode';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;

test('renderer handoff retires AR before creating Studio, including an intervening support check',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 let change!:(mode:RendererMode)=>void;const events:string[]=[];
 function NativeBoundary({mode}:{mode:string}){useEffect(()=>{events.push('mount '+mode);return ()=>{events.push('dispose '+mode);};},[mode]);return null;}
 function App(){const [mode,setMode]=useRendererMode();change=setMode;return mode==='ar'||mode==='studio'?React.createElement(NativeBoundary,{key:mode,mode}):null;}
 let app!:ReactTestRenderer;
 act(()=>{app=create(React.createElement(App));});
 try{
  act(()=>change('ar'));act(()=>change('studio'));
  assert.deepEqual(events,['mount ar','dispose ar'],'A native replacement cannot initialize in the retiring renderer commit');
  act(()=>t.mock.timers.tick(500));assert.deepEqual(events,['mount ar','dispose ar','mount studio']);
  act(()=>change('checking'));act(()=>t.mock.timers.tick(100));act(()=>change('ar'));
  assert.equal(events.at(-1),'dispose studio','A fast support check must not bypass native cleanup');
  act(()=>t.mock.timers.tick(500));assert.equal(events.at(-1),'mount ar');
 }finally{act(()=>app.unmount());}
});

test('a cancelled renderer transition cannot reopen a scene over a newer mode',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});let change!:(mode:RendererMode)=>void;let observed='';
 function App(){const [mode,setMode]=useRendererMode();change=setMode;observed=mode;return null;}
 let app!:ReactTestRenderer;act(()=>{app=create(React.createElement(App));});
 try{act(()=>change('ar'));act(()=>change('studio'));act(()=>change('permission'));act(()=>t.mock.timers.tick(1000));assert.equal(observed,'permission');}
 finally{act(()=>app.unmount());}
});
