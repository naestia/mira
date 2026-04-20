"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Save, X, Loader2 } from "lucide-react"

interface ProjectOverviewProps {
  overview?: string | null
  canEdit?: boolean
  isArchived?: boolean
  onSave?: (overview: string) => Promise<void>
}

export function ProjectOverview({
  overview,
  canEdit,
  isArchived,
  onSave,
}: ProjectOverviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(overview || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(overview || "")
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full min-h-[300px] p-3 rounded-lg border bg-transparent text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Write your project overview using Markdown..."
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Supports Markdown: headings, lists, code blocks, links, and more.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Overview</CardTitle>
        {canEdit && !isArchived && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {overview ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-primary underline underline-offset-2 hover:opacity-80"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className
                  if (isInline) {
                    return (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code
                      className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => (
                  <pre className="mb-4">{children}</pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-4">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {overview}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {canEdit && !isArchived
              ? "No overview yet. Click Edit to add one."
              : "No overview available."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
