package expo.modules.localonlyhotspot

import java.net.Inet4Address

internal fun selectHotspotIpv4(
  addressesBeforeStart: Set<Inet4Address>,
  currentAddresses: Set<Inet4Address>,
  connectedNetworkAddresses: Set<Inet4Address>
): String? {
  var candidate: Inet4Address? = null
  for (address in currentAddresses) {
    if (address in addressesBeforeStart || address in connectedNetworkAddresses) continue
    if (candidate != null) return null
    candidate = address
  }
  return candidate?.hostAddress
}
