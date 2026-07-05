import Joi from "joi";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const createEventSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  notes: Joi.string().allow("", null).max(5000),
  color: Joi.string().pattern(HEX_COLOR).allow(null),
  startsAt: Joi.date().iso().required(),
  endsAt: Joi.date().iso().min(Joi.ref("startsAt")).allow(null),
  allDay: Joi.boolean().default(false),
  reminderAt: Joi.date().iso().allow(null),
});

export const updateEventSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  notes: Joi.string().allow("", null).max(5000),
  color: Joi.string().pattern(HEX_COLOR).allow(null),
  startsAt: Joi.date().iso(),
  endsAt: Joi.date().iso().allow(null),
  allDay: Joi.boolean(),
  reminderAt: Joi.date().iso().allow(null),
}).min(1);

export const listEventsQuerySchema = Joi.object({
  from: Joi.date().iso().required(),
  to: Joi.date().iso().min(Joi.ref("from")).required(),
});
