import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Suspense } from "react"

import { TicketsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingTickets from "@/components/Pending/PendingTickets"
import { columns } from "@/components/Tickets/columns"

function getTicketsQueryOptions() {
  return {
    queryFn: async () =>
      (await TicketsService.readTickets({ query: { skip: 0, limit: 100 } }))
        .data,
    queryKey: ["tickets"],
  }
}

export const Route = createFileRoute("/_layout/tickets")({
  component: Tickets,
  head: () => ({
    meta: [
      {
        title: "Tickets - AI Support Platform",
      },
    ],
  }),
})

function TicketsTableContent() {
  const { data: tickets } = useSuspenseQuery(getTicketsQueryOptions())

  if (tickets.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No tickets yet</h3>
        <p className="text-muted-foreground">
          New customer requests will appear here.
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={tickets.data} />
}

function TicketsTable() {
  return (
    <Suspense fallback={<PendingTickets />}>
      <TicketsTableContent />
    </Suspense>
  )
}

function Tickets() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <p className="text-muted-foreground">
          Review and manage customer support requests.
        </p>
      </div>
      <TicketsTable />
    </div>
  )
}
