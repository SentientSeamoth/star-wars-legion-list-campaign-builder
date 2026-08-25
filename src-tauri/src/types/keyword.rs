//! Mirrors data/schema/keyword.schema.json and data/keywords.json.
//! See src-tauri/src/types/common.rs for the toolchain-not-validated note.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KeywordType {
    Unit,
    Weapon,
    Upgrade,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyword {
    pub id: String,
    pub name: String,

    /// "type" is a reserved word in Rust, so the field is named `kind` here
    /// and mapped back to the JSON key "type" via serde rename.
    #[serde(rename = "type")]
    pub kind: KeywordType,

    pub parameterized: bool,

    #[serde(default)]
    pub stacks: Option<bool>,

    pub description: String,

    #[serde(default)]
    pub rules_note: Option<String>,

    #[serde(default)]
    pub verified: Option<bool>,

    #[serde(default)]
    pub verification_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordLibraryMeta {
    pub description: String,

    #[serde(default)]
    pub source_notes: Option<String>,

    pub rules_baseline: String,
    pub last_reviewed: String,

    #[serde(default)]
    pub verification_status: Option<String>,
}

/// Top-level shape of data/keywords.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordLibrary {
    #[serde(rename = "_meta")]
    pub meta: KeywordLibraryMeta,
    pub keywords: Vec<Keyword>,
}
