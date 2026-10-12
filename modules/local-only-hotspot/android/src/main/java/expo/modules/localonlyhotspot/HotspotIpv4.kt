package expo.modules.localonlyhotspot

import java.net.Inet4Address

internal fun selectHotspotIpv4(
  addressesBeforeStart: Set<Inet4Address>,
  currentAddresses: Set<Inet4Address>,
  // Values identify addresses advertised by device-hosted local Wi-Fi networks.
  connectedNetworkAddresses: Map<Inet4Address, Boolean>
): String? {
  var candidate: Inet4Address? = null
  for (address in currentAddresses) {
    if (address in addressesBeforeStart || connectedNetworkAddresses[address] == false) continue
    if (candidate != null) return null
    candidate = address
  }
  for ((address, isHostedWifiNetwork) in connectedNetworkAddresses) {
    if (!isHostedWifiNetwork || !address.isSiteLocalAddress ||
      address in addressesBeforeStart || address == candidate) continue
    if (candidate != null) return null
    candidate = address
  }
  return candidate?.hostAddress
}
