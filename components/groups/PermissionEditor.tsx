"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Permissions, PermissionLabels, hasPermission, PermissionKey } from "@/lib/permissions"

interface PermissionEditorProps {
  permissions: number
  onChange: (newPermissions: number) => void
  disabled?: boolean
}

export function PermissionEditor({ permissions, onChange, disabled }: PermissionEditorProps) {
  const permissionKeys = Object.keys(Permissions) as PermissionKey[]

  const handleToggle = (key: PermissionKey) => {
    const bit = Permissions[key]
    const newPermissions = hasPermission(permissions, bit)
      ? permissions & ~bit // Remove permission
      : permissions | bit  // Add permission
    onChange(newPermissions)
  }

  return (
    <div className="space-y-3">
      {permissionKeys.map((key) => {
        const bit = Permissions[key]
        const isChecked = hasPermission(permissions, bit)
        const id = `permission-${key}`

        return (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox
              id={id}
              checked={isChecked}
              onCheckedChange={() => handleToggle(key)}
              disabled={disabled}
            />
            <Label
              htmlFor={id}
              className="text-sm font-normal cursor-pointer"
            >
              {PermissionLabels[key]}
            </Label>
          </div>
        )
      })}
    </div>
  )
}
