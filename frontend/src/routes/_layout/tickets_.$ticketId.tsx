import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Suspense, useState } from "react"

import {
  type TicketPriority,
  type TicketStatus,
  TicketsService,
  type TicketUpdate,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const statusOptions: { label: string; value: TicketStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
]

const priorityOptions: { label: string; value: TicketPriority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
]

function getTicketQueryOptions(ticketId: string) {
  return {
    queryFn: async () =>
      (await TicketsService.readTicket({ path: { id: ticketId } })).data,
    queryKey: ["tickets", ticketId],
  }
}

export const Route = createFileRoute("/_layout/tickets_/$ticketId")({
  component: TicketDetails,
  head: () => ({
    meta: [{ title: "Ticket Details - AI Support Platform" }],
  }),
})

function TicketDetailsContent() {
  const { ticketId } = Route.useParams()
  const { data: ticket } = useSuspenseQuery(getTicketQueryOptions(ticketId))
  const [status, setStatus] = useState<TicketStatus>(ticket.status)
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: TicketUpdate) =>
      TicketsService.updateTicket({ path: { id: ticket.id }, body: data }),
    onSuccess: () => {
      showSuccessToast("Ticket updated successfully")
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
  })

  const hasChanges = status !== ticket.status || priority !== ticket.priority

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-2">
          <Link to="/tickets">
            <ArrowLeft />
            Back to tickets
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">Ticket ID: {ticket.id}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Customer request</CardTitle>
            <CardDescription>
              Submitted {new Date(ticket.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Requester</p>
                <p className="text-sm text-muted-foreground">
                  {ticket.requester_name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <a
                  className="text-sm text-primary hover:underline"
                  href={`mailto:${ticket.requester_email}`}
                >
                  {ticket.requester_email}
                </a>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Description</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {ticket.description || "No description provided."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Ticket management</CardTitle>
            <CardDescription>Update the ticket workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="ticket-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TicketStatus)}
              >
                <SelectTrigger id="ticket-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as TicketPriority)}
              >
                <SelectTrigger id="ticket-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <LoadingButton
              className="w-full"
              disabled={!hasChanges}
              loading={mutation.isPending}
              onClick={() => mutation.mutate({ status, priority })}
            >
              Save changes
            </LoadingButton>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TicketDetailsPending() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

function TicketDetails() {
  return (
    <Suspense fallback={<TicketDetailsPending />}>
      <TicketDetailsContent />
    </Suspense>
  )
}
