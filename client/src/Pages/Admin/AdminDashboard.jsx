import {
  Activity,
  Heart,
  ListMusic,
  Music,
  PlayCircle,
  Radio,
  RefreshCw,
  Share2,
  UserPlus,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"
import EmptyState from "@/components/music/EmptyState"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminStats } from "@/hooks/queries/useAdminQueries"
import { formatCount, getSongArtists, getSongCover, plural } from "@/lib/song"
import { getProfileCloudinaryUrl } from "@/Utils/Cloudinary"
import { AdminPageHeader, formatDate, Panel, StatCard } from "./components"

const SongMiniList = ({ songs, metric }) =>
  songs?.length ? (
    <ol className="space-y-2">
      {songs.map((song, i) => (
        <li key={song.id} className="flex items-center gap-3">
          <span className="w-4 text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
          <img src={getSongCover(song, "small")} alt="" className="h-9 w-9 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{song.name}</p>
            <p className="truncate text-xs text-muted-foreground">{getSongArtists(song)}</p>
          </div>
          <span className="text-xs font-medium tabular-nums">{metric(song)}</span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>
  )

const UserChip = ({ user }) => (
  <Link
    to={`/admin/users/${user.userid}`}
    className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-accent/50"
  >
    <Avatar className="h-8 w-8">
      <AvatarImage src={getProfileCloudinaryUrl(user.profilepic)} alt="" />
      <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">{user.name}</p>
      <p className="truncate text-xs text-muted-foreground">
        {user.email || `@${user.username}`}
      </p>
    </div>
    {user.createdAt && (
      <span className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</span>
    )}
  </Link>
)

const AdminDashboard = () => {
  const { data, isLoading, isError, refetch, isFetching } = useAdminStats()

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load the dashboard"
        action={{ label: "Retry", onClick: refetch }}
      />
    )
  }

  const t = data?.totals || {}
  const cards = [
    {
      label: "Total clients",
      value: formatCount(t.totalUsers),
      hint: `${t.newUsers7d ?? 0} joined this week · ${t.bannedUsers ?? 0} banned`,
      icon: Users,
    },
    {
      label: "Online now",
      value: formatCount(t.onlineUsers),
      hint: `${t.listenersInGroups ?? 0} listening in groups`,
      icon: Activity,
      accent: "bg-emerald-500/15 text-emerald-500",
    },
    {
      label: "Active groups",
      value: formatCount(t.activeGroups),
      hint: "Live listening sessions",
      icon: Radio,
    },
    {
      label: "Songs",
      value: formatCount(t.totalSongs),
      hint: `${t.adminSongs ?? 0} added by admins · ${t.hiddenSongs ?? 0} hidden`,
      icon: Music,
    },
    {
      label: "Playlists",
      value: formatCount(t.totalPlaylists),
      hint: `${t.acceptedShares ?? 0} shares accepted · ${t.pendingShares ?? 0} pending`,
      icon: ListMusic,
    },
    { label: "Likes", value: formatCount(t.totalLikes), hint: "Across all songs", icon: Heart },
    { label: "Plays", value: formatCount(t.totalPlays), hint: "Solo and group", icon: PlayCircle },
    {
      label: "Pending invites",
      value: formatCount(t.pendingShares),
      hint: "Playlist shares not answered",
      icon: Share2,
    },
  ]

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Live overview of clients, music and activity. Refreshes every 30 seconds."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {!isLoading && data && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Panel
            title="Most liked songs"
            action={
              <Link to="/admin/charts" className="text-xs text-primary hover:underline">
                Top charts
              </Link>
            }
          >
            <SongMiniList songs={data.topLiked.filter((s) => s.likeCount > 0)} metric={(s) => `♥ ${formatCount(s.likeCount)}`} />
          </Panel>
          <Panel title="Most played songs">
            <SongMiniList
              songs={data.topPlayed}
              metric={(s) => plural(s.playCount, "play")}
            />
          </Panel>
          <Panel title={`Active clients (${t.onlineUsers ?? 0})`}>
            {data.onlineUsers.length ? (
              <div className="space-y-1">
                {data.onlineUsers.map((u) => (
                  <UserChip key={u.userid} user={u} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nobody online right now</p>
            )}
          </Panel>
          <Panel title="Live groups" className="lg:col-span-2">
            {data.activeGroups.length ? (
              <ul className="divide-y divide-border/50">
                {data.activeGroups.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{g.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {g.nowPlaying ? `Now playing: ${g.nowPlaying}` : "Nothing playing"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {g.members} listening
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No live groups</p>
            )}
          </Panel>
          <Panel
            title="Newest clients"
            action={
              <Link to="/admin/users" className="text-xs text-primary hover:underline">
                <UserPlus className="mr-1 inline h-3 w-3" />
                All clients
              </Link>
            }
          >
            <div className="space-y-1">
              {data.recentUsers.map((u) => (
                <UserChip key={u.userid} user={u} />
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  )
}

export default AdminDashboard
