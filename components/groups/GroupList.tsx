"use client"

import { GroupCard } from "./GroupCard"

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

interface GroupListProps {
  groups: Group[]
  onJoinRequest?: (groupId: string) => void
  requestingGroupId?: string | null
  emptyMessage?: string
}

export function GroupList({
  groups,
  onJoinRequest,
  requestingGroupId,
  emptyMessage = "No groups found",
}: GroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onJoinRequest={onJoinRequest}
          isRequesting={requestingGroupId === group.id}
        />
      ))}
    </div>
  )
}
