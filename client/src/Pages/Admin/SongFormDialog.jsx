import { yupResolver } from "@hookform/resolvers/yup"
import { ImageOff, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import * as yup from "yup"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCreateAdminSong, useUpdateAdminSong } from "@/hooks/queries/useAdminQueries"
import { getAlbumName, getSongArtists, getSongAudioUrl, getSongCover } from "@/lib/song"

const link = (label) =>
  yup
    .string()
    .trim()
    .required(`${label} is required`)
    .url(`${label} must be a valid URL`)
    .matches(/^https?:\/\//i, `${label} must start with http:// or https://`)

const schema = yup.object({
  name: yup.string().trim().required("Song name is required").max(200, "Too long"),
  artists: yup.string().trim().required("Add at least one artist").max(300, "Too long"),
  album: yup.string().trim().max(200, "Too long"),
  language: yup.string().trim().max(50, "Too long"),
  duration: yup
    .string()
    .trim()
    .matches(/^(\d{1,2}:\d{2}|\d*)$/, "Use minutes:seconds, e.g. 3:45"),
  audioUrl: link("Audio link"),
  coverUrl: link("Cover image link"),
})

const toSeconds = (value) => {
  if (!value) return 0
  if (value.includes(":")) {
    const [m, s] = value.split(":").map(Number)
    return m * 60 + s
  }
  return Number(value) || 0
}

const toMinutes = (seconds) => {
  const total = Number(seconds) || 0
  return total ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}` : ""
}

const valuesFrom = (song) => ({
  name: song?.name || "",
  artists: song ? getSongArtists(song, 10).replace("Unknown artist", "") : "",
  album: song ? getAlbumName(song) : "",
  language: song?.language && song.language !== "unknown" ? song.language : "",
  duration: toMinutes(song?.duration),
  audioUrl: song ? getSongAudioUrl(song) : "",
  coverUrl: song ? getSongCover(song, "large") : "",
})

/** Add a song by pasting links (no uploads), or edit one when `song` is passed. */
const SongFormDialog = ({ open, onOpenChange, song }) => {
  const isEdit = Boolean(song)
  const form = useForm({ resolver: yupResolver(schema), defaultValues: valuesFrom(null) })
  const [coverError, setCoverError] = useState(false)
  const create = useCreateAdminSong()
  const update = useUpdateAdminSong()
  const isPending = create.isPending || update.isPending

  useEffect(() => {
    if (open) {
      form.reset(valuesFrom(song))
      setCoverError(false)
    }
  }, [open, song, form])

  const coverUrl = form.watch("coverUrl")
  const audioUrl = form.watch("audioUrl")

  // A new cover link gets a fresh chance to load
  useEffect(() => setCoverError(false), [coverUrl])
  const validAudio = /^https?:\/\/\S+$/i.test(audioUrl || "")

  // Fill in the duration automatically once the audio link loads
  const onAudioMetadata = (e) => {
    const seconds = Math.round(e.currentTarget.duration)
    if (Number.isFinite(seconds) && seconds > 0 && !form.getValues("duration")) {
      form.setValue("duration", toMinutes(seconds), { shouldValidate: true })
    }
  }

  const onSubmit = (values) => {
    const body = { ...values, duration: toSeconds(values.duration) }
    const options = { onSuccess: () => onOpenChange(false) }
    if (isEdit) update.mutate({ id: song?.dbId, ...body }, options)
    else create.mutate(body, options)
  }

  const field = (name, label, props = {}, description) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...f} {...props} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit song" : "Add song"}</DialogTitle>
          <DialogDescription>
            Paste a direct link to the audio file (mp3/m4a) and to a cover image. Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div className="space-y-4">
                {field("audioUrl", "Audio link", {
                  placeholder: "https://example.com/song.mp3",
                  inputMode: "url",
                })}
                {field("coverUrl", "Cover image link", {
                  placeholder: "https://example.com/cover.jpg",
                  inputMode: "url",
                })}
              </div>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
                {coverUrl && !coverError ? (
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="h-full w-full object-cover"
                    onError={() => setCoverError(true)}
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 px-2 text-center text-xs text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                    {coverError ? "Image link doesn't load" : "Cover preview"}
                  </span>
                )}
              </div>
            </div>

            {validAudio && (
              <audio
                key={audioUrl}
                src={audioUrl}
                controls
                preload="metadata"
                onLoadedMetadata={onAudioMetadata}
                className="h-10 w-full"
              >
                <track kind="captions" />
              </audio>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Song name", { placeholder: "e.g. Kesariya" })}
              {field(
                "artists",
                "Artists",
                { placeholder: "e.g. Arijit Singh, Pritam" },
                "Separate several artists with commas",
              )}
              {field("album", "Album (optional)")}
              <div className="grid grid-cols-2 gap-3">
                {field("language", "Language", { placeholder: "hindi" })}
                {field("duration", "Duration", { placeholder: "3:45" }, "Auto-filled from audio")}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isEdit ? "Save changes" : "Add song"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default SongFormDialog
