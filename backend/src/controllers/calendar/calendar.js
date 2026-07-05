import { Router } from "express";
import { validateBody, validateQuery } from "../../middleware/validateRequest.js";
import {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
} from "../../validation/calendarSchemas.js";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "./calendarEvents.controller.js";

const router = Router();

// Every route is authenticated and scoped to the current user inside the
// controller (owner derived from the token, never the body).
router.get("/events", validateQuery(listEventsQuerySchema), listEvents);
router.post("/events", validateBody(createEventSchema), createEvent);
router.put("/events/:id", validateBody(updateEventSchema), updateEvent);
router.delete("/events/:id", deleteEvent);

export default router;
