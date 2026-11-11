// Emulator-only gesture injector run as adb shell, never included in the app.
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.InputEvent;
import android.view.MotionEvent;
import java.lang.reflect.Method;

public class StudioPinch {
    public static void main(String[] args) throws Exception {
        Class<?> manager = Class.forName("android.hardware.input.InputManagerGlobal");
        Object input = manager.getMethod("getInstance").invoke(null);
        Method inject = manager.getMethod("injectInputEvent", InputEvent.class, int.class);
        long start = SystemClock.uptimeMillis();
        send(input, inject, start, MotionEvent.ACTION_DOWN, 1, 80);
        send(input, inject, start, MotionEvent.ACTION_POINTER_DOWN | (1 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 2, 80);
        for (int i = 0; i <= 20; i++) {
            send(input, inject, start, MotionEvent.ACTION_MOVE, 2, 80 + i * 4);
            Thread.sleep(30);
        }
        send(input, inject, start, MotionEvent.ACTION_POINTER_UP | (1 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 2, 160);
        send(input, inject, start, MotionEvent.ACTION_UP, 1, 160);
    }
    private static void send(Object input, Method inject, long start, int action, int count, float halfSpan) throws Exception {
        MotionEvent.PointerProperties[] properties = new MotionEvent.PointerProperties[count];
        MotionEvent.PointerCoords[] coords = new MotionEvent.PointerCoords[count];
        for (int i = 0; i < count; i++) {
            properties[i] = new MotionEvent.PointerProperties();
            properties[i].id = i;
            properties[i].toolType = MotionEvent.TOOL_TYPE_FINGER;
            coords[i] = new MotionEvent.PointerCoords();
            coords[i].x = 360 + (i == 0 ? -halfSpan : halfSpan);
            coords[i].y = 650;
            coords[i].pressure = 1;
            coords[i].size = .1f;
        }
        MotionEvent event = MotionEvent.obtain(start, SystemClock.uptimeMillis(), action, count, properties, coords, 0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        if (!Boolean.TRUE.equals(inject.invoke(input, event, 2))) throw new IllegalStateException("Gesture injection failed");
        event.recycle();
    }
}
