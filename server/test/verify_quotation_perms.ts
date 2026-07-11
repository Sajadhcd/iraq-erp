import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const requiredPerms = [
    { action: "quotations:view", description: "عرض عروض الأسعار" },
    { action: "quotations:create", description: "إنشاء عروض الأسعار" },
    { action: "quotations:edit", description: "تعديل عروض الأسعار" },
    { action: "quotations:delete", description: "حذف عروض الأسعار" },
    { action: "quotations:approve", description: "اعتماد عروض الأسعار" },
    { action: "quotations:print", description: "طباعة عروض الأسعار" },
  ];

  for (const p of requiredPerms) {
    await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: p,
    });
  }

  const rolesMap: Record<string, string[]> = {
    SUPER_ADMIN: requiredPerms.map(p => p.action),
    ADMIN: requiredPerms.map(p => p.action),
    SALES_MANAGER: requiredPerms.map(p => p.action),
    SALES_AGENT: ["quotations:view", "quotations:create", "quotations:edit"],
  };

  for (const [roleName, actions] of Object.entries(rolesMap)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.log(`Role not found: ${roleName}`);
      continue;
    }
    for (const action of actions) {
      const perm = await prisma.permission.findUnique({ where: { action } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
    console.log(`Verified quotation permissions for ${roleName}`);
  }
}

main()
  .then(() => console.log('Done ensuring quotation permissions'))
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
