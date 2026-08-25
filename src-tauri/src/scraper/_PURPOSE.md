# scraper/

Card image/text scraper and the rules-update checker.

RULES:
- Network/parsing code only. Any output that would change `data/`
  content goes through `rules_updates_log` as a proposed diff -- this
  module never silently overwrites seed data files. A human (you)
  approves changes.
- Respect robots.txt/ToS per source. See docs/ARCHITECTURE.md.
