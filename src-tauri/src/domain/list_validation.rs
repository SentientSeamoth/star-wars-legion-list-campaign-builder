//! Pure official-mode army-list rank validation -- second real occupant
//! of domain/ alongside campaign_rules.rs. No I/O: the command layer
//! (commands/list_validation.rs) loads a list's entries, resolves each
//! unit's rank, sums counts, and loads the requirement bounds from
//! data/factions.json before calling in here.

use crate::types::common::Rank;
use crate::types::{RankRequirements, ValidationIssue};
use std::collections::HashMap;

/// The ranks a standard-format army is actually constrained on. Attached
/// units are deliberately excluded -- see RankRequirements's doc comment.
const CHECKED_RANKS: [Rank; 6] = [
    Rank::Commander,
    Rank::Operative,
    Rank::Corps,
    Rank::SpecialForces,
    Rank::Support,
    Rank::Heavy,
];

fn requirement_for(requirements: &RankRequirements, rank: Rank) -> crate::types::RankRequirement {
    match rank {
        Rank::Commander => requirements.commander,
        Rank::Operative => requirements.operative,
        Rank::Corps => requirements.corps,
        Rank::SpecialForces => requirements.special_forces,
        Rank::Support => requirements.support,
        Rank::Heavy => requirements.heavy,
        Rank::Attached => Default::default(),
    }
}

/// Checks each rank's actual unit count against the sourced min/max
/// bounds. A rank with no bound on one side (e.g. `operative`'s min of 0,
/// meaning "optional") simply never fails that side.
pub fn validate_rank_counts(
    counts: &HashMap<Rank, i32>,
    requirements: &RankRequirements,
) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    for rank in CHECKED_RANKS {
        let requirement = requirement_for(requirements, rank);
        let count = counts.get(&rank).copied().unwrap_or(0);
        if let Some(min) = requirement.min {
            if count < min {
                issues.push(ValidationIssue {
                    rank,
                    message: format!("needs at least {min} (currently {count})"),
                });
            }
        }
        if let Some(max) = requirement.max {
            if count > max {
                issues.push(ValidationIssue {
                    rank,
                    message: format!("allows at most {max} (currently {count})"),
                });
            }
        }
    }
    issues
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::RankRequirement;

    fn standard_requirements() -> RankRequirements {
        RankRequirements {
            commander: RankRequirement { min: Some(1), max: Some(2) },
            operative: RankRequirement { min: Some(0), max: Some(2) },
            corps: RankRequirement { min: Some(3), max: Some(6) },
            special_forces: RankRequirement { min: Some(0), max: Some(3) },
            support: RankRequirement { min: Some(0), max: Some(3) },
            heavy: RankRequirement { min: Some(0), max: Some(2) },
        }
    }

    #[test]
    fn a_legal_army_has_no_issues() {
        let counts = HashMap::from([(Rank::Commander, 1), (Rank::Corps, 3)]);
        assert!(validate_rank_counts(&counts, &standard_requirements()).is_empty());
    }

    #[test]
    fn missing_a_required_commander_is_flagged() {
        let counts = HashMap::from([(Rank::Corps, 3)]);
        let issues = validate_rank_counts(&counts, &standard_requirements());
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].rank, Rank::Commander);
        assert!(issues[0].message.contains("at least 1"));
    }

    #[test]
    fn too_few_corps_is_flagged() {
        let counts = HashMap::from([(Rank::Commander, 1), (Rank::Corps, 1)]);
        let issues = validate_rank_counts(&counts, &standard_requirements());
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].rank, Rank::Corps);
        assert!(issues[0].message.contains("at least 3"));
    }

    #[test]
    fn too_many_commanders_is_flagged() {
        let counts = HashMap::from([(Rank::Commander, 3), (Rank::Corps, 3)]);
        let issues = validate_rank_counts(&counts, &standard_requirements());
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].rank, Rank::Commander);
        assert!(issues[0].message.contains("at most 2"));
    }

    #[test]
    fn optional_ranks_at_zero_are_never_flagged() {
        let counts = HashMap::from([(Rank::Commander, 1), (Rank::Corps, 3)]);
        let issues = validate_rank_counts(&counts, &standard_requirements());
        assert!(issues.iter().all(|i| i.rank != Rank::Operative));
    }

    #[test]
    fn attached_units_are_never_flagged_even_with_no_bound() {
        let counts = HashMap::from([(Rank::Commander, 1), (Rank::Corps, 3), (Rank::Attached, 50)]);
        let issues = validate_rank_counts(&counts, &standard_requirements());
        assert!(issues.iter().all(|i| i.rank != Rank::Attached));
    }
}
