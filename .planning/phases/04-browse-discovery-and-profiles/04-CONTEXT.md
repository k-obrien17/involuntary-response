# Phase 4: Browse, Discovery, and Profiles - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Visitors can discover posts by tag, by artist, and by contributor. Contributor profiles show identity and collected work. Three browse/filter pages plus a contributor profile page and an explore hub.

</domain>

<decisions>
## Implementation Decisions

### Browse page layout
- Compact list format — each row shows title, contributor name (links to profile), and relative date
- Page heading is just the name (e.g., "hip-hop", "Kendrick Lamar") — no post count
- Sorted newest first, no sort toggle
- Same text-first responsive design as the feed

### Artist pages
- Small circular avatar (~64px) from Spotify artist image, next to artist name
- Use the image from the most recent post featuring that artist
- Below the header: compact post list of all posts featuring that artist

### Contributor profiles
- URL pattern: `/@username`
- Page shows: display name, avatar, ~300 char bio, then their posts in compact list
- Bio editing is inline on the profile page — click to edit when viewing your own profile
- Avatar + bio + post list (no social links)

### Explore page
- Dedicated `/explore` page with three sections: popular tags (as pills), most-written-about artists, active contributors
- Each item links to its respective browse page
- Ranked by most recent activity (tags/artists/contributors from newest posts rank higher)
- Linked from the main navbar as "Explore" alongside Home

### Navigation flow
- Tags on posts are clickable pills → tag browse page
- Artist names in post embeds are clickable → artist page
- Contributor names → profile page
- Explore page as a navbar entry point for discovery

### Claude's Discretion
- Avatar upload implementation (file upload vs Gravatar vs external URL — pick simplest approach)
- Exact spacing, typography, and responsive breakpoints on browse pages
- Empty state treatment for browse pages with no results
- How many items to show per section on /explore before a "see all" link
- Artist deduplication strategy (Spotify ID vs name matching)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-browse-discovery-and-profiles*
*Context gathered: 2026-02-27*
