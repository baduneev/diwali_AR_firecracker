package com.viro.core;

import android.opengl.GLSurfaceView;
import javax.microedition.khronos.egl.*;

/** Prefer the renderer's sRGB surface, with a default-colorspace fallback. */
public class ViroEGLWindowSurfaceFactory implements GLSurfaceView.EGLWindowSurfaceFactory {
    public EGLSurface createWindowSurface(EGL10 egl,EGLDisplay display,EGLConfig config,Object window) {
        EGLSurface surface=egl.eglCreateWindowSurface(display,config,window,new int[]{0x309D,0x3089,EGL10.EGL_NONE});
        if(surface==null || surface==EGL10.EGL_NO_SURFACE) {
            egl.eglGetError();
            surface=egl.eglCreateWindowSurface(display,config,window,null);
        }
        return surface;
    }
    public void destroySurface(EGL10 egl,EGLDisplay display,EGLSurface surface) {
        egl.eglDestroySurface(display,surface);
    }
}
