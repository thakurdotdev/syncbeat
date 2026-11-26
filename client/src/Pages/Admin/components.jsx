import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export { Panel, StatCard } from "@/components/StatCard"

export const AdminPageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions}
  </div>
)

export const Pagination = ({ page, pages, total, onChange, label = "results" }) => {
  if (!pages || pages <= 1) {
    return total ? (
      <p className="mt-3 text-xs text-muted-foreground">
        {total} {label}
      </p>
    ) : null
  }
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {total} {label} · page {page} of {pages}
      </p>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

export const TableShell = ({ children }) => (
  <div className="overflow-x-auto rounded-2xl border border-border/60">
    <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
  </div>
)

export const Th = ({ children, className }) => (
  <th
    className={cn(
      "border-b border-border/60 bg-muted/40 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
      className,
    )}
  >
    {children}
  </th>
)

export const Td = ({ children, className }) => (
  <td className={cn("border-b border-border/40 px-3 py-2.5 align-middle", className)}>{children}</td>
)

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "–"
