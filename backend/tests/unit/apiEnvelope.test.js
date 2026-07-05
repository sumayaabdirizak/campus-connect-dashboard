import { describe, it, expect } from "vitest";
import {
  apiErrorBody,
  apiSuccessBody,
  prismaSchemaDriftHint,
} from "../../src/utils/apiEnvelope.js";

describe("utils/apiEnvelope", () => {
  it("apiSuccessBody wraps data with status success", () => {
    expect(apiSuccessBody({ id: 1 }, "OK")).toEqual({
      status: "success",
      message: "OK",
      data: { id: 1 },
    });
  });

  it("apiErrorBody wraps message and details", () => {
    expect(apiErrorBody("Nope", ["bad field"])).toEqual({
      status: "error",
      message: "Nope",
      details: ["bad field"],
    });
  });

  it("prismaSchemaDriftHint suggests migrate on P2022", () => {
    expect(prismaSchemaDriftHint({ code: "P2022" })).toMatch(/migrate deploy/i);
  });
});
