import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";

/**
 * Personal calendar events — user-owned, user-scoped. Every handler derives the
 * owner from the authenticated token (`req.user.sub`), never from the body, so
 * a user can only ever read or mutate their own events.
 */

function currentUserId(req) {
  const raw = req.user?.sub ?? req.user?.id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/** GET /api/calendar/events?from=&to= — events overlapping the [from, to] window. */
export async function listEvents(req, res) {
  const userId = currentUserId(req);
  if (!userId) return res.status(401).json(apiErrorBody("Unauthenticated", null));

  const query = req.validatedQuery ?? req.query;
  const from = new Date(query.from);
  const to = new Date(query.to);

  try {
    const results = await prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { startsAt: { gte: from, lte: to } },
          // Multi-day events that started before the window but spill into it.
          { startsAt: { lt: from }, endsAt: { gte: from } }
        ]
      },
      orderBy: { startsAt: "asc" }
    });
    res.json({ results });
  } catch (err) {
    console.error("[calendar] listEvents failed", { message: err?.message });
    res.status(500).json(apiErrorBody("Failed to load events", null));
  }
}

/** POST /api/calendar/events — create an event owned by the current user. */
export async function createEvent(req, res) {
  const userId = currentUserId(req);
  if (!userId) return res.status(401).json(apiErrorBody("Unauthenticated", null));

  const { title, notes, color, startsAt, endsAt, allDay, reminderAt } = req.body;
  try {
    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        notes: notes || null,
        color: color || null,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        allDay: allDay ?? false,
        reminderAt: reminderAt ? new Date(reminderAt) : null
      }
    });
    res.status(201).json({ event });
  } catch (err) {
    console.error("[calendar] createEvent failed", { message: err?.message });
    res.status(500).json(apiErrorBody("Failed to create event", null));
  }
}

/** PUT /api/calendar/events/:id — update an event the user owns. */
export async function updateEvent(req, res) {
  const userId = currentUserId(req);
  if (!userId) return res.status(401).json(apiErrorBody("Unauthenticated", null));

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json(apiErrorBody("Invalid id", null));

  const body = req.body;
  const data = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.color !== undefined) data.color = body.color || null;
  if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt);
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (body.allDay !== undefined) data.allDay = body.allDay;
  if (body.reminderAt !== undefined)
    data.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null;

  try {
    // Scope the update to the owner — updateMany returns count 0 (not 500) when
    // the row exists but belongs to someone else, so we never leak existence.
    const { count } = await prisma.calendarEvent.updateMany({
      where: { id, userId },
      data
    });
    if (count === 0) return res.status(404).json(apiErrorBody("Event not found", null));
    const event = await prisma.calendarEvent.findUnique({ where: { id } });
    res.json({ event });
  } catch (err) {
    console.error("[calendar] updateEvent failed", { message: err?.message });
    res.status(500).json(apiErrorBody("Failed to update event", null));
  }
}

/** DELETE /api/calendar/events/:id — delete an event the user owns. */
export async function deleteEvent(req, res) {
  const userId = currentUserId(req);
  if (!userId) return res.status(401).json(apiErrorBody("Unauthenticated", null));

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json(apiErrorBody("Invalid id", null));

  try {
    const { count } = await prisma.calendarEvent.deleteMany({ where: { id, userId } });
    if (count === 0) return res.status(404).json(apiErrorBody("Event not found", null));
    res.json({ success: true });
  } catch (err) {
    console.error("[calendar] deleteEvent failed", { message: err?.message });
    res.status(500).json(apiErrorBody("Failed to delete event", null));
  }
}
