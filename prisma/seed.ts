import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create admin user with default credentials (admin/admin)
  // User will be prompted to change password on first login
  const adminPassword = await bcrypt.hash("admin", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin" },
    update: { protected: true },
    create: {
      email: "admin",
      name: "Administrator",
      password: adminPassword,
      role: "ADMIN",
      mustChangePassword: true,
      protected: true,
    },
  })

  console.log("Created admin user:", admin.email, "(password: admin)")

  // Create a default group for the admin user
  const defaultGroup = await prisma.group.upsert({
    where: { id: "default-admin-group" },
    update: {},
    create: {
      id: "default-admin-group",
      name: "Admin Tasks",
      description: "Default task group for administrators",
      createdBy: admin.id,
      memberships: {
        create: {
          userId: admin.id,
          permissions: 127, // Full permissions
        },
      },
    },
  })

  console.log("Created default group:", defaultGroup.name)

  // Seed default app settings
  const settings = [
    { key: "allow_registration", value: "true" },
    { key: "default_task_limit", value: "0" },
  ]

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        updatedBy: admin.id,
      },
    })
  }

  console.log("Seeded app settings")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
