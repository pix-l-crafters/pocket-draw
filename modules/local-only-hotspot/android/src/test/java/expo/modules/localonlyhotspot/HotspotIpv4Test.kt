package expo.modules.localonlyhotspot

import java.net.Inet4Address
import java.net.InetAddress

private fun ips(vararg values: String): Set<Inet4Address> =
  values.map { InetAddress.getByName(it) as Inet4Address }.toSet()

fun main() {
  val station = ips("192.168.1.42")
  val hotspot = "192.168.43.1"
  check(selectHotspotIpv4(station, ips("192.168.1.42", hotspot), station) == hotspot) {
    "The preexisting Wi-Fi address must not be advertised as the hotspot."
  }
  check(selectHotspotIpv4(station, station, station) == null) {
    "A missing hotspot address must not fall back to the station address."
  }
  check(selectHotspotIpv4(station, ips(hotspot), emptySet()) == hotspot) {
    "The hotspot may reuse an interface after the station disconnects."
  }
  check(selectHotspotIpv4(
    station,
    ips("192.168.2.42", hotspot),
    ips("192.168.2.42")
  ) == hotspot) {
    "A changed station address must be excluded using current Android network details."
  }
  check(selectHotspotIpv4(station, ips(hotspot, "10.8.0.2"), emptySet()) == null) {
    "Ambiguous new addresses must not produce a guessed hotspot address."
  }
  println("Hotspot IPv4 regression checks passed (5 scenarios).")
}
