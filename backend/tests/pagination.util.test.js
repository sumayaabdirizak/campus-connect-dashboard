import { describe, it, expect } from "vitest";
import { parsePaginationQuery, paginatedPayload } from "../src/utils/pagination.js";

describe("parsePaginationQuery", () => {
  it("defaults page and pageSize", () => {
    const q = parsePaginationQuery({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(10);
    expect(q.skip).toBe(0);
  });

  it("accepts limit as alias for pageSize", () => {
    const q = parsePaginationQuery({ page: "2", limit: "5" });
    expect(q.page).toBe(2);
    expect(q.pageSize).toBe(5);
    expect(q.skip).toBe(5);
  });

  it("caps pageSize at maxPageSize", () => {
    const q = parsePaginationQuery({ pageSize: "9999" }, { maxPageSize: 50 });
    expect(q.pageSize).toBe(50);
  });
});

describe("paginatedPayload", () => {
  it("builds list envelope", () => {
    const body = paginatedPayload({
      total: 100,
      page: 2,
      pageSize: 10,
      results: [{ id: 1 }],
    });
    expect(body).toEqual({
      total: 100,
      page: 2,
      pageSize: 10,
      results: [{ id: 1 }],
    });
  });
});
