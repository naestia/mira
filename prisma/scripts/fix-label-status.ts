/**
 * One-off repair: default board columns created before the Label.status field
 * existed all default to TODO. Map the well-known column names to their proper
 * status, and sync the tasks currently sitting in each of those columns.
 *
 * Run with:  npx tsx prisma/scripts/fix-label-status.ts
 */
import { PrismaClient, Status } from "@prisma/client"

const prisma = new PrismaClient()

const NAME_TO_STATUS: Record<string, Status> = {
  "to do": "TODO",
  "in progress": "IN_PROGRESS",
  "done": "DONE",
}

async function main() {
  const labels = await prisma.label.findMany()
  let labelsFixed = 0
  let tasksFixed = 0

  for (const label of labels) {
    const target = NAME_TO_STATUS[label.name.trim().toLowerCase()]
    if (!target || target === label.status) continue

    await prisma.label.update({ where: { id: label.id }, data: { status: target } })
    const res = await prisma.task.updateMany({
      where: { labelId: label.id },
      data: { status: target },
    })
    labelsFixed++
    tasksFixed += res.count
    console.log(`  ${label.name} -> ${target} (${res.count} tasks)`)
  }

  console.log(`\nDone. Remapped ${labelsFixed} labels, updated ${tasksFixed} tasks.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
