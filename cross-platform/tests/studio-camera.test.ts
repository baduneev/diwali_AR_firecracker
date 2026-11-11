import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_VIEW,cameraPose,orbitView,zoomView,beginGesture,moveGesture,isPlacementTap} from '../src/studio-camera';

const touch=(x:number,y:number)=>({x,y});
test('a quarter orbit moves the viewpoint around the object and keeps the lens aimed at it',()=>{
 const pose=cameraPose({...DEFAULT_VIEW,yaw:90,pitch:30,distance:1});
 assert.ok(Math.abs(pose.position[0]-Math.sqrt(3)/2)<1e-9);
 assert.ok(Math.abs(pose.position[1]-.56)<1e-9);
 assert.ok(Math.abs(pose.position[2])<1e-9);
 assert.deepEqual(pose.rotation,[-30,90,0]);
});
test('drag changes azimuth and elevation but cannot move the camera below the floor',()=>{
 const view=orbitView(DEFAULT_VIEW,100,50);
 assert.equal(view.yaw,1);assert.equal(view.pitch,46.5);
 assert.equal(orbitView(view,0,-10000).pitch,8);
 assert.equal(orbitView(view,0,10000).pitch,85);
});
test('zoom stops before clipping through a model and allows a wider view',()=>{
 assert.equal(zoomView(DEFAULT_VIEW,2).distance,.37);
 assert.equal(zoomView(DEFAULT_VIEW,100).distance,.22);
 assert.equal(zoomView(DEFAULT_VIEW,.001).distance,6);
 assert.deepEqual(zoomView(DEFAULT_VIEW,0),DEFAULT_VIEW);
});
test('screen drag orbits without placing, even if the finger returns to its starting point',()=>{
 let g=beginGesture(DEFAULT_VIEW,[touch(100,100)],0);
 g=moveGesture(g,[touch(200,150)]);
 assert.notDeepEqual(g.view,DEFAULT_VIEW);
 g=moveGesture(g,[touch(100,100)]);
 assert.equal(isPlacementTap(g,100),false);
});
test('a short stationary tap places but a long press does not',()=>{
 const g=beginGesture(DEFAULT_VIEW,[touch(100,100)],0);
 assert.equal(isPlacementTap(g,200),true);
 assert.equal(isPlacementTap(g,700),false);
});
test('spreading fingers zooms without placement or a jump when returning to one finger',()=>{
 let g=beginGesture(DEFAULT_VIEW,[touch(100,100),touch(200,100)],0);
 g=moveGesture(g,[touch(50,100),touch(250,100)]);
 assert.equal(g.view.distance,.37);
 const pinched=g.view;
 g=moveGesture(g,[touch(250,100)]);
 assert.deepEqual(g.view,pinched);
 g=moveGesture(g,[touch(260,100)]);
 assert.equal(g.view.yaw,pinched.yaw-3.5);
 assert.equal(isPlacementTap(g,200),false);
});
test('adding a second finger during a tap cancels placement',()=>{
 const g=moveGesture(beginGesture(DEFAULT_VIEW,[touch(100,100)],0),[touch(100,100),touch(100,100)]);
 assert.equal(isPlacementTap(g,100),false);
 assert.ok(Number.isFinite(g.view.distance));
});
