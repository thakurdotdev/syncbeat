import { ArrowLeft, Ban, Heart, ListMusic, PlayCircle, Shield, ShieldOff, UserCheck } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import EmptyState from "@/components/music/EmptyState"
import PlaylistCover from "@/components/music/PlaylistCover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/Context/Context"
import { useAdminUser, useUpdateAdminUser } from "@/hooks/queries/useAdminQueries"
import { loginDevice, loginIp, loginLocation } from "@/lib/loginLog"
import { getSongArtists, getSongCover, plural } from "@/lib/song"
import { getProfileCloudinaryUrl } from "@/Utils/Cloudinary"
import { TimeAgo } from "@/Utils/TimeAgo"
import { UserStatusBadges } from "./AdminUsers"
import { formatDate, Panel, StatCard } from "./components"

const SongLine = ({ song, right }) => (
  <li className="flex items-center gap-3">
    <img src={getSongCover(song, "small")} alt="" className="h-9 w-9 rounded-md object-cover" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">{song.name}</p>
      <p className="truncate text-xs text-muted-foreground">{getSongArtists(song)}</p>
    </div>
    {right && <span className="shrink-0 text-xs text-muted-foreground">{right}</span>}
  </li>
)

const PlaylistLine = ({ playlist }) => (
  <li className="flex items-center gap-3">
    <PlaylistCover covers={playlist.covers} className="h-9 w-9 rounded-md" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">{playlist.name}</p>
      <p className="truncate text-xs text-muted-foreground">
        {plural(playlist.songCount, "song")} · {plural(playlist.memberCount, "collaborator")}
      </p>
    </div>
  </li>
)

const Empty = ({ children }) => (
  <p className="py-4 text-center text-sm text-muted-foreground">{children}</p>
)

const AdminUserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me } = useProfile()
  const { data, isLoading, isError } = useAdminUser(id)
  const update = useUpdateAdminUser()
  const [confirm, setConfirm] = useState(null) // { title, description, body, destructive }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />
  if (isError || !data) {
    return (
      <EmptyState
        title="Client not found"
        action={{ label: "Back to clients", onClick: () => navigate("/admin/users") }}
      />
    )
  }

  const { user, stats } = data
  const isSelf = me?.userid === user.userid

  const ask = (kind) => {
    const configs = {
      ban: {
        title: `Ban ${user.name}?`,
        description: "They will be signed out on their next request and can't log in until unbanned.",
        body: { isDeleted: true },
        destructive: true,
        label: "Ban",
      },
      unban: {
        title: `Unban ${user.name}?`,
        description: "They will be able to log in again.",
        body: { isDeleted: false },
        label: "Unban",
      },
      promote: {
        title: `Make ${user.name} an admin?`,
        description: "Admins can manage clients, music and playlists.",
        body: { role: "admin" },
        label: "Make admin",
      },
      demote: {
        title: `Remove admin access from ${user.name}?`,
        description: "They will become a normal user.",
        body: { role: "user" },
        destructive: true,
        label: "Remove admin",
      },
    }
    setConfirm(configs[kind])
  }

  return (
    <>
      <Link
        to="/admin/users"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16">
          <AvatarImage src={getProfileCloudinaryUrl(user.profilepic)} alt="" />
          <AvatarFallback className="text-lg">{user.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{user.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {user.email} · @{user.username}
          </p>
          <div className="mt-2">
            <UserStatusBadges user={user} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Joined {formatDate(user.createdAt)}
            {user.lastLogin && ` · last login ${TimeAgo(user.lastLogin)}`}
            {user.bio && ` · “${user.bio}”`}
          </p>
        </div>
        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            {user.role === "admin" ? (
              <Button variant="outline" size="sm" onClick={() => ask("demote")}>
                <ShieldOff /> Remove admin
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => ask("promote")}>
                <Shield /> Make admin
              </Button>
            )}
            {user.isDeleted ? (
              <Button size="sm" onClick={() => ask("unban")}>
                <UserCheck /> Unban
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => ask("ban")}>
                <Ban /> Ban
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Plays" value={stats.playCount} hint={`${stats.uniqueSongs} different songs`} icon={PlayCircle} />
        <StatCard label="Liked songs" value={stats.likeCount} icon={Heart} />
        <StatCard label="Own playlists" value={stats.playlistCount} icon={ListMusic} />
        <StatCard label="Shared with them" value={stats.sharedCount} icon={ListMusic} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Recently played">
          {data.recentPlays.length ? (
            <ul className="space-y-2">
              {data.recentPlays.map((s) => (
                <SongLine key={s.id} song={s} right={`${s.myPlayCount}× · ${TimeAgo(s.lastPlayedAt)}`} />
              ))}
            </ul>
          ) : (
            <Empty>No plays yet</Empty>
          )}
        </Panel>
        <Panel title="Liked songs">
          {data.likedSongs.length ? (
            <ul className="space-y-2">
              {data.likedSongs.map((s) => (
                <SongLine key={s.id} song={s} />
              ))}
            </ul>
          ) : (
            <Empty>No liked songs</Empty>
          )}
        </Panel>
        <Panel title="Playlists">
          {data.playlists.length || data.sharedPlaylists.length ? (
            <ul className="space-y-2">
              {data.playlists.map((p) => (
                <PlaylistLine key={p.id} playlist={p} />
              ))}
              {data.sharedPlaylists.map((p) => (
                <PlaylistLine key={`s-${p.id}`} playlist={{ ...p, name: `${p.name} (shared by ${p.owner.name})` }} />
              ))}
            </ul>
          ) : (
            <Empty>No playlists</Empty>
          )}
        </Panel>
        <Panel title="Login history">
          {data.loginLogs.length ? (
            <ul className="divide-y divide-border/50 text-sm">
              {data.loginLogs.map((log) => (
                <li key={log.loginlogid} className="flex justify-between gap-3 py-2">
                  <span className="truncate">
                    {loginDevice(log)}
                    <span className="block truncate text-xs text-muted-foreground">
                      {[loginLocation(log) || "Location unknown", loginIp(log)]
                        .filter(Boolean)
                        .join(" · ")}
                      {log.loginType === "Admin Password" && " · admin login"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{TimeAgo(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No logins recorded (logins are only logged in production)</Empty>
          )}
        </Panel>
      </div>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
              onClick={() => update.mutate({ id: user.userid, ...confirm?.body })}
            >
              {confirm?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AdminUserDetail
