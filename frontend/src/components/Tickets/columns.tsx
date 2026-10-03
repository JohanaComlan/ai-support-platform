import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"

import type { TicketPriority, TicketStaffPublic, TicketStatus } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
}

const priorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const variant =
    priority === "urgent"
      ? "destructive"
      : priority === "high"
        ? "default"
        : priority === "medium"
          ? "secondary"
          : "outline"

  return <Badge variant={variant}>{priorityLabels[priority]}</Badge>
}

export const columns: ColumnDef<TicketStaffPublic>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.subject}</span>
    ),
  },
  {
    accessorKey: "requester_name",
    header: "Requester",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.requester_name}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.requester_email}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline">{statusLabels[row.original.status]}</Badge>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link to="/tickets/$ticketId" params={{ ticketId: row.original.id }}>
          <Eye />
          View
        </Link>
      </Button>
    ),
  },
]
