import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "events@swahilipothub.org";
  const passwordHash = await bcrypt.hash("SwahilipotHub2026!", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Swahilipot Hub Foundation", email, passwordHash, role: "ORGANIZER" },
  });

  const organizer = await prisma.organizer.upsert({
    where: { userId: user.id },
    update: { displayName: "Swahilipot Hub Foundation" },
    create: {
      userId: user.id,
      displayName: "Swahilipot Hub Foundation",
      bio: "Mombasa-based youth innovation and culture hub, convening entrepreneurs, creatives, and changemakers along Kenya's coast.",
    },
  });

  const events = [
    {
      slug: "pwani-innovation-week",
      title: "Pwani Innovation Week",
      description:
        "Pwani Innovation Week (PIW) is a Pwani-led, youth-driven annual convening that has become the premier point of convergence for youth, entrepreneurs, investors, creatives, and changemakers to co-create localised solutions for sustainable growth along Kenya's coast and across the East African coastline. Now in its 7th edition, PIW addresses emerging regional needs through synergy-led discourse, action-oriented programming, and a relentless focus on coastal youth as the primary architects of change.\n\nTickets for this event are sold by Swahilipot Hub Foundation via SoldOutAfrica — tap \"Get tickets\" to book there.",
      category: "Tech",
      imageUrl:
        "https://eu2.contabostorage.com/b418dbb4d7c942e5b311c172a41d1db8:bv-kenya/events/1788870541630-fxbrrmo.JPG",
      externalUrl: "https://soldoutafrica.com/pwani-innovation-week",
      startsAt: new Date("2026-10-26T07:00:00+03:00"),
      endsAt: new Date("2026-10-31T18:00:00+03:00"),
      venue: { name: "Swahilipot Hub Foundation", address: "Swahilipot Hub Foundation", city: "Mombasa" },
      ticketTypes: [
        { name: "Students (without meals) — per day", price: 1000, quantity: 500 },
        { name: "Students (without meals) — per week", price: 4000, quantity: 500 },
        { name: "Delegate/Faculty (without meals) — per day", price: 2500, quantity: 500 },
        { name: "Delegate/Faculty (with meals) — per day", price: 3500, quantity: 500 },
        { name: "Exhibition booth", price: 50000, quantity: 50 },
      ],
    },
    {
      slug: "pwani-gat-talent",
      title: "Pwani Gat Talent",
      description:
        "The closing night of Pwani Innovation Week: a six-day convention ends with a public concert at Gym Khana, Mombasa, drawing crowds far beyond the delegate list. It's the most visible single moment of the year — the image that anchors the press coverage and reminds every attendee why this work matters.\n\nTickets for this event are sold by Swahilipot Hub Foundation via SoldOutAfrica — tap \"Get tickets\" to book there.",
      category: "Music",
      imageUrl:
        "https://eu2.contabostorage.com/b418dbb4d7c942e5b311c172a41d1db8:bv-kenya/events/1791362065647-pnicjru.jpeg",
      externalUrl: "https://soldoutafrica.com/pwani-gat-talent",
      startsAt: new Date("2026-10-31T14:00:00+03:00"),
      endsAt: new Date("2026-10-31T22:00:00+03:00"),
      venue: { name: "Gym Khana", address: "Gym Khana", city: "Mombasa" },
      ticketTypes: [
        { name: "Early Bird", price: 1000, quantity: 500 },
        { name: "Regular", price: 1500, quantity: 500 },
        { name: "Gate", price: 2000, quantity: 500 },
        { name: "VIP", price: 3500, quantity: 200 },
      ],
    },
  ];

  for (const e of events) {
    const event = await prisma.event.upsert({
      where: { slug: e.slug },
      update: {
        title: e.title,
        description: e.description,
        category: e.category,
        imageUrl: e.imageUrl,
        externalUrl: e.externalUrl,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        status: "PUBLISHED",
      },
      create: {
        organizer: { connect: { id: organizer.id } },
        slug: e.slug,
        title: e.title,
        description: e.description,
        category: e.category,
        imageUrl: e.imageUrl,
        externalUrl: e.externalUrl,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        status: "PUBLISHED",
        venue: { create: e.venue },
        ticketTypes: { create: e.ticketTypes },
      },
    });
    console.log(`event ready: ${event.slug}`);
  }

  console.log(`organizer login: ${email} / SwahilipotHub2026!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
