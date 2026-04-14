"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { GroupList } from "@/components/groups/GroupList"
import { CreateGroupForm } from "@/components/groups/CreateGroupForm"
import { JoinRequestForm } from "@/components/groups/JoinRequestForm"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Group {
  id: string
  name: string
  description?: string | null
  memberCount: number
  taskCount: number
  isMember: boolean
  hasPendingRequest?: boolean
  myPermissions?: number
  creator?: {
    id: string
    name: string | null
    email: string
  }
}

export default function GroupsPage() {
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(null)
  const [joinRequestGroup, setJoinRequestGroup] = useState<Group | null>(null)

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch("/api/groups")
      if (!response.ok) throw new Error("Failed to fetch groups")
      const data = await response.json()
      setMyGroups(data.myGroups || [])
      setDiscoverGroups(data.discover || [])
    } catch (error) {
      toast.error("Failed to fetch groups")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleCreateGroup = async (data: { name: string; description?: string }) => {
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to create group")
      throw new Error(error.error)
    }

    toast.success("Group created")
    fetchGroups()
  }

  const handleJoinRequest = (groupId: string) => {
    const group = discoverGroups.find((g) => g.id === groupId)
    if (group) {
      setJoinRequestGroup(group)
    }
  }

  const handleSubmitJoinRequest = async (message?: string) => {
    if (!joinRequestGroup) return

    setRequestingGroupId(joinRequestGroup.id)
    try {
      const response = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: joinRequestGroup.id, message }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Join request sent")
      fetchGroups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send request")
    } finally {
      setRequestingGroupId(null)
      setJoinRequestGroup(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Manage and discover groups</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">My Groups</h2>
        <GroupList
          groups={myGroups}
          emptyMessage="You're not a member of any groups yet. Create one or join an existing group."
        />
      </div>

      {discoverGroups.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Discover Groups</h2>
          <GroupList
            groups={discoverGroups}
            onJoinRequest={handleJoinRequest}
            requestingGroupId={requestingGroupId}
            emptyMessage="No groups to discover"
          />
        </div>
      )}

      <CreateGroupForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateGroup}
      />

      {joinRequestGroup && (
        <JoinRequestForm
          open={!!joinRequestGroup}
          onOpenChange={(open) => !open && setJoinRequestGroup(null)}
          groupName={joinRequestGroup.name}
          onSubmit={handleSubmitJoinRequest}
        />
      )}
    </div>
  )
}
