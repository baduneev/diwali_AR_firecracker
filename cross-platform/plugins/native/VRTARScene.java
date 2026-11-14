//  Copyright © 2017 Viro Media. All rights reserved.
//
//  Permission is hereby granted, free of charge, to any person obtaining
//  a copy of this software and associated documentation files (the
//  "Software"), to deal in the Software without restriction, including
//  without limitation the rights to use, copy, modify, merge, publish,
//  distribute, sublicense, and/or sell copies of the Software, and to
//  permit persons to whom the Software is furnished to do so, subject to
//  the following conditions:
//
//  The above copyright notice and this permission notice shall be included
//  in all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

package com.viromedia.bridge.component.node;

import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.viro.core.ARAnchor;
import com.viro.core.ARPlaneAnchor;
import java.util.LinkedHashMap;
import com.viro.core.internal.ARDeclarativeNode;

import com.viro.core.ARNode;
import com.viro.core.ARScene;
import com.viro.core.internal.Image;
import com.viro.core.Scene;
import com.viro.core.EventDelegate;

import com.viro.core.Quad;
import com.viro.core.Texture;
import com.viro.core.Vector;
import com.viro.core.ViroViewARCore;
import com.viromedia.bridge.utility.ARUtils;
import com.viromedia.bridge.utility.ImageDownloadListener;
import com.viromedia.bridge.utility.ImageDownloader;
import com.viromedia.bridge.utility.ViroEvents;

import java.util.EnumSet;

public class VRTARScene extends VRTScene implements ARScene.Listener {

    // ARCore color corrections are generally returned in the range 0.5 to 1.5; since they
    // go above 1.0, they are not compatible with with hexadecimal color representations
    // used in React. To compensate for this, rebalance the color corrections by multiplying
    // by this factor. Since doing this will reduce the intensity of the light, we also have
    // to then multiply the estimated intensity by the *inverse* of this factor.
    private static float kLightEstimateIntensityRebalance = 0.5f;

    private static final String AMBIENT_LIGHT_INFO_KEY = "ambientLightInfo";
    private static final String AMBIENT_INTENSITY_KEY = "intensity";
    private static final String AMBIENT_COLOR_KEY = "color";
    private Quad mPointCloudQuad;
    private PointCloudImageDownloadListener mImageDownloadListener;
    private Handler mMainHandler;

    // App-specific backpressure: retain only the newest native snapshot, before
    // allocating WritableMaps/polygon arrays or crossing the React bridge.
    private final Object mEventLock = new Object();
    private final LinkedHashMap<String, ARAnchor> mPendingPlanes = new LinkedHashMap<>();
    private boolean mPlaneFlushScheduled, mLightFlushScheduled, mBridgeClosed;
    private float mPendingIntensity;
    private Vector mPendingColor;
    private final Runnable mFlushPlanes = () -> {
        ARAnchor[] anchors;
        synchronized (mEventLock) {
            mPlaneFlushScheduled = false;
            if (mBridgeClosed) return;
            anchors = mPendingPlanes.values().toArray(new ARAnchor[0]);
            mPendingPlanes.clear();
        }
        for (ARAnchor anchor : anchors) emitAnchor(ViroEvents.ON_ANCHOR_UPDATED, anchor);
    };
    private final Runnable mFlushLight = () -> {
        float intensity;
        Vector color;
        synchronized (mEventLock) {
            mLightFlushScheduled = false;
            if (mBridgeClosed) return;
            intensity = mPendingIntensity;
            color = mPendingColor;
        }
        emitAmbientLight(intensity, color);
    };

    @Override
    public void onTearDown() {
        synchronized (mEventLock) {
            mBridgeClosed = true;
            mPendingPlanes.clear();
            mPendingColor = null;
        }
        mMainHandler.removeCallbacksAndMessages(null);
        super.onTearDown();
    }

    // Pending occlusion mode to apply when scene is ready
    private ARScene.OcclusionMode mPendingOcclusionMode = null;
    private boolean mSceneDidAppear = false;

    public VRTARScene(ReactContext reactContext) {
        super(reactContext);
        mMainHandler = new Handler(Looper.getMainLooper());
    }

    @Override
    protected Scene createSceneJni() {
        ARScene sceneControllerJni = new ARScene(true);
        sceneControllerJni.setListener(this);
        sceneControllerJni.setVisibilityListener(this);
        return sceneControllerJni;
    }

    public void setDisplayPointCloud(boolean displayPointCloud) {
        ((ARScene) mNativeScene).displayPointCloud(displayPointCloud);
    }

