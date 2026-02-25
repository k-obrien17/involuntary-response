# OPS-MANUAL.md - Extended Reference

**Core contract:** CLAUDE.md  
**Last updated:** 2026-02-25

---

## 1) Vault Model

### Entity Types (assumed)

- People / Contacts
- Organizations
- Projects / Engagements
- Content assets (drafts, briefs, published)
- Research / Stars (stats, frameworks, quotes)
- Meetings / Notes
- Admin (invoices, taxes, ops)

If vault differs, adapt and document the difference.

### Current Indexes

<!-- UPDATE THIS LIST as indexes are created -->

| Index | Location | Refresh |
|-------|----------|---------|
| Main Dashboard | `vault/📊 Dashboard.md` | Dataview (live) |
| Client Health | `vault/💼 Client Health.md` | Dataview (live) |
| Pipeline | `vault/📈 Pipeline.md` | Dataview (live) |
| This Week | `vault/📅 This Week.md` | Dataview (live) |
| Contacts by Lead Score | `vault/090-Meta/Contacts by Lead Score.md` | Python script (manual) |
| Contacts by Tag | `vault/090-Meta/Contacts by Tag.md` | Dataview (live) |
| Contacts Data Quality | `vault/090-Meta/Contacts Data Quality.md` | Dataview (live) |
| Evidence Dashboard | `vault/030-Evidence/_Indexes/Dashboard.md` | Dataview (live) |
| Content Output | `vault/📝 Content Output.md` | Dataview (live) |

**Rule:** Before searching broadly, check if an index exists. If a pattern repeats 3+ times, propose a new index.

### Derived Artifacts

Artifacts that prevent repeated searching:

| Artifact | Status | Location |
|----------|--------|----------|
| Weekly metrics snapshot | ✅ Live | `vault/📊 Dashboard.md` |
| Rolling "last touch" per client | ✅ Live | `vault/💼 Client Health.md` |
| Drafts-in-progress list | ✅ Live | `vault/📝 Content Output.md` |
| Top cited stats by category | ✅ Live | `vault/030-Evidence/_Indexes/Dashboard.md` |
| Lead scoring by tier | ✅ Manual | `vault/090-Meta/Contacts by Lead Score.md` |

**Rule:** Derived artifacts should be refreshable (manual or scheduled), not precious.

---

## 2) Playbooks

### Playbook A: Build/Improve an Index Note

**Goal:** Create one "answer hub" that eliminates repeated searching.

**Deliverable structure:**
```markdown
# [Index Name]

## Purpose
What questions this index answers.

## Active
- [ ] Item with link
- [ ] Item with link

## Recent (last 30 days)
- Item with link

## Next Actions
- [ ] Action item

---
*Last updated: YYYY-MM-DD*
*Update rule: [manual weekly / triggered by X]*
```

**Example output:** A client index showing active clients, last touch date, and next action for each.

---

### Playbook B: Weekly Dashboard

**Goal:** Single-screen view of what matters this week.

**Deliverable structure:**
```markdown
# Weekly Dashboard - Week of [DATE]

## This Week
- **Shipped:** [content pieces]
- **Active clients:** [count + names]
- **Meetings:** [count]
- **Next actions:** [top 3]

## Rolling Metrics
| Client | Last Touch | Next Action |
|--------|------------|-------------|
| [Client] | [date] | [action] |

## Drafts in Progress
- [Draft] - status

## Inbox (uncategorized)
- [Items that don't fit above]

---
*Refresh: Manual, Mondays*
```

**If automation proposed, include:** trigger, file pattern assumptions, rollback path.

---

### Playbook C: Draft from Source Material

**Workflow:**
1. Identify target audience + objective
2. Pull 3-7 source anchors (snippets/notes from vault)
3. Create outline: claim → evidence → implication
4. Draft in Keith's voice (direct, concrete, no warm-up)
5. Provide 2 variants when helpful: concise vs. expanded

**Voice checklist:**
- [ ] No warm-up intro
- [ ] Lead with insight, not context
- [ ] Concrete examples over abstractions
- [ ] Skimmable structure (headings, bullets)
- [ ] Active voice

---

### Playbook D: "Can't Find X"

**Sequence:**
1. Filename search (exact + fuzzy)
2. Check indexes/dashboards
3. Targeted keyword search (2-3 terms max)
4. Ask one precise clarifying question

**Do not:** Broad scan without hypothesis. Reading 20+ files "just in case."

---

### Playbook E: System Improvement Proposal

**Use when:** Identifying friction, proposing structural changes, or optimizing workflows.

**Deliverable structure:**
```markdown
## Diagnosis
What's breaking / what friction exists.

## Options
| Option | Tradeoffs | Effort |
|--------|-----------|--------|
| A: [description] | [pros/cons] | [low/med/high] |
| B: [description] | [pros/cons] | [low/med/high] |

## Recommendation
[Option X] because [reason grounded in evidence].

## Implementation
1. Step with file path
2. Step with file path

## Rollback
How to revert if needed.

## Open Questions
1. [Question that unlocks next layer]
2. [Question]
```

**Labels for proposals:**
- 🔧 Quick win (< 15 min)
- 🧱 Structural refactor (> 1 hour)
- 🧠 Cognitive load reduction

---

## 3) Output Standards

### Recommendations / Analysis

1. What I found (grounded in retrieved evidence)
2. Options A/B/C + tradeoffs + effort
3. Recommendation + why
4. Next actions (checklist)
5. Open questions (2-5)

### Writing Outputs

- Match Keith's voice if samples exist
- Concise, skimmable, insight-first
- Headings/bullets for structure
- Prefer concrete claims over abstractions

### Research Summaries

