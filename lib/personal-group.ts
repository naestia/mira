import { prisma } from "./prisma"
import { FULL_PERMISSIONS } from "./permissions"

export async function createPersonalGroup(userId: string, userName?: string | null) {
  const group = await prisma.group.create({
    data: {
      name: "Personal",
      description: "Your personal tasks",
      isPersonal: true,
      createdBy: userId,
      memberships: {
        create: {
          userId: userId,
          permissions: FULL_PERMISSIONS,
        },
      },
    },
  })

  return group
}

export async function getOrCreatePersonalGroup(userId: string) {
  // First try to find existing personal group
  let group = await prisma.group.findFirst({
    where: {
      createdBy: userId,
      isPersonal: true,
    },
  })

  // Create if doesn't exist
  if (!group) {
    group = await createPersonalGroup(userId)
  }

  return group
}
