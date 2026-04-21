"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, FolderKanban, CheckSquare, Lock, Globe, Archive } from "lucide-react"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description?: string | null
    visibility: "PUBLIC" | "PRIVATE"
    status: "ACTIVE" | "ARCHIVED"
    memberCount: number
    groupCount: number
    taskCount: number
    myRole?: "MEMBER" | "MANAGER" | "OWNER" | null
    isMember: boolean
    creator?: {
      id: string
      name: string | null
      email: string
    }
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="hover:ring-2 hover:ring-primary/20 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate">
                <Link href={`/projects/${project.id}`} className="hover:underline">
                  {project.name}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                {project.visibility === "PRIVATE" ? (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Private
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />
                    Public
                  </Badge>
                )}
                {project.status === "ARCHIVED" && (
                  <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <Archive className="h-3 w-3" />
                    Archived
                  </Badge>
                )}
              </div>
            </div>
            {project.description && (
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          {project.myRole && (
            <Badge variant="secondary" className="ml-2 shrink-0 capitalize">
              {project.myRole.toLowerCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{project.memberCount} members</span>
          </div>
          <div className="flex items-center gap-1">
            <FolderKanban className="h-4 w-4" />
            <span>{project.groupCount} groups</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            <span>{project.taskCount} tasks</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href={`/projects/${project.id}`} />}
        >
          View Project
        </Button>
      </CardContent>
    </Card>
  )
}
