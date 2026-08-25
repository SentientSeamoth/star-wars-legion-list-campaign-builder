import { describe, expect, it } from "vitest";
import { toDbFaction, toDbMode, toUiFaction, toUiMode } from "./uiMapping";
import type { Faction } from "../../lib/types/manual_seed";

describe("uiMapping faction translation", () => {
  it("maps every UI faction id to its real backend faction", () => {
    expect(toDbFaction("separatist")).toBe("separatist");
    expect(toDbFaction("republic")).toBe("republic");
    expect(toDbFaction("rebel")).toBe("rebel");
    expect(toDbFaction("empire")).toBe("empire");
    expect(toDbFaction("assassins")).toBe("shadow_collective");
  });

  it("maps every real backend faction back to its UI id", () => {
    expect(toUiFaction("separatist")).toBe("separatist");
    expect(toUiFaction("republic")).toBe("republic");
    expect(toUiFaction("rebel")).toBe("rebel");
    expect(toUiFaction("empire")).toBe("empire");
    expect(toUiFaction("shadow_collective")).toBe("assassins");
  });

  it("defaults a null faction to separatist rather than throwing", () => {
    expect(toUiFaction(null)).toBe("separatist");
  });

  it("round-trips every real Faction value through db -> ui -> db", () => {
    const allFactions: Faction[] = ["empire", "separatist", "rebel", "republic", "shadow_collective"];
    for (const f of allFactions) {
      expect(toDbFaction(toUiFaction(f))).toBe(f);
    }
  });
});

describe("uiMapping mode translation", () => {
  it("maps traditional/custom to official/freeform and back", () => {
    expect(toDbMode("traditional")).toBe("official");
    expect(toDbMode("custom")).toBe("freeform");
    expect(toUiMode("official")).toBe("traditional");
    expect(toUiMode("freeform")).toBe("custom");
  });
});
