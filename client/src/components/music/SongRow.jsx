import { ListPlus, MoreHorizontal, Pause, Play, Trash2, Users } from "lucide-react"
import { memo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCount, formatDuration, getAlbumName, getSongArtists, getSongCover, plural } from "@/lib/song"
import { cn } from "@/lib/utils"
import { useAddToPlaylistStore } from "@/stores/addToPlaylistStore"
import { usePlayerStore } from "@/stores/playerStore"
import LikeButton from "./LikeButton"

/**
 * One song in a list. `meta` is a small line on the right (e.g. "3 plays"),
 * `onRemove` adds a "Remove" item (used inside playlists).
 * `compact` is for narrow columns: no duration/stats columns, `meta` moves under the title.
 */
const SongRow = ({
  song,
  index,
  rank,
  onPlay,
  inGroup,
  showStats,
  meta,
  onRemove,
  removeLabel,
  compact,
}) => {
  const openAddToPlaylist = useAddToPlaylistStore((s) => s.open)
  const isCurrent = usePlayerStore((s) => s.queue[s.index]?.id === song.id)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const showPause = isCurrent && isPlaying && !inGroup
  const album = getAlbumName(song)

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/40",
        isCurrent && !inGroup && "bg-primary/5",
        song.isActive === false && "opacity-60",
      )}
    >
      {rank !== undefined ? (
        <span
          className={cn(
            "w-7 shrink-0 text-center text-sm font-bold tabular-nums",
            rank <= 3 ? "text-primary" : "text-muted-foreground",
          )}
        >
          {rank}
        </span>
      ) : index !== undefined ? (
        <span className="hidden sm:block w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
          {index + 1}
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => onPlay(song)}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted cursor-pointer"
        aria-label={inGroup ? `Add ${song.name} to group queue` : `Play ${song.name}`}
      >
        {getSongCover(song) && (
          <img
            src={getSongCover(song)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity",
            showPause ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {inGroup ? (
            <ListPlus className="h-4 w-4" />
          ) : showPause ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onPlay(song)}
        className="min-w-0 flex-1 text-left cursor-pointer"
      >
        <p
          className={cn(
            "truncate text-sm font-medium",
            isCurrent && !inGroup && "text-primary",
          )}
        >
          {song.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {compact && meta ? `${meta} · ` : ""}
          {getSongArtists(song)}
          {album && !compact ? <span className="hidden md:inline"> · {album}</span> : null}
        </p>
      </button>

      {showStats && !compact && (
        <div className="hidden sm:flex shrink-0 items-center gap-4 text-xs tabular-nums text-muted-foreground">
          <span title="Likes">♥ {formatCount(song.likeCount)}</span>
          <span title="Plays" className="w-16 text-right">
            {plural(song.playCount, "play")}
          </span>
        </div>
      )}

      {meta && !compact && (
        <span className="hidden md:block shrink-0 text-xs text-muted-foreground">{meta}</span>
      )}

      {!compact && (
        <span className="hidden sm:block w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatDuration(song.duration)}
        </span>
      )}

      <LikeButton song={song} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 cursor-pointer"
            aria-label={`More options for ${song.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onPlay(song)} className="cursor-pointer">
            {inGroup ? <Users /> : <Play />}
            {inGroup ? "Add to group queue" : "Play"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openAddToPlaylist(song)} className="cursor-pointer">
            <ListPlus />
            Add to playlist
          </DropdownMenuItem>
          {onRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRemove(song)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 />
                {removeLabel || "Remove"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default memo(SongRow)
