import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  let t = Date.now();
  await prisma.event.findMany({ include: { venue: true, ticketTypes: { take: 1 } } });
  console.log("query1 (cold):", Date.now() - t, "ms");
  t = Date.now();
  await prisma.event.findMany({ include: { venue: true, ticketTypes: { take: 1 } } });
  console.log("query2 (warm):", Date.now() - t, "ms");
  t = Date.now();
  await prisma.event.findMany({ include: { venue: true, ticketTypes: { take: 1 } } });
  console.log("query3 (warm):", Date.now() - t, "ms");
  await prisma.$disconnect();
}
main();
