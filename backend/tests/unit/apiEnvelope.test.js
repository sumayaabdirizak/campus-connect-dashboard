import { describe, it, expect } from "vitest";
import {
  apiErrorBody,
  apiSuccessBody,
  namedListSuccess,
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

  it("namedListSuccess keeps domain key and pagination fields", () => {
    const items = [{ id: 1 }];
    expect(
      namedListSuccess({
        message: "ok",
        name: "faculties",
        items,
        page: 1,
        pageSize: 50,
        totalCount: 1,
      })
    ).toEqual({
      status: "success",
      message: "ok",
      count: 1,
      faculties: items,
      totalCount: 1,
      page: 1,
      pageSize: 50,
      results: items,
    });
  });

  it("prismaSchemaDriftHint suggests migrate on P2022", () => {
    expect(prismaSchemaDriftHint({ code: "P2022" })).toMatch(/migrate deploy/i);
  });
});
