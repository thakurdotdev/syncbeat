import { ListMusic } from "lucide-react"
import { cn } from "@/lib/utils"

/** 2x2 mosaic of the first song covers, or a placeholder. */
const PlaylistCover = ({ covers = [], className }) => {
  if (!covers.length) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center rounded-xl bg-linear-to-br from-primary/25 to-primary/5",
          className,
        )}
      >
        <ListMusic className="h-1/3 w-1/3 text-primary/70" />
      </div>
    )
  }
  if (covers.length < 4) {
    return (
      <img
        src={covers[0]}
        alt=""
        loading="lazy"
        className={cn("aspect-square rounded-xl object-cover", className)}
      />
    )
  }
  return (
    <div className={cn("grid aspect-square grid-cols-2 overflow-hidden rounded-xl", className)}>
      {covers.slice(0, 4).map((src, i) => (
        <img key={i} src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ))}
    </div>
  )
}

export default PlaylistCover
