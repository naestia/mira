"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Send } from "lucide-react"

interface NoteFormProps {
  onSubmit: (message: string) => Promise<void>
  disabled?: boolean
}

export function NoteForm({ onSubmit, disabled }: NoteFormProps) {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(message.trim())
      setMessage("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a note to the timeline..."
        disabled={disabled || isSubmitting}
        className="flex-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="submit"
        disabled={disabled || isSubmitting || !message.trim()}
        size="icon"
        className="self-end"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
}