    public void setPointCloudImage(ReadableMap pointCloudImage) {
        // If there's another download still running, invalidate it.
        if (mImageDownloadListener != null) {
            mImageDownloadListener.invalidate();
        }

        if (pointCloudImage == null) {
            ((ARScene) mNativeScene).resetPointCloudSurface();

            if (mPointCloudQuad != null) {
                mPointCloudQuad.dispose();
                mPointCloudQuad = null;
            }

            return;
        }

        final ImageDownloader downloader = new ImageDownloader(getContext());
        downloader.setTextureFormat(Texture.Format.RGBA8);

        mImageDownloadListener = new PointCloudImageDownloadListener();
        downloader.getImageAsync(pointCloudImage, mImageDownloadListener);
    }

    public void setPointCloudScale(Vector pointCloudScale) {
        ((ARScene) mNativeScene).setPointCloudSurfaceScale(pointCloudScale);
    }

    public void setPointCloudMaxPoints(int maxPoints) {
        ((ARScene) mNativeScene).setPointCloudMaxPoints(maxPoints);
    }

    public void addARNode(ARDeclarativeNode node) {
        ((ARScene) mNativeScene).addARDeclarativeNode(node);
    }

    public void updateARNode(ARDeclarativeNode node) {
        ((ARScene) mNativeScene).updateARDeclarativeNode(node);
    }

    public void removeARNode(ARDeclarativeNode node) {
        ((ARScene) mNativeScene).removeARDeclarativeNode(node);
    }

    public void setAnchorDetectionTypes(ReadableArray types) {
        EnumSet<ViroViewARCore.AnchorDetectionType> typesList = EnumSet.noneOf(ViroViewARCore.AnchorDetectionType.class);
        if (types != null) {
            for (int i = 0; i < types.size(); i++) {
                ViroViewARCore.AnchorDetectionType type = ViroViewARCore.AnchorDetectionType.valueFromString(types.getString(i));
                if (type != null) {
                    typesList.add(type);
                }
            }
        }
        ((ARScene) mNativeScene).setAnchorDetectionTypes(typesList);
    }

    public void setCanCameraARHitTest(boolean canCameraHitTest){
        mEventDelegateJni.setEventEnabled(EventDelegate.EventAction.ON_CAMERA_AR_HIT_TEST, canCameraHitTest);
    }

    public void setCanARPointCloudUpdate(boolean canARPointCloudUpdate) {
        mEventDelegateJni.setEventEnabled(EventDelegate.EventAction.ON_AR_POINT_CLOUD_UPDATE, canARPointCloudUpdate);
    }

    public void setOcclusionMode(ARScene.OcclusionMode mode) {
        mPendingOcclusionMode = mode;
        if (mSceneDidAppear) {
            ((ARScene) mNativeScene).setOcclusionMode(mode);
        }
    }

    @Override
    public void onSceneDidAppear() {
        super.onSceneDidAppear();
        mSceneDidAppear = true;
        if (mPendingOcclusionMode != null) {
            ((ARScene) mNativeScene).setOcclusionMode(mPendingOcclusionMode);
        }
    }

    // -- ARSceneDelegate Implementation --

    @Override
    public void onTrackingUpdated(ARScene.TrackingState state, ARScene.TrackingStateReason reason) {
        WritableMap returnMap = Arguments.createMap();
        returnMap.putInt("state", state.getId());
        returnMap.putInt("reason", reason.getId());

        mReactContext.getJSModule(RCTEventEmitter.class).receiveEvent(
                getId(),
                ViroEvents.ON_TRACKING_UPDATED,
                returnMap);
    }

    @Override
    public void onTrackingInitialized() {
        //No-op
    }

    @Override
    public void onAmbientLightUpdate(float intensity, Vector color) {
        synchronized (mEventLock) {
            if (mBridgeClosed) return;
            mPendingIntensity = intensity;
            mPendingColor = new Vector(color.x, color.y, color.z);
            if (!mLightFlushScheduled) {
                mLightFlushScheduled = true;
                mMainHandler.postDelayed(mFlushLight, 200);
            }
        }
    }

    private void emitAmbientLight(float intensity, Vector color) {
        // Multiply by the inverse of the rebalancing factor to compensate for the
        // brightness reduction caused by rebalancing color correction.
        float lightIntensity = intensity * 1.0f / kLightEstimateIntensityRebalance;

        // ARCore returns light values in gamma space in the range 0.5 to 1.5. First convert
        // to linear color, then rebalance so the values do not breach 1.0. The brightness is
        // diminished but this is compensated by multiplying estimated intensity by the inverse
        // of the rebalance constant (above).
        String lightColor = String.format("#%02x%02x%02x",
                (int) Math.min(255, Math.max(0, color.x * kLightEstimateIntensityRebalance * 255)),
                (int) Math.min(255, Math.max(0, color.y * kLightEstimateIntensityRebalance * 255)),
                (int) Math.min(255, Math.max(0, color.z * kLightEstimateIntensityRebalance * 255)));

        WritableMap lightInfoMap = Arguments.createMap();
        lightInfoMap.putDouble(AMBIENT_INTENSITY_KEY, (double) lightIntensity);
        lightInfoMap.putString(AMBIENT_COLOR_KEY, lightColor);

        WritableMap event = Arguments.createMap();
        event.putMap(AMBIENT_LIGHT_INFO_KEY, lightInfoMap);

        mReactContext.getJSModule(RCTEventEmitter.class).receiveEvent(
                getId(),
                ViroEvents.ON_AMBIENT_LIGHT_UPDATE,
                event);
    }

