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
    // Express 5 treats req.query as read-only; keep coerced values separately.
    req.validatedQuery = value;
    next();
  };
}

/**
 * Validate request data with a Zod schema. On failure, passes `HttpError` 400.
 * @param {import("zod").ZodTypeAny} schema
 * @param {"body" | "query" | "params"} source
 */
export function validateZod(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map(
        (i) => `${i.path.join(".") || source}: ${i.message}`
      );
      return next(new HttpError(400, "Validation failed", details));
    }
    if (source === "body") req.body = result.data;
    else if (source === "query") req.validatedQuery = result.data;
    else req.validatedParams = result.data;
    next();
  };
}
