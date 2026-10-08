import AVFAudio
import ExpoModulesCore
import MediaPlayer
import UIKit

public class VolumeFireModule: Module {
  private var hasListeners = false
  private var isForeground = true
  private var volumeObservation: NSKeyValueObservation?
  private var volumeView: MPVolumeView?
  private var volumeSlider: UISlider?
  private var originalVolume: Float?
  private var resetVolume: Float?
  private var pendingResetVolume: Float?

  public func definition() -> ModuleDefinition {
    Name("VolumeFire")
    Events("onVolumeButton")

    OnStartObserving("onVolumeButton") { [weak self] in
      self?.onMain {
        guard let self else { return }
        self.hasListeners = true
        self.startObservingVolume()
      }
    }

    OnStopObserving("onVolumeButton") { [weak self] in
      self?.onMain {
        guard let self else { return }
        self.hasListeners = false
        self.stopObservingVolume()
      }
    }

    OnAppEntersBackground { [weak self] in
      self?.onMain {
        guard let self else { return }
        self.isForeground = false
        self.stopObservingVolume()
      }
    }

    OnAppBecomesActive { [weak self] in
      self?.onMain {
        guard let self else { return }
        self.isForeground = true
        self.startObservingVolume()
      }
    }

    OnDestroy { [weak self] in
      self?.onMain {
        guard let self else { return }
        self.hasListeners = false
        self.stopObservingVolume()
      }
    }
  }

  private func startObservingVolume() {
    guard hasListeners, isForeground, volumeObservation == nil,
          UIApplication.shared.applicationState == .active else { return }

    let session = AVAudioSession.sharedInstance()
    // Keep Expo's playback category once it has configured duel audio.
    if session.category == .soloAmbient { _ = try? session.setCategory(.ambient) }
    let canReset = (try? session.setActive(true)) != nil

    if canReset, let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .flatMap(\.windows)
      .first(where: \.isKeyWindow) {
      let view = MPVolumeView(frame: CGRect(x: 0, y: 0, width: 100, height: 30))
      view.alpha = 0.0001
      view.showsRouteButton = false
      window.addSubview(view)
      view.layoutIfNeeded()
      if let slider = view.subviews.compactMap({ $0 as? UISlider }).first {
        volumeView = view
        volumeSlider = slider
        let baseline = session.outputVolume
        originalVolume = baseline
        // Leave room for a volume press at either endpoint.
        resetVolume = baseline <= 0.05 || baseline >= 0.95 ? 0.5 : baseline
      } else {
        view.removeFromSuperview()
      }
    }

    volumeObservation = session.observe(
      \.outputVolume,
      options: [.old, .new]
    ) { [weak self] _, change in
      guard let oldVolume = change.oldValue,
            let newVolume = change.newValue,
            oldVolume != newVolume else { return }

      self?.onMain {
        guard let self, self.hasListeners, self.isForeground,
              UIApplication.shared.applicationState == .active else { return }
        // The slider reset is a volume change, not another button press.
        if let pending = self.pendingResetVolume {
          self.pendingResetVolume = nil
          if abs(newVolume - pending) < 0.04 { return }
        }
        let direction = newVolume > oldVolume ? "up" : "down"
        self.sendEvent("onVolumeButton", ["direction": direction])
        if let baseline = self.resetVolume {
          self.pendingResetVolume = baseline
          self.volumeSlider?.setValue(baseline, animated: false)
          self.volumeSlider?.sendActions(for: .valueChanged)
        }
      }
    }
    if let slider = volumeSlider, let baseline = resetVolume,
      abs(session.outputVolume - baseline) > 0.04 {
      pendingResetVolume = baseline
      slider.setValue(baseline, animated: false)
      slider.sendActions(for: .valueChanged)
    }
  }

  private func stopObservingVolume() {
    volumeObservation?.invalidate()
    volumeObservation = nil
    if let original = originalVolume {
      volumeSlider?.setValue(original, animated: false)
      volumeSlider?.sendActions(for: .valueChanged)
    }
    volumeView?.removeFromSuperview()
    volumeView = nil
    volumeSlider = nil
    originalVolume = nil
    resetVolume = nil
    pendingResetVolume = nil
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync(execute: work)
    }
  }
}