    // Scene discovery uses bounds and pose, never polygon vertices. Plane
    // components still use the SDK's full ARUtils payload independently.
    private WritableMap sceneAnchor(ARAnchor anchor) {
        if (!(anchor instanceof ARPlaneAnchor)) return ARUtils.mapFromARAnchor(anchor);
        ARPlaneAnchor plane = (ARPlaneAnchor) anchor;
        WritableMap map = Arguments.createMap();
        map.putString("anchorId", anchor.getAnchorId());
        map.putString("type", anchor.getType().getStringValue());
        map.putArray("position", Arguments.makeNativeArray(anchor.getPosition().toArray()));
        map.putArray("scale", Arguments.makeNativeArray(anchor.getScale().toArray()));
        Vector r = anchor.getRotation();
        map.putArray("rotation", Arguments.makeNativeArray(new float[]{
            (float)Math.toDegrees(r.x), (float)Math.toDegrees(r.y), (float)Math.toDegrees(r.z)}));
        map.putArray("center", Arguments.makeNativeArray(plane.getCenter().toArray()));
        map.putDouble("width", plane.getExtent().x);
        map.putDouble("height", plane.getExtent().z);
        map.putString("alignment", plane.getAlignment().getStringValue());
        map.putString("classification", plane.getClassification().getStringValue());
        return map;
    }

    private void emitAnchor(String event, ARAnchor anchor) {
        synchronized (mEventLock) { if (mBridgeClosed) return; }
        WritableMap map = Arguments.createMap();
        map.putMap("anchor", sceneAnchor(anchor));
        mReactContext.getJSModule(RCTEventEmitter.class).receiveEvent(getId(), event, map);
    }

    @Override
    public void onAnchorFound(ARAnchor anchor, ARNode node) {
        synchronized (mEventLock) { mPendingPlanes.remove(anchor.getAnchorId()); }
        emitAnchor(ViroEvents.ON_ANCHOR_FOUND, anchor);
    }

    @Override
    public void onAnchorUpdated(ARAnchor anchor, ARNode node) {
        if (!(anchor instanceof ARPlaneAnchor)) {
            emitAnchor(ViroEvents.ON_ANCHOR_UPDATED, anchor);
            return;
        }
        synchronized (mEventLock) {
            if (mBridgeClosed) return;
            String id = anchor.getAnchorId();
            mPendingPlanes.remove(id);
            mPendingPlanes.put(id, anchor);
            while (mPendingPlanes.size() > 8) mPendingPlanes.remove(mPendingPlanes.keySet().iterator().next());
            if (!mPlaneFlushScheduled) {
                mPlaneFlushScheduled = true;
                mMainHandler.postDelayed(mFlushPlanes, 100);
            }
        }
    }

    @Override
    public void onAnchorRemoved(ARAnchor anchor, ARNode node) {
        synchronized (mEventLock) { mPendingPlanes.remove(anchor.getAnchorId()); }
        emitAnchor(ViroEvents.ON_ANCHOR_REMOVED, anchor);
    }

    private class PointCloudImageDownloadListener implements ImageDownloadListener {
        private boolean mIsValid = true;

        public void invalidate() {
            mIsValid = false;
        }

        @Override
        public boolean isValid() {
            return mIsValid;
        }

        @Override
        public void completed(final Bitmap result) {
            mMainHandler.post(new Runnable() {
                @Override
                public void run() {
                    if (!mIsValid) {
                        return;
                    }

                    if (mPointCloudQuad == null) {
                        mPointCloudQuad = new Quad(1, 1);
                    }

                    Image image = new Image(result, Texture.Format.RGBA8);
                    Texture texture = new Texture(image, true, false, null);
                    mPointCloudQuad.setImageTexture(texture);

                    if (!isTornDown()) {
                    ((ARScene) mNativeScene).setPointCloudQuad(mPointCloudQuad);
                    }
                }
            });
        }

        @Override
        public void failed(String error) {
            throw new IllegalStateException("Unable to download point cloud image. Error: [" + error + "].");
        }
    }
}
