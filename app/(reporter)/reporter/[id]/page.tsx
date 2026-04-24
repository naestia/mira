"use client"

import { use } from "react"
import { SubmissionDetail } from "@/components/reporter"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function SubmissionDetailPage({ params }: PageProps) {
  const { id } = use(params)

  return (
    <div className="py-6">
      <SubmissionDetail id={id} />
    </div>
  )
}
