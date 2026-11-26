import { Skeleton } from "@/components/ui/skeleton"
import { usePlaySong } from "@/hooks/usePlaySong"
import EmptyState from "./EmptyState"
import SongRow from "./SongRow"

/** A list of songs with loading, error and empty states built in. */
const SongList = ({
  songs,
  isLoading,
  isError,
  onRetry,
  empty,
  ranked,
  showStats,
  numbered = true,
  getMeta,
  onRemove,
  removeLabel,
  compact,
}) => {
  const { play, inGroup } = usePlaySong()

  if (isLoading) {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading songs">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="h-11 w-11 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load songs"
        description="Check your connection and try again."
        action={onRetry ? { label: "Retry", onClick: onRetry } : undefined}
      />
    )
  }

  if (!songs?.length) return empty || <EmptyState title="No songs here yet" />

  return (
    <div className="space-y-0.5">
      {songs.map((song, i) => (
        <SongRow
          key={`${song.id}-${song.itemId ?? i}`}
          song={song}
          index={numbered ? i : undefined}
          rank={ranked ? song.rank : undefined}
          onPlay={(s) => play(s, songs)}
          inGroup={inGroup}
          showStats={showStats}
          meta={getMeta?.(song)}
          onRemove={onRemove}
          removeLabel={removeLabel}
          compact={compact}
        />
      ))}
    </div>
  )
}

export default SongList
