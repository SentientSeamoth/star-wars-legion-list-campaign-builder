import { describe, expect, it } from "vitest";
import { resolveKeywordId } from "./keywordResolve";

describe("resolveKeywordId", () => {
  it("resolves a direct kebab-case match", () => {
    expect(resolveKeywordId("Armor", new Set(["armor"]))).toBe("armor");
  });

  it("truncates at the first colon before resolving", () => {
    expect(resolveKeywordId("Detachment: Cassian Andor", new Set(["detachment"]))).toBe("detachment");
  });

  it("strips a trailing digit before resolving", () => {
    expect(resolveKeywordId("Sharpshooter 1", new Set(["sharpshooter"]))).toBe("sharpshooter");
    expect(resolveKeywordId("Impact 2", new Set(["impact"]))).toBe("impact");
  });

  it("falls back to a -x suffix id when the bare slug isn't known", () => {
    expect(resolveKeywordId("Ram", new Set(["ram-x"]))).toBe("ram-x");
  });

  it("falls back to a -x-y suffix id when neither bare nor -x is known", () => {
    expect(resolveKeywordId("Fire Support", new Set(["fire-support-x-y"]))).toBe("fire-support-x-y");
  });

  it("converts a multi-word name with no colon to kebab-case", () => {
    expect(resolveKeywordId("Full Pivot", new Set(["full-pivot"]))).toBe("full-pivot");
  });

  it("applies the coordinate override table entry", () => {
    expect(resolveKeywordId("Coordinate", new Set(["coordinate-unit-name-type"]))).toBe(
      "coordinate-unit-name-type"
    );
  });

  it("does not apply the coordinate override when the target id isn't known", () => {
    expect(resolveKeywordId("Coordinate", new Set(["coordinate"]))).toBe("coordinate");
  });

  it("applies raw-prefix overrides ahead of the normal slug pipeline (Hover: Air vs Hover: Ground)", () => {
    const known = new Set(["hover-air-x", "hover-ground"]);
    expect(resolveKeywordId("Hover: Air 2", known)).toBe("hover-air-x");
    expect(resolveKeywordId("Hover: Ground", known)).toBe("hover-ground");
  });

  it("returns null when nothing in the known set matches", () => {
    expect(resolveKeywordId("Totally Unknown Keyword", new Set(["armor"]))).toBeNull();
  });

  it("returns null for an empty/unresolvable slug", () => {
    expect(resolveKeywordId("123", new Set(["armor"]))).toBeNull();
  });
});
