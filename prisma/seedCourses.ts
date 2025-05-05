import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  // Erstelle PCEP-Kurs
  const pcepCourse = await prisma.course.upsert({
    where: { id: "pcep-course" },
    update: {},
    create: {
      id: "pcep-course",
      name: "PCEP Vorbereitung",
      description: "Python Certified Entry-Level Programmer Vorbereitung",
      updatedAt: new Date()
    }
  })

  // Verknüpfe bestehende Fragen mit diesem Kurs
  await prisma.question.updateMany({
    where: { courseId: null },
    data: { courseId: pcepCourse.id }
  })

  console.log("✅ Kurse erstellt und Fragen migriert")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())