"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, CheckSquare, Clock, FolderKanban } from "lucide-react"

interface GroupCardProps {
  group: {
    id: string
    name: string
    description?: string | null
    memberCount: number
    taskCount: number
    isMember: boolean
    hasPendingRequest?: boolean
    myPermissions?: number
    projectId?: string | null
    project?: {
      id: string
      name: string
    } | null
    creator?: {
      id: string
      name: string | null
      email: string
    }
  }
  onJoinRequest?: (groupId: string) => void
  isRequesting?: boolean
}

export function GroupCard({ group, onJoinRequest, isRequesting }: GroupCardProps) {
  return (
    <Card className="hover:ring-2 hover:ring-primary/20 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {group.isMember ? (
                <Link href={`/groups/${group.id}`} className="hover:underline">
                  {group.name}
                </Link>
              ) : (
                group.name
              )}
            </CardTitle>
            {group.description && (
              <CardDescription className="line-clamp-2">
                {group.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {group.project && (
              <Link href={`/projects/${group.project.id}`}>
                <Badge variant="outline" className="gap-1 hover:bg-accent">
                  <FolderKanban className="h-3 w-3" />
                  {group.project.name}
                </Badge>
              </Link>
            )}
            {group.isMember && (
              <Badge variant="secondary">Member</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{group.memberCount} members</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            <span>{group.taskCount} tasks</span>
          </div>
        </div>

        {group.isMember ? (
          <Button variant="outline" className="w-full" nativeButton={false} render={<Link href={`/groups/${group.id}`} />}>
            View Group
          </Button>
        ) : group.hasPendingRequest ? (
          <Button variant="outline" className="w-full" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Request Pending
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => onJoinRequest?.(group.id)}
            disabled={isRequesting}
          >
            {isRequesting ? "Requesting..." : "Request to Join"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
