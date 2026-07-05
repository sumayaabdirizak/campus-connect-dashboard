import { describe, it, expect } from "vitest";
import { csvEscapeCell, formatCsv } from "../../src/utils/csv.js";

describe("utils/csv", () => {
  it("quotes cells containing commas or newlines", () => {
    expect(csvEscapeCell("hello")).toBe("hello");
    expect(csvEscapeCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscapeCell("a,b")).toBe('"a,b"');
  });

  it("formatCsv builds a header and data rows", () => {
    const csv = formatCsv(
      ["name", "score"],
      [
        ["Ada", 100],
        ["Bob", "90,5"],
      ]
    );
    expect(csv).toBe('name,score\nAda,100\nBob,"90,5"');
  });
});
