import { Clock, Globe, Heart, ListMusic, Music2, Plus, Search, Users } from "lucide-react"
import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import EmptyState from "@/components/music/EmptyState"
import PlaylistCover from "@/components/music/PlaylistCover"
import PlaylistFormDialog from "@/components/music/PlaylistFormDialog"
import { ShareInviteItem } from "@/components/music/ShareInvitesMenu"
import SongList from "@/components/music/SongList"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useCatalogSongs,
  useLikedSongs,
  useOnlineSearch,
  useRecentSongs,
} from "@/hooks/queries/useLibraryQueries"
import { useIncomingShares, useMyPlaylists } from "@/hooks/queries/usePlaylistQueries"
import { usePlaySong } from "@/hooks/usePlaySong"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { plural } from "@/lib/song"
import { TimeAgo as timeAgo } from "@/Utils/TimeAgo"

const TABS = ["all", "recent", "liked", "playlists"]
const PAGE_SIZE = 30

export const PageShell = ({ title, description, actions, children }) => (
  <div className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6 sm:pt-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
    {children}
  </div>
)

const AllSongsTab = () => {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("latest")
  const [limit, setLimit] = useState(PAGE_SIZE)
  const deferredSearch = useDebouncedValue(search.trim(), 300)
  const { data, isLoading, isError, refetch, isFetching } = useCatalogSongs({
    search: deferredSearch,
    sort,
    limit,
  })
  const online = useOnlineSearch(deferredSearch)
  const hasOnlineSearch = Boolean(import.meta.env.VITE_SONG_URL)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setLimit(PAGE_SIZE)
            }}
            placeholder="Search songs, artists or albums"
            className="pl-9"
            aria-label="Search songs"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-44" aria-label="Sort songs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Newest first</SelectItem>
            <SelectItem value="popular">Most liked</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SongList
        songs={data?.songs}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        showStats
        empty={
          <EmptyState
            title={deferredSearch ? `No songs match “${deferredSearch}”` : "No songs yet"}
            description={
              deferredSearch
                ? hasOnlineSearch
                  ? "Try the online results below."
                  : "Try a different search."
                : "Songs added by the admin, or played in groups, appear here."
            }
          />
        }
      />

      {data && data.total > data.songs.length && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            disabled={isFetching}
          >
            Show more ({data.total - data.songs.length} left)
          </Button>
        </div>
      )}

      {hasOnlineSearch && deferredSearch.length > 1 && (
        <section className="pt-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Globe className="h-4 w-4" /> From online
          </h2>
          <SongList
            songs={online.data}
            isLoading={online.isLoading}
            isError={online.isError}
            onRetry={online.refetch}
            numbered={false}
            empty={<EmptyState title="Nothing found online" />}
          />
        </section>
      )}
    </div>
  )
}

const RecentTab = () => {
  const { data, isLoading, isError, refetch } = useRecentSongs()
  return (
    <SongList
      songs={data}
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      getMeta={(song) => timeAgo(song.lastPlayedAt)}
      empty={
        <EmptyState
          icon={Clock}
          title="Nothing played yet"
          description="Songs you play, alone or in a group, show up here."
        />
      }
    />
  )
}

const LikedTab = () => {
  const { data, isLoading, isError, refetch } = useLikedSongs()
  const { playAll, inGroup } = usePlaySong()
  return (
    <div className="space-y-3">
      {data?.length > 0 && (
        <Button size="sm" onClick={() => playAll(data)}>
          {inGroup ? <Users /> : <Music2 />}
          {inGroup ? "Add all to group queue" : `Play all (${data.length})`}
        </Button>
      )}
      <SongList
        songs={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={Heart}
            title="No liked songs yet"
            description="Tap the heart on any song to save it here."
          />
        }
      />
    </div>
  )
}

export const PlaylistGrid = ({ playlists, linkPrefix = "/playlists" }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
    {playlists.map((playlist) => (
      <Link
        key={playlist.id}
        to={`${linkPrefix}/${playlist.id}`}
        className="group rounded-2xl p-2 transition-colors hover:bg-accent/40"
      >
        <PlaylistCover covers={playlist.covers} className="w-full shadow-sm" />
        <p className="mt-2 truncate text-sm font-medium group-hover:text-primary">
          {playlist.name}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          {playlist.myRole === "editor" ? (
            <>
              <Users className="h-3 w-3 shrink-0" /> by {playlist.owner.name}
            </>
          ) : (
            <>
              {plural(playlist.songCount, "song")}
              {playlist.memberCount > 0 && ` · shared with ${playlist.memberCount}`}
            </>
          )}
        </p>
      </Link>
    ))}
  </div>
)

const PlaylistsTab = () => {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: playlists, isLoading, isError, refetch } = useMyPlaylists()
  const { data: invites = [] } = useIncomingShares()
  const owned = playlists?.filter((p) => p.myRole === "owner") || []
  const shared = playlists?.filter((p) => p.myRole === "editor") || []

  return (
    <div className="space-y-8">
      {invites.length > 0 && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <h2 className="px-2 pb-1 text-sm font-semibold">Waiting for your answer</h2>
          <div className="grid gap-1 md:grid-cols-2">
            {invites.map((share) => (
              <ShareInviteItem key={share.shareId} share={share} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">My playlists</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> New playlist
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Couldn't load playlists"
            action={{ label: "Retry", onClick: refetch }}
          />
        ) : owned.length ? (
          <PlaylistGrid playlists={owned} />
        ) : (
          <EmptyState
            icon={ListMusic}
            title="No playlists yet"
            description="Create one, add songs, then share it with friends."
            action={{ label: "Create playlist", onClick: () => setCreateOpen(true) }}
          />
        )}
      </section>

      {shared.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Shared with me</h2>
          <PlaylistGrid playlists={shared} />
        </section>
      )}

      <PlaylistFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

const Library = () => {
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "all"
  const { data: invites = [] } = useIncomingShares()

  return (
    <PageShell title="Library" description="Browse songs, revisit what you played, and manage playlists.">
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="all">All songs</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="liked">Liked</TabsTrigger>
          <TabsTrigger value="playlists" className="gap-1.5">
            Playlists
            {invites.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                {invites.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <AllSongsTab />
        </TabsContent>
        <TabsContent value="recent">
          <RecentTab />
        </TabsContent>
        <TabsContent value="liked">
          <LikedTab />
        </TabsContent>
        <TabsContent value="playlists">
          <PlaylistsTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

export default Library
