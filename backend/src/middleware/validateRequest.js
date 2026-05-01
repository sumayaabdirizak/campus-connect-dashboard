import Joi from "joi";
import { HttpError } from "../utils/httpError.js";

/**
 * Express middleware: validate `req.body` with a Joi schema.
 * On failure, passes `HttpError` 400 to `next` (handled by global error handler).
 * @param {Joi.ObjectSchema} schema
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const details = error.details.map((d) => d.message);
      return next(new HttpError(400, "Validation failed", details));
    }
    req.body = value;
    next();
  };
}

/**
 * Validate `req.query` (e.g. pagination params).
 * @param {Joi.ObjectSchema} schema
 */
export function validateQuery(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const details = error.details.map((d) => d.message);
      return next(new HttpError(400, "Invalid query parameters", details));
    }
    req.query = value;
    next();
  };
}
