import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";
import type { BookingStatus } from "@/types/database";

const STYLES: Record<BookingStatus, string> = {
  booked: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  rescheduled: "bg-warning/15 text-warning border-warning/30",
  no_show: "bg-muted text-muted-foreground border-border",
  closed: "bg-chart-2/15 text-chart-2 border-chart-2/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STYLES[status], className)}
    >
      {statusLabel(status)}
    </Badge>
  );
}
