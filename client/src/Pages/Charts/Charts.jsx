import { BarChart3, Heart, Play, Search, Users } from "lucide-react"
import { useState } from "react"
import EmptyState from "@/components/music/EmptyState"
import LikeButton from "@/components/music/LikeButton"
import SongList from "@/components/music/SongList"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCharts } from "@/hooks/queries/useLibraryQueries"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { usePlaySong } from "@/hooks/usePlaySong"
import { formatCount, getSongArtists, getSongCover, plural } from "@/lib/song"
import { PageShell } from "../Library/Library"

const PERIODS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
]

const PodiumCard = ({ song, list }) => {
  const { play, inGroup } = usePlaySong()
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={getSongCover(song, "large")}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/45" />
        <span className="absolute left-3 top-2 text-5xl font-black text-white/90 drop-shadow">
          {song.rank}
        </span>
        <Button
          size="icon"
          className="absolute bottom-3 right-3 h-11 w-11 rounded-full shadow-lg"
          onClick={() => play(song, list)}
          aria-label={inGroup ? `Add ${song.name} to group queue` : `Play ${song.name}`}
        >
          {inGroup ? <Users /> : <Play className="fill-current" />}
        </Button>
        <div className="absolute bottom-3 left-3 right-16 text-white">
          <p className="truncate font-semibold">{song.name}</p>
          <p className="truncate text-xs text-white/75">{getSongArtists(song)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-3 tabular-nums">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {formatCount(song.likeCount)}
          </span>
          <span>{plural(song.playCount, "play")}</span>
        </span>
        <LikeButton song={song} />
      </div>
    </div>
  )
}

const Charts = () => {
  const [period, setPeriod] = useState("week")
  const [search, setSearch] = useState("")
  const debounced = useDebouncedValue(search.trim(), 300)
  const { data: songs, isLoading, isError, refetch } = useCharts({ period, search: debounced })

  const showPodium = !debounced && songs?.length >= 3
  const podium = showPodium ? songs.slice(0, 3) : []
  const rest = showPodium ? songs.slice(3) : songs

  return (
    <PageShell
      title="Top Charts"
      description="The most liked songs on SyncBeat. Plays break ties."
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the charts"
            className="pl-9"
            aria-label="Search the charts"
          />
        </div>
      </div>

      {podium.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {podium.map((song) => (
            <PodiumCard key={song.id} song={song} list={songs} />
          ))}
        </div>
      )}

      <SongList
        songs={rest}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        ranked
        showStats
        numbered={false}
        empty={
          podium.length ? (
            <span />
          ) : (
            <EmptyState
              icon={BarChart3}
              title={debounced ? `No chart songs match “${debounced}”` : "No chart data yet"}
              description={
                debounced ? "Try a different search." : "Like and play songs to get the charts going."
              }
            />
          )
        }
      />
    </PageShell>
  )
}

export default Charts
