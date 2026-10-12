package expo.modules.localonlyhotspot

import java.net.Inet4Address
import java.net.InetAddress

private fun ips(vararg values: String): Set<Inet4Address> =
  values.map { InetAddress.getByName(it) as Inet4Address }.toSet()

fun main() {
  val station = ips("192.168.1.42")
  val stationNetwork = station.associateWith { false }
  val hotspot = "192.168.43.1"
  check(selectHotspotIpv4(station, ips("192.168.1.42", hotspot), stationNetwork) == hotspot) {
    "The preexisting Wi-Fi address must not be advertised as the hotspot."
  }
  check(selectHotspotIpv4(station, station, stationNetwork) == null) {
    "A missing hotspot address must not fall back to the station address."
  }
  check(selectHotspotIpv4(station, ips(hotspot), emptyMap()) == hotspot) {
    "The hotspot may reuse an interface after the station disconnects."
  }
  check(selectHotspotIpv4(
    station,
    ips("192.168.2.42", hotspot),
    ips("192.168.2.42").associateWith { false }
  ) == hotspot) {
    "A changed station address must be excluded using current Android network details."
  }
  check(selectHotspotIpv4(station, ips(hotspot, "10.8.0.2"), emptyMap()) == null) {
    "Ambiguous new addresses must not produce a guessed hotspot address."
  }
  check(selectHotspotIpv4(
    ips("192.168.12.167"),
    ips("192.168.12.167"),
    mapOf(
      ips("192.168.12.167").single() to false,
      ips("10.48.173.13").single() to true
    )
  ) == "10.48.173.13") {
    "An Android-managed local hotspot must not be excluded as an upstream network."
  }
  println("Hotspot IPv4 regression checks passed (6 scenarios).")
}
