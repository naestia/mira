"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Settings, Trash2, Loader2, UserPlus, Crown, Shield, User } from "lucide-react"
import { toast } from "sonner"

interface Member {
  id: string
  userId: string
  projectId: string
  role: "MEMBER" | "MANAGER" | "OWNER"
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ProjectMemberListProps {
  projectId: string
  members: Member[]
  myRole?: "MEMBER" | "MANAGER" | "OWNER" | null
  isAdmin?: boolean
  isArchived?: boolean
  currentUserId: string
  onMemberUpdated?: () => void
}

const roleIcons = {
  OWNER: Crown,
  MANAGER: Shield,
  MEMBER: User,
}

const roleColors = {
  OWNER: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  MANAGER: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MEMBER: "",
}

export function ProjectMemberList({
  projectId,
  members,
  myRole,
  isAdmin,
  isArchived,
  currentUserId,
  onMemberUpdated,
}: ProjectMemberListProps) {
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editedRole, setEditedRole] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [removingMember, setRemovingMember] = useState<Member | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [searchEmail, setSearchEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<string>("MEMBER")
  const [isAdding, setIsAdding] = useState(false)

  const canManage = isAdmin || myRole === "OWNER" || myRole === "MANAGER"

  const handleEditClick = (member: Member) => {
    setEditingMember(member)
    setEditedRole(member.role)
  }

  const handleSaveRole = async () => {
    if (!editingMember) return
    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${editingMember.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: editedRole }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Member role updated")
      setEditingMember(null)
      onMemberUpdated?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!removingMember) return
    setIsRemoving(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${removingMember.userId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Member removed")
      setRemovingMember(null)
      onMemberUpdated?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    } finally {
      setIsRemoving(false)
    }
  }

  const handleAddMember = async () => {
    if (!searchEmail.trim()) return
    setIsAdding(true)
    try {
      // First, find the user by email
      const searchResponse = await fetch(
        `/api/admin/users?search=${encodeURIComponent(searchEmail)}`
      )
      if (!searchResponse.ok) throw new Error("Failed to search users")

      const users = await searchResponse.json()
      const user = users.find(
        (u: { email: string }) => u.email.toLowerCase() === searchEmail.toLowerCase()
      )

      if (!user) {
        throw new Error("User not found")
      }

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newMemberRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Member added")
      setIsAddMemberOpen(false)
      setSearchEmail("")
      setNewMemberRole("MEMBER")
      onMemberUpdated?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Members</CardTitle>
        {canManage && !isArchived && (
          <Button size="sm" onClick={() => setIsAddMemberOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Member</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                {canManage && !isArchived && (
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isCurrentUser = member.userId === currentUserId
                const RoleIcon = roleIcons[member.role]

                return (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {member.user.name || "—"}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {member.user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`gap-1 ${roleColors[member.role]}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(member.joinedAt), "MMM d, yyyy")}
                    </td>
                    {canManage && !isArchived && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(isAdmin || myRole === "OWNER") && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditClick(member)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setRemovingMember(member)}
                            disabled={member.role === "OWNER" && myRole !== "OWNER" && !isAdmin}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Edit Role Dialog */}
      <Dialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Role for {editingMember?.user.name || editingMember?.user.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editedRole} onValueChange={(v) => v && setEditedRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Member
                    </div>
                  </SelectItem>
                  <SelectItem value="MANAGER">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="OWNER">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Owner
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editedRole === "OWNER" && "Transferring ownership will demote the current owner to Manager."}
                {editedRole === "MANAGER" && "Managers can create groups and manage members."}
                {editedRole === "MEMBER" && "Members can view and contribute to the project."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newMemberRole} onValueChange={(v) => v && setNewMemberRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isAdding || !searchEmail.trim()}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      {removingMember && (
        <ConfirmDialog
          open={!!removingMember}
          onOpenChange={(open) => !open && setRemovingMember(null)}
          title="Remove Member"
          description={`Are you sure you want to remove ${removingMember.user.name || removingMember.user.email} from this project?`}
          confirmLabel="Remove"
          variant="destructive"
          onConfirm={handleRemoveMember}
          isLoading={isRemoving}
        />
      )}
    </Card>
  )
}
