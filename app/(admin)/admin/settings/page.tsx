"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

interface Settings {
  allow_registration: string
  default_task_limit: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    allow_registration: "true",
    default_task_limit: "0",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/admin/settings")
        if (!response.ok) throw new Error("Failed to fetch settings")
        const data = await response.json()
        setSettings({
          allow_registration: data.allow_registration || "true",
          default_task_limit: data.default_task_limit || "0",
        })
      } catch (error) {
        toast.error("Failed to fetch settings")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Settings saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
          <CardDescription>Control user registration settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Public Registration</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, only admins can create new user accounts
              </p>
            </div>
            <Switch
              checked={settings.allow_registration === "true"}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  allow_registration: checked ? "true" : "false",
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Limits</CardTitle>
          <CardDescription>Set limits on user tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-limit">Default Task Limit Per User</Label>
            <Input
              id="task-limit"
              type="number"
              min="0"
              value={settings.default_task_limit}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  default_task_limit: e.target.value,
                }))
              }
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Set to 0 for unlimited tasks
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
