import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { MessageSquare } from "lucide-react"
import { type FormEvent, Suspense, useState } from "react"

import { type TicketMessageCreate, TicketsService } from "@/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

function getTicketMessagesQueryOptions(ticketId: string) {
  return {
    queryFn: async () =>
      (
        await TicketsService.readTicketMessages({
          path: { ticket_id: ticketId },
          query: { skip: 0, limit: 100 },
        })
      ).data,
    queryKey: ["ticket-messages", ticketId],
  }
}

interface TicketMessagesContentProps {
  ticketId: string
}

function TicketMessagesContent({ ticketId }: TicketMessagesContentProps) {
  const { data: messages } = useSuspenseQuery(
    getTicketMessagesQueryOptions(ticketId),
  )
  const [content, setContent] = useState("")
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: TicketMessageCreate) =>
      TicketsService.createTicketMessage({
        path: { ticket_id: ticketId },
        body: data,
      }),
    onSuccess: () => {
      setContent("")
      showSuccessToast("Reply sent successfully")
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-messages", ticketId],
      })
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedContent = content.trim()
    if (trimmedContent) {
      mutation.mutate({ content: trimmedContent })
    }
  }

  return (
    <div className="space-y-6">
      {messages.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No replies yet</p>
          <p className="text-sm text-muted-foreground">
            Send the first reply to this customer request.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.data.map((message) => (
            <div
              className={`rounded-lg border p-4 ${
                message.sender_type === "staff"
                  ? "bg-muted/50"
                  : "bg-background"
              }`}
              key={message.id}
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-sm font-medium">
                  {message.sender_type === "staff"
                    ? "Support staff"
                    : "Customer"}
                </p>
                <time className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleString()}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          ))}
        </div>
      )}

      <form className="space-y-3 border-t pt-6" onSubmit={handleSubmit}>
        <Label htmlFor="ticket-reply">Reply</Label>
        <textarea
          id="ticket-reply"
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-32 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          maxLength={10000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a reply to the customer..."
          value={content}
        />
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            disabled={!content.trim()}
            loading={mutation.isPending}
          >
            Send reply
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}

function TicketMessagesPending() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

interface TicketMessagesProps {
  ticketId: string
}

function TicketMessages({ ticketId }: TicketMessagesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation</CardTitle>
        <CardDescription>
          View the history and reply to this ticket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<TicketMessagesPending />}>
          <TicketMessagesContent ticketId={ticketId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}

export default TicketMessages
