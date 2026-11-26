/** Treats empty and broken values (older rows stored "undefined, undefined, undefined") as missing. */
const clean = (value) => {
  const text = String(value ?? "").trim()
  if (!text || /undefined|null/i.test(text) || /^unknown( os| browser)?$/i.test(text)) return null
  return text
}

export const loginLocation = (log) => clean(log?.location)
export const loginIp = (log) => clean(log?.ipaddress)

/** "Chrome on Windows", or whichever part is known. */
export const loginDevice = (log) => {
  const browser = clean(log?.browser)
  const os = clean(log?.os)
  if (browser && os) return `${browser} on ${os}`
  return browser || os || "Unknown device"
}
