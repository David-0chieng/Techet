import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const organizerUser = await prisma.user.upsert({
    where: { email: "organizer@techet.africa" },
    update: {},
    create: {
      name: "Techet Collective",
      email: "organizer@techet.africa",
      passwordHash,
      role: "ORGANIZER",
      organizer: {
        create: {
          displayName: "Techet Collective",
          bio: "Independent promoters putting on the best nights and days in Nairobi.",
        },
      },
    },
    include: { organizer: true },
  });

  const organizerId = organizerUser.organizer!.id;

  const ngongRacecourse = await prisma.venue.upsert({
    where: { id: "seed-venue-ngong-racecourse" },
    update: {},
    create: {
      id: "seed-venue-ngong-racecourse",
      name: "Ngong Racecourse",
      address: "Ngong Road",
      city: "Nairobi",
      country: "Kenya",
    },
  });

  const theAlchemist = await prisma.venue.upsert({
    where: { id: "seed-venue-the-alchemist" },
    update: {},
    create: {
      id: "seed-venue-the-alchemist",
      name: "The Alchemist Bar",
      address: "Westlands",
      city: "Nairobi",
      country: "Kenya",
    },
  });

  const sarit = await prisma.venue.upsert({
    where: { id: "seed-venue-sarit-expo" },
    update: {},
    create: {
      id: "seed-venue-sarit-expo",
      name: "Sarit Expo Centre",
      address: "Westlands",
      city: "Nairobi",
      country: "Kenya",
    },
  });

  const events = [
    {
      slug: "sunset-sessions-vol-4",
      title: "Sunset Sessions Vol. 4",
      description:
        "An open-air afternoon into evening of house and afro-fusion DJs overlooking the racecourse, with food trucks and craft drinks on site.",
      category: "Music",
      imageUrl: "/events/sunset-sessions.jpg",
      venueId: ngongRacecourse.id,
      startsAt: new Date("2026-10-24T14:00:00+03:00"),
      endsAt: new Date("2026-10-24T23:00:00+03:00"),
      ticketTypes: [
        { name: "Early Bird", price: 1500, quantity: 150 },
        { name: "Regular", price: 2500, quantity: 400 },
        { name: "VIP", price: 6000, quantity: 60 },
      ],
    },
    {
      slug: "nairobi-tech-summit-2026",
      title: "Nairobi Tech Summit 2026",
      description:
        "A day of talks and workshops on AI, fintech, and startup growth from founders and engineers building across East Africa.",
      category: "Tech",
      imageUrl: "/events/tech-summit.jpg",
      venueId: sarit.id,
      startsAt: new Date("2026-11-07T09:00:00+03:00"),
      endsAt: new Date("2026-11-07T18:00:00+03:00"),
      ticketTypes: [
        { name: "Standard Pass", price: 3000, quantity: 300 },
        { name: "Student Pass", price: 1200, quantity: 100 },
        { name: "All-Access Pass", price: 8000, quantity: 50 },
      ],
    },
    {
      slug: "afro-gallery-night",
      title: "Afro Gallery Night",
      description:
        "A late-night contemporary art showcase featuring emerging Kenyan painters and sculptors, with live jazz between walkthroughs.",
      category: "Art",
      imageUrl: "/events/gallery-night.jpg",
      venueId: theAlchemist.id,
      startsAt: new Date("2026-11-14T18:00:00+03:00"),
      endsAt: new Date("2026-11-15T00:00:00+03:00"),
      ticketTypes: [
        { name: "Entry", price: 1000, quantity: 200 },
        { name: "Collector's Pass", price: 4000, quantity: 25 },
      ],
    },
    {
      slug: "nairobi-street-food-festival",
      title: "Nairobi Street Food Festival",
      description:
        "Over 40 vendors serving Kenyan and pan-African street food, with cooking demos and a kids' zone running all weekend.",
      category: "Food",
      imageUrl: "/events/food-festival.jpg",
      venueId: ngongRacecourse.id,
      startsAt: new Date("2026-12-05T11:00:00+03:00"),
      endsAt: new Date("2026-12-06T21:00:00+03:00"),
      ticketTypes: [
        { name: "Day Pass", price: 800, quantity: 500 },
        { name: "Weekend Pass", price: 1400, quantity: 200 },
      ],
    },
    {
      slug: "sunrise-yoga-wellness-retreat",
      title: "Sunrise Yoga & Wellness Retreat",
      description:
        "A half-day of guided yoga, breathwork, and sound healing led by local instructors, followed by a plant-based brunch.",
      category: "Wellness",
      imageUrl: "/events/yoga-retreat.jpg",
      venueId: theAlchemist.id,
      startsAt: new Date("2026-12-20T06:30:00+03:00"),
      endsAt: new Date("2026-12-20T11:00:00+03:00"),
      ticketTypes: [
        { name: "General", price: 1800, quantity: 80 },
        { name: "With Brunch", price: 2800, quantity: 60 },
      ],
    },
  ];

  for (const e of events) {
    await prisma.event.upsert({
      where: { slug: e.slug },
      update: { imageUrl: e.imageUrl },
      create: {
        organizerId,
        venueId: e.venueId,
        title: e.title,
        slug: e.slug,
        description: e.description,
        category: e.category,
        imageUrl: e.imageUrl,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        status: "PUBLISHED",
        ticketTypes: { create: e.ticketTypes },
      },
    });
  }

  console.log(`Seeded ${events.length} events for organizer ${organizerUser.email}`);
}

