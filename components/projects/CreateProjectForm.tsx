"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Lock, Globe } from "lucide-react"

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  overview: z.string().max(10000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
})

type CreateProjectInput = z.infer<typeof createProjectSchema>

interface CreateProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateProjectInput) => Promise<void>
}

export function CreateProjectForm({
  open,
  onOpenChange,
  onSubmit,
}: CreateProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      visibility: "PRIVATE",
    },
  })

  const visibility = watch("visibility")

  const handleFormSubmit = async (data: CreateProjectInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      reset()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="My Project"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="What is this project about?"
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="overview">Overview (optional)</Label>
            <textarea
              id="overview"
              {...register("overview")}
              className="w-full min-h-[100px] p-3 rounded-lg border bg-transparent text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Write a detailed overview using Markdown..."
            />
            <p className="text-xs text-muted-foreground">
              Supports Markdown formatting
            </p>
            {errors.overview && (
              <p className="text-sm text-destructive">
                {errors.overview.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) =>
                setValue("visibility", value as "PUBLIC" | "PRIVATE")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                </SelectItem>
                <SelectItem value="PUBLIC">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {visibility === "PRIVATE"
                ? "Only project members can see this project"
                : "Any logged-in user can see this project"}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
