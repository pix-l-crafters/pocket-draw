import AVFAudio
import ExpoModulesCore
import UIKit

public class VolumeFireModule: Module {
  private var hasListeners = false
  private var isForeground = true
  private var volumeObservation: NSKeyValueObservation?

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

    volumeObservation = AVAudioSession.sharedInstance().observe(
      \.outputVolume,
      options: [.old, .new]
    ) { [weak self] _, change in
      guard let oldVolume = change.oldValue,
            let newVolume = change.newValue,
            oldVolume != newVolume else { return }

      let direction = newVolume > oldVolume ? "up" : "down"
      self?.onMain {
        guard let self, self.hasListeners, self.isForeground,
              UIApplication.shared.applicationState == .active else { return }
        self.sendEvent("onVolumeButton", ["direction": direction])
      }
    }
  }

  private func stopObservingVolume() {
    volumeObservation?.invalidate()
    volumeObservation = nil
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync(execute: work)
    }
  }
}
