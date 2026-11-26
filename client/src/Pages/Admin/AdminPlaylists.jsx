import { yupResolver } from "@hookform/resolvers/yup"
import { Loader2, Pencil, Search, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import * as yup from "yup"
import { Link } from "react-router-dom"
import EmptyState from "@/components/music/EmptyState"
import PlaylistCover from "@/components/music/PlaylistCover"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useAdminPlaylist,
  useAdminPlaylists,
  useDeleteAdminPlaylist,
  useRemoveAdminPlaylistSong,
  useUpdateAdminPlaylist,
} from "@/hooks/queries/useAdminQueries"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { plural } from "@/lib/song"
import { AdminPageHeader, formatDate, Pagination } from "./components"

const editSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Playlist name is required")
    .max(100, "Name must be 100 characters or less"),
  description: yup.string().trim().max(500, "Description must be 500 characters or less"),
})

/** Inline form so the admin can rename a playlist or change its description. */
const EditPlaylistForm = ({ playlist, onDone }) => {
  const update = useUpdateAdminPlaylist()
  const form = useForm({
    resolver: yupResolver(editSchema),
    defaultValues: { name: playlist.name, description: playlist.description || "" },
  })

  const onSubmit = (values) =>
    update.mutate({ id: playlist.id, ...values }, { onSuccess: () => onDone() })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-xl border border-border/60 p-3"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}

const PlaylistDialog = ({ playlistId, onClose, onDelete }) => {
  const { data: playlist, isLoading } = useAdminPlaylist(playlistId)
  const removeSong = useRemoveAdminPlaylistSong()
  const [editing, setEditing] = useState(false)

  useEffect(() => setEditing(false), [playlistId])

  return (
    <Dialog open={Boolean(playlistId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        {isLoading || !playlist ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <PlaylistCover covers={playlist.covers} className="h-20 w-20" />
                <div className="min-w-0 text-left">
                  <DialogTitle className="truncate">{playlist.name}</DialogTitle>
                  <DialogDescription>
                    by{" "}
                    <Link
                      to={`/admin/users/${playlist.owner.userid}`}
                      className="text-primary hover:underline"
                      onClick={onClose}
                    >
                      {playlist.owner.name}
                    </Link>{" "}
                    · {plural(playlist.songCount, "song")} · created {formatDate(playlist.createdAt)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {editing ? (
              <EditPlaylistForm playlist={playlist} onDone={() => setEditing(false)} />
            ) : (
              playlist.description && (
                <p className="text-sm text-muted-foreground">{playlist.description}</p>
              )
            )}
            {playlist.members.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {playlist.members.map((m) => (
                  <Badge key={m.userid} variant={m.status === "accepted" ? "secondary" : "outline"}>
                    {m.name}
                    {m.status === "pending" && " (invited)"}
                  </Badge>
                ))}
              </div>
            )}
            <SongList
              songs={playlist.songs}
              getMeta={(s) => (s.addedBy ? `added by ${s.addedBy.name}` : null)}
              onRemove={(song) => removeSong.mutate({ id: playlist.id, songRefId: song.dbId })}
              removeLabel="Remove from playlist"
              empty={<EmptyState title="This playlist is empty" />}
            />
            <div className="flex flex-wrap justify-end gap-2">
              {!editing && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit details
                </Button>
              )}
              <Button variant="destructive" onClick={() => onDelete(playlist)}>
                <Trash2 /> Delete playlist
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

const AdminPlaylists = () => {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("popular")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const debounced = useDebouncedValue(search.trim(), 300)
  const { data, isLoading, isError, refetch } = useAdminPlaylists({ search: debounced, sort, page })
  const remove = useDeleteAdminPlaylist()

  return (
    <>
      <AdminPageHeader
        title="Playlists"
        description="Popular playlists are the ones shared with the most people."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={sort}
          onValueChange={(v) => {
            setSort(v)
            setPage(1)
          }}
        >
          <TabsList>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="songs">Most songs</TabsTrigger>
            <TabsTrigger value="recent">Recently updated</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search playlist or owner"
            className="pl-9"
            aria-label="Search playlists"
          />
        </div>
      </div>

      {isError ? (
        <EmptyState title="Couldn't load playlists" action={{ label: "Retry", onClick: refetch }} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : !data.playlists.length ? (
        <EmptyState title={debounced ? "No playlists match" : "No playlists yet"} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.playlists.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenId(p.id)}
                className="group relative rounded-2xl p-2 text-left transition-colors hover:bg-accent/40 cursor-pointer"
              >
                {sort === "popular" && page === 1 && i < 3 && (
                  <span className="absolute left-4 top-4 z-10 rounded-full bg-background/90 px-2 py-0.5 text-xs font-bold">
                    #{i + 1}
                  </span>
                )}
                <PlaylistCover covers={p.covers} className="w-full" />
                <p className="mt-2 truncate text-sm font-medium group-hover:text-primary">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">by {p.owner.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {plural(p.songCount, "song")} · {plural(p.memberCount, "collaborator")}
                </p>
              </button>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} label="playlists" />
        </>
      )}

      <PlaylistDialog playlistId={openId} onClose={() => setOpenId(null)} onDelete={setToDelete} />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear for {toDelete?.owner?.name} and everyone it's shared with.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                remove.mutate(toDelete?.id, {
                  onSuccess: () => setOpenId(null),
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AdminPlaylists
