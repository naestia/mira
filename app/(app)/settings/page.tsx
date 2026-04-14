"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Tag } from "@/types"

interface UserProfile {
  id: string
  email: string
  username: string | null
  name: string | null
  createdAt: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#6366f1")
  const [isCreating, setIsCreating] = useState(false)

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileName, setProfileName] = useState("")
  const [profileUsername, setProfileUsername] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  useEffect(() => {
    fetchTags()
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (!response.ok) throw new Error("Failed to fetch profile")
      const data = await response.json()
      setProfile(data)
      setProfileName(data.name ?? "")
      setProfileUsername(data.username ?? "")
    } catch (error) {
      toast.error("Failed to fetch profile")
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    setProfileError(null)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName || undefined,
          username: profileUsername || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setProfileError(data.error || "Failed to update profile")
        return
      }

      setProfile(data)
      setProfileName(data.name ?? "")
      setProfileUsername(data.username ?? "")
      toast.success("Profile updated successfully")
    } catch (error) {
      setProfileError("Failed to update profile")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const hasProfileChanges = Boolean(
    profile &&
      (profileName.trim() !== (profile.name ?? "") ||
        profileUsername.trim() !== (profile.username ?? ""))
  )

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags")
      if (!response.ok) throw new Error("Failed to fetch tags")
      const data = await response.json()
      setTags(data)
    } catch (error) {
      toast.error("Failed to fetch tags")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    setIsCreating(true)
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create tag")
      }
      const newTag = await response.json()
      setTags((prev) => [...prev, newTag])
      setNewTagName("")
      toast.success("Tag created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tag")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete tag")
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      toast.success("Tag deleted")
    } catch (error) {
      toast.error("Failed to delete tag")
    }
  }

  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
  ]

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {profileError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md">
                  {profileError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="Choose a username"
                />
                <p className="text-xs text-muted-foreground">
                  3-30 characters. Letters, numbers, underscores, and hyphens only.
                  You can use your username to log in.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={session?.user?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || !hasProfileChanges}
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>Manage your task tags</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="pr-1 gap-1"
                    style={{ backgroundColor: tag.color, color: "white" }}
                  >
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-white/20"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags yet</p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Create new tag</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateTag()
                    }}
                  />
                  <Button onClick={handleCreateTag} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
                <div className="flex gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        newTagColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
