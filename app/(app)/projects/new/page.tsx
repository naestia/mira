"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Lock, Globe, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { hasUserPermission, UserPermissions } from "@/lib/permissions"

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  overview: z.string().max(10000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
})

type CreateProjectInput = z.infer<typeof createProjectSchema>

export default function NewProjectPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const {
    register,
    handleSubmit,
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

  const checkPermission = useCallback(async () => {
    if (status === "loading") return

    if (!session?.user?.id) {
      router.replace("/login")
      return
    }

    // Admins can always create
    if (session.user.role === "ADMIN") {
      setIsChecking(false)
      return
    }

    // Check user permissions
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const user = await response.json()
        const canCreate = hasUserPermission(
          user.userPermissions || 0,
          UserPermissions.CREATE_PROJECT
        )

        if (!canCreate) {
          toast.error("You don't have permission to create projects")
          router.replace("/projects")
          return
        }
      }
    } catch {
      toast.error("Failed to verify permissions")
      router.replace("/projects")
      return
    }

    setIsChecking(false)
  }, [session, status, router])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  const onSubmit = async (data: CreateProjectInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create project")
      }

      const project = await response.json()
      toast.success("Project created")
      router.push(`/projects/${project.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isChecking || status === "loading") {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/projects" />}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>
            Projects organize groups and tasks together. Set up your project
            details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                placeholder="A brief description of your project"
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
                className="w-full min-h-[150px] p-3 rounded-lg border bg-transparent text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Write a detailed overview using Markdown...

# Project Goals
- Goal 1
- Goal 2

## Getting Started
..."
              />
              <p className="text-xs text-muted-foreground">
                Supports Markdown: headings, lists, code blocks, links, and more.
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

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={<Link href="/projects" />}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
