import { prisma } from "@/lib/prisma"
import { Severity, IncidentStatus } from "@prisma/client"

interface CreateNotificationParams {
  incidentId: string
  userId: string
  message: string
}

export async function createNotification({
  incidentId,
  userId,
  message,
}: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      incidentId,
      userId,
      message,
    },
  })
}

export async function notifyIncidentCreated(
  incidentId: string,
  userId: string,
  title: string,
  severity: Severity
) {
  // Only notify for HIGH or CRITICAL severity incidents
  if (severity === "HIGH" || severity === "CRITICAL") {
    await createNotification({
      incidentId,
      userId,
      message: `New ${severity} incident created: ${title}`,
    })
  }
}

export async function notifyStatusChange(
  incidentId: string,
  userId: string,
  title: string,
  oldStatus: IncidentStatus,
  newStatus: IncidentStatus
) {
  await createNotification({
    incidentId,
    userId,
    message: `Incident "${title}" status changed from ${oldStatus} to ${newStatus}`,
  })
}

export async function notifyIncidentResolved(
  incidentId: string,
  userId: string,
  title: string
) {
  await createNotification({
    incidentId,
    userId,
    message: `Incident "${title}" has been resolved`,
  })
}

export async function notifyIncidentAssigned(
  incidentId: string,
  assigneeId: string,
  title: string
) {
  await createNotification({
    incidentId,
    userId: assigneeId,
    message: `You have been assigned to incident: "${title}"`,
  })
}
