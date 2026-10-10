package expo.modules.localonlyhotspot

import android.content.Context
import android.net.ConnectivityManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.Inet4Address
import java.net.NetworkInterface

class LocalOnlyHotspotModule : Module() {
  private var reservation: WifiManager.LocalOnlyHotspotReservation? = null
  private var activeNetwork: Map<String, String>? = null
  private var stopRequested = false

  override fun definition() = ModuleDefinition {
    Name("LocalOnlyHotspot")

    AsyncFunction("startAsync") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.reject(
          "ERR_UNSUPPORTED_ANDROID_VERSION",
          "Local-only hotspots require Android 8.0 or newer.",
          null
        )
        return@AsyncFunction
      }

      activeNetwork?.let {
        promise.resolve(it)
        return@AsyncFunction
      }
      stopRequested = false

      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_NO_ACTIVITY", "Android application context is unavailable.", null)
        return@AsyncFunction
      }
      val wifiManager = context.applicationContext
        .getSystemService(Context.WIFI_SERVICE) as WifiManager

      try {
        val connectivityManager = context.applicationContext
          .getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        // ponytail: a shared hotspot already running before this request is
        // rejected; supporting it needs platform hotspot-interface identification.
        val addressesBeforeStart = localIpv4Addresses()
        wifiManager.startLocalOnlyHotspot(
          object : WifiManager.LocalOnlyHotspotCallback() {
            override fun onStarted(hotspotReservation: WifiManager.LocalOnlyHotspotReservation) {
              if (stopRequested) {
                hotspotReservation.close()
                promise.reject(
                  "ERR_HOTSPOT_CANCELLED",
                  "Hotspot creation was cancelled.",
                  null
                )
                return
              }
              val credentials = credentialsFrom(hotspotReservation)
              val hostIp = selectHotspotIpv4(
                addressesBeforeStart,
                localIpv4Addresses(),
                connectedIpv4Addresses(connectivityManager)
              )
              if (credentials == null || hostIp == null) {
                hotspotReservation.close()
                promise.reject(
                  "ERR_HOTSPOT_DETAILS",
                  "Android created a hotspot but its credentials or a unique hotspot IPv4 address were unavailable.",
                  null
                )
                return
              }

              reservation = hotspotReservation
              activeNetwork = mapOf(
                "ssid" to credentials.first,
                "password" to credentials.second,
                "hostIp" to hostIp
              )
              promise.resolve(activeNetwork)
            }

            override fun onStopped() {
              reservation = null
              activeNetwork = null
            }

            override fun onFailed(reason: Int) {
              promise.reject(
                "ERR_HOTSPOT_START_$reason",
                "Android could not start a local-only hotspot (reason $reason).",
                null
              )
            }
          },
          Handler(Looper.getMainLooper())
        )
      } catch (error: SecurityException) {
        promise.reject(
          "ERR_HOTSPOT_PERMISSION",
          "Android denied permission to create a local-only hotspot.",
          error
        )
      }
    }

    Function("stop") {
      stopHotspot()
    }

    OnDestroy {
      stopHotspot()
    }
  }

  @Suppress("DEPRECATION")
  private fun credentialsFrom(
    hotspotReservation: WifiManager.LocalOnlyHotspotReservation
  ): Pair<String, String>? {
    val ssid: String?
    val password: String?
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      ssid = hotspotReservation.softApConfiguration.ssid
      password = hotspotReservation.softApConfiguration.passphrase
    } else {
      ssid = hotspotReservation.wifiConfiguration?.SSID?.trim('"')
      password = hotspotReservation.wifiConfiguration?.preSharedKey?.trim('"')
    }
    return if (ssid.isNullOrBlank() || password.isNullOrBlank()) {
      null
    } else {
      Pair(ssid, password)
    }
  }

  private fun localIpv4Addresses(): Set<Inet4Address> {
    val interfaces = NetworkInterface.getNetworkInterfaces() ?: return emptySet()
    val result = mutableSetOf<Inet4Address>()
    while (interfaces.hasMoreElements()) {
      val networkInterface = interfaces.nextElement()
      if (!networkInterface.isUp || networkInterface.isLoopback) continue
      val addresses = networkInterface.inetAddresses
      while (addresses.hasMoreElements()) {
        val address = addresses.nextElement()
        if (address is Inet4Address && !address.isLoopbackAddress && address.isSiteLocalAddress) {
          result.add(address)
        }
      }
    }
    return result
  }

  // These are one-shot snapshots, not a network-change subscription.
  @Suppress("DEPRECATION")
  private fun connectedIpv4Addresses(manager: ConnectivityManager): Set<Inet4Address> {
    val result = mutableSetOf<Inet4Address>()
    for (network in manager.allNetworks) {
      val properties = manager.getLinkProperties(network) ?: continue
      for (linkAddress in properties.linkAddresses) {
        val address = linkAddress.address
        if (address is Inet4Address) result.add(address)
      }
    }
    return result
  }

  private fun stopHotspot() {
    stopRequested = true
    reservation?.close()
    reservation = null
    activeNetwork = null
  }
}
