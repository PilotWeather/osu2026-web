import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.FIRST_ADMIN_EMAIL?.trim().toLocaleLowerCase("en-US");
  if (!email || !email.includes("@")) {
    throw new Error("FIRST_ADMIN_EMAIL must contain the pre-approved Google account email.");
  }

  const configuredName = process.env.FIRST_ADMIN_NAME?.trim();
  await prisma.authorizedUser.upsert({
    where: { email },
    update: {
      name: configuredName || "System Administrator",
      role: UserRole.ADMIN,
      active: true,
    },
    create: {
      email,
      name: configuredName || "System Administrator",
      role: UserRole.ADMIN,
      active: true,
    },
  });

  console.log("First administrator allowlist entry is active.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
