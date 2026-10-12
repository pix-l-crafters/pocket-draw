package expo.modules.localonlyhotspot

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
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
        addressesBeforeStart.addAll(connectedIpv4Addresses(connectivityManager).keys)
        val handler = Handler(Looper.getMainLooper())
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
              if (credentials == null) {
                hotspotReservation.close()
                promise.reject(
                  "ERR_HOTSPOT_DETAILS",
                  "Android created a hotspot but its credentials were unavailable.",
                  null
                )
                return
              }

              reservation = hotspotReservation
              val deadline = SystemClock.elapsedRealtime() + 5000
              // The callback can precede publication of the interface address.
              val resolveAddress = object : Runnable {
                override fun run() {
                  if (stopRequested || reservation !== hotspotReservation) {
                    hotspotReservation.close()
                    promise.reject("ERR_HOTSPOT_CANCELLED", "Hotspot creation was cancelled.", null)
                    return
                  }
                  val hostIp = selectHotspotIpv4(
                    addressesBeforeStart,
                    localIpv4Addresses(),
                    connectedIpv4Addresses(connectivityManager)
                  )
                  if (hostIp != null) {
                    activeNetwork = mapOf(
                      "ssid" to credentials.first,
                      "password" to credentials.second,
                      "hostIp" to hostIp
                    )
                    promise.resolve(activeNetwork)
                    return
                  }
                  if (SystemClock.elapsedRealtime() >= deadline) {
                    stopHotspot()
                    promise.reject(
                      "ERR_HOTSPOT_DETAILS",
                      "Android created a hotspot but a unique hotspot IPv4 address was unavailable.",
                      null
                    )
                    return
                  }
                  handler.postDelayed(this, 100)
                }
              }
              resolveAddress.run()
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
          handler
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

  private fun localIpv4Addresses(): MutableSet<Inet4Address> {
    val result = mutableSetOf<Inet4Address>()
    val interfaces = NetworkInterface.getNetworkInterfaces() ?: return result
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

  // Local Wi-Fi networks publish the host's own addresses, not upstream addresses.
  @Suppress("DEPRECATION")
  private fun connectedIpv4Addresses(manager: ConnectivityManager): Map<Inet4Address, Boolean> {
    val result = mutableMapOf<Inet4Address, Boolean>()
    for (network in manager.allNetworks) {
      val capabilities = manager.getNetworkCapabilities(network)
      val isHostedWifiNetwork = Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM &&
        capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true &&
        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_LOCAL_NETWORK)
      val properties = manager.getLinkProperties(network) ?: continue
      for (linkAddress in properties.linkAddresses) {
        val address = linkAddress.address
        if (address is Inet4Address) result[address] = isHostedWifiNetwork
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
