import { Music2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const EmptyState = ({ icon: Icon = Music2, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && (
      <Button size="sm" variant="outline" className="mt-4" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
)

export default EmptyState
