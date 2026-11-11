import type {Vec3} from './core';

export type StudioView={yaw:number;pitch:number;distance:number};
export type TouchPoint={x:number;y:number};
export const DEFAULT_VIEW:StudioView={yaw:36,pitch:29,distance:.74};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function orbitView(view:StudioView,dx:number,dy:number):StudioView {
 return {...view,yaw:((view.yaw-dx*.35)%360+360)%360,pitch:clamp(view.pitch+dy*.35,8,85)};
}
export function zoomView(view:StudioView,factor:number):StudioView {
 return Number.isFinite(factor)&&factor>0?{...view,distance:clamp(view.distance/factor,.22,6)}:view;
}
/** Camera looks along -Z; match Euler orientation to its spherical position. */
export function cameraPose(view:StudioView):{position:Vec3;rotation:Vec3} {
 const yaw=view.yaw*Math.PI/180,pitch=view.pitch*Math.PI/180;
 return {position:[view.distance*Math.cos(pitch)*Math.sin(yaw),.06+view.distance*Math.sin(pitch),view.distance*Math.cos(pitch)*Math.cos(yaw)],rotation:[-view.pitch,view.yaw,0]};
}
export type StudioGesture={view:StudioView;previous:TouchPoint[];start:TouchPoint|undefined;started:number;tap:boolean};
export function beginGesture(view:StudioView,points:TouchPoint[],now:number):StudioGesture {
 return {view,previous:points,start:points[0],started:now,tap:points.length===1};
}
const span=(points:TouchPoint[])=>Math.hypot(points[0]!.x-points[1]!.x,points[0]!.y-points[1]!.y);
export function moveGesture(g:StudioGesture,points:TouchPoint[]):StudioGesture {
 let view=g.view;
 const sameCount=points.length===g.previous.length;
 if(sameCount&&points.length===1)view=orbitView(view,points[0]!.x-g.previous[0]!.x,points[0]!.y-g.previous[0]!.y);
 if(sameCount&&points.length===2&&span(g.previous)>1)view=zoomView(view,span(points)/span(g.previous));
 const first=points[0];
 const tap=g.tap&&points.length===1&&!!first&&!!g.start&&Math.hypot(first.x-g.start.x,first.y-g.start.y)<6;
 return {...g,view,previous:points,tap};
}
export const isPlacementTap=(g:StudioGesture,now:number)=>g.tap&&now-g.started<350;
