import { describe, expect, it } from "vitest";
import { computeFitScale, estimatePageCount, clampScale, MIN_SCALE } from "../one-page";

describe("computeFitScale", () => {
  // Simulate a content height that scales linearly with the font multiplier.
  const makeMeasure = (baseAt1: number) => (s: number) => baseAt1 * s;

  it("returns scale 1 when content already fits", () => {
    const r = computeFitScale(makeMeasure(900), 1122);
    expect(r.scale).toBe(1);
    expect(r.state).toBe("fit");
  });

  it("shrinks the scale until content fits", () => {
    // At scale 1 height=1400 > 1122; at ~0.8 height≈1120 which fits.
    const r = computeFitScale(makeMeasure(1400), 1122);
    expect(r.state).toBe("fit");
    expect(r.scale).toBeLessThan(1);
    expect(r.scale).toBeGreaterThan(MIN_SCALE);
    // Verify the chosen scale actually fits.
    expect(makeMeasure(1400)(r.scale)).toBeLessThanOrEqual(1122 + 1);
  });

  it("reports overflow when content cannot fit even at MIN_SCALE", () => {
    const r = computeFitScale(makeMeasure(2000), 1122);
    expect(r.state).toBe("overflow");
    expect(r.scale).toBe(MIN_SCALE);
  });
});

describe("estimatePageCount", () => {
  it("counts whole pages", () => {
    expect(estimatePageCount(1122, 1122)).toBe(1);
    // A sub-2% overflow is treated as a single page (visual fit).
    expect(estimatePageCount(1130, 1122)).toBe(1);
    expect(estimatePageCount(2000, 1122)).toBe(2);
    expect(estimatePageCount(2360, 1122)).toBe(3);
  });
  it("never returns less than 1", () => {
    expect(estimatePageCount(0, 1122)).toBe(1);
  });
});

describe("clampScale", () => {
  it("clamps to [MIN_SCALE, 1]", () => {
    expect(clampScale(1.5)).toBe(1);
    expect(clampScale(0.1)).toBe(MIN_SCALE);
    expect(clampScale(0.9)).toBe(0.9);
  });
});
