"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { PermissionEditor } from "./PermissionEditor"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { hasPermission, Permissions, getPermissionList } from "@/lib/permissions"
import { Settings, Trash2, Loader2 } from "lucide-react"

interface Member {
  id: string
  userId: string
  permissions: number
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    createdAt: string
  }
}

interface MemberTableProps {
  members: Member[]
  canManage: boolean
  currentUserId: string
  onUpdatePermissions: (userId: string, permissions: number) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
}

export function MemberTable({
  members,
  canManage,
  currentUserId,
  onUpdatePermissions,
  onRemoveMember,
}: MemberTableProps) {
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editedPermissions, setEditedPermissions] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [removingMember, setRemovingMember] = useState<Member | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleEditClick = (member: Member) => {
    setEditingMember(member)
    setEditedPermissions(member.permissions)
  }

  const handleSavePermissions = async () => {
    if (!editingMember) return
    setIsSaving(true)
    try {
      await onUpdatePermissions(editingMember.userId, editedPermissions)
      setEditingMember(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!removingMember) return
    setIsRemoving(true)
    try {
      await onRemoveMember(removingMember.userId)
      setRemovingMember(null)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Member</th>
              <th className="px-4 py-3 text-left font-medium">Permissions</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              {canManage && (
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId
              const permissionList = getPermissionList(member.permissions)
              const isManager = hasPermission(member.permissions, Permissions.MANAGE_MEMBERS)

              return (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {member.user.name || "—"}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                        {isManager && (
                          <Badge variant="secondary" className="text-xs">Manager</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">{member.user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {permissionList.slice(0, 3).map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p.replace("_", " ")}
                        </Badge>
                      ))}
                      {permissionList.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{permissionList.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(member.joinedAt), "MMM d, yyyy")}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEditClick(member)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRemovingMember(member)}
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

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Permissions for {editingMember?.user.name || editingMember?.user.email}
            </DialogTitle>
          </DialogHeader>
          <PermissionEditor
            permissions={editedPermissions}
            onChange={setEditedPermissions}
            disabled={isSaving}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
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
          description={`Are you sure you want to remove ${removingMember.user.name || removingMember.user.email} from this group?`}
          confirmLabel="Remove"
          variant="destructive"
          onConfirm={handleRemoveMember}
          isLoading={isRemoving}
        />
      )}
    </>
  )
}
