import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "orgtest_admin@example.com";
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash("adminpass123", 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash },
    create: { name: "Test Admin", email, passwordHash, role: "ADMIN" },
  });
  console.log("admin ready");
}
main().finally(() => prisma.$disconnect());
