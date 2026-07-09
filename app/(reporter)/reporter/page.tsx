"use client"

import { SubmissionList } from "@/components/reporter"

export default function ReporterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Submissions</h1>
        <p className="text-muted-foreground">
          Track the status of your incident reports
        </p>
      </div>
      <SubmissionList />
    </div>
  )
}
