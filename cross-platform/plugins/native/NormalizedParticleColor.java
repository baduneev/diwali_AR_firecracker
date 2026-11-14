package com.viromedia.bridge.component.node.control;

/** Colour boundary shared by initial ranges and interpolation endpoints. */
public final class NormalizedParticleColor {
    private NormalizedParticleColor() {}
    public static float[] fromArgb(int argb) {
        return new float[]{((argb >>> 16) & 255) / 255f, ((argb >>> 8) & 255) / 255f, (argb & 255) / 255f};
    }
}
