"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { hasPermission, Permissions } from "@/lib/permissions"

const groupSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
})

type GroupSettingsInput = z.infer<typeof groupSettingsSchema>

interface Group {
  id: string
  name: string
  description?: string | null
  myPermissions: number
}

export default function GroupSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GroupSettingsInput>({
    resolver: zodResolver(groupSettingsSchema),
  })

  const fetchGroup = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (!response.ok) {
        router.push("/groups")
        return
      }
      const data = await response.json()

      if (!hasPermission(data.myPermissions, Permissions.MANAGE_MEMBERS)) {
        router.push(`/groups/${groupId}`)
        return
      }

      setGroup(data)
      reset({
        name: data.name,
        description: data.description || "",
      })
    } catch (error) {
      router.push("/groups")
    } finally {
      setIsLoading(false)
    }
  }, [groupId, router, reset])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  const handleSave = async (data: GroupSettingsInput) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const updated = await response.json()
      setGroup(updated)
      reset({
        name: updated.name,
        description: updated.description || "",
      })
      toast.success("Settings saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Group deleted")
      router.push("/groups")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group")
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!group) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/groups/${groupId}`} />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">{group.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your group's name and description</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                {...register("name")}
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
                placeholder="Optional description"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
            <div>
              <p className="font-medium">Delete Group</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this group and all its tasks
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Group
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? This will permanently delete all tasks in this group. This action cannot be undone.`}
        confirmLabel="Delete Group"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
