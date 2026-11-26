import { Heart } from "lucide-react"
import { useLikedIds, useToggleLike } from "@/hooks/queries/useLibraryQueries"
import { cn } from "@/lib/utils"

const LikeButton = ({ song, className, size = "h-4 w-4" }) => {
  const likedIds = useLikedIds()
  const { mutate, isPending } = useToggleLike()
  const liked = likedIds.has(song?.id)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!isPending) mutate(song)
      }}
      aria-pressed={liked}
      aria-label={liked ? `Unlike ${song?.name}` : `Like ${song?.name}`}
      title={liked ? "Remove from liked songs" : "Like"}
      className={cn(
        "h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-colors cursor-pointer",
        "text-muted-foreground hover:text-foreground hover:bg-accent/60",
        liked && "text-rose-500 hover:text-rose-500",
        className,
      )}
    >
      <Heart className={cn(size, liked && "fill-current")} />
    </button>
  )
}

export default LikeButton
