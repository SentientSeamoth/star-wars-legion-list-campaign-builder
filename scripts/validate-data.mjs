#!/usr/bin/env node
// Validates every data/*.json content library against its
// data/schema/*.schema.json counterpart -- these schemas existed but were
// never actually run against anything (see docs/TODO.md's 2026-08-24
// "JSON schema validation wiring" entry). Real failures here mean the
// SCHEMA is stale relative to the data (data has grown real new verified
// fields since a schema was last touched), not that the data is wrong --
// report drift honestly rather than silently "fixing" either side.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const schemaDir = path.join(dataDir, "schema");

// data/*.json filename -> data/schema/*.schema.json filename
const PAIRS = [
  ["affiliations.json", "affiliation.schema.json"],
  ["battle-forces.json", "battle-force.schema.json"],
  ["command-cards.json", "command-card.schema.json"],
  ["expansions.json", "expansion.schema.json"],
  ["factions.json", "faction.schema.json"],
  ["keywords.json", "keyword.schema.json"],
  ["scenarios.json", "scenario.schema.json"],
  ["units.json", "unit.schema.json"],
  ["upgrades.json", "upgrade.schema.json"],
];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let anyFailed = false;

for (const [dataFile, schemaFile] of PAIRS) {
  const dataPath = path.join(dataDir, dataFile);
  const schemaPath = path.join(schemaDir, schemaFile);
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    console.log(`OK    ${dataFile}`);
  } else {
    anyFailed = true;
    console.log(`FAIL  ${dataFile} (against ${schemaFile}) -- ${validate.errors.length} issue(s)`);
    for (const err of validate.errors.slice(0, 20)) {
      console.log(`        ${err.instancePath || "(root)"} ${err.message}`);
    }
    if (validate.errors.length > 20) {
      console.log(`        ...and ${validate.errors.length - 20} more`);
    }
  }
}

if (anyFailed) {
  console.log("\nSome data files don't match their schema -- see docs/TODO.md's schema-validation entry.");
  process.exit(1);
} else {
  console.log("\nAll data files match their schemas.");
}
