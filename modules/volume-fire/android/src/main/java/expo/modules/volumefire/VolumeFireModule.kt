package expo.modules.volumefire

import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.Window
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VolumeFireModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  @Volatile private var observing = false
  private var wrappedWindow: Window? = null
  private var originalCallback: Window.Callback? = null
  private var buttonCallback: Window.Callback? = null

  override fun definition() = ModuleDefinition {
    Name("VolumeFire")
    Events("onVolumeButton")

    OnStartObserving("onVolumeButton") {
      observing = true
      mainHandler.post { installCallback() }
    }

    OnStopObserving("onVolumeButton") {
      observing = false
      mainHandler.post { restoreCallback() }
    }

    OnActivityEntersForeground {
      if (observing) mainHandler.post { installCallback() }
    }

    OnActivityEntersBackground {
      mainHandler.post { restoreCallback() }
    }

    OnDestroy {
      observing = false
      mainHandler.post { restoreCallback() }
    }
  }

  private fun installCallback() {
    if (!observing) return
    val window = appContext.currentActivity?.window ?: return
    if (wrappedWindow === window) return
    restoreCallback()

    val original = window.callback ?: return
    val wrapper = object : Window.Callback by original {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (observing && (event.keyCode == KeyEvent.KEYCODE_VOLUME_UP ||
              event.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN)) {
          if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
            val direction = if (event.keyCode == KeyEvent.KEYCODE_VOLUME_UP) "up" else "down"
            sendEvent("onVolumeButton", mapOf("direction" to direction))
          }
          // Consume both down and up so the press does not adjust system volume.
          return true
        }
        return original.dispatchKeyEvent(event)
      }
    }
    originalCallback = original
    buttonCallback = wrapper
    wrappedWindow = window
    window.callback = wrapper
  }

  private fun restoreCallback() {
    val window = wrappedWindow ?: return
    // Another module may have replaced the callback; leave its owner intact.
    if (window.callback === buttonCallback) window.callback = originalCallback
    wrappedWindow = null
    originalCallback = null
    buttonCallback = null
  }
}
