import { prisma } from "@/lib/prisma";
import { formatEventDate, formatEventTime, formatPrice } from "@/lib/format";

// Best-effort transactional email via Resend's REST API (no SDK dependency).
// Never throws — a failed or unconfigured email must never break the caller's request.
async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Vibenasi <no-reply@vibenasi.app>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${params.to} subject="${params.subject}"`);
    }
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!res.ok) console.error(`Email send failed (${res.status}): ${await res.text()}`);
  } catch (err) {
    console.error("Email send failed", err);
  }
}

function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
    <h2 style="color:#111">${title}</h2>
    ${bodyHtml}
    <p style="color:#888;font-size:12px;margin-top:24px">Vibenasi — Good people. Great events. One place.</p>
  </div>`;
}

export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, event: true, items: { include: { ticketType: true } } },
    });
    if (!order) return;

    const rows = order.items
      .map((item) => `<li>${item.quantity} × ${item.ticketType.name} — ${formatPrice(String(item.unitPrice))}</li>`)
      .join("");

    await sendEmail({
      to: order.user.email,
      subject: `Your tickets for ${order.event.title} are confirmed`,
      html: layout("Tickets confirmed 🎟️", `
        <p>Hi ${order.user.name}, your order for <strong>${order.event.title}</strong> is confirmed.</p>
        <p>${formatEventDate(order.event.startsAt)} · ${formatEventTime(order.event.startsAt)}</p>
        <ul>${rows}</ul>
        <p>Total paid: <strong>${formatPrice(String(order.totalAmount))}</strong></p>
        <p>Find your QR tickets anytime in your <a href="${process.env.APP_URL ?? ""}/orders/${order.id}">order page</a>.</p>
      `),
    });
  } catch (err) {
    console.error("sendOrderConfirmationEmail failed", err);
  }
}

export async function sendBookingRequestCreatedEmail(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingId },
      include: { artist: { include: { user: true } }, requester: true },
    });
    if (!booking) return;

    await sendEmail({
      to: booking.artist.user.email,
      subject: `New booking request from ${booking.requester.name}`,
      html: layout("New booking request", `
        <p>${booking.requester.name} wants to book you for a <strong>${booking.eventType}</strong> on
        ${formatEventDate(booking.eventDate)}.</p>
        <p>Budget: <strong>${formatPrice(String(booking.budget))}</strong></p>
        ${booking.notes ? `<p>Notes: ${booking.notes}</p>` : ""}
        <p>Respond from your <a href="${process.env.APP_URL ?? ""}/dashboard/artist">artist dashboard</a>.</p>
      `),
    });
  } catch (err) {
    console.error("sendBookingRequestCreatedEmail failed", err);
  }
}

export async function sendBookingStatusEmail(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingId },
      include: { artist: { include: { user: true } }, requester: true },
    });
    if (!booking) return;

    // The artist caused ACCEPTED/DECLINED so we notify the requester; CANCELLED is the
    // requester's own action so we notify the artist instead.
    const recipient = booking.status === "CANCELLED" ? booking.artist.user : booking.requester;
    const verb = booking.status.toLowerCase();

    await sendEmail({
      to: recipient.email,
      subject: `Booking request ${verb}`,
      html: layout(`Booking request ${verb}`, `
        <p>The booking request for a <strong>${booking.eventType}</strong> on
        ${formatEventDate(booking.eventDate)} was ${verb}.</p>
      `),
    });
  } catch (err) {
    console.error("sendBookingStatusEmail failed", err);
  }
}

export async function sendCrewJoinEmail(crewPlanId: string, joinedUserId: string): Promise<void> {
  try {
    const crewPlan = await prisma.crewPlan.findUnique({
      where: { id: crewPlanId },
      include: { itinerary: { include: { user: true } } },
    });
    if (!crewPlan || crewPlan.itinerary.userId === joinedUserId) return;

    const joinedUser = await prisma.user.findUnique({ where: { id: joinedUserId } });

    await sendEmail({
      to: crewPlan.itinerary.user.email,
      subject: `${joinedUser?.name ?? "Someone"} joined your crew plan`,
      html: layout("Your crew is growing", `
        <p>${joinedUser?.name ?? "Someone"} joined <strong>${crewPlan.itinerary.title}</strong>.</p>
        <p>Vote on the plan and split costs in your <a href="${process.env.APP_URL ?? ""}/plan/${crewPlan.itinerary.shareSlug}">crew plan</a>.</p>
      `),
    });
  } catch (err) {
    console.error("sendCrewJoinEmail failed", err);
  }
}
