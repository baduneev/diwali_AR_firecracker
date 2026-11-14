import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {stripSurfaceFactories,stripSceneBridge,stripParticleBridge} from '../plugins/renderer-archive';

test('particle bridge colour repair preserves its manager and other scene classes',()=>{
 const prefix='com/viromedia/bridge/component/node/control/VRTParticleEmitter';
 const aar=zipSync({'classes.jar':zipSync({[`${prefix}.class`]:strToU8('old emitter'),[`${prefix}$ImageParticleDownloadListener.class`]:strToU8('old callback'),[`${prefix}Manager.class`]:strToU8('keep manager'),'com/viro/core/ParticleEmitter.class':strToU8('keep renderer')})});
 const result=stripParticleBridge(aar),classes=unzipSync(unzipSync(result)['classes.jar']!);
 assert.equal(classes[`${prefix}.class`],undefined);assert.equal(classes[`${prefix}$ImageParticleDownloadListener.class`],undefined);
 assert.equal(strFromU8(classes[`${prefix}Manager.class`]!),'keep manager');assert.equal(strFromU8(classes['com/viro/core/ParticleEmitter.class']!),'keep renderer');
 assert.deepEqual(stripParticleBridge(result),result);
});
test('replaceable EGL factories are removed without discarding renderer libraries',()=>{
 const jar=zipSync({'com/viro/core/ViroEGLWindowSurfaceFactory.class':strToU8('old factory'),'com/viro/core/ViroEGLTextureWindowSurfaceFactory.class':strToU8('old texture factory'),'com/viro/core/Renderer.class':strToU8('retain')});
 const aar=zipSync({'classes.jar':jar,'jni/arm64-v8a/libviro_renderer.so':strToU8('native bytes'),'AndroidManifest.xml':strToU8('manifest')});
 const patched=unzipSync(stripSurfaceFactories(aar)),classes=unzipSync(patched['classes.jar']!);
 assert.equal(classes['com/viro/core/ViroEGLWindowSurfaceFactory.class'],undefined);
 assert.equal(classes['com/viro/core/ViroEGLTextureWindowSurfaceFactory.class'],undefined);
 assert.equal(strFromU8(classes['com/viro/core/Renderer.class']!),'retain');
 assert.equal(strFromU8(patched['jni/arm64-v8a/libviro_renderer.so']!),'native bytes');
 assert.equal(strFromU8(patched['AndroidManifest.xml']!),'manifest');
 assert.deepEqual(unzipSync(stripSurfaceFactories(stripSurfaceFactories(aar))),patched);
});

test('native scene backpressure replacement removes its nested classes and preserves other bridge code',()=>{
 const jar=zipSync({
  'com/viromedia/bridge/component/node/VRTARScene.class':strToU8('old scene'),
  'com/viromedia/bridge/component/node/VRTARScene$1.class':strToU8('old callback'),
  'com/viromedia/bridge/component/node/VRTARScene$PointCloudImageDownloadListener.class':strToU8('old listener'),
  'com/viromedia/bridge/component/node/VRTARSceneManager.class':strToU8('keep manager'),
  'com/viromedia/bridge/component/node/VRTNode.class':strToU8('keep automatic point anchoring'),
 });
 const aar=zipSync({'classes.jar':jar,'AndroidManifest.xml':strToU8('manifest')});
 const patched=unzipSync(stripSceneBridge(aar)),classes=unzipSync(patched['classes.jar']!);
 assert.equal(classes['com/viromedia/bridge/component/node/VRTARScene.class'],undefined);
 assert.equal(classes['com/viromedia/bridge/component/node/VRTARScene$1.class'],undefined);
 assert.equal(classes['com/viromedia/bridge/component/node/VRTARScene$PointCloudImageDownloadListener.class'],undefined);
 assert.equal(strFromU8(classes['com/viromedia/bridge/component/node/VRTARSceneManager.class']!),'keep manager');
 assert.equal(strFromU8(classes['com/viromedia/bridge/component/node/VRTNode.class']!),'keep automatic point anchoring');
 assert.deepEqual(unzipSync(stripSceneBridge(stripSceneBridge(aar))),patched);
});
