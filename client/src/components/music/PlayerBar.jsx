import { Loader2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react"
import { useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { useGroupMusic } from "@/Context/GroupMusicContext"
import { formatDuration, getSongArtists, getSongCover } from "@/lib/song"
import { usePlayerStore } from "@/stores/playerStore"
import LikeButton from "./LikeButton"

const IconButton = ({ label, className = "", ...props }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`flex items-center justify-center rounded-full transition-colors hover:bg-accent/60 disabled:opacity-40 cursor-pointer ${className}`}
    {...props}
  />
)

/** Personal player bar, shown at the bottom while a solo song is loaded. */
const PlayerBar = () => {
  const song = usePlayerStore((s) => s.queue[s.index])
  const hasNext = usePlayerStore((s) => s.index + 1 < s.queue.length)
  const { isPlaying, isLoading, currentTime, duration, volume } = usePlayerStore()
  const { toggle, next, previous, seek, setVolume, stop } = usePlayerStore.getState()
  const { currentGroup } = useGroupMusic()

  // Joining a group hands playback over to the synced group player
  useEffect(() => {
    if (currentGroup) usePlayerStore.getState().stop()
  }, [currentGroup])

  if (!song) return null
  const total = duration || song.duration || 0

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl">
      <Slider
        value={[Math.min(currentTime, total || 0)]}
        max={total || 1}
        step={1}
        onValueChange={([v]) => seek(v)}
        aria-label="Seek"
        className="absolute inset-x-0 -top-1.5 sm:hidden"
      />
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {getSongCover(song) && (
            <img src={getSongCover(song)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{song.name}</p>
            <p className="truncate text-xs text-muted-foreground">{getSongArtists(song)}</p>
          </div>
          <LikeButton song={song} className="hidden sm:flex" />
        </div>

        <div className="flex flex-col items-center gap-1 sm:w-[40%] sm:max-w-md">
          <div className="flex items-center gap-1">
            <IconButton label="Previous" className="h-9 w-9" onClick={previous}>
              <SkipBack className="h-4 w-4 fill-current" />
            </IconButton>
            <IconButton
              label={isPlaying ? "Pause" : "Play"}
              className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={toggle}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </IconButton>
            <IconButton label="Next" className="h-9 w-9" onClick={() => next()} disabled={!hasNext}>
              <SkipForward className="h-4 w-4 fill-current" />
            </IconButton>
          </div>
          <div className="hidden w-full items-center gap-2 sm:flex">
            <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
              {formatDuration(currentTime, "0:00")}
            </span>
            <Slider
              value={[Math.min(currentTime, total || 0)]}
              max={total || 1}
              step={1}
              onValueChange={([v]) => seek(v)}
              aria-label="Seek"
              className="flex-1"
            />
            <span className="w-10 text-[11px] tabular-nums text-muted-foreground">
              {formatDuration(total)}
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1">
          <div className="hidden items-center gap-2 md:flex">
            <IconButton
              label={volume ? "Mute" : "Unmute"}
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setVolume(volume ? 0 : 1)}
            >
              {volume ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </IconButton>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={([v]) => setVolume(v)}
              aria-label="Volume"
              className="w-24"
            />
          </div>
          <IconButton label="Close player" className="h-8 w-8 text-muted-foreground" onClick={stop}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

export default PlayerBar
