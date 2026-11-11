import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {stripSurfaceFactories} from '../plugins/renderer-archive';
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
