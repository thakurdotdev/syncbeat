import {
  ArrowLeft,
  Clock3,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Play,
  Search,
  Share2,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import EmptyState from "@/components/music/EmptyState"
import PlaylistCover from "@/components/music/PlaylistCover"
import PlaylistFormDialog from "@/components/music/PlaylistFormDialog"
import SongList from "@/components/music/SongList"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/Context/Context"
import { useQuery } from "@tanstack/react-query"
import { searchUsers } from "@/api/playlists"
import {
  useDeletePlaylist,
  usePlaylist,
  useRemovePlaylistMember,
  useRemoveSongFromPlaylist,
  useSharePlaylist,
} from "@/hooks/queries/usePlaylistQueries"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { usePlaySong } from "@/hooks/usePlaySong"
import { formatDuration, plural } from "@/lib/song"
import { getProfileCloudinaryUrl } from "@/Utils/Cloudinary"

const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

const ShareDialog = ({ open, onOpenChange, playlist }) => {
  const [search, setSearch] = useState("")
  const query = useDebouncedValue(search.trim(), 300)
  const share = useSharePlaylist()
  const { data: users, isFetching } = useQuery({
    queryKey: ["user-search", query],
    queryFn: () => searchUsers(query),
    enabled: open && query.length > 1,
  })
  const memberStatus = Object.fromEntries(playlist.members.map((m) => [m.userid, m.status]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share “{playlist.name}”</DialogTitle>
          <DialogDescription>
            They'll get an invite. Once they accept, they can add and remove songs too.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people by name"
            className="pl-9"
            autoFocus
            aria-label="Search people"
          />
        </div>
        <div className="min-h-32 max-h-72 space-y-1 overflow-y-auto">
          {query.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Type at least 2 letters to find someone.
            </p>
          ) : isFetching && !users ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !users?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No one found.</p>
          ) : (
            users.map((u) => {
              const status = memberStatus[u.userid]
              const sending = share.isPending && share.variables?.userId === u.userid
              return (
                <div key={u.userid} className="flex items-center gap-3 rounded-lg p-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={getProfileCloudinaryUrl(u.profilepic)} alt="" />
                    <AvatarFallback>{initials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  {status ? (
                    <Badge variant="secondary">{status === "accepted" ? "Has access" : "Invited"}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={share.isPending}
                      onClick={() => share.mutate({ id: playlist.id, userId: u.userid })}
                    >
                      {sending ? <Loader2 className="animate-spin" /> : <Share2 />}
                      Invite
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const MembersPanel = ({ playlist, isOwner, currentUserId }) => {
  const removeMember = useRemovePlaylistMember()
  const people = [
    { ...playlist.owner, status: "owner" },
    ...playlist.members.filter((m) => m.status === "accepted" || isOwner),
  ]

  return (
    <section className="rounded-2xl border border-border/60 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4" /> People
      </h2>
      <ul className="space-y-2">
        {people.map((person) => (
          <li key={person.userid} className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={getProfileCloudinaryUrl(person.profilepic)} alt="" />
              <AvatarFallback className="text-xs">{initials(person.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {person.name}
                {person.userid === currentUserId && (
                  <span className="text-muted-foreground"> (you)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {person.status === "owner"
                  ? "Owner"
                  : person.status === "pending"
                    ? "Invite pending"
                    : "Can edit"}
              </p>
            </div>
            {isOwner && person.status !== "owner" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title={person.status === "pending" ? "Cancel invite" : "Remove access"}
                aria-label={
                  person.status === "pending"
                    ? `Cancel invite for ${person.name}`
                    : `Remove ${person.name}`
                }
                disabled={removeMember.isPending}
                onClick={() => removeMember.mutate({ id: playlist.id, userId: person.userid })}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

const PlaylistDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useProfile()
  const { data: playlist, isLoading, isError, error } = usePlaylist(id)
  const { playAll, inGroup } = usePlaySong()
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // "delete" | "leave"

  const removeSong = useRemoveSongFromPlaylist()
  const deletePlaylist = useDeletePlaylist({ onSuccess: () => navigate("/library?tab=playlists") })
  const leave = useRemovePlaylistMember({ onSuccess: () => navigate("/library?tab=playlists") })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-3 pt-6 sm:px-6">
        <div className="flex gap-5">
          <Skeleton className="h-36 w-36 rounded-2xl sm:h-48 sm:w-48" />
          <div className="flex-1 space-y-3 pt-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !playlist) {
    return (
      <div className="mx-auto max-w-xl px-3 pt-16">
        <EmptyState
          title={error?.response?.status === 404 ? "Playlist not found" : "Couldn't load playlist"}
          description="It may have been deleted, or you no longer have access."
          action={{ label: "Back to library", onClick: () => navigate("/library?tab=playlists") }}
        />
      </div>
    )
  }

  const isOwner = playlist.myRole === "owner"
  const totalSeconds = playlist.songs.reduce((sum, s) => sum + (Number(s.duration) || 0), 0)

  return (
    <div className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6 sm:pt-6">
      <Link
        to="/library?tab=playlists"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <PlaylistCover covers={playlist.covers} className="h-40 w-40 shadow-lg sm:h-48 sm:w-48" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isOwner ? "Your playlist" : `Shared by ${playlist.owner.name}`}
          </p>
          <h1 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="mt-2 text-sm text-muted-foreground">{playlist.description}</p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            {plural(playlist.songCount, "song")}
            {totalSeconds > 0 && (
              <>
                {" · "}
                <Clock3 className="h-3.5 w-3.5" /> {formatDuration(totalSeconds)}
              </>
            )}
            {playlist.memberCount > 0 && ` · ${playlist.memberCount + 1} people`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => playAll(playlist.songs)} disabled={!playlist.songs.length}>
              {inGroup ? <Users /> : <Play className="fill-current" />}
              {inGroup ? "Play in group" : "Play all"}
            </Button>
            {isOwner && (
              <Button variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 /> Share
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More playlist options">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer">
                  <Pencil /> Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isOwner ? (
                  <DropdownMenuItem
                    onClick={() => setConfirm("delete")}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 /> Delete playlist
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setConfirm("leave")}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut /> Leave playlist
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <SongList
            songs={playlist.songs}
            getMeta={(song) => (song.addedBy ? `added by ${song.addedBy.name}` : null)}
            onRemove={(song) => removeSong.mutate({ id: playlist.id, songRefId: song.dbId })}
            removeLabel="Remove from playlist"
            empty={
              <EmptyState
                title="This playlist is empty"
                description="Use “Add to playlist” from the ⋯ menu on any song in your Library, Top Charts or group search."
                action={{ label: "Browse songs", onClick: () => navigate("/library") }}
              />
            }
          />
        </section>
        <aside>
          <MembersPanel playlist={playlist} isOwner={isOwner} currentUserId={user?.userid} />
        </aside>
      </div>

      <PlaylistFormDialog open={editOpen} onOpenChange={setEditOpen} playlist={playlist} />
      {isOwner && <ShareDialog open={shareOpen} onOpenChange={setShareOpen} playlist={playlist} />}

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? "Delete this playlist?" : "Leave this playlist?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? "It will be removed for everyone it's shared with. This can't be undone."
                : `You'll lose access to “${playlist.name}” until ${playlist.owner.name} invites you again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                confirm === "delete"
                  ? deletePlaylist.mutate(playlist.id)
                  : leave.mutate({ id: playlist.id, userId: user.userid })
              }
            >
              {confirm === "delete" ? "Delete" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PlaylistDetail
