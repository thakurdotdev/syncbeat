import { yupResolver } from "@hookform/resolvers/yup"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreatePlaylist, useUpdatePlaylist } from "@/hooks/queries/usePlaylistQueries"

const schema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Give your playlist a name")
    .max(100, "Name must be 100 characters or less"),
  description: yup.string().trim().max(500, "Description must be 500 characters or less"),
})

/** Create a playlist, or edit one when `playlist` is passed. */
const PlaylistFormDialog = ({ open, onOpenChange, playlist, onSaved }) => {
  const isEdit = Boolean(playlist)
  const form = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: "", description: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: playlist?.name || "", description: playlist?.description || "" })
    }
  }, [open, playlist, form])

  const done = (saved) => {
    onOpenChange(false)
    onSaved?.(saved)
  }
  const create = useCreatePlaylist({ onSuccess: done })
  const update = useUpdatePlaylist({ onSuccess: done })
  const isPending = create.isPending || update.isPending

  const onSubmit = (values) => {
    if (isEdit) update.mutate({ id: playlist.id, ...values })
    else create.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit playlist" : "New playlist"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Everyone who shares this playlist will see the change."
              : "You can share it with friends after it's created."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Late night drive" autoFocus />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="What's this playlist for?" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isEdit ? "Save" : "Create playlist"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default PlaylistFormDialog
