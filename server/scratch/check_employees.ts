import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    include: {
      department: true,
      position: true,
    }
  });

  console.log("Employees Count:", employees.length);
  console.log("Employees JSON:", JSON.stringify(employees, null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
