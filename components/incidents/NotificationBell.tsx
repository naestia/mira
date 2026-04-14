"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SeverityBadge } from "./SeverityBadge"
import { Bell, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Severity, IncidentStatus } from "@prisma/client"

interface Notification {
  id: string
  message: string
  read: boolean
  createdAt: string
  incident: {
    id: string
    title: string
    severity: Severity
    status: IncidentStatus
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })
      fetchNotifications()
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
      })
      fetchNotifications()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={`/incidents/${notification.incident.id}`}
                onClick={() => {
                  handleMarkAsRead(notification.id)
                  setIsOpen(false)
                }}
                className={cn(
                  "block border-b px-4 py-3 hover:bg-muted transition-colors",
                  !notification.read && "bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm line-clamp-2">{notification.message}</p>
                  <SeverityBadge severity={notification.incident.severity} className="shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </Link>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Link
              href="/incidents"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              View all incidents
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