// VibeNasi coastal discovery data: moods, places, sunset spots, and a sample artist.
async function seedVibeNasi() {
  const moods = [
    { key: "chill", label: "Chill", emoji: "🌴", sortOrder: 1 },
    { key: "turn_up", label: "Turn Up", emoji: "🔥", sortOrder: 2 },
    { key: "romantic", label: "Romantic", emoji: "🌅", sortOrder: 3 },
    { key: "budget", label: "Budget", emoji: "💸", sortOrder: 4 },
  ] as const;

  const moodRecords = new Map<string, { id: string }>();
  for (const m of moods) {
    const record = await prisma.mood.upsert({
      where: { key: m.key },
      update: { label: m.label, emoji: m.emoji, sortOrder: m.sortOrder },
      create: m,
    });
    moodRecords.set(m.key, record);
  }

  const places = [
    {
      id: "seed-place-tide-palm",
      name: "Tide & Palm Beach Bar",
      category: "NIGHTLIFE" as const,
      description: "Beachfront bar with live DJs most nights and bonfires after dark.",
      city: "Diani",
      lat: -4.3297,
      lng: 39.5756,
      priceLevel: 2,
      trendingScore: 92,
      moodKeys: ["turn_up", "romantic"],
    },
    {
      id: "seed-place-baobab-sunset",
      name: "Baobab Sunset Point",
      category: "VIEWPOINT" as const,
      description: "Clifftop lookout over the reef — the best golden hour on this stretch of coast.",
      city: "Diani",
      lat: -4.3401,
      lng: 39.5781,
      priceLevel: 1,
      trendingScore: 88,
      moodKeys: ["chill", "romantic"],
      sunset: { bestWindow: "6:15 PM – 6:45 PM", cloudHint: "Mostly clear", photoScore: 91 },
    },
    {
      id: "seed-place-reef-walk",
      name: "Reef Walk Watersports",
      category: "ACTIVITY" as const,
      description: "Snorkelling, kayaks, and glass-bottom boat trips out to the reef.",
      city: "Diani",
      lat: -4.3222,
      lng: 39.5703,
      priceLevel: 2,
      trendingScore: 76,
      moodKeys: ["turn_up", "budget"],
    },
    {
      id: "seed-place-coral-garden",
      name: "Coral Garden Café",
      category: "FOOD" as const,
      description: "Breezy courtyard café, fresh juices and coastal breakfasts.",
      city: "Mombasa",
      lat: -4.0547,
      lng: 39.6636,
      priceLevel: 1,
      trendingScore: 70,
      moodKeys: ["chill", "budget"],
    },
    {
      id: "seed-place-old-town-market",
      name: "Old Town Night Market",
      category: "FOOD" as const,
      description: "Street food stalls in Old Town — biryani, mahamri, and fresh sugarcane juice.",
      city: "Mombasa",
      lat: -4.0635,
      lng: 39.6682,
      priceLevel: 1,
      trendingScore: 85,
      moodKeys: ["turn_up", "budget"],
    },
    {
      id: "seed-place-nyali-dhow",
      name: "Nyali Dhow Cruise",
      category: "ACTIVITY" as const,
      description: "Sunset dhow cruise along Nyali creek with a seafood dinner on board.",
      city: "Mombasa",
      lat: -4.0304,
      lng: 39.7177,
      priceLevel: 3,
      trendingScore: 80,
      moodKeys: ["romantic", "turn_up"],
    },
    {
      id: "seed-place-watamu-lookout",
      name: "Watamu Marine Lookout",
      category: "VIEWPOINT" as const,
      description: "Quiet viewpoint over Watamu Marine Park — turtles visible at low tide.",
      city: "Watamu",
      lat: -3.3530,
      lng: 40.0225,
      priceLevel: 1,
      trendingScore: 74,
      moodKeys: ["chill", "romantic"],
      sunset: { bestWindow: "6:20 PM – 6:50 PM", cloudHint: "Light coastal haze", photoScore: 83 },
    },
    {
      id: "seed-place-mangrove-kayak",
      name: "Mangrove Kayak Trail",
      category: "ACTIVITY" as const,
      description: "Guided kayak route through the Watamu mangrove channels.",
      city: "Watamu",
      lat: -3.3612,
      lng: 40.0151,
      priceLevel: 2,
      trendingScore: 65,
      moodKeys: ["chill", "budget"],
    },
    {
      id: "seed-place-bongo-beats",
      name: "Bongo Beats Lounge",
      category: "NIGHTLIFE" as const,
      description: "Afrobeats and Bongo Flava every weekend, open till late.",
      city: "Mombasa",
      lat: -4.0472,
      lng: 39.6719,
      priceLevel: 2,
      trendingScore: 90,
      moodKeys: ["turn_up"],
    },
    {
      id: "seed-place-castle-rooftop",
      name: "Castle Rooftop Grill",
      category: "FOOD" as const,
      description: "Rooftop grill with ocean views, best for a slow dinner date.",
      city: "Mombasa",
      lat: -4.0503,
      lng: 39.6698,
      priceLevel: 3,
      trendingScore: 78,
      moodKeys: ["romantic", "turn_up"],
    },
  ];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const p of places) {
    const place = await prisma.place.upsert({
      where: { id: p.id },
      update: {
        trendingScore: p.trendingScore,
        moods: { set: p.moodKeys.map((k) => ({ id: moodRecords.get(k)!.id })) },
      },
      create: {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        city: p.city,
        lat: p.lat,
        lng: p.lng,
        priceLevel: p.priceLevel,
        trendingScore: p.trendingScore,
        moods: { connect: p.moodKeys.map((k) => ({ id: moodRecords.get(k)!.id })) },
      },
    });

    if (p.sunset) {
      await prisma.sunsetSpot.upsert({
        where: { placeId_date: { placeId: place.id, date: today } },
        update: { bestWindow: p.sunset.bestWindow, cloudHint: p.sunset.cloudHint, photoScore: p.sunset.photoScore },
        create: {
          placeId: place.id,
          bestWindow: p.sunset.bestWindow,
          cloudHint: p.sunset.cloudHint,
          photoScore: p.sunset.photoScore,
          date: today,
        },
      });
    }
  }

  const artistPasswordHash = await bcrypt.hash("password123", 10);
  const artistUser = await prisma.user.upsert({
    where: { email: "artist@vibenasi.africa" },
    update: {},
    create: {
      name: "DJ Pwani",
      email: "artist@vibenasi.africa",
      passwordHash: artistPasswordHash,
      role: "ARTIST",
      artistProfile: {
        create: {
          displayName: "DJ Pwani",
          category: "DJ",
          city: "Mombasa",
          bio: "Afro-house and Bongo Flava sets for beach parties and private events along the coast.",
          rateCard: "From Ksh 15,000 for a 3-hour set. Travel outside Mombasa billed separately.",
          available: true,
        },
      },
    },
  });

  console.log(`Seeded ${moods.length} moods, ${places.length} places, 1 artist (${artistUser.email})`);

  // Mock real-time signals (check-ins/saves/comments) so the vibe map has believable crowd levels
  // without waiting for real user activity. Weighted toward the higher-trendingScore spots.
  const now = Date.now();
  const signalWeights: Record<string, number> = {
    "seed-place-tide-palm": 14,
    "seed-place-bongo-beats": 12,
    "seed-place-old-town-market": 9,
    "seed-place-baobab-sunset": 6,
    "seed-place-nyali-dhow": 5,
    "seed-place-castle-rooftop": 4,
    "seed-place-reef-walk": 3,
    "seed-place-watamu-lookout": 2,
    "seed-place-coral-garden": 2,
    "seed-place-mangrove-kayak": 1,
  };
  const signalTypes = ["CHECKIN", "SAVE", "COMMENT"] as const;
  await prisma.vibeSignal.deleteMany({ where: { placeId: { in: Object.keys(signalWeights) } } });
  const signalRows = Object.entries(signalWeights).flatMap(([placeId, count]) =>
    Array.from({ length: count }, (_, i) => ({
      placeId,
      type: signalTypes[i % signalTypes.length],
      // Spread over the last 12 hours so recent-velocity ranking has something to chew on.
      createdAt: new Date(now - Math.floor(Math.random() * 12 * 60 * 60 * 1000)),
    })),
  );
  await prisma.vibeSignal.createMany({ data: signalRows });
  console.log(`Seeded ${signalRows.length} vibe signals`);

  // Tag a few existing events with moods so Discover has real cross-category results.
  const eventMoodTags: Record<string, string[]> = {
    "sunset-sessions-vol-4": ["turn_up", "romantic"],
    "nairobi-street-food-festival": ["budget", "chill"],
    "sunrise-yoga-wellness-retreat": ["chill", "budget"],
    "afro-gallery-night": ["romantic", "turn_up"],
    "pwani-gat-talent": ["turn_up"],
    "pwani-innovation-week": ["budget"],
  };
  for (const [slug, moodKeys] of Object.entries(eventMoodTags)) {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) continue;
    await prisma.event.update({
      where: { id: event.id },
      data: { moods: { set: moodKeys.map((k) => ({ id: moodRecords.get(k)!.id })) } },
    });
  }
}

main()
  .then(() => seedVibeNasi())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
