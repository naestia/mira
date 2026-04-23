"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const submissionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().min(1, "Description is required").max(5000, "Description is too long"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
})

type SubmissionInput = z.infer<typeof submissionSchema>

const severityOptions = [
  {
    value: "LOW" as const,
    label: "Low",
    description: "Minor issue, no immediate impact",
  },
  {
    value: "MEDIUM" as const,
    label: "Medium",
    description: "Degraded experience, workaround available",
  },
  {
    value: "HIGH" as const,
    label: "High",
    description: "Significant impact, no workaround",
  },
  {
    value: "CRITICAL" as const,
    label: "Critical",
    description: "Complete outage or data risk",
  },
]

export function SubmissionForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubmissionInput>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "MEDIUM",
    },
  })

  const selectedSeverity = watch("severity")

  const onSubmit = async (data: SubmissionInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/reporter/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit incident")
      }

      toast.success("Your incident has been submitted")
      router.push("/reporter")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit incident")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Submit an Incident</CardTitle>
        <CardDescription>
          Describe the issue you&apos;re experiencing. Our team will review and respond as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of the incident"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="What happened? When did it occur? What is the impact?"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Severity</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {severityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue("severity", option.value)}
                  className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                    selectedSeverity === option.value
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-muted/50"
                  }`}
                >
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
            {errors.severity && (
              <p className="text-sm text-destructive">{errors.severity.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={session?.user?.name || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your email</Label>
              <Input
                id="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Incident
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
