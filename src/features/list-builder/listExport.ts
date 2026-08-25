// Plain-text army-list export/copy -- mirrors Campaign Mode's Story tab
// Copy/Export pattern (src/features/campaigns/components/StoryPanel.tsx),
// closing docs/TODO.md's "is exporting a list as text in scope for v1?"
// open question for the text case (image export stays out, separate
// feature). Pure/testable on purpose -- see listExport.test.ts.

export interface ListExportRankGroup {
  label: string;
  units: Array<{ name: string; count: number; upgradeNames: string[] }>;
}

export interface ListExportInput {
  armyName: string;
  factionLabel: string;
  modeLabel: string;
  total: number;
  pointLimit: number;
  rankGroups: ListExportRankGroup[];
  commandCards: string[];
  battleDeck: string[];
}

export function buildListText(input: ListExportInput): string {
  const lines: string[] = [
    input.armyName,
    `${input.factionLabel} · ${input.modeLabel} · ${input.total}/${input.pointLimit} pts`,
    "-".repeat(48),
  ];

  for (const group of input.rankGroups) {
    if (group.units.length === 0) continue;
    lines.push("", group.label.toUpperCase());
    for (const u of group.units) {
      const suffix = u.count > 1 ? ` x${u.count}` : "";
      lines.push(`  ${u.name}${suffix}`);
      for (const upgradeName of u.upgradeNames) {
        lines.push(`    + ${upgradeName}`);
      }
    }
  }

  if (input.commandCards.length > 0) {
    lines.push("", "COMMAND HAND");
    for (const name of input.commandCards) lines.push(`  ${name}`);
  }

  if (input.battleDeck.length > 0) {
    lines.push("", "BATTLE DECK");
    for (const name of input.battleDeck) lines.push(`  ${name}`);
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function slugifyListName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "army-list";
}
