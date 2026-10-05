export function isUsableIpv4Address(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 4) return false;

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return Number.NaN;
    if (part.length > 1 && part.startsWith("0")) return Number.NaN;
    return Number(part);
  });
  if (octets.some((octet) => !Number.isInteger(octet) || octet > 255)) {
    return false;
  }

  const [first] = octets;
  return value !== "0.0.0.0" && first !== 0 && first !== 127 && first < 224;
}

export function isValidSignalPort(value: unknown): value is number {
  return (
    Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 65_535
  );
}

export function isValidWifiSsid(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 32
  );
}

export function isValidHotspotPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 63;
}
