import { cn } from "@/lib/utils"

/** Number card used on the admin and user dashboards. */
export const StatCard = ({ label, value, hint, icon: Icon, accent }) => (
  <div className="rounded-2xl border border-border/60 bg-card p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{label}</p>
      {Icon && (
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
    </div>
    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value ?? "–"}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
)

export const Panel = ({ title, action, children, className }) => (
  <section className={cn("rounded-2xl border border-border/60 bg-card p-4", className)}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </section>
)
