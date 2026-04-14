"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Loader2 } from "lucide-react"

interface JoinRequest {
  id: string
  userId: string
  message?: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    createdAt: string
  }
}

interface JoinRequestListProps {
  requests: JoinRequest[]
  onApprove: (requestId: string) => Promise<void>
  onReject: (requestId: string) => Promise<void>
}

export function JoinRequestList({ requests, onApprove, onReject }: JoinRequestListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    setProcessingId(requestId)
    try {
      if (action === "approve") {
        await onApprove(requestId)
      } else {
        await onReject(requestId)
      }
    } finally {
      setProcessingId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending join requests
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const isProcessing = processingId === request.id

        return (
          <Card key={request.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {request.user.name || request.user.email}
                  </CardTitle>
                  {request.user.name && (
                    <p className="text-sm text-muted-foreground">{request.user.email}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(request.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {request.message && (
                <p className="text-sm mb-4 bg-muted p-3 rounded-lg">
                  &ldquo;{request.message}&rdquo;
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(request.id, "approve")}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(request.id, "reject")}
                  disabled={isProcessing}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
