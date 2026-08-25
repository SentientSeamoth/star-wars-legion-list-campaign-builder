import { describe, expect, it } from "vitest";
import { buildListText, slugifyListName } from "./listExport";
import type { ListExportInput } from "./listExport";

describe("buildListText", () => {
  const base: ListExportInput = {
    armyName: "Test Army",
    factionLabel: "Rebel",
    modeLabel: "Traditional",
    total: 480,
    pointLimit: 1000,
    rankGroups: [
      { label: "Commander", units: [{ name: "Leia Organa", count: 1, upgradeNames: ["Squad Training"] }] },
      { label: "Corps", units: [{ name: "Rebel Troopers", count: 2, upgradeNames: [] }] },
      { label: "Operative", units: [] },
    ],
    commandCards: ["Ambush"],
    battleDeck: ["Shifting Priorities"],
  };

  it("includes the header line with faction/mode/points", () => {
    const text = buildListText(base);
    expect(text).toContain("Test Army");
    expect(text).toContain("Rebel · Traditional · 480/1000 pts");
  });

  it("lists each non-empty rank group with unit counts and upgrades", () => {
    const text = buildListText(base);
    expect(text).toContain("COMMANDER");
    expect(text).toContain("Leia Organa");
    expect(text).toContain("+ Squad Training");
    expect(text).toContain("CORPS");
    expect(text).toContain("Rebel Troopers x2");
  });

  it("omits empty rank groups entirely", () => {
    const text = buildListText(base);
    expect(text).not.toContain("OPERATIVE");
  });

  it("omits the command hand / battle deck sections when empty", () => {
    const text = buildListText({ ...base, commandCards: [], battleDeck: [] });
    expect(text).not.toContain("COMMAND HAND");
    expect(text).not.toContain("BATTLE DECK");
  });

  it("includes command hand and battle deck sections when present", () => {
    const text = buildListText(base);
    expect(text).toContain("COMMAND HAND");
    expect(text).toContain("Ambush");
    expect(text).toContain("BATTLE DECK");
    expect(text).toContain("Shifting Priorities");
  });
});

describe("slugifyListName", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyListName("My Cool Army!")).toBe("my-cool-army");
  });

  it("falls back to a default for an empty/unslugifiable name", () => {
    expect(slugifyListName("   ")).toBe("army-list");
    expect(slugifyListName("!!!")).toBe("army-list");
  });
});
