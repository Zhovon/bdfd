import { describe, expect, it } from "vitest";
import { likePattern, pageWindow } from "@/lib/paging";

describe("pageWindow", () => {
  it("returns the requested page and its offset", () => {
    expect(pageWindow(65, 2, 25)).toEqual({ page: 2, pageCount: 3, offset: 25 });
  });

  it("clamps pages past the end to the last page", () => {
    expect(pageWindow(65, 99, 25)).toEqual({ page: 3, pageCount: 3, offset: 50 });
  });

  it("treats zero, negative, fractional and NaN pages sensibly", () => {
    expect(pageWindow(65, 0, 25).page).toBe(1);
    expect(pageWindow(65, -4, 25).page).toBe(1);
    expect(pageWindow(65, 2.9, 25).page).toBe(2);
    expect(pageWindow(65, Number.NaN, 25).page).toBe(1);
  });

  it("always has at least one page, even with no rows", () => {
    expect(pageWindow(0, 5, 25)).toEqual({ page: 1, pageCount: 1, offset: 0 });
  });
});

describe("likePattern", () => {
  it("wraps a term for a contains-search", () => {
    expect(likePattern("dhaka")).toBe("%dhaka%");
  });

  it("returns null for blank input", () => {
    expect(likePattern("")).toBeNull();
    expect(likePattern("   ")).toBeNull();
    expect(likePattern(undefined)).toBeNull();
  });

  it("escapes LIKE wildcards and backslashes so they match literally", () => {
    expect(likePattern("50%")).toBe("%50\\%%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
    expect(likePattern("c:\\x")).toBe("%c:\\\\x%");
  });

  it("trims and caps very long input", () => {
    expect(likePattern("  x  ")).toBe("%x%");
    expect(likePattern("y".repeat(500))).toHaveLength(102);
  });
});
