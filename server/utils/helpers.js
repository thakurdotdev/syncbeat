/**
 * Login metadata (browser, OS, IP, location) is worked out on the server from the
 * request itself, so it doesn't depend on the browser calling a third-party API.
 */

/** Brand list from the Client Hints header Chromium browsers send, e.g. "Brave";v="131". */
const getClientHintBrands = (req) =>
  (req.get("Sec-CH-UA") || "")
    .split(",")
    .map((part) => part.trim().match(/^"([^"]+)"/)?.[1])
    .filter(Boolean)

const getBrowser = (req, userAgent) => {
  const brands = getClientHintBrands(req)
  const brand = (name) => brands.some((b) => b.toLowerCase() === name.toLowerCase())

  // Client Hints name the real browser (Brave/Edge/Opera all report "Chrome" in the UA string)
  if (brand("Brave")) return "Brave"
  if (brand("Microsoft Edge")) return "Edge"
  if (brand("Opera") || brand("Opera GX")) return "Opera"

  // Order matters: Edge/Opera/Samsung UAs also contain "Chrome", and Chrome UAs contain "Safari"
  if (/Edg(e|A|iOS)?\//i.test(userAgent)) return "Edge"
  if (/OPR\/|Opera/i.test(userAgent)) return "Opera"
  if (/SamsungBrowser/i.test(userAgent)) return "Samsung Internet"
  if (/Firefox\/|FxiOS/i.test(userAgent)) return "Firefox"
  if (/MSIE|Trident/i.test(userAgent)) return "Internet Explorer"
  if (/Chrome\/|CriOS/i.test(userAgent) || brand("Google Chrome") || brand("Chromium"))
    return "Chrome"
  if (/Safari\//i.test(userAgent)) return "Safari"
  return "Unknown"
}

const getOS = (req, userAgent) => {
  // Order matters: iPhone/iPad UAs contain "like Mac OS X", Android UAs contain "Linux"
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS"
  if (/Android/i.test(userAgent)) return "Android"
  if (/CrOS/i.test(userAgent)) return "ChromeOS"
  if (/Windows/i.test(userAgent)) return "Windows"
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS"
  if (/Linux/i.test(userAgent)) return "Linux"

  const platform = (req.get("Sec-CH-UA-Platform") || "").replace(/"/g, "")
  return platform || "Unknown"
}

const parseUserAgent = (req) => {
  const userAgent = req.get("User-Agent") || ""
  return [getBrowser(req, userAgent), getOS(req, userAgent)]
}

/** The visitor's IP (first entry of the proxy chain), without the IPv6 "::ffff:" prefix. */
const getClientIp = (req) => {
  const forwarded =
    req.get("X-Vercel-Forwarded-For") || req.get("X-Forwarded-For") || req.get("X-Real-IP") || ""
  const ip = forwarded.split(",")[0].trim() || req.ip || ""
  return ip.replace(/^::ffff:/, "") || null
}

const decode = (value) => {
  try {
    return value ? decodeURIComponent(value).trim() : ""
  } catch {
    return value.trim()
  }
}

/**
 * "City, Region, Country" from the geo headers Vercel adds to every request
 * (Cloudflare's country header as a fallback). Null when nothing is known, e.g. locally.
 */
const getGeoLocation = (req) => {
  const parts = [
    decode(req.get("X-Vercel-IP-City")),
    decode(req.get("X-Vercel-IP-Country-Region")),
    decode(req.get("X-Vercel-IP-Country") || req.get("CF-IPCountry")),
  ].filter((p) => p && p !== "XX")
  return parts.length ? parts.join(", ") : null
}

module.exports = { parseUserAgent, getClientIp, getGeoLocation }