Include:
- Key takeaways
- Implications
- What to do next
- Open questions

Mark uncertainty explicitly.

---

## 4) Commands Reference

### Read-Only (always allowed)
```bash
ls, fd, rg, cat, bat, head, tail
git status, git diff, git log
```

### Requires Approval
```bash
rm, mv, cp (to new location)
sed -i, awk (in-place edits)
git commit, git push
Any multi-file modification
```

### Claude Code Skills
| Skill | Trigger |
|-------|---------|
| Weekly Review | `/weekly-review` |
| Plan Day | `/plan-day` |
| Find Hot Prospects | `/find-hot-prospects` |
| Find Stale Contacts | `/find-stale-contacts` |
| Prep Meeting | `/prep-meeting` |
| Draft Email | `/draft-email` |
| New Contact | `/new-contact` |
| Update Vault Map | `/update-vault-map` |
| Document | `/document` |
| Review | `/review` |
| Test | `/test` |

### Vault Scripts

Located in `vault/000-OS/Claude/scripts/`. Dry run by default (`--execute` to apply).

**Data Quality**

| Script | Purpose | Usage |
|--------|---------|-------|
| `audit.py` | Combined audit (schema + tags + topics + mismatches) | `audit.py [schema\|tags\|topics\|mismatches\|all]` |
| `find_duplicates.py` | Find duplicate contacts and orgs (fuzzy matching) | `find_duplicates.py [contacts\|orgs\|all] [--cross-org] [--threshold 0.9] [--csv]` |
| `fix_lead_tiers.py` | Recalculate lead_tier from lead_score | After score changes |
| `normalize_tags.py` | Normalize tag casing, spaces, canonical forms | After new contacts added |
| `fix_dates.py` | Normalize dates to YYYY-MM-DD | After imports |
| `lead_score.py` | Recalculate all lead scores, export CSV | After schema/weight changes |
| `evidence_quality.py` | Evidence data quality fixes (5 phases: citation YAML, topics, articles, books, use_cases) | `evidence_quality.py [--phase 1-5] [--execute]` |
| `process_captures.py` | Process status:capture citations (create Source notes, link, promote) | `process_captures.py [--execute] [--stats]` |
| `schema_migrate_v2.py` | Purge legacy keys, inject new fields (business, topics, platforms, rapport, context) on contacts | `schema_migrate_v2.py [--execute] [--path ORG]` |

**Contact & Org Management**

| Script | Purpose | Usage |
|--------|---------|-------|
| `infer_contact_tags.py` | Auto-tag contacts from title/industry | After new contacts; supports `--path` |
| `infer_org_type.py` | Infer org_type from description/industry | After new orgs added |
| `move_contact_to_org.py` | Move contact between orgs (job change) | `"Name" "New Org"` |
| `merge_duplicate_orgs.py` | Merge duplicate org folders | Edit PAIRS list first |
| `propagate.py` | Propagate fields from orgs to contacts | `propagate.py [status\|industry\|org_type\|all]` |
| `apply_template.py` | Add missing template fields to files | `apply_template.py [contact\|organization\|meeting]` |

**Operations**

| Script | Purpose | Usage |
|--------|---------|-------|
| `daily_summary.py` | Morning briefing: stale contacts, meetings, stats | Daily / cron |
| `draft_pipeline.py` | Voice draft pipeline report (stages, aging, overdue) | `draft_pipeline.py [--speaker X] [--days 60] [--age-threshold 7]` |
| `vault_stats.py` | Quick vault overview by relationship/stage | Anytime |
| `sync_calendar.py` | Create meeting notes from Google Calendar ICS | After meetings; `--execute` to create |
| `sync_last_contact.py` | Update last_contact from meeting attendance | After creating meeting notes |
| `setup_week.py` | Create weekly + daily note templates | Start of each week |

### Environment
macOS, zsh, homebrew, node, python, ripgrep, bun available.

---

## 5) MCP Tools Quick Reference

### obsidian-vault

| Tool | Use |
|------|-----|
| `query_contacts` | Find contacts by folder, title, org, industry |
| `query_organizations` | Find orgs by folder, type, industry |
| `query_content` | Find content pieces by type, org |
| `query_meetings` | Find meetings by org, attendee |
| `query_stale_contacts` | Find contacts not touched in X days |
| `search_vault` | Full-text search |
| `read_file` | Read specific file by path |
| `list_folders` | Explore vault structure |
| `create_contact` | Add new contact |
| `create_meeting` | Add meeting note |
| `update_contact` | Update contact fields |

### Claude in Chrome

| Tool | Use |
|------|-----|
| `navigate` | Go to URL |
| `read_page` | Get accessibility tree |
| `find` | Natural language element search |
| `computer` | Click, type, screenshot, scroll |
| `get_page_text` | Extract article text |

---

## 6) Iteration Protocol

**For major system improvements, follow this sequence:**

### Phase 1: Orientation
Capture:
- 3 non-negotiable workflows
- Daily vs. aspirational use
- Current friction: "acceptable" vs. "must fix"
- "It should just do X" outcomes

### Phase 2: Diagnosis
Identify:
- Scale risks at 10×
- Duplication and entropy points
- Hidden manual work
- Missing indexes/dashboards

### Phase 3: Optimization
Propose changes using Playbook E format. Label each:
- 🔧 Quick win
- 🧱 Structural refactor
- 🧠 Cognitive load reduction

### Phase 4: Next Questions
End with 2-5 precise questions that unlock the next layer.

---

## 7) What Good Looks Like

- Fast, accurate, thoughtful
- Surfaces what Keith might miss
- Reduces repeated searching via indexes + derived artifacts
- Improves the system incrementally without breaking trust
- Treats the work like it matters
