/** Helpers for the song objects used everywhere (music API shape, also used for admin songs). */

const SIZE_INDEX = { small: 0, medium: 1, large: 2 }

export const getSongCover = (song, size = "medium") =>
  song?.image?.[SIZE_INDEX[size]]?.link || song?.image?.at?.(-1)?.link || ""

export const getSongArtists = (song, max = 3) => {
  const artists = song?.artist_map?.primary_artists?.length
    ? song.artist_map.primary_artists
    : song?.artist_map?.artists || []
  return (
    artists
      .slice(0, max)
      .map((a) => a?.name)
      .filter(Boolean)
      .join(", ") || "Unknown artist"
  )
}

export const getSongAudioUrl = (song) =>
  song?.download_url?.find((u) => u.quality === "320kbps")?.link ||
  song?.download_url?.at?.(-1)?.link ||
  ""

export const getAlbumName = (song) =>
  typeof song?.album === "string" ? song.album : song?.album?.name || ""

export const formatDuration = (seconds, empty = "--:--") => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  if (!total) return empty
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, "0")
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

/** "1 song", "3 songs", "1.2K plays" */
export const plural = (count, word) =>
  `${formatCount(count)} ${word}${Number(count) === 1 ? "" : "s"}`

export const formatCount = (value) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number(value) || 0,
  )
