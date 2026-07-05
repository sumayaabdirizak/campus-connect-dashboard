import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validateZod } from "../../src/middleware/validateRequest.js";
import { HttpError } from "../../src/utils/httpError.js";

describe("middleware/validateRequest validateZod", () => {
  const schema = z.object({
    endpoint: z.string().url(),
  });

  it("parses valid body onto req.body", () => {
    const req = { body: { endpoint: "https://example.com/push" } };
    const next = vi.fn();
    validateZod(schema)(req, {}, next);
    expect(req.body.endpoint).toBe("https://example.com/push");
    expect(next).toHaveBeenCalledWith();
  });

  it("passes HttpError 400 to next on invalid body", () => {
    const req = { body: { endpoint: "not-a-url" } };
    const next = vi.fn();
    validateZod(schema)(req, {}, next);
    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(HttpError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Validation failed");
  });
});
