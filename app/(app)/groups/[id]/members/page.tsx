"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MemberTable } from "@/components/groups/MemberTable"
import { JoinRequestList } from "@/components/groups/JoinRequestList"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { hasPermission, Permissions } from "@/lib/permissions"

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

interface JoinRequest {
  id: string
  userId: string
  message?: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    createdAt: string
  }
}

interface Group {
  id: string
  name: string
  myPermissions: number
}

export default function GroupMembersPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [canManage, setCanManage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchGroup = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (!response.ok) {
        router.push("/groups")
        return null
      }
      const data = await response.json()
      setGroup(data)
      return data
    } catch (error) {
      router.push("/groups")
      return null
    }
  }, [groupId, router])

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`)
      if (!response.ok) throw new Error("Failed to fetch members")
      const data = await response.json()
      setMembers(data.members)
      setCanManage(data.canManage)
    } catch (error) {
      toast.error("Failed to fetch members")
    }
  }, [groupId])

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/requests`)
      if (!response.ok) return
      const data = await response.json()
      setRequests(data)
    } catch (error) {
      // Ignore - user may not have permission
    }
  }, [groupId])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const groupData = await fetchGroup()
      if (groupData) {
        await Promise.all([fetchMembers(), fetchRequests()])
      }
      setIsLoading(false)
    }
    loadData()
  }, [fetchGroup, fetchMembers, fetchRequests])

  const handleUpdatePermissions = async (userId: string, permissions: number) => {
    const response = await fetch(`/api/groups/${groupId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, permissions }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to update permissions")
      throw new Error(error.error)
    }

    toast.success("Permissions updated")
    fetchMembers()
  }

  const handleRemoveMember = async (userId: string) => {
    const response = await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to remove member")
      throw new Error(error.error)
    }

    toast.success("Member removed")

    // If user removed themselves, redirect to groups
    if (userId === session?.user?.id) {
      router.push("/groups")
    } else {
      fetchMembers()
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    const response = await fetch(`/api/groups/${groupId}/requests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action: "approve" }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to approve request")
      throw new Error(error.error)
    }

    toast.success("Request approved")
    await Promise.all([fetchMembers(), fetchRequests()])
  }

  const handleRejectRequest = async (requestId: string) => {
    const response = await fetch(`/api/groups/${groupId}/requests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action: "reject" }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to reject request")
      throw new Error(error.error)
    }

    toast.success("Request rejected")
    fetchRequests()
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
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">{group.name}</p>
        </div>
      </div>

      {canManage && requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Join Requests ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <JoinRequestList
              requests={requests}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberTable
            members={members}
            canManage={canManage}
            currentUserId={session?.user?.id || ""}
            onUpdatePermissions={handleUpdatePermissions}
            onRemoveMember={handleRemoveMember}
          />
        </CardContent>
      </Card>
    </div>
  )
}
