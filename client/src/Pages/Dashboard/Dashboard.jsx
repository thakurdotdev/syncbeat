import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  Clock,
  Headphones,
  Heart,
  Library,
  ListMusic,
  PlayCircle,
  Share2,
  Users,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { dashboardKeys, fetchMyDashboard } from "@/api/dashboard"
import EmptyState from "@/components/music/EmptyState"
import { ShareInviteItem } from "@/components/music/ShareInvitesMenu"
import SongList from "@/components/music/SongList"
import { Panel, StatCard } from "@/components/StatCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/Context/Context"
import { useIncomingShares } from "@/hooks/queries/usePlaylistQueries"
import { formatCount, plural } from "@/lib/song"
import { getProfileCloudinaryUrl } from "@/Utils/Cloudinary"
import { TimeAgo } from "@/Utils/TimeAgo"
import { PageShell, PlaylistGrid } from "../Library/Library"

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

const formatListening = (seconds) => {
  const minutes = Math.round((seconds || 0) / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

const SeeAll = ({ to }) => (
  <Link to={to} className="text-xs text-primary hover:underline">
    See all
  </Link>
)

const QUICK_LINKS = [
  { to: "/music", label: "Listen together", hint: "Start or join a group", icon: Users },
  { to: "/library", label: "Browse music", hint: "All songs & search", icon: Library },
  { to: "/charts", label: "Top Charts", hint: "Most liked songs", icon: BarChart3 },
]

const Dashboard = () => {
  const { user } = useProfile()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: dashboardKeys.mine(),
    queryFn: fetchMyDashboard,
  })
  const { data: invites = [] } = useIncomingShares()
  const firstName = user?.name?.split(" ")[0] || "there"

  if (isError) {
    return (
      <PageShell title={`${greeting()}, ${firstName}`}>
        <EmptyState title="Couldn't load your dashboard" action={{ label: "Retry", onClick: refetch }} />
      </PageShell>
    )
  }

  const s = data?.stats || {}
  const cards = [
    {
      label: "Songs played",
      value: formatCount(s.totalPlays),
      hint: `${plural(s.uniqueSongs, "different song")}`,
      icon: PlayCircle,
    },
    {
      label: "Listening time",
      value: formatListening(s.secondsListened),
      hint: "Solo and in groups",
      icon: Clock,
      accent: "bg-primary/15 text-primary",
    },
    { label: "Liked songs", value: formatCount(s.likedCount), hint: "Your favourites", icon: Heart, accent: "bg-rose-500/15 text-rose-500" },
    {
      label: "Playlists",
      value: formatCount((s.ownPlaylists || 0) + (s.sharedWithMe || 0)),
      hint: `${s.ownPlaylists ?? 0} yours · ${s.sharedWithMe ?? 0} shared with you`,
      icon: ListMusic,
    },
  ]

  return (
    <PageShell
      title={`${greeting()}, ${firstName}`}
      description="Your listening at a glance."
    >
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:bg-accent/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </Link>
        ))}
      </div>

      {invites.length > 0 && (
        <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <h2 className="flex items-center gap-2 px-2 pb-1 text-sm font-semibold">
            <Share2 className="h-4 w-4" /> {plural(invites.length, "playlist invite")} waiting
          </h2>
          <div className="grid gap-1 md:grid-cols-2">
            {invites.map((share) => (
              <ShareInviteItem key={share.shareId} share={share} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Recently played" action={<SeeAll to="/library?tab=recent" />}>
            <SongList
              songs={data?.recent}
              isLoading={isLoading}
              numbered={false}
              getMeta={(song) => TimeAgo(song.lastPlayedAt)}
              empty={
                <EmptyState
                  icon={Headphones}
                  title="Nothing played yet"
                  description="Play something from the Library or join a group session."
                  action={{ label: "Browse music", onClick: () => navigate("/library") }}
                />
              }
            />
          </Panel>

          <Panel title="Your playlists" action={<SeeAll to="/library?tab=playlists" />}>
            {isLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : data.playlists.length ? (
              <PlaylistGrid playlists={data.playlists} />
            ) : (
              <EmptyState
                icon={ListMusic}
                title="No playlists yet"
                description="Create one in your Library and share it with friends."
              />
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title="Your most played">
            {isLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : data.mostPlayed.length ? (
              <SongList
                songs={data.mostPlayed}
                compact
                numbered
                getMeta={(song) => plural(song.myPlayCount, "play")}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Play a few songs first</p>
            )}
          </Panel>

          <Panel title="Trending this week" action={<SeeAll to="/charts" />}>
            {isLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : data.trending.length ? (
              <SongList songs={data.trending} ranked compact numbered={false} getMeta={(s) => `♥ ${formatCount(s.likeCount)}`} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No likes this week yet</p>
            )}
          </Panel>

          <Panel title="Friends">
            {isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : data.friends.length ? (
              <ul className="space-y-2">
                {data.friends.map((f) => (
                  <li key={f.userid} className="flex items-center gap-3">
                    <span className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getProfileCloudinaryUrl(f.profilepic)} alt="" />
                        <AvatarFallback className="text-xs">{f.name?.[0]}</AvatarFallback>
                      </Avatar>
                      {f.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{f.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {f.isOnline ? "Online now" : `@${f.username}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                People you share playlists with show up here.
              </p>
            )}
          </Panel>
        </div>
      </div>

    </PageShell>
  )
}

export default Dashboard
