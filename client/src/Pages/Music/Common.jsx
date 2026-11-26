import { Loader2 } from "lucide-react"

export const formatTime = (time) => {
  if (!time) return "00:00"
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export const LoadingState = ({ message, height }) => (
  <div
    className={`flex ${
      height ? height : "h-full"
    } items-center justify-center bg-background/50 backdrop-blur-xs`}
  >
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      <p className="text-muted-foreground animate-pulse">{message || "Loading your music..."}</p>
    </div>
  </div>
)

export const ensureHttpsForDownloadUrls = (song) => {
  if (!song || typeof song !== "object") return song

  const updatedDownloadUrls = Array.isArray(song.download_url)
    ? song.download_url.map((item) => {
        if (!item || typeof item !== "object") return item
        return {
          ...item,
          link:
            item.link && typeof item.link === "string"
              ? item.link.startsWith("http://")
                ? item.link.replace("http://", "https://")
                : item.link
              : item.link,
        }
      })
    : song.download_url

  const updatedArtworkUrls = Array.isArray(song.image)
    ? song.image.map((item) => {
        if (!item || typeof item !== "object") return item
        return {
          ...item,
          link:
            item.link && typeof item.link === "string"
              ? item.link.startsWith("http://")
                ? item.link.replace("http://", "https://")
                : item.link
              : item.link,
        }
      })
    : song.image

  return {
    ...song,
    download_url: updatedDownloadUrls,
    image: updatedArtworkUrls,
  }
}
