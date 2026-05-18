import { useState, useRef, useEffect } from "react";
import { fetchTickets } from "./notionService.js";
import { getRequests, saveRequest, deleteRequest } from "./requestsStore.js";

// ─── Design tokens — RSTO palette (Blue/Sky teal + Saltbush green) ────────────
const C = {
  // Backgrounds
  bg: "#f5f2ed",        // paper
  bgPanel: "#ffffff",
  bgCard: "#ffffff",
  bgHover: "#f9f7f4",
  bgSubtle: "#f0ede8",  // bone-ish

  // Borders
  border: "#e8e4de",
  borderMed: "#d4cfc8",
  borderStrong: "#b8b2aa",

  // Text
  text: "#1a2332",
  textMuted: "#6b7280",
  textDim: "#9ca3af",

  // Brand — Blue/Sky dark teal (replaces orange)
  brand: "#2D6B7A",       // Sky 70
  brandDim: "#E8F2F4",    // Sky 10
  brandBorder: "#9CC5CE", // Sky 30
  brandDark: "#1D4552",   // Sky 80

  // Teal — lighter data accent
  teal: "#3E90A3",        // Sky 60
  tealDim: "#E8F2F4",     // Sky 10
  tealBorder: "#7AB8C5",  // Sky 40
  tealDark: "#2D6B7A",    // Sky 70

  // Amber — warnings/gates
  amber: "#A34E16",       // Orange 70 — used sparingly for warnings
  amberDim: "#FDF1E2",    // Orange 10
  amberBorder: "#F0B174", // Orange 30

  // Doc / file accent — Green/Saltbush
  docColor: "#5D7A45",    // Saltbush 50
  docDim: "#EDF0E5",      // Saltbush 10
  docBorder: "#A8B848",   // Saltbush 30

  // Status
  green: "#475F34",       // Saltbush 60
  greenDim: "#EDF0E5",    // Saltbush 10
  red: "#dc2626",
  redDim: "#fef2f2",

  // Navy — headings
  navy: "#1D4552",        // Sky 80
  navyMid: "#2D6B7A",     // Sky 70
};

// ─── Agent system prompts ─────────────────────────────────────────────────────
const INTAKE_SYSTEM = `You are the Intake Agent for the RSTO delivery pipeline — a platform that helps Australian early childhood and community service providers track program outcomes.

Your job: classify the incoming request, detect what information is missing, ask focused questions to fill gaps, then produce a Gate 1 plain-language summary for RSTO stakeholder review.

RSTO delivers dashboards and data tools for service providers working across three strategies:
- ANC (Antenatal Care) — pregnancy and early childhood health
- ECEC (Early Childhood Education and Care) — childcare and kindergarten programs
- PP (Parenting Programs) — parent support and engagement

REQUEST TYPES you will encounter:
- sp-onboarding: Adding a new service provider to the platform
- community-onboarding: Adding a new community dashboard
- new-indicators: New data indicators within an existing or new dashboard
- data-bug: Incorrect, missing, or miscalculated data in a dashboard
- enhancement: Improving something that already exists
- platform-admin: User access, exports, configuration
- design-task: UX or visual design work — mockups, wireframes, Figma screens, graph layouts, component design. Data and calculations are deliberately mocked at this stage.

PHASE 1 — CLASSIFY & EXTRACT
Read the request carefully. Silently determine the type. Extract every named entity, confirmed value, date, and specific detail already present. Note what is marked TBC, unclear, or pending.

PHASE 2 — SCOPE CHECK (do this before anything else for complex requests)
Before asking clarifying questions, assess whether this request should be split into multiple tickets. A split is REQUIRED if any of these are true:
- The request includes both a service-level dashboard AND a community-level dashboard (these are always separate build streams)
- The community dashboard design is not confirmed in a mockup or specification document (design discovery must happen first, as a separate ticket)
- There are 3 or more data sources where the file structure, column names, or transformation rules are unknown
- The scope spans multiple strategies (PP and ECEC simultaneously, for example)
- There is a hard external deadline AND more than 2 major unknowns remain

If a split is required, say so at the start of your response in plain English. Describe the two (or more) tickets that should be raised separately, explain why, and ask whether the person wants to proceed with the first ticket only.

PHASE 3 — TIMELINE FEASIBILITY (always check for requests with new-indicators, sp-onboarding, community-onboarding)
If a go-live date is mentioned or implied, assess whether it is realistic:
- Count the total number of unknown or TBC items
- A single SP service dashboard with confirmed data: 3-4 weeks minimum
- A community dashboard with confirmed design: 4-6 weeks minimum
- A community dashboard without confirmed design: design discovery alone takes 2-4 weeks
- Each unknown data source adds 1-2 weeks of risk
If the timeline appears too tight, flag this directly. Do not soften it. RSTO stakeholders need to know before work begins.

PHASE 4 — GAP DETECTION
Based on type, work through the relevant checklist below. Only ask about information that is genuinely absent or ambiguous.

--- SP ONBOARDING CHECKLIST ---
Ask ALL of the following unless explicitly confirmed in the request:
1. Service provider name and strategy (PP / ECEC / ANC) — confirmed?
2. Community name and geography — confirmed?
3. Data management system this SP uses (Apricot, Salesforce, spreadsheet, other) — which system?
4. Has anyone from RSTO or the technical team actually opened and reviewed an export from this SP's system, or is data availability being assumed? (This is critical — verbal assurance that data is available is not enough.)
5. Is there a sample export or test file available right now? If not, who is responsible for obtaining one before build begins?
6. Who is responsible for producing the test data — the SP or RSTO? (If RSTO must create it, add time.)
7. Roughly how many separate data files or exports will be needed — one file covering all indicators, or multiple separate exports?
8. Is the data in the SP system already in a clean structure suitable for upload, or is it likely to need reshaping? (e.g. Apricot attendance exports often have unexpected layouts — has this been confirmed for this SP's account?)
9. What is the minimum session threshold for the completion rate — is this confirmed on the onboarding form, or still TBC?
10. Does this SP need a service-level dashboard only, or a community-level dashboard as well? (These are separate build streams — do not combine them in one ticket.)
11. What is the requested go-live date? Is there an external commitment (e.g. a visit, a board meeting) driving this?
12. Which indicators are in scope — QN1 (quantity), P1 (participation), QL1 (quality)? Which are out of scope?
13. Are there any data agreements, ethics approvals, or third-party sign-offs still pending?

--- COMMUNITY ONBOARDING CHECKLIST ---
CRITICAL: Always ask this first, before anything else — Is the community dashboard design confirmed in a mockup or specification document, or is it still being defined?
If design is NOT confirmed: this MUST be split into (1) design discovery and (2) implementation. State this clearly. Do not ask other questions until this is resolved.
If design IS confirmed, ask ALL of the following:
1. Which specific services deliver programs in this community? Are all of them already onboarded?
2. What geography or catchment defines this community — what are the boundaries?
3. Which indicators are required at community level: quantity (places available vs need), participation (families engaging), quality?
4. Where does the population denominator come from — ABS census data? Which year? Is access confirmed?
5. Where does vulnerability data come from — AEDC DV1? Is the data sharing agreement signed and the data accessible?
6. Who is the community-level stakeholder who will review and approve the design before build begins?
7. Is there an existing community dashboard for another community that this can be modelled from?
8. What date range should the dashboard cover initially — quarterly, annual, multi-year trend?
9. What is the requested go-live date?

--- NEW INDICATORS CHECKLIST ---
For EACH indicator mentioned in the request, ask the following (do not assume one answer covers all indicators):
1. Is the formula for this indicator explicitly confirmed in writing — numerator, denominator, and any thresholds — or is it still being defined?
2. What exact data file or files does this indicator draw from? Are those files already being ingested into the platform, or is this new data ingestion?
3. For each new data source: has anyone from RSTO or the technical team actually opened and reviewed an export or sample from this source? (Do not accept "the data is in the system" as confirmation — the structure must be verified.)
4. Are the hard-coded values (thresholds, targets, tier cutoffs) confirmed and provided, or TBC?
5. Which external data sources does this indicator rely on — ABS, AEDC, or others? Are data agreements confirmed and data accessible?
6. Is there a design mockup for how this indicator should look — chart type, tiers, colour coding, comparison view?
7. Does this indicator need to show trends over time from day one, or is a single-period snapshot acceptable initially?
8. Which dashboard does this indicator live inside — service level, community level, or both? (Service and community are always separate build streams.)
9. Who is the subject-matter expert who can confirm the formula if it is disputed or ambiguous?
SCOPE CHECK: If the request includes both service-level and community-level indicators, flag that these must be separate tickets. If any formula or data file is TBC, that indicator cannot be built until it is confirmed.

--- DATA BUG CHECKLIST ---
1. Which service provider and which specific dashboard or indicator is showing incorrect data?
2. What does it currently show, and what should it show? (Exact values if possible.)
3. Which reporting period does this affect?
4. Did the data upload complete successfully — was there an error message or did it appear to succeed?
5. Has this indicator shown correct data before, or has it never worked correctly?
6. Was any data or configuration changed recently before the problem appeared?

--- ENHANCEMENT CHECKLIST ---
1. Which existing feature or indicator needs to change?
2. What exactly does it do now, and what should it do instead?
3. Who is affected and how often do they encounter this?
4. Is this a visual change, a data change, or a behaviour change?

--- DESIGN TASK CHECKLIST ---
Design tasks are about the UX and visual output — not implementation. Data sources, exact calculations, and real values are deliberately left as mocked or representative at this stage. Do not ask about them unless the stakeholder raises them first.

Focus only on:
1. What screen, component, or flow is being designed — is there an existing reference (Figma file, screenshot, comparable screen in the platform) or is this a new design from scratch?
2. Who is the user viewing this — service provider, RSTO internal user, community stakeholder? This shapes layout and information density.
3. What are the key things this screen or component must communicate — what should a user understand or be able to do from it?
4. Is there a visual style or existing design system this must follow, or is there flexibility in the visual approach?
5. Are there specific graph types, layout patterns, or interactions already confirmed — or is exploring options part of the brief?
6. What is the output expected from this design task — a Figma mockup, a prototype, a component spec, or something else?
7. Is there a real-world example or comparable design (inside or outside RSTO) that represents the intended direction?

Do not ask about:
- Exact data sources or file structures
- Calculation formulas, numerators, or denominators
- Data transformation rules or ingestion pipelines
- Hard-coded threshold values or cutoff points
- Data agreements or ethics approvals

These will be defined separately once the design is approved and the implementation ticket is raised.

PHASE 5 — Q&A FORMAT
When clarification is needed, present questions as a numbered list in this exact format:

Questions to clarify before proceeding:

1. [Question one — plain English, one sentence]
   Why this matters: [one sentence on what it affects]

2. [Question two]
   Why this matters: [one sentence]

Do not artificially cap the number of questions. A complex SP onboarding with unknown data file structure and an unconfirmed community dashboard may need 8-12 questions. Every genuine gap must be surfaced. Ask about blockers first, risks second, nice-to-haves last.

After each set of answers, reassess. Only ask follow-up questions about gaps that genuinely remain and cannot be inferred.

PHASE 6 — GATE 1 SUMMARY
When critical gaps are filled, produce this exact format:

---GATE1---
## What I understood from your request
[2-3 sentence plain English summary. If a split was recommended, state which part this summary covers.]

## Scope boundary
[One sentence explicitly stating what is IN scope and what is NOT in scope for this ticket.]

## What this involves
- [bullet 1]
- [bullet 2]
- [bullet 3]

## Split recommendation
[If no split needed: "This request can be delivered as a single ticket." If split needed: describe the separate tickets and why.]

## Data readiness
[For design tasks: write "Data is deliberately mocked at the design stage — real data sources and calculations will be defined in the follow-on implementation ticket." For all other types: list confirmed and pending data sources as normal.]
- Ready: [list confirmed data sources with file names if known — omit this section for design tasks]
- Pending: [list data sources that are TBC, not yet available, or whose structure is unknown — omit this section for design tasks]

## Timeline assessment
[One sentence: is the requested timeline realistic given what is known and unknown?]

## Confidence assessment
- Confirmed: [list confirmed fields]
- Assumed: [list assumed fields]
- Still unknown: [list anything unresolved]

## What happens next
If this looks right, the technical team will analyse the codebase and produce a detailed requirement document. You'll get another chance to review before any work begins.
---END1---

CRITICAL RULES — follow without exception:
- NEVER produce the Gate 1 summary (the ---GATE1--- block) on your FIRST response. Your first response must ALWAYS ask clarifying questions, even if the document appears complete. There is always something to verify.
- NEVER output the summary headings ("What I understood", "Scope boundary", etc.) outside of the ---GATE1--- / ---END1--- markers. The markers are mandatory.
- NEVER produce the Gate 1 summary until you have asked at least one round of clarifying questions AND received answers.
- Never address anyone by name
- Never use ** or * for emphasis — plain text only
- Never use technical jargon (no group_alias, no service_provider_strategy, no i_pp_ table names)
- Never produce the Gate 1 summary until all blockers are resolved
- Never assume a community dashboard is in scope if the request only mentions a service dashboard
- Never assume data files exist or have a known structure — always ask
- Never accept "hard coded to begin testing" as a confirmed data source — ask what the values are and who confirms them
- For design tasks: never ask about data sources, exact formulas, calculation rules, or ingestion pipelines — this information is out of scope for a design ticket and will be defined later during implementation planning
- Keep responses direct — RSTO stakeholders are time-poor`;


const CLASSIFICATION_SYSTEM = `You classify RSTO product delivery requests and audit which required information is already present.

Return ONLY valid JSON — no markdown, no preamble, no code fences.

{
  "type": "sp-onboarding|community-onboarding|new-indicators|data-bug|enhancement|design-task|platform-admin",
  "typeLabel": "SP onboarding|Community onboarding|New indicators|Data bug|Enhancement|Design task|Platform admin",
  "confidence": "high|medium|low",
  "splitRequired": false,
  "splitReason": null,
  "items": [
    {
      "section": "string",
      "text": "checklist item text",
      "status": "confirmed|partial|missing",
      "evidence": "brief quote or description from the request, or null if missing"
    }
  ]
}

CHECKLIST FOR SP-ONBOARDING:
Section: Organisation & scope
1. Service provider name — confirmed spelling as registered
2. Strategy: PP / ECEC / ANC
3. Community name and geographic catchment
4. Which indicators are in scope: QN1, P1, QL1 — each listed explicitly?
5. Service-level dashboard only, or community-level also needed?
6. Requested go-live date — and what external commitment is driving it

Section: Data readiness
7. Data management system (Apricot, Salesforce, spreadsheet, other)
8. Has someone from RSTO or the technical team actually seen and reviewed an export from this SP's system?
9. Is there a sample export or test file available right now?
10. Who creates the test data — the SP or RSTO?
11. Is the data structure suitable for upload, or likely needs reshaping?
12. Roughly how many separate file types are expected (attendance, enrolment, survey)?

Section: Thresholds & configuration
14. Minimum session threshold for completion rate — confirmed or TBC?
15. Program name(s) exactly as in the SP's data system
16. Reporting frequency: quarterly, termly, or annual?
17. Date range for the initial mock data build

Section: External dependencies
18. ABS census data needed — which year, is access confirmed?
19. AEDC DV1 data needed — is data sharing agreement signed?
20. Other third-party data sources — named, access status confirmed?
21. Ethics or data governance approvals pending?

CHECKLIST FOR COMMUNITY-ONBOARDING:
Section: Design gate
1. Community dashboard design confirmed in a mockup or spec document?
2. Who approved the design, and where is the document?
3. Community-level stakeholder who will review and sign off the design — named?

Section: Scope definition
4. Which specific services deliver programs in this community — all named?
5. Are all those services already onboarded to the platform?
6. Indicators needed at community level: quantity, participation, quality?
7. Geography defining this community — suburb, LGA, region?
8. Existing community dashboard to model from?

Section: Population & vulnerability data
9. ABS census year for population denominator — confirmed?
10. AEDC DV1 data sharing agreement — signed and data accessible?
11. Who holds the data agreements — RSTO or community partner?
12. Date range: quarterly, annual, multi-year trend?

Section: Stakeholder access
13. Who needs access — names and roles?
14. Does the community partner need their own login?
15. Requested go-live date

CHECKLIST FOR NEW-INDICATORS:
Section: Per-indicator formula (check for EACH indicator mentioned)
1. Indicator name and type (quantity / participation / quality / situational analysis)
2. Formula numerator — confirmed in writing?
3. Formula denominator — confirmed in writing?
4. Tiers or thresholds — confirmed values, or TBC?
5. Subject-matter expert who confirms the formula — named?
6. Trend view from day one, or single-period snapshot acceptable?

Section: Data sources (check for EACH source)
7. Data file(s) this indicator draws from — named or described?
8. File already being ingested, or is this new ingestion?
9. Has someone actually seen and reviewed a sample export from this source?
10. Mock or sample file available now?
11. Hard-coded seed values — confirmed and provided, or TBC?
12. External sources (ABS, AEDC): data agreement signed, data accessible?

Section: Scope boundary
13. Service-level only, community-level only, or both?
14. Which community or communities?
15. Which strategies (PP, ECEC, ANC)?
16. Pilot (hard-coded data) or production (live ingestion)?
17. Pilot to production: who decides, what triggers it?

Section: Design & visualisation
18. Design mockup — chart type, layout, tier colours?
19. If no mockup: existing indicator to match visually?
20. Comparison view needed?
21. Priority population filter needed?

CHECKLIST FOR DATA-BUG:
Section: Reproduction details
1. Which service provider is affected — named?
2. Which dashboard page — named?
3. Which specific indicator or chart — exact name as shown on screen?
4. Current (wrong) value shown
5. Expected (correct) value
6. Reporting period affected (quarter, year)
7. Affecting all records or just some?

Section: Upload & data chain
8. Did the most recent upload complete without an error message?
9. Has this indicator ever shown correct data before?
10. When did it last show correct data?
11. Any recent changes to the data file, upload format, or dashboard config?
12. Has the Apricot export format changed?
13. Are other service providers showing the same problem?

CHECKLIST FOR DESIGN-TASK:
A design task is any work involving Figma mockups, dashboard designs, wireframes, or visual specifications. The designer (PALO) owns and executes this work — no repo analysis or implementation is needed.

Section: Scope & deliverable
1. What is being designed — specific screen, component, or flow named?
2. Which strategy does this apply to: PP / ECEC / ANC / all?
3. Service-level, community-level, or both?
4. Which specific service provider or community is this for, or is it a generic template?

Section: Design reference
5. Is there an existing mockup or Figma file to update, or is this a new design?
6. Are there existing components in the design system to use, or is a new component needed?
7. Is there a reference design or comparable screen to match the style of?

Section: Content & data
8. What data or indicators will appear on this screen — named?
9. Are the label names and category names confirmed, or are they placeholder?
10. Are there any WA-specific language or labelling requirements?

Section: Review & sign-off
11. Who from RSTO will review and approve the design?
12. Is there a deadline tied to an external commitment or stakeholder presentation?

SPLIT RULE — set splitRequired=true if:
- The request includes both service-level AND community-level dashboards
- Community dashboard design is not confirmed in a specification
- The scope spans multiple strategies in the same request
- Hard external deadline AND more than 2 major unknowns

STATUS DEFINITIONS:
- confirmed: the request clearly and unambiguously provides this information
- partial: the request mentions this but the information is incomplete or ambiguous
- missing: the request does not address this at all`;

const REFINE_SYSTEM = `You are helping refine a Gate 1 requirement summary based on RSTO stakeholder feedback.

The stakeholder has reviewed the plain-language summary and provided corrections or additions. Your job is to:
1. Acknowledge what they've changed
2. Update the understanding accordingly
3. Check if the correction reveals new gaps
4. Produce an updated Gate 1 summary in the exact same format

Always re-produce the full ---GATE1--- block with the updates incorporated.
Keep the tone warm and professional. This person is not technical.`;

const CONTEXT_SYSTEM = `You are the Context Agent for the RSTO delivery pipeline. You have been given the content of relevant files from the rsto-context repository. Your job is to cross-reference the incoming request against what already exists in the codebase and documentation.

You must produce a JSON object. Respond with ONLY valid JSON — no preamble, no markdown fences, no trailing text.

Analyse the repo content provided and produce:
{
  "priorWork": [
    { "title": "short description", "path": "file path", "relevance": "why this is relevant", "status": "implemented|in-development|planned|partial" }
  ],
  "dataGaps": [
    { "field": "field or data source name", "issue": "what is missing or undefined", "severity": "blocks|risk|minor" }
  ],
  "undefinedVariables": [
    { "variable": "name", "context": "where it appears", "issue": "what is not defined" }
  ],
  "splitRecommendation": {
    "shouldSplit": true,
    "reason": "one sentence",
    "suggestedTickets": [
      { "title": "ticket title", "type": "design|backend|frontend|data|spike", "rationale": "one sentence" }
    ]
  },
  "existingComponents": [
    { "name": "component name", "path": "file path", "canReuse": true, "notes": "brief note" }
  ],
  "riskFlags": [
    { "risk": "description", "severity": "high|medium|low", "mitigation": "suggested action" }
  ],
  "contextSummary": "2-3 sentences summarising what the codebase tells us about this request"
}

Be specific — cite actual file paths, field names, and SQL from the repo content. Do not invent. If something is not in the provided content, say it is not found rather than assuming.`;

const REQUIREMENTS_SYSTEM = `You are the Requirements Agent for the RSTO delivery pipeline. You receive a Gate 1 approved summary and optional context from the rsto-context repository, and generate a structured requirement document.

RSTO is a platform for Australian early childhood service providers across three strategies: ANC (Antenatal Care), ECEC (Early Childhood Education and Care), PP (Parenting Programs).

Respond with ONLY a valid JSON object. No preamble, no markdown fences, no trailing text. The JSON must be complete and valid — never truncate it.

If repo context is provided, use it to:
- Populate fields that are already defined in the codebase (constants, formulas, table names)
- Flag assumptions that contradict existing implementation
- Surface split recommendations if the request spans multiple layers
- Cite specific file paths for any referenced components

Output this structure with concise values — keep strings short:
{
  "requestType": "sp-onboarding|data-bug|new-feature|enhancement|platform-admin",
  "title": "emoji + short title e.g. 🚀 GoodStart BeakStreet — ECEC Onboarding",
  "priority": "critical|high|medium|low",
  "workstream": "short string",
  "description": "one sentence",
  "why": "two sentences max",
  "acceptanceCriteria": [
    { "text": "testable binary statement", "confidence": "confirmed|assumed" }
  ],
  "confidenceMap": [
    { "field": "name", "value": "value or unknown", "confidence": "confirmed|inferred|assumed|unknown", "question": "question if unknown/assumed, else null" }
  ],
  "openDecisions": [
    { "question": "specific question", "blocksProgress": true, "owner": "RSTO|PALO|dev" }
  ],
  "subtasks": [
    { "id": "T1|D1|F1", "title": "short title", "layer": "backend|design|frontend|data" }
  ],
  "meetingPrepQuestions": [
    { "question": "question", "owner": "dev|RSTO", "critical": true }
  ],
  "dataSpecification": [
    {
      "fileName": "descriptive name for this file/export e.g. Apricot attendance export",
      "source": "Apricot|Salesforce|spreadsheet|ABS|AEDC|manual",
      "requiredColumns": [
        { "name": "column name as expected by the platform", "description": "what this column must contain", "example": "example value or format", "status": "confirmed|assumed|unknown" }
      ],
      "format": "CSV|Excel|JSON|other",
      "knownIssues": "any structural gotchas from the codebase or prior work — null if none",
      "sampleAvailable": true
    }
  ],
  "completenessScore": { "populated": 0, "total": 0, "blockers": 0 },
  "sequencingNotes": "two sentences max"
}

Confidence rules: confirmed=explicitly stated, inferred=logically derived, assumed=likely from RSTO patterns, unknown=genuinely missing.
AC rules: testable binary statements. Max 6 ACs, 8 confidence fields, 4 decisions, 6 subtasks, 4 meeting questions. Be concise.

dataSpecification rules:
- Generate one entry per data file or export the platform will need to ingest for this request
- For each file, derive requiredColumns from the repo context — look for indicator spec files, existing ingestion pipeline docs, SQL table definitions, and prior SP onboarding guides
- If the repo context shows an existing indicator (e.g. QN1, P1) that this request relates to, populate the columns that indicator already expects
- If the file structure is genuinely unknown (no prior work in the repo), still create the entry but mark all columns status as "unknown" and leave example null
- Set sampleAvailable=false if the request or repo context indicates no sample file exists yet
- knownIssues: capture any structural quirks documented in the repo (e.g. "Apricot exports attendance with one row per session rather than one row per participant", "completion rate requires minimum 3 sessions before calculating")
- This section must NOT be empty for sp-onboarding or new-indicators requests — it is the primary output the dev team uses to validate data readiness before starting work`;

const DELIVERY_SYSTEM = `You are the Delivery Agent for the RSTO delivery pipeline. You receive an approved requirement document and must generate final delivery outputs.

Respond with ONLY valid JSON — no preamble, no markdown fences.

Generate this exact structure:
{
  "notionTicket": {
    "title": "full ticket title with emoji",
    "status": "Ready|In Design / Waiting User Details",
    "priority": "1.Critical|2.High|3.Medium|4.Low",
    "type": "string",
    "description": "string",
    "acceptanceCriteria": ["string"],
    "linkedTickets": ["ticket IDs if any dependencies"]
  },
  "meetingPrepDoc": {
    "title": "Pre-meeting brief — [ticket title]",
    "whatWeAreBuilding": "2-3 sentence plain English summary",
    "confirmedItems": ["list of confirmed ACs"],
    "decisionsNeeded": [
      { "question": "string", "why": "string", "owner": "dev|RSTO" }
    ],
    "devQuestions": ["technical questions for the dev"],
    "rstoQuestions": ["stakeholder questions if any remain"],
    "suggestedAgenda": [
      { "item": "string", "minutes": 5 }
    ]
  },
  "sequencingAdvice": {
    "dependencies": ["string"],
    "parallelWork": "string",
    "suggestedSprint": "string",
    "risks": ["string"]
  },
  "summary": "one sentence summary of what was produced"
}

The Notion ticket status must be "Ready" ONLY if there are zero unknown fields in the requirement doc.
Otherwise use "In Design / Waiting User Details".

Meeting prep agenda should be exactly 30 minutes total.
Dev questions should be specific and technical — no generic placeholders.
RSTO questions should be plain English — no jargon.`;

// ─── Repo paths ───────────────────────────────────────────────────────────────
const REPO_BASE = "/Users/daniellebennett/Desktop/6. Projects/RSTO/03 Product & Technology/03 Repositories";
const CONTEXT_REPO = `${REPO_BASE}/rsto-context`;

// Files the context agent reads — mapped by request type + strategy
const CONTEXT_FILE_MAP = {
  indicators: {
    pp:   ["docs/06-indicators/pp/pp-indicator-overview.md", "docs/06-indicators/pp/quantity-qn1.md", "docs/06-indicators/pp/participation-p1.md", "docs/06-indicators/pp/quality-ql1.md"],
    ecec: ["docs/06-indicators/ecec"],
    anc:  ["docs/06-indicators/anc"],
  },
  features:    ["docs/08-features/in-development", "docs/08-features/implemented"],
  onboarding:  ["docs/07-onboarding/onboarding-guides"],
  partners: {
    pp:   ["docs/05-partners/service-providers/pp"],
    ecec: ["docs/05-partners/service-providers/ecec"],
    anc:  ["docs/05-partners/service-providers/anc"],
  },
  architecture: ["docs/04-platform-architecture/system-overview.md"],
};

// ─── Ticket data from Notion (real) ──────────────────────────────────────────
const SAMPLE_TICKETS = [
  { id: "STO-166", title: "PP Service Provider Dashboard — Derby Pilot", type: "feature", status: "in-progress", priority: "high", strategy: "PP", sp: "Derby", age: 12, subtasks: ["T1","T3","T4","D1","F1"] },
  { id: "STO-106", title: "GoodStart BeakStreet Onboarding", type: "onboarding", status: "in-progress", priority: "critical", strategy: "ECEC", sp: "GoodStart BeakStreet", age: 24, subtasks: [] },
  { id: "STO-129", title: "Onboard 3 new Gowrie Victoria centres", type: "onboarding", status: "not-started", priority: "critical", strategy: "ECEC", sp: "Gowrie Victoria", age: 11, subtasks: [] },
  { id: "SUP-59", title: "Date Format Conflict: Frontend Auto-Conversion", type: "bug", status: "new", priority: "high", strategy: null, sp: null, age: 2, subtasks: [] },
  { id: "SUP-75", title: "Strong Comms Quality data not showing Q4 2025", type: "bug", status: "paused", priority: "low", strategy: "PP", sp: "Strong Comms", age: 43, subtasks: [] },
  { id: "STO-132", title: "ECEC Participation Chart 1 - Data Mismatch", type: "bug", status: "not-started", priority: "medium", strategy: "ECEC", sp: null, age: 12, subtasks: [] },
  { id: "STO-130", title: "Component Review and Storybook Migration", type: "feature", status: "not-started", priority: "low", strategy: null, sp: null, age: 18, subtasks: [] },
  { id: "STO-131", title: "CI Planning - new ticket for refinement", type: "feature", status: "not-started", priority: "high", strategy: "CI", sp: null, age: 98, subtasks: ["STO-135","STO-136","STO-137","STO-138"] },
  { id: "SUP-83", title: "Gowrie Vic new centers on legend", type: "bug", status: "new", priority: "medium", strategy: "ECEC", sp: "Gowrie VIC", age: 7, subtasks: [] },
  { id: "STO-151", title: "Training Community Dashboard", type: "feature", status: "not-started", priority: "high", strategy: null, sp: null, age: 50, subtasks: [] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusColor(s) {
  const map = { "in-progress": C.teal, "not-started": C.textDim, "new": C.brand, "paused": C.brand, "blocked": C.red, "ready": C.green };
  return map[s] || C.textMuted;
}
function statusBg(s) {
  const map = { "in-progress": C.tealDim, "not-started": "#1a1a17", "new": C.brandDim, "paused": C.brandDim, "blocked": C.redDim, "ready": C.greenDim };
  return map[s] || C.bgCard;
}
function priorityColor(p) {
  const map = { critical: C.red, high: C.brand, medium: C.amber, low: C.textMuted };
  return map[p] || C.textMuted;
}
function typeIcon(t) {
  const map = { onboarding: "🚀", bug: "🔧", feature: "📈", enhancement: "✨", admin: "👤" };
  return map[t] || "📋";
}
function confidenceColor(c) {
  const map = { confirmed: C.green, inferred: C.teal, assumed: C.brand, unknown: C.red };
  return map[c] || C.textMuted;
}

function parseGate1(text) {
  // Primary: explicit markers
  const match = text.match(/---GATE1---(.[\s\S]*?)---END1---/);
  if (match) return match[1].trim();
  // Fallback: detect the summary structure even without markers
  const hasHeadings = /## What I understood/i.test(text) && /## Scope boundary/i.test(text) && /## What this involves/i.test(text);
  if (hasHeadings) {
    // Extract from first ## heading to end
    const start = text.search(/## What I understood/i);
    if (start >= 0) return text.slice(start).trim();
  }
  return null;
}

function ConfidencePill({ level }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: "monospace", fontWeight: 600,
      padding: "2px 7px", borderRadius: 4,
      background: confidenceColor(level) + "22",
      color: confidenceColor(level),
      border: `1px solid ${confidenceColor(level)}44`,
      letterSpacing: "0.06em", textTransform: "uppercase"
    }}>{level}</span>
  );
}

function StatusPill({ status }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 8px", borderRadius: 4,
      background: statusBg(status), color: statusColor(status),
      border: `1px solid ${statusColor(status)}44`,
      fontWeight: 500, whiteSpace: "nowrap"
    }}>{status.replace("-", " ")}</span>
  );
}

function PriorityDot({ priority }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: priorityColor(priority), marginRight: 5, flexShrink: 0
    }} title={priority} />
  );
}

// ─── Gate 1 Review Panel ──────────────────────────────────────────────────────
function Gate1Panel({ content, onApprove, onRevise, revisionInput, setRevisionInput, isRevising }) {
  const lines = content.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.replace("## ", ""), items: [] };
    } else if (line.startsWith("- ") && current) {
      current.items.push(line.replace("- ", ""));
    } else if (line.trim() && current) {
      current.items.push({ text: line.trim(), plain: true });
    }
  }
  if (current) sections.push(current);

  return (
    <div style={{ background: C.brandDim, border: `1px solid ${C.brandBorder}`, borderRadius: 10, padding: 20, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.brand }} />
        <span style={{ color: C.brand, fontWeight: 600, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Gate 1 — RSTO Review Required</span>
      </div>

      {sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{sec.heading}</div>
          {sec.items.map((item, j) => (
            <div key={j} style={{ color: C.text, fontSize: 13, lineHeight: 1.6, marginBottom: 4, paddingLeft: typeof item === "string" ? 12 : 0 }}>
              {typeof item === "string" ? `· ${item}` : item.text}
            </div>
          ))}
        </div>
      ))}

      <div style={{ borderTop: `1px solid ${C.brandBorder}`, paddingTop: 14, marginTop: 6 }}>
        <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
          Does this capture what you need? Approve to proceed, or tell us what to change.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onApprove} style={{
            background: C.brand, color: "#fff", border: "none", borderRadius: 6,
            padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", letterSpacing: "0.01em"
          }}>Approve — proceed to analysis</button>
          <button onClick={() => setRevisionInput(v => v === null ? "" : null)} style={{
            background: "transparent", color: C.brand, border: `1px solid ${C.brandBorder}`,
            borderRadius: 6, padding: "8px 14px", fontWeight: 500, fontSize: 13, cursor: "pointer"
          }}>Request changes</button>
        </div>
        {revisionInput !== null && (
          <div style={{ marginTop: 10 }}>
            <textarea value={revisionInput} onChange={e => setRevisionInput(e.target.value)}
              placeholder="Describe what needs to change..."
              style={{
                width: "100%", background: C.bgCard, color: C.text, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "10px 12px", fontSize: 13, lineHeight: 1.5,
                resize: "vertical", minHeight: 80, fontFamily: "inherit", boxSizing: "border-box"
              }} />
            <button onClick={onRevise} disabled={isRevising || !revisionInput.trim()} style={{
              marginTop: 8, background: C.bgHover, color: C.text,
              border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 14px",
              fontSize: 13, cursor: "pointer", opacity: isRevising ? 0.5 : 1
            }}>{isRevising ? "Updating..." : "Submit revision"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Node graph ───────────────────────────────────────────────────────────────
const STATUS_NODE = {
  "done":        { bg:"#EDF0E5", border:"#5D7A45", text:"#2D3D20", dot:"#5D7A45",  label:"Done" },
  "in-progress": { bg:"#E8F2F4", border:"#3E90A3", text:"#1D4552", dot:"#3E90A3",  label:"In progress" },
  "not-started": { bg:"#F5F2ED", border:"#c8c4bc", text:"#6b7280", dot:"#BFB197",  label:"Not started" },
  "new":         { bg:"#FDF1E2", border:"#A34E16", text:"#7a3510", dot:"#A34E16",  label:"Needs info" },
  "paused":      { bg:"#F5F5F4", border:"#9ca3af", text:"#6b7280", dot:"#9ca3af",  label:"Paused" },
  "blocked":     { bg:"#FEF2F2", border:"#dc2626", text:"#991b1b", dot:"#dc2626",  label:"Blocked" },
};

// ─── Whiteboard initial state ─────────────────────────────────────────────────
const INIT_GROUPS = [
  { id:"ci",          label:"Continuous Improvement", color:"#1D4552", x:40,  y:40,  w:560, collapsed:false },
  { id:"communities", label:"Communities",            color:"#2D3D20", x:40,  y:310, w:560, collapsed:false },
  { id:"sp-goodstart",label:"GoodStart BeakStreet",   color:"#7a3510", x:40,  y:530, w:260, collapsed:false },
  { id:"sp-gowrie",   label:"Gowrie Victoria",        color:"#7a3510", x:320, y:530, w:260, collapsed:false },
  { id:"sp-strong",   label:"Strong Communities",     color:"#5D7A45", x:600, y:530, w:260, collapsed:false },
  { id:"sp-derby",    label:"Derby (PP)",              color:"#3E90A3", x:880, y:530, w:260, collapsed:false },
];

const INIT_TICKETS = [
  { id:"ci-epic",    group:"ci",           type:"epic",      title:"CI Planning",                status:"not-started" },
  { id:"STO-135",    group:"ci",           type:"story",     title:"CI refinement sprint 1",      status:"not-started" },
  { id:"STO-136",    group:"ci",           type:"story",     title:"CI refinement sprint 2",      status:"not-started" },
  { id:"STO-137",    group:"ci",           type:"story",     title:"CI refinement sprint 3",      status:"not-started" },
  { id:"STO-138",    group:"ci",           type:"story",     title:"CI refinement sprint 4",      status:"not-started" },
  { id:"STO-130",    group:"ci",           type:"story",     title:"Storybook migration",          status:"not-started" },
  { id:"SUP-59",     group:"ci",           type:"bug",       title:"Date format conflict",         status:"new" },
  { id:"com-epic",   group:"communities",  type:"epic",      title:"Community Dashboards",         status:"in-progress" },
  { id:"STO-151",    group:"communities",  type:"story",     title:"Training community dashboard", status:"not-started" },
  { id:"STO-166",    group:"communities",  type:"story",     title:"Derby pilot dashboard",        status:"in-progress" },
  { id:"STO-004",    group:"communities",  type:"story",     title:"Test & learn dashboard",       status:"in-progress" },
  { id:"STO-106",    group:"sp-goodstart", type:"onboarding",title:"GoodStart BeakStreet onboarding", status:"in-progress" },
  { id:"STO-129",    group:"sp-gowrie",    type:"onboarding",title:"Onboard 3 Gowrie VIC centres", status:"not-started" },
  { id:"SUP-83",     group:"sp-gowrie",    type:"bug",       title:"New centres on legend",        status:"new" },
  { id:"STO-132",    group:"sp-gowrie",    type:"bug",       title:"Participation chart mismatch", status:"not-started" },
  { id:"SUP-75",     group:"sp-strong",    type:"bug",       title:"Quality data missing Q4 2025", status:"paused" },
  { id:"STO-166-T1", group:"sp-derby",     type:"story",     title:"T1 — data integration",        status:"in-progress" },
  { id:"STO-166-D1", group:"sp-derby",     type:"story",     title:"D1 — dashboard design",        status:"in-progress" },
  { id:"STO-166-F1", group:"sp-derby",     type:"story",     title:"F1 — frontend build",          status:"not-started" },
];

// ─── Whiteboard ───────────────────────────────────────────────────────────────
function NodeGraph({ tickets: notionTickets = [] }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [groups, setGroups]         = useState(INIT_GROUPS);
  const [tickets, setTickets]       = useState(INIT_TICKETS);
  const [pan, setPan]               = useState({ x: 60, y: 60 });
  const [zoom, setZoom]             = useState(0.82);
  const [selected, setSelected]     = useState(null);           // ticket id
  const [dragTicket, setDragTicket] = useState(null);           // { id, ox, oy }
  const [dragGroup, setDragGroup]   = useState(null);           // { id, ox, oy }
  const [isPanning, setIsPanning]   = useState(false);
  const [panStart, setPanStart]     = useState(null);
  const [moveMenu, setMoveMenu]     = useState(null);           // { ticketId, x, y }
  const [addingToGroup, setAddingToGroup] = useState(null);     // groupId
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketStatus, setNewTicketStatus] = useState("not-started");
  const [dragOverGroup, setDragOverGroup] = useState(null);     // highlight drop target
  const canvasRef = useRef(null);
  // phantom for drag-preview
  const [phantom, setPhantom] = useState(null);                 // { x, y }

  const CARD_W = 210, CARD_H = 50, CARD_GAP = 8, CARD_PAD = 14;
  const HEADER_H = 40;

  // ── Derived ─────────────────────────────────────────────────────────────────
  function ticketsInGroup(gid) { return tickets.filter(t => t.group === gid); }

  function groupHeight(gid, collapsed) {
    if (collapsed) return HEADER_H;
    const n = ticketsInGroup(gid).length;
    if (n === 0) return HEADER_H + CARD_PAD * 2 + 32; // empty state
    return HEADER_H + CARD_PAD + Math.ceil(n / 2) * (CARD_H + CARD_GAP) - CARD_GAP + CARD_PAD;
  }

  // ── Canvas helpers ──────────────────────────────────────────────────────────
  function toCanvas(sx, sy) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (sx - rect.left - pan.x) / zoom, y: (sy - rect.top - pan.y) / zoom };
  }

  // ── Pointer handlers ────────────────────────────────────────────────────────
  function onCanvasDown(e) {
    if (e.button !== 0) return;
    if (e.target === canvasRef.current || e.target.dataset.canvas) {
      setSelected(null);
      setMoveMenu(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }

  function onGroupHeaderDown(e, gid) {
    e.stopPropagation();
    setMoveMenu(null);
    const g = groups.find(g => g.id === gid);
    const cp = toCanvas(e.clientX, e.clientY);
    setDragGroup({ id: gid, ox: cp.x - g.x, oy: cp.y - g.y });
  }

  function onTicketDown(e, tid) {
    e.stopPropagation();
    setSelected(tid);
    setMoveMenu(null);
    const t = tickets.find(t => t.id === tid);
    const g = groups.find(g => g.id === t.group);
    const idx = ticketsInGroup(t.group).indexOf(t);
    const col = idx % 2, row = Math.floor(idx / 2);
    const tx = g.x + CARD_PAD + col * (CARD_W + CARD_GAP);
    const ty = g.y + HEADER_H + CARD_PAD + row * (CARD_H + CARD_GAP);
    const cp = toCanvas(e.clientX, e.clientY);
    setDragTicket({ id: tid, ox: cp.x - tx, oy: cp.y - ty });
  }

  function onMouseMove(e) {
    if (dragGroup) {
      const cp = toCanvas(e.clientX, e.clientY);
      setGroups(gs => gs.map(g => g.id === dragGroup.id
        ? { ...g, x: cp.x - dragGroup.ox, y: cp.y - dragGroup.oy }
        : g
      ));
    } else if (dragTicket) {
      const cp = toCanvas(e.clientX, e.clientY);
      setPhantom({ x: cp.x - dragTicket.ox, y: cp.y - dragTicket.oy });
      // detect which group the phantom centre is over
      const cx = cp.x - dragTicket.ox + CARD_W / 2;
      const cy = cp.y - dragTicket.oy + CARD_H / 2;
      const over = groups.find(g => {
        const h = groupHeight(g.id, g.collapsed);
        return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + h;
      });
      setDragOverGroup(over ? over.id : null);
    } else if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }

  function onMouseUp(e) {
    if (dragTicket && dragOverGroup) {
      const tid = dragTicket.id;
      const dest = dragOverGroup;
      setTickets(ts => ts.map(t => t.id === tid ? { ...t, group: dest } : t));
    }
    setDragTicket(null);
    setDragGroup(null);
    setIsPanning(false);
    setPhantom(null);
    setDragOverGroup(null);
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    setZoom(z => Math.min(2, Math.max(0.25, z * factor)));
  }

  // ── Move menu ────────────────────────────────────────────────────────────────
  function openMoveMenu(e, tid) {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    setMoveMenu({ ticketId: tid, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
  }

  function moveTicket(tid, destGid) {
    setTickets(ts => ts.map(t => t.id === tid ? { ...t, group: destGid } : t));
    setMoveMenu(null);
  }

  function removeTicket(tid) {
    setTickets(ts => ts.filter(t => t.id !== tid));
    setMoveMenu(null);
    if (selected === tid) setSelected(null);
  }

  // ── Add ticket ───────────────────────────────────────────────────────────────
  function submitNewTicket(gid) {
    if (!newTicketTitle.trim()) return;
    const id = `NEW-${Date.now()}`;
    setTickets(ts => [...ts, { id, group: gid, type: "story", title: newTicketTitle.trim(), status: newTicketStatus }]);
    setNewTicketTitle("");
    setNewTicketStatus("not-started");
    setAddingToGroup(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const selectedTicket = tickets.find(t => t.id === selected);

  // Estimate canvas bounding box for background grid sizing
  const boardW = Math.max(1600, ...groups.map(g => g.x + g.w + 120));
  const boardH = Math.max(1200, ...groups.map(g => g.y + groupHeight(g.id, g.collapsed) + 120));

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", position: "relative", background: "#F6F3EE" }}>

      {/* Canvas */}
      <div
        ref={canvasRef}
        data-canvas="1"
        style={{ flex: 1, overflow: "hidden", position: "relative", cursor: isPanning ? "grabbing" : dragGroup ? "grabbing" : "default" }}
        onMouseDown={onCanvasDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Dot-grid background */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <defs>
            <pattern id="dot-grid" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)} width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={0.8} fill="#C8C4BC" opacity={0.5} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Scaled canvas */}
        <div style={{ position: "absolute", transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", width: boardW, height: boardH, userSelect: "none" }}>

          {groups.map(g => {
            const gh = groupHeight(g.id, g.collapsed);
            const gTickets = ticketsInGroup(g.id);
            const isDragOver = dragOverGroup === g.id;
            const isAddingHere = addingToGroup === g.id;

            return (
              <div key={g.id} style={{ position: "absolute", left: g.x, top: g.y, width: g.w, zIndex: dragGroup?.id === g.id ? 100 : 1 }}>

                {/* Group card */}
                <div style={{
                  background: "#fff",
                  border: `2px solid ${isDragOver ? g.color : "#E2DDD6"}`,
                  borderRadius: 14,
                  boxShadow: isDragOver ? `0 0 0 3px ${g.color}33` : "0 2px 8px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  transition: "border-color 0.12s, box-shadow 0.12s",
                  minHeight: gh,
                }}>

                  {/* Header — drag handle */}
                  <div
                    onMouseDown={e => onGroupHeaderDown(e, g.id)}
                    style={{
                      height: HEADER_H, background: g.color, display: "flex", alignItems: "center",
                      justifyContent: "space-between", padding: "0 14px", cursor: "grab", borderRadius: "12px 12px 0 0",
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.label}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{gTickets.length}</span>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setGroups(gs => gs.map(x => x.id === g.id ? { ...x, collapsed: !x.collapsed } : x)); }}
                        style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 5, color: "#fff", fontSize: 11, width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >{g.collapsed ? "▼" : "▲"}</button>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setAddingToGroup(isAddingHere ? null : g.id); setNewTicketTitle(""); }}
                        style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 5, color: "#fff", fontSize: 14, width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >+</button>
                    </div>
                  </div>

                  {/* Body */}
                  {!g.collapsed && (
                    <div style={{ padding: CARD_PAD, display: "grid", gridTemplateColumns: `1fr 1fr`, gap: CARD_GAP, minHeight: 60 }}>

                      {gTickets.map(t => {
                        const s = STATUS_NODE[t.status] || STATUS_NODE["not-started"];
                        const isEpic = t.type === "epic";
                        const isSel = selected === t.id;
                        const isDragging = dragTicket?.id === t.id;

                        return (
                          <div
                            key={t.id}
                            onMouseDown={e => onTicketDown(e, t.id)}
                            style={{
                              background: isEpic ? "#1D4552" : isSel ? s.border : s.bg,
                              border: `${isSel ? 2 : 1.5}px solid ${isEpic ? "#1D4552" : s.border}`,
                              borderRadius: 8, padding: "7px 9px", cursor: "grab",
                              boxShadow: isSel ? `0 2px 8px ${s.border}44` : "0 1px 2px rgba(0,0,0,0.05)",
                              height: CARD_H, display: "flex", flexDirection: "column", justifyContent: "center",
                              opacity: isDragging ? 0.35 : 1,
                              transition: "opacity 0.1s",
                              position: "relative",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              {isEpic
                                ? <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", padding: "1px 5px", borderRadius: 3 }}>EPIC</span>
                                : <div style={{ width: 6, height: 6, borderRadius: "50%", background: isSel ? "#fff" : s.dot, flexShrink: 0 }} />
                              }
                            </div>
                            <div style={{ fontSize: 10.5, fontWeight: 500, lineHeight: 1.35, color: isEpic ? "#fff" : isSel ? "#fff" : s.text, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.title}</div>
                            <div style={{ fontSize: 9, color: isEpic ? "rgba(255,255,255,0.45)" : isSel ? "rgba(255,255,255,0.55)" : "#999", marginTop: 1, fontFamily: "monospace" }}>{t.id}</div>

                            {/* Hover more-menu button */}
                            <button
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => openMoveMenu(e, t.id)}
                              style={{
                                position: "absolute", top: 4, right: 4,
                                background: "rgba(0,0,0,0.08)", border: "none", borderRadius: 4,
                                color: isEpic ? "#fff" : s.text, fontSize: 12, width: 18, height: 18,
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: isSel ? 1 : 0,
                                transition: "opacity 0.1s",
                              }}
                              className="ticket-menu-btn"
                            >⋯</button>
                          </div>
                        );
                      })}

                      {gTickets.length === 0 && !isAddingHere && (
                        <div style={{ gridColumn: "1/-1", color: "#ccc", fontSize: 11, textAlign: "center", padding: "12px 0", fontStyle: "italic" }}>
                          Drop tickets here or use + to add
                        </div>
                      )}

                      {/* Inline add form */}
                      {isAddingHere && (
                        <div style={{ gridColumn: "1/-1", background: "#F6F3EE", borderRadius: 8, padding: 10, border: `1px dashed ${g.color}` }} onMouseDown={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={newTicketTitle}
                            onChange={e => setNewTicketTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") submitNewTicket(g.id); if (e.key === "Escape") setAddingToGroup(null); }}
                            placeholder="Ticket title…"
                            style={{ width: "100%", background: "#fff", color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 9px", fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 6 }}
                          />
                          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                            <select value={newTicketStatus} onChange={e => setNewTicketStatus(e.target.value)} style={{ flex: 1, fontSize: 10, background: "#fff", color: C.navy, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 6px", fontFamily: "inherit", outline: "none" }}>
                              {Object.entries(STATUS_NODE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <button onClick={() => submitNewTicket(g.id)} style={{ background: g.color, color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Add</button>
                            <button onClick={() => setAddingToGroup(null)} style={{ background: "#fff", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 8px", fontSize: 10, cursor: "pointer" }}>×</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Phantom drag preview */}
          {phantom && dragTicket && (() => {
            const t = tickets.find(t => t.id === dragTicket.id);
            if (!t) return null;
            const s = STATUS_NODE[t.status] || STATUS_NODE["not-started"];
            return (
              <div style={{
                position: "absolute", left: phantom.x, top: phantom.y, width: CARD_W, height: CARD_H,
                background: t.type === "epic" ? "#1D4552" : s.bg, border: `2px solid ${t.type === "epic" ? "#1D4552" : s.border}`,
                borderRadius: 8, padding: "7px 9px", opacity: 0.85, pointerEvents: "none", zIndex: 999,
                boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
              }}>
                <div style={{ fontSize: 10.5, fontWeight: 500, color: t.type === "epic" ? "#fff" : s.text, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.title}</div>
                <div style={{ fontSize: 9, color: t.type === "epic" ? "rgba(255,255,255,0.5)" : "#999", fontFamily: "monospace", marginTop: 2 }}>{t.id}</div>
              </div>
            );
          })()}

        </div>

        {/* Move context menu */}
        {moveMenu && (
          <div
            style={{ position: "absolute", left: moveMenu.x, top: moveMenu.y, zIndex: 999, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", padding: "6px 0", minWidth: 180 }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, padding: "4px 14px 6px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Move to group</div>
            {groups.map(g => (
              <button key={g.id} onClick={() => moveTicket(moveMenu.ticketId, g.id)} style={{
                display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none",
                padding: "7px 14px", fontSize: 12, color: C.navy, cursor: "pointer", fontFamily: "inherit",
              }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgSubtle}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: g.color, marginRight: 8, verticalAlign: "middle" }} />
                {g.label}
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "4px 0" }} />
            <button onClick={() => removeTicket(moveMenu.ticketId)} style={{
              display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none",
              padding: "7px 14px", fontSize: 12, color: C.red, cursor: "pointer", fontFamily: "inherit",
            }}
              onMouseEnter={e => e.currentTarget.style.background = C.redDim}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >Remove ticket</button>
          </div>
        )}

      </div>

      {/* Zoom controls + legend */}
      <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Status</div>
          {Object.entries(STATUS_NODE).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: C.textMuted }}>{v.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["+", () => setZoom(z => Math.min(2, z + 0.12))],
            ["−", () => setZoom(z => Math.max(0.25, z - 0.12))],
            ["⟳", () => { setZoom(0.82); setPan({ x: 60, y: 60 }); }],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ width: 30, height: 30, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, cursor: "pointer", color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 20, fontSize: 10, color: C.textDim, background: "rgba(255,255,255,0.8)", padding: "5px 10px", borderRadius: 7 }}>
        Drag groups · drag tickets between groups · scroll to zoom · click ticket for options
      </div>

      {/* Selected ticket side panel */}
      {selectedTicket && (() => {
        const s = STATUS_NODE[selectedTicket.status] || STATUS_NODE["not-started"];
        const g = groups.find(x => x.id === selectedTicket.group);
        return (
          <div style={{ width: 272, background: "#fff", borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, zIndex: 30, boxShadow: "-2px 0 12px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, background: g?.color ?? C.navy }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.12)", padding: "2px 7px", borderRadius: 4 }}>{selectedTicket.id}</span>
                <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{selectedTicket.title}</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Status</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {Object.entries(STATUS_NODE).map(([k, v]) => (
                    <button key={k} onClick={() => setTickets(ts => ts.map(t => t.id === selectedTicket.id ? { ...t, status: k } : t))} style={{
                      fontSize: 10, padding: "3px 9px", borderRadius: 20, cursor: "pointer", fontWeight: 500,
                      background: selectedTicket.status === k ? v.border : C.bgSubtle,
                      color: selectedTicket.status === k ? "#fff" : C.textMuted,
                      border: `1px solid ${selectedTicket.status === k ? v.border : C.border}`,
                    }}>{v.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Group</div>
                <select value={selectedTicket.group} onChange={e => setTickets(ts => ts.map(t => t.id === selectedTicket.id ? { ...t, group: e.target.value } : t))}
                  style={{ width: "100%", background: C.bgSubtle, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 8px", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
              <button onClick={() => removeTicket(selectedTicket.id)} style={{ width: "100%", background: C.redDim, color: C.red, border: `1px solid ${C.red}33`, borderRadius: 7, padding: "8px", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>Remove ticket</button>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// ─── Work Tracker ─────────────────────────────────────────────────────────────
function WorkTracker({ onNewRequest, onOpenRequest }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | stale | priority
  const [viewMode, setViewMode] = useState("list"); // list | graph
  const [tickets, setTickets] = useState(SAMPLE_TICKETS);
  const [notionStatus, setNotionStatus] = useState("idle"); // idle | loading | live | error
  const [poRequests, setPoRequests] = useState(() => getRequests());

  useEffect(() => {
    setNotionStatus("loading");
    fetchTickets()
      .then(data => {
        if (data) { setTickets(data); setNotionStatus("live"); }
        else setNotionStatus("idle");
      })
      .catch(err => { console.error("Notion fetch failed:", err); setNotionStatus("error"); });
  }, []);

  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const filteredTickets = tickets
    .filter(t =>
      filter === "all"        ? true :
      filter === "needs-info" ? (t.status === "new" || t.age > 30) :
      filter === "blocked"    ? t.status === "blocked" :
      t.type === filter
    )
    .sort((a, b) =>
      sortBy === "newest"   ? a.age - b.age :
      sortBy === "oldest"   ? b.age - a.age :
      sortBy === "stale"    ? b.age - a.age :
      sortBy === "priority" ? (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) :
      0
    );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Page header */}
      <div style={{ background: C.bgPanel, borderBottom: `1px solid ${C.border}`, padding: "20px 32px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ color: C.textDim, fontSize: 12 }}>RSTO</span>
              <span style={{ color: C.border, fontSize: 12 }}>·</span>
              <span style={{ color: C.textDim, fontSize: 12 }}>Delivery pipeline</span>
              {notionStatus === "loading" && (
                <span style={{ fontSize: 11, color: C.textDim, padding: "2px 8px", borderRadius: 4, background: C.bgSubtle, border: `1px solid ${C.border}` }}>Syncing Notion...</span>
              )}
              {notionStatus === "live" && (
                <span style={{ fontSize: 11, color: C.green, padding: "2px 8px", borderRadius: 4, background: C.greenDim, border: `1px solid ${C.green}44` }}>Live from Notion</span>
              )}
              {notionStatus === "error" && (
                <span style={{ fontSize: 11, color: C.amber, padding: "2px 8px", borderRadius: 4, background: C.amberDim, border: `1px solid ${C.amberBorder}` }}>Notion unavailable — showing cached data</span>
              )}
            </div>
            <h1 style={{ color: C.navy, fontSize: 26, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Work tracker</h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* View toggle */}
            <div style={{ display: "flex", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
              {[
                { id: "list", icon: "☰", label: "List" },
                { id: "graph", icon: "⬡", label: "Graph" },
              ].map(({ id, icon, label }) => (
                <button key={id} onClick={() => setViewMode(id)} style={{
                  background: viewMode === id ? C.bgCard : "transparent",
                  color: viewMode === id ? C.navy : C.textMuted,
                  border: `1px solid ${viewMode === id ? C.border : "transparent"}`,
                  borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer",
                  fontWeight: viewMode === id ? 600 : 400, display: "flex", alignItems: "center", gap: 5,
                  boxShadow: viewMode === id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s"
                }}>
                  <span style={{ fontSize: 13 }}>{icon}</span> {label}
                </button>
              ))}
            </div>
            <button onClick={onNewRequest} style={{
              background: C.brand, color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: `0 1px 3px ${C.brand}44`,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              New request
            </button>
          </div>
        </div>
      </div>

      {viewMode === "graph" ? (
        <NodeGraph tickets={tickets} />
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {/* Health summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "In progress", val: tickets.filter(t => t.status === "in-progress").length, color: C.teal },
              { label: "Needs info", val: tickets.filter(t => t.status === "new" || t.age > 30).length, color: C.brand },
              { label: "Not started", val: tickets.filter(t => t.status === "not-started").length, color: C.textMuted },
              { label: "Critical priority", val: tickets.filter(t => t.priority === "critical").length, color: C.red },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", borderTop: `3px solid ${color}` }}>
                <div style={{ color, fontSize: 28, fontWeight: 700, lineHeight: 1, fontFamily: "'Playfair Display', Georgia, serif" }}>{val}</div>
                <div style={{ color: C.textMuted, fontSize: 12, marginTop: 5, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Filter + sort row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: C.textDim, fontSize: 12, marginRight: 4 }}>Show:</span>
              {["all", "needs-info", "onboarding", "bug", "feature"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: filter === f ? C.brand : C.bgCard, color: filter === f ? "#fff" : C.textMuted,
                  border: `1px solid ${filter === f ? C.brand : C.border}`, borderRadius: 20,
                  padding: "4px 14px", fontSize: 12, cursor: "pointer", fontWeight: filter === f ? 600 : 400, transition: "all 0.15s",
                }}>{f === "needs-info" ? "⚠ needs info" : f}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: C.textDim, fontSize: 12, marginRight: 2 }}>Sort:</span>
              {[
                { val: "newest",   label: "Newest" },
                { val: "oldest",   label: "Oldest" },
                { val: "stale",    label: "Most stale" },
                { val: "priority", label: "Priority" },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setSortBy(val)} style={{
                  background: sortBy === val ? C.bgSubtle : "transparent",
                  color: sortBy === val ? C.navy : C.textMuted,
                  border: `1px solid ${sortBy === val ? C.borderMed : "transparent"}`,
                  borderRadius: 6, padding: "4px 10px", fontSize: 12,
                  cursor: "pointer", fontWeight: sortBy === val ? 600 : 400, transition: "all 0.15s",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredTickets.map(ticket => (
              <div key={ticket.id} style={{
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = C.borderMed; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = C.border; }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{typeIcon(ticket.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <PriorityDot priority={ticket.priority} />
                    <span style={{ color: C.textDim, fontSize: 11, fontFamily: "monospace", background: C.bgSubtle, padding: "1px 6px", borderRadius: 3 }}>{ticket.id}</span>
                    <span style={{ color: C.navy, fontSize: 13, fontWeight: 500 }}>{ticket.title}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {ticket.strategy && <span style={{ color: C.tealDark, fontSize: 11, background: C.tealDim, padding: "2px 7px", borderRadius: 4, fontWeight: 500 }}>{ticket.strategy}</span>}
                    {ticket.sp && <span style={{ color: C.textMuted, fontSize: 11 }}>{ticket.sp}</span>}
                    {ticket.subtasks.length > 0 && <span style={{ color: C.docColor, fontSize: 11 }}>{ticket.subtasks.length} sub-tasks</span>}
                    {ticket.age > 30 && <span style={{ color: C.amber, fontSize: 11, fontWeight: 500 }}>⚠ {ticket.age}d stale</span>}
                  </div>
                </div>
                <StatusPill status={ticket.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Parse agent questions into structured format ─────────────────────────────
function parseQuestions(text) {
  // Detect the questions block
  if (!text.includes("Questions to clarify")) return null;
  const lines = text.split("\n");
  const questions = [];
  let current = null;
  for (const line of lines) {
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      if (current) questions.push(current);
      current = { question: numMatch[2].trim(), why: "" };
    } else if (line.trim().startsWith("Why this matters:") && current) {
      current.why = line.replace("Why this matters:", "").trim();
    }
  }
  if (current) questions.push(current);
  return questions.length ? questions : null;
}

// Strip markdown bold/italic asterisks from text
function stripMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

function renderMarkdown(text) {
  // Render ## headings, - list items, **bold**, blank-line paragraphs
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^## (.+)/.test(line)) {
      elements.push(
        <div key={i} style={{ color: C.navy, fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginTop: elements.length ? 14 : 0, marginBottom: 4 }}>
          {line.replace(/^## /, "")}
        </div>
      );
    } else if (/^- (.+)/.test(line)) {
      elements.push(
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3, paddingLeft: 2 }}>
          <span style={{ color: C.textDim, flexShrink: 0, marginTop: 1 }}>·</span>
          <span>{renderInline(line.replace(/^- /, ""))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      if (elements.length) elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(<div key={i} style={{ marginBottom: 2 }}>{renderInline(line)}</div>);
    }
    i++;
  }
  return elements;
}

function renderInline(text) {
  // **bold** and *italic* inline
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// ─── Answerable clarification questions ──────────────────────────────────────
function AnswerableQuestions({ questions, onSubmitAnswers }) {
  const [answers, setAnswers] = useState(() => questions.map(() => ""));
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every(a => a.trim().length > 0);

  function handleSubmit() {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    onSubmitAnswers(questions, answers);
  }

  if (submitted) {
    return (
      <div style={{ width: "100%", background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ color: C.tealDark, fontSize: 12, fontWeight: 500 }}>✓ Answers submitted — updating understanding...</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 2 }}>
        Clarifications needed
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questions.map((q, i) => (
          <div key={i} style={{
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${answers[i].trim() ? C.teal : C.brand}`,
            borderRadius: "0 8px 8px 0",
            padding: "12px 14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            transition: "border-left-color 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <span style={{
                color: answers[i].trim() ? C.teal : C.brand,
                fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                background: answers[i].trim() ? C.tealDim : C.brandDim,
                padding: "2px 7px", borderRadius: 4,
                flexShrink: 0, marginTop: 1,
                transition: "all 0.2s",
              }}>Q{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.navy, fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{q.question}</div>
                {q.why && (
                  <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>
                    Why this matters: {q.why}
                  </div>
                )}
              </div>
            </div>
            <textarea
              value={answers[i]}
              onChange={e => setAnswers(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
              placeholder="Your answer..."
              rows={2}
              style={{
                width: "100%", background: C.bgSubtle, color: C.navy,
                border: `1px solid ${answers[i].trim() ? C.tealBorder : C.border}`,
                borderRadius: 6, padding: "8px 10px", fontSize: 12,
                fontFamily: "inherit", resize: "vertical", outline: "none",
                boxSizing: "border-box", lineHeight: 1.5,
                transition: "border-color 0.2s",
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          style={{
            background: allAnswered ? C.brand : C.bgSubtle,
            color: allAnswered ? "#fff" : C.textDim,
            border: `1px solid ${allAnswered ? C.brand : C.border}`,
            borderRadius: 7, padding: "8px 18px", fontWeight: 600,
            fontSize: 13, cursor: allAnswered ? "pointer" : "default",
            transition: "all 0.2s",
          }}
        >
          Submit all answers
        </button>
        <span style={{ color: C.textDim, fontSize: 12 }}>
          {answers.filter(a => a.trim()).length}/{questions.length} answered
        </span>
      </div>
    </div>
  );
}


function Message({ role, content, gate1Content, gate1Ready, onProceed, onApprove, onRevise, revisionInput, setRevisionInput, isRevising, isDoc, docName, onSubmitAnswers }) {
  const isAgent = role === "agent";

  if (isDoc) {
    return (
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: C.docDim, border: `1px solid ${C.docColor}44`,
          borderRadius: "12px 4px 12px 12px", padding: "10px 14px",
        }}>
          <div style={{ width: 32, height: 32, background: C.docDim, border: `1px solid ${C.docColor}55`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="1" width="10" height="13" rx="1.5" stroke={C.docColor} strokeWidth="1.2" fill="none"/>
              <path d="M5 5h6M5 7.5h6M5 10h4" stroke={C.docColor} strokeWidth="1" strokeLinecap="round"/>
              <path d="M10 1v3.5H13" stroke={C.docColor} strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{docName}</div>
            <div style={{ color: C.textDim, fontSize: 11 }}>Feature request form · .docx</div>
          </div>
        </div>
      </div>
    );
  }

  // For agent messages, check if there's a questions block to render as cards
  const cleanContent = stripMarkdown(content);
  const questions = isAgent ? parseQuestions(cleanContent) : null;

  // Split content around the questions block for rendering
  const beforeQuestions = questions
    ? cleanContent.split("Questions to clarify")[0].trim()
    : cleanContent;
  return (
    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: isAgent ? "flex-start" : "flex-end", maxWidth: isAgent ? "90%" : "85%" }}>
      {isAgent && (
        <div style={{ color: C.textDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, paddingLeft: 2 }}>Intake agent</div>
      )}

      {/* Main text bubble */}
      {(beforeQuestions || !questions) && (
        <div style={{
          background: isAgent ? C.bgCard : C.brandDim,
          border: `1px solid ${isAgent ? C.border : C.brandBorder}`,
          borderRadius: isAgent ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
          padding: "12px 16px", color: C.navy, fontSize: 13, lineHeight: 1.7,
          boxShadow: isAgent ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          marginBottom: questions ? 10 : 0,
          maxWidth: "100%",
        }}>
          {isAgent ? renderMarkdown(beforeQuestions || cleanContent) : (beforeQuestions || cleanContent)}
        </div>
      )}

      {/* Questions as answerable inline cards */}
      {questions && (
        <AnswerableQuestions questions={questions} onSubmitAnswers={onSubmitAnswers} />
      )}

      {gate1Content && (
        <div style={{ width: "100%" }}>
          <Gate1Panel
            content={gate1Content}
            onApprove={onApprove}
            onRevise={onRevise}
            revisionInput={revisionInput}
            setRevisionInput={setRevisionInput}
            isRevising={isRevising}
          />
        </div>
      )}

      {/* Gate 1 ready — show proceed prompt instead of inline summary */}
      {gate1Ready && (
        <div style={{
          marginTop: 10, background: C.tealDim, border: `1px solid ${C.tealBorder}`,
          borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div>
            <div style={{ color: C.tealDark, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Ready for Gate 1 review</div>
            <div style={{ color: C.tealDark, fontSize: 12, opacity: 0.8 }}>I have enough information. Review the summary and decide whether to proceed.</div>
          </div>
          <button
            onClick={onProceed}
            style={{
              background: C.teal, color: "#fff", border: "none", borderRadius: 8,
              padding: "9px 18px", fontWeight: 600, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
              boxShadow: `0 1px 4px ${C.teal}44`, flexShrink: 0,
            }}
          >
            Proceed to Gate 1
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Intake view ──────────────────────────────────────────────────────────────
function IntakeView({ initialSnapshot, onSnapshot, onGate1Ready, readOnly }) {
  const snap = initialSnapshot || {};
  const [messages, setMessages] = useState(snap.messages || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [gate1Content, setGate1Content] = useState(snap.gate1Content || null);
  const [gate1Ready, setGate1Ready] = useState(snap.gate1Ready || false);
  const [conversationHistory, setConversationHistory] = useState(snap.conversationHistory || []);
  const [started, setStarted] = useState(snap.started || false);
  const [uploadedDoc, setUploadedDoc] = useState(snap.uploadedDocName ? { name: snap.uploadedDocName } : null);
  const [uploadError, setUploadError] = useState(null);
  const [parsingDoc, setParsingDoc] = useState(false);
  const [checklistStatus, setChecklistStatus] = useState(snap.checklistStatus || null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Persist snapshot to parent whenever key state changes
  useEffect(() => {
    if (!started) return;
    onSnapshot?.({
      messages,
      conversationHistory,
      gate1Content,
      gate1Ready,
      started,
      uploadedDocName: uploadedDoc?.name || null,
      checklistStatus,
      checklistLoading,
    });
  }, [messages, conversationHistory, gate1Content, gate1Ready, started, checklistStatus]);

  function handleProceedToGate1() {
    if (gate1Content) onGate1Ready?.(gate1Content);
  }

  async function runClassification(requestText) {
    setChecklistLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2500,
          system: CLASSIFICATION_SYSTEM,
          messages: [{ role: "user", content: `Classify and audit this request:\n\n${requestText.slice(0, 4000)}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(clean); }
      catch { const m = clean.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error("parse"); }
      setChecklistStatus(parsed);
    } catch {
      // fail silently — classification is a bonus, not blocking
    }
    setChecklistLoading(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      setUploadError("Only .docx files are supported right now.");
      return;
    }
    setUploadError(null);
    setParsingDoc(true);
    try {
      // Load mammoth as UMD from cdnjs if not already loaded
      if (!window.mammoth) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Could not load mammoth library"));
          document.head.appendChild(script);
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      const text = result.value.trim();
      if (!text) throw new Error("Could not extract text from document.");
      setUploadedDoc({ name: file.name, text });
      await processWithDoc(file.name, text);
    } catch (err) {
      setUploadError("Failed to read document: " + err.message);
    }
    setParsingDoc(false);
    e.target.value = "";
  }

  async function processWithDoc(fileName, docText) {
    setStarted(true);
    setMessages(m => [...m, {
      role: "user",
      content: `Attached: ${fileName}`,
      isDoc: true,
      docName: fileName,
    }]);
    setLoading(true);
    // Run classification in parallel (fire and forget)
    runClassification(`Document: ${fileName}\n\n${docText}`);
    const prompt = `The user has uploaded a Feature Request Form document called "${fileName}". Here is the full text:\n\n---\n${docText}\n---\n\nPlease read this document carefully, extract everything that is present, identify what critical information is still missing or ambiguous, and ask clarifying questions about the gaps. Do NOT produce the Gate 1 summary yet — always ask at least one round of clarifying questions first, even if the document appears complete. There is always something to verify or confirm. Do not ask for information already present in the document.`;
    try {
      const reply = await callAgent(prompt);
      const gate1 = parseGate1(reply);
      if (gate1) {
        setGate1Content(gate1);
        setGate1Ready(true);
        setMessages(m => [...m, { role: "agent", content: reply, gate1Ready: true }]);
      } else {
        setMessages(m => [...m, { role: "agent", content: reply }]);
      }
    } catch {
      setMessages(m => [...m, { role: "agent", content: "I had trouble reading the document. Please try again." }]);
    }
    setLoading(false);
  }

  async function callAgent(userMessage, systemOverride = null) {
    const newHistory = [...conversationHistory, { role: "user", content: userMessage }];
    setConversationHistory(newHistory);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemOverride || INTAKE_SYSTEM,
        messages: newHistory,
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(`API error: ${data.error.type} — ${data.error.message}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.message || "Unknown error"}`);
    const reply = data.content?.[0]?.text || "Sorry, something went wrong.";
    const updatedHistory = [...newHistory, { role: "assistant", content: reply }];
    setConversationHistory(updatedHistory);
    return reply;
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setStarted(true);
    setMessages(m => [...m, { role: "user", content: userText }]);
    setLoading(true);
    // On first typed message, classify the request in parallel
    if (conversationHistory.length === 0) runClassification(userText);
    try {
      const reply = await callAgent(userText);
      const gate1 = parseGate1(reply);
      if (gate1) {
        setGate1Content(gate1);
        setGate1Ready(true);
        setMessages(m => [...m, { role: "agent", content: reply, gate1Ready: true }]);
      } else {
        setMessages(m => [...m, { role: "agent", content: reply || "Here's my understanding:" }]);
      }
    } catch {
      setMessages(m => [...m, { role: "agent", content: "I had trouble connecting. Please try again." }]);
    }
    setLoading(false);
  }

  async function handleSubmitAnswers(questions, answers) {
    // Build a single message with all Q&A pairs
    const qaPairs = questions.map((q, i) =>
      `Q${i + 1}: ${q.question}\nAnswer: ${answers[i].trim()}`
    ).join("\n\n");
    const userText = `Here are the answers to your clarifying questions:\n\n${qaPairs}`;
    setStarted(true);
    setMessages(m => [...m, { role: "user", content: userText }]);
    setLoading(true);
    // Re-run classification with full conversation so the checklist panel updates
    const fullCtx = [...conversationHistory.map(m => m.content), userText].join("\n\n");
    runClassification(fullCtx);
    try {
      const reply = await callAgent(userText);
      const gate1 = parseGate1(reply);
      if (gate1) {
        setGate1Content(gate1);
        setGate1Ready(true);
        setMessages(m => [...m, { role: "agent", content: reply, gate1Ready: true }]);
      } else {
        setMessages(m => [...m, { role: "agent", content: reply || "Here's my updated understanding:" }]);
      }
    } catch {
      setMessages(m => [...m, { role: "agent", content: "I had trouble processing the answers. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 32px 16px", borderBottom: `1px solid ${C.border}`, background: C.bgPanel }}>
        <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Intake agent</div>
        <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Describe the request</h1>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: C.bg }}>
        {!started && (
          <div style={{ maxWidth: 500 }}>
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Describe the request from RSTO in your own words, or attach their feature request form directly — the agent will read the document and ask only about what's genuinely missing.
            </div>
            {/* Upload drop zone when not started */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                background: C.bgCard, transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.background = C.brandDim; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}
            >
              <div style={{ width: 40, height: 40, background: C.bgHover, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="2" width="11" height="15" rx="2" stroke={C.textMuted} strokeWidth="1.2" fill="none"/>
                  <path d="M7 7h6M7 10h6M7 13h4" stroke={C.textMuted} strokeWidth="1" strokeLinecap="round"/>
                  <path d="M11 2v4h4" stroke={C.textMuted} strokeWidth="1" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>Attach feature request form</div>
                <div style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>.docx files — the agent will read and extract automatically</div>
              </div>
            </div>
            {uploadError && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{uploadError}</div>}
            {parsingDoc && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, color: C.textMuted, fontSize: 12 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.docColor, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                </div>
                Reading document...
              </div>
            )}
          </div>
        )}

        {/* Uploaded doc banner — shows after upload while conversation continues */}
        {uploadedDoc && started && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.docDim, border: `1px solid ${C.docColor}33`, borderRadius: 7, marginBottom: 16 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="1" width="10" height="13" rx="1.5" stroke={C.docColor} strokeWidth="1.2" fill="none"/>
              <path d="M5 5h6M5 7.5h4" stroke={C.docColor} strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span style={{ color: C.docColor, fontSize: 12 }}>{uploadedDoc.name}</span>
            <span style={{ color: C.textDim, fontSize: 11 }}>· document in context</span>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLastAgentMsg = msg.role === "agent" && i === messages.reduceRight((acc, m, j) => acc === -1 && m.role === "agent" ? j : acc, -1);
          const isReadyMsg = msg.gate1Ready === true;
          return (
            <Message
              key={i}
              role={msg.role}
              content={isReadyMsg ? "I have everything I need to complete the Gate 1 summary." : msg.content}
              isDoc={msg.isDoc}
              docName={msg.docName}
              gate1Ready={isReadyMsg && !readOnly}
              onProceed={handleProceedToGate1}
              onSubmitAnswers={isLastAgentMsg && !loading && !isReadyMsg ? handleSubmitAnswers : null}
            />
          );
        })}
        {loading && (
          <div style={{ display: "flex", gap: 5, padding: "8px 2px" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%", background: C.brand,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
              }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
        </div>{/* end scrollable chat */}
      </div>{/* end two-column flex row */}

      {/* Submit to Gate 1 sticky bar removed — auto-advances on summary generation */}
      {!readOnly && (
        <div style={{ padding: "14px 32px 20px", borderTop: `1px solid ${C.border}`, background: C.bgPanel }}>
          <input ref={fileInputRef} type="file" accept=".docx" onChange={handleFileUpload} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || parsingDoc}
              title="Attach .docx feature request form"
              style={{
                background: C.bgSubtle, color: C.textMuted, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "0 12px", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: loading || parsingDoc ? 0.5 : 1, transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.docColor; e.currentTarget.style.color = C.docColor; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="1" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                <path d="M4 5h6M4 7.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                <path d="M9 1v3.5H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </button>
            <textarea
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={uploadedDoc ? "Ask a follow-up or add context..." : "Describe the RSTO request..."}
              disabled={loading || parsingDoc} rows={2}
              style={{
                flex: 1, background: C.bgSubtle, color: C.navy,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 14px", fontSize: 13, lineHeight: 1.5,
                resize: "none", fontFamily: "inherit", outline: "none",
              }}
            />
            <button onClick={sendMessage} disabled={loading || parsingDoc || !input.trim()} style={{
              background: loading || parsingDoc || !input.trim() ? C.bgSubtle : C.brand,
              color: loading || parsingDoc || !input.trim() ? C.textDim : "#fff",
              border: `1px solid ${loading || parsingDoc || !input.trim() ? C.border : C.brand}`,
              borderRadius: 8, padding: "0 20px", fontWeight: 600, fontSize: 13,
              cursor: loading || parsingDoc || !input.trim() ? "default" : "pointer",
              transition: "all 0.15s", flexShrink: 0,
            }}>Send</button>
          </div>
          <div style={{ color: C.textDim, fontSize: 11, marginTop: 6 }}>
            Enter to send · Shift+Enter for new line ·
            <span style={{ color: C.docColor }}> doc icon to attach .docx</span>
          </div>
          {uploadError && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{uploadError}</div>}
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ─── Read repo files via Anthropic API + Filesystem MCP ──────────────────────
async function readRepoFiles(filePaths, strategy) {
  // Ask Claude to read the relevant files using the filesystem MCP
  // This works because the Anthropic API supports MCP servers
  try {
    const pathsToRead = filePaths.map(p =>
      p.startsWith("/") ? p : `${CONTEXT_REPO}/${p}`
    );

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: `You are a file reader. Read the files at the given paths using the filesystem tool. For each file that exists, return its content. For directories, list their contents and read the most relevant .md files (max 3 per directory). Return a JSON array: [{"path": "...", "content": "..."}]. Return ONLY valid JSON, no other text.`,
        messages: [{
          role: "user",
          content: `Read these paths from the rsto-context repo and return their contents as JSON:\n${pathsToRead.join("\n")}\n\nFor directories, read the .md files inside. Focus on indicator specs, feature docs, and partner/SP documentation relevant to strategy: ${strategy || "general"}.`
        }],
        mcp_servers: [{
          type: "url",
          url: "https://mcp.filesystem.claude.com/mcp",
          name: "filesystem"
        }]
      })
    });

    const data = await res.json();
    // Extract text blocks from potentially mixed content
    const textContent = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const clean = textContent.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.filter(f => f.content && f.content.length > 50);
    }
    return [];
  } catch {
    // Filesystem MCP not available in this context — fall back gracefully
    return [];
  }
}

// ─── Gate 2 — requirements agent with real repo context ────────────────────────
function Gate2View({ gate1Summary, onGate2Approved, onReqDocGenerated, preloadedReqDoc }) {
  const [reqDoc, setReqDoc] = useState(preloadedReqDoc || null);
  const [contextData, setContextData] = useState(null);
  const [loading, setLoading] = useState(!preloadedReqDoc);
  const [loadingStage, setLoadingStage] = useState("reading");
  const [error, setError] = useState(null);
  const [runCount, setRunCount] = useState(0);
  const [approved, setApproved] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!loading) return;
    async function run() {
      try {
        const summaryLower = gate1Summary.toLowerCase();
        const isDesignTask = summaryLower.includes("figma") || summaryLower.includes("mockup") || summaryLower.includes("wireframe") || summaryLower.includes("visual spec") || summaryLower.includes("design task") || summaryLower.includes("dashboard design") || summaryLower.includes("design the") || summaryLower.includes("designing");

        let repoContext = [];

        if (!isDesignTask) {
          // ── Stage 1: Detect request type and read relevant repo files ──────────
          setLoadingStage("reading");
          const isPP = summaryLower.includes("pp") || summaryLower.includes("parenting program") || summaryLower.includes("supported playgroup");
          const isECEC = summaryLower.includes("ecec") || summaryLower.includes("early childhood");
          const isANC = summaryLower.includes("anc") || summaryLower.includes("antenatal");
          const isOnboarding = summaryLower.includes("onboard") || summaryLower.includes("service provider");
          const strategy = isPP ? "pp" : isECEC ? "ecec" : isANC ? "anc" : null;
          const filesToRead = [];
          if (strategy) {
            filesToRead.push(...(CONTEXT_FILE_MAP.indicators[strategy] || []));
            filesToRead.push(...(CONTEXT_FILE_MAP.partners[strategy] || []));
          }
          if (isOnboarding) filesToRead.push(...CONTEXT_FILE_MAP.onboarding);
          filesToRead.push(...CONTEXT_FILE_MAP.features);
          repoContext = await readRepoFiles(filesToRead, strategy);
          setContextData(repoContext);
        }

        // ── Stage 2: Run requirements agent ───────────────────────────────────
        setLoadingStage("analysing");
        const userContent = [
          `Generate the requirement document for this Gate 1 approved summary:\n\n${gate1Summary}`,
          isDesignTask
            ? "\n\nNote: This is a DESIGN TASK — no repository context is needed. The designer (PALO) will execute this in Figma. Do not generate a dataSpecification. Focus the output on deliverable scope, acceptance criteria, and open decisions about the design itself."
            : repoContext.length > 0
              ? `\n\nThe following files from rsto-context are relevant to this request:\n\n${repoContext.map(f => `### ${f.path}\n${f.content}`).join("\n\n")}`
              : "\n\nNote: No matching repo context files were found for this request type."
        ].join("");

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            system: REQUIREMENTS_SYSTEM,
            messages: [{ role: "user", content: userContent }]
          })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        const clean = text.replace(/```json|```/g, "").trim();
        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch {
          const match = clean.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
          else throw new Error("Could not parse JSON from response");
        }
        parsed._repoFilesRead = repoContext.map(f => f.path);
        setReqDoc(parsed);
        onReqDocGenerated?.(parsed);
      } catch (e) {
        setError("Failed to generate requirement document. " + e.message);
      }
      setLoading(false);
    }
    run();
  }, [gate1Summary, runCount]);

  const summaryLowerCheck = gate1Summary?.toLowerCase() || "";
  const isDesignTaskView = summaryLowerCheck.includes("figma") || summaryLowerCheck.includes("mockup") || summaryLowerCheck.includes("wireframe") || summaryLowerCheck.includes("visual spec") || summaryLowerCheck.includes("design task") || summaryLowerCheck.includes("dashboard design") || summaryLowerCheck.includes("design the") || summaryLowerCheck.includes("designing");

  if (loading) return (
    <div style={{ padding: "24px 32px", background: C.bg, height: "100%" }}>
      <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Technical review</div>
      <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: "0 0 24px", fontFamily: "'Playfair Display', Georgia, serif" }}>Gate 2 — PALO review</h1>
      {isDesignTaskView && (
        <div style={{ background: `${C.brand}18`, border: `1px solid ${C.brandBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎨</span>
          <span style={{ color: C.brand, fontSize: 12, fontWeight: 600 }}>Design task — skipping repo analysis</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[
          ...(!isDesignTaskView ? [{ stage: "reading", label: "Reading rsto-context repository", done: loadingStage === "analysing" }] : []),
          { stage: "analysing", label: isDesignTaskView ? "Generating design task specification" : "Requirements agent analysing with repo context", done: false },
        ].map(({ stage, label, done }) => {
          const active = loadingStage === stage;
          return (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                background: done ? C.teal : active ? C.brand : C.bgSubtle,
                color: done || active ? "#fff" : C.textDim,
                border: `1.5px solid ${done ? C.teal : active ? C.brand : C.border}`,
              }}>{done ? "✓" : active ? "…" : ""}</div>
              <span style={{ color: done ? C.tealDark : active ? C.navy : C.textDim, fontSize: 13, fontWeight: active ? 500 : 400 }}>{label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 32, display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => { setError(null); setLoadingStage("reading"); setLoading(true); setRunCount(c => c + 1); }} style={{
          background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.textMuted, fontSize: 12, padding: "6px 14px", cursor: "pointer"
        }}>Re-run analysis</button>
        <span style={{ color: C.textDim, fontSize: 11 }}>If the analysis appears stuck, click to restart it.</span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Technical review</div>
      <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: "0 0 16px", fontFamily: "'Playfair Display', Georgia, serif" }}>Gate 2 — PALO review</h1>
      <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Analysis failed</div>
        <div style={{ color: C.textMuted, fontSize: 12 }}>{error}</div>
      </div>
      <button onClick={() => { setError(null); setLoading(true); setLoadingStage("reading"); setRunCount(c => c + 1); }} style={{
        background: C.brand, border: "none", borderRadius: 6,
        color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer"
      }}>Retry analysis</button>
    </div>
  );

  const blockers = reqDoc.confidenceMap?.filter(f => f.confidence === "unknown") || [];
  const assumed = reqDoc.confidenceMap?.filter(f => f.confidence === "assumed") || [];
  const confirmed = reqDoc.confidenceMap?.filter(f => f.confidence === "confirmed" || f.confidence === "inferred") || [];
  const score = reqDoc.completenessScore || { populated: confirmed.length, total: (reqDoc.confidenceMap || []).length, blockers: blockers.length };

  const tabs = ["overview", "data spec", "acceptance criteria", "confidence map", "open decisions", "subtasks", "repo context"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px 0", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.bgPanel }}>
        <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Technical review</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Playfair Display', Georgia, serif" }}>Gate 2 — PALO review</h1>
            <div style={{ color: C.textMuted, fontSize: 13, fontFamily: "monospace" }}>{reqDoc.title}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: score.blockers > 0 ? C.red : C.green, fontSize: 20, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }}>
                {Math.round((score.populated / Math.max(score.total, 1)) * 100)}%
              </div>
              <div style={{ color: C.textDim, fontSize: 11 }}>complete</div>
            </div>
            {score.blockers > 0 && (
              <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "6px 10px" }}>
                <span style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>⚠ {score.blockers} blocker{score.blockers !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "transparent", border: "none", borderBottom: activeTab === tab ? `2px solid ${C.teal}` : "2px solid transparent",
              color: activeTab === tab ? C.teal : C.textMuted, fontSize: 12, fontWeight: activeTab === tab ? 500 : 400,
              padding: "6px 12px 10px", cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap"
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px" }}>

        {activeTab === "overview" && (
          <div>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>Description</div>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{reqDoc.description}</div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{reqDoc.why}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Priority", value: reqDoc.priority, color: priorityColor(reqDoc.priority) },
                { label: "Type", value: reqDoc.requestType?.replace("-", " "), color: C.textMuted },
                { label: "Workstream", value: reqDoc.workstream, color: C.textMuted },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ color: C.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
                  <div style={{ color, fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>Sequencing notes</div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{reqDoc.sequencingNotes}</div>
            </div>

            {blockers.length > 0 && (
              <div style={{ background: C.redDim, border: `1px solid ${C.red}33`, borderRadius: 8, padding: 14 }}>
                <div style={{ color: C.red, fontWeight: 600, fontSize: 12, marginBottom: 8 }}>⚠ Blocking unknowns — must resolve before sprint</div>
                {blockers.map((b, i) => (
                  <div key={i} style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.6, paddingLeft: 8, borderLeft: `2px solid ${C.red}44`, marginBottom: 6 }}>
                    <span style={{ color: C.text }}>{b.field}:</span> {b.question}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "data spec" && (
          <div>
            {/* Explainer */}
            <div style={{ background: C.amberDim, border: `1px solid ${C.amberBorder}`, borderLeft: `4px solid ${C.amber}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ color: C.amber, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Before build starts</div>
              <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>
                The dev team needs to physically verify each file below against an actual export before writing any ingestion code. Column names derived from the codebase or prior work — confirm them against a real sample before treating them as final.
              </div>
            </div>

            {(!reqDoc.dataSpecification || reqDoc.dataSpecification.length === 0) ? (
              <div style={{ color: C.textMuted, fontSize: 13, padding: "12px 0" }}>No data specification generated — this may not be an onboarding or new-indicator request.</div>
            ) : reqDoc.dataSpecification.map((fileSpec, fi) => {
              const allConfirmed = (fileSpec.requiredColumns || []).every(c => c.status === "confirmed");
              const anyUnknown = (fileSpec.requiredColumns || []).some(c => c.status === "unknown");
              const headerColor = anyUnknown ? C.red : allConfirmed ? C.green : C.amber;
              return (
                <div key={fi} style={{ background: C.bgCard, border: `1px solid ${anyUnknown ? C.red + "55" : C.border}`, borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
                  {/* File header */}
                  <div style={{ padding: "12px 16px", background: anyUnknown ? C.redDim : allConfirmed ? C.greenDim : C.amberDim, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="9" height="12" rx="1.5" stroke={headerColor} strokeWidth="1.2" fill="none"/><path d="M4 5h6M4 7.5h4" stroke={headerColor} strokeWidth="1" strokeLinecap="round"/></svg>
                        <span style={{ color: headerColor, fontSize: 13, fontWeight: 600 }}>{fileSpec.fileName}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {fileSpec.source && <span style={{ fontSize: 10, background: C.bgSubtle, color: C.textMuted, padding: "2px 7px", borderRadius: 4, border: `1px solid ${C.border}` }}>{fileSpec.source}</span>}
                        {fileSpec.format && <span style={{ fontSize: 10, background: C.bgSubtle, color: C.textMuted, padding: "2px 7px", borderRadius: 4, border: `1px solid ${C.border}` }}>{fileSpec.format}</span>}
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${fileSpec.sampleAvailable ? C.green + "44" : C.amber + "55"}`, color: fileSpec.sampleAvailable ? C.green : C.amber, background: fileSpec.sampleAvailable ? C.greenDim : C.amberDim }}>
                          {fileSpec.sampleAvailable ? "✓ Sample available" : "⚠ No sample yet"}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: anyUnknown ? C.red : allConfirmed ? C.green : C.amber, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {(fileSpec.requiredColumns || []).filter(c => c.status === "confirmed").length}/{(fileSpec.requiredColumns || []).length} confirmed
                    </div>
                  </div>

                  {/* Known issues */}
                  {fileSpec.knownIssues && (
                    <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, background: C.bgSubtle, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ color: C.amber, fontSize: 12, flexShrink: 0 }}>!</span>
                      <span style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>{fileSpec.knownIssues}</span>
                    </div>
                  )}

                  {/* Column table */}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: C.bgSubtle }}>
                          {["Column name", "Must contain", "Example", "Status"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 14px", color: C.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(fileSpec.requiredColumns || []).map((col, ci) => {
                          const cs = {
                            confirmed: { color: C.green, bg: C.greenDim, label: "Confirmed" },
                            assumed:   { color: C.amber, bg: C.amberDim, label: "Assumed" },
                            unknown:   { color: C.red,   bg: C.redDim,   label: "Unknown" },
                          }[col.status] || { color: C.textDim, bg: C.bgSubtle, label: col.status };
                          return (
                            <tr key={ci} style={{ borderBottom: `1px solid ${C.border}`, background: col.status === "unknown" ? `${C.red}08` : "transparent" }}>
                              <td style={{ padding: "9px 14px", fontFamily: "monospace", color: C.navy, fontWeight: 500 }}>{col.name}</td>
                              <td style={{ padding: "9px 14px", color: C.text, lineHeight: 1.5 }}>{col.description}</td>
                              <td style={{ padding: "9px 14px", color: C.textMuted, fontFamily: "monospace", fontSize: 11 }}>{col.example || "—"}</td>
                              <td style={{ padding: "9px 14px" }}>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: cs.bg, color: cs.color, border: `1px solid ${cs.color}44`, whiteSpace: "nowrap" }}>{cs.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "acceptance criteria" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(reqDoc.acceptanceCriteria || []).map((ac, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <div style={{ width: 18, height: 18, border: `1.5px solid ${C.border}`, borderRadius: 4, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>{ac.text || ac}</div>
                </div>
                <ConfidencePill level={ac.confidence || "assumed"} />
              </div>
            ))}
          </div>
        )}

        {activeTab === "confidence map" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["confirmed","inferred","assumed","unknown"].map(level => {
              const fields = (reqDoc.confidenceMap || []).filter(f => f.confidence === level);
              if (!fields.length) return null;
              return (
                <div key={level} style={{ marginBottom: 10 }}>
                  <div style={{ color: confidenceColor(level), fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: confidenceColor(level), display: "inline-block" }} />
                    {level} ({fields.length})
                  </div>
                  {fields.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 7, marginBottom: 5 }}>
                      <span style={{ color: C.textMuted, fontSize: 12, minWidth: 180, flexShrink: 0 }}>{f.field}</span>
                      <span style={{ color: C.text, fontSize: 12, flex: 1 }}>{f.value}</span>
                      {f.question && <span style={{ color: C.brand, fontSize: 11, fontStyle: "italic", maxWidth: 200, textAlign: "right" }}>{f.question}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "open decisions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(reqDoc.openDecisions || []).map((d, i) => (
              <div key={i} style={{ padding: "12px 14px", background: C.bgCard, border: `1px solid ${d.blocksProgress ? C.red + "55" : C.border}`, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {d.blocksProgress && <span style={{ color: C.red, fontSize: 11, fontWeight: 600 }}>BLOCKS</span>}
                  <span style={{ color: C.textDim, fontSize: 11, fontFamily: "monospace", background: C.bgHover, padding: "2px 7px", borderRadius: 4 }}>{d.owner}</span>
                </div>
                <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>{d.question}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "subtasks" && (
          <div>
            {["backend","data","design","frontend"].map(layer => {
              const tasks = (reqDoc.subtasks || []).filter(t => t.layer === layer);
              if (!tasks.length) return null;
              const layerColor = { backend: C.teal, data: C.docColor, design: C.brand, frontend: C.brand }[layer];
              return (
                <div key={layer} style={{ marginBottom: 14 }}>
                  <div style={{ color: layerColor, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{layer}</div>
                  {tasks.map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 7, marginBottom: 5 }}>
                      <span style={{ color: layerColor, fontFamily: "monospace", fontSize: 12, minWidth: 32 }}>{t.id}</span>
                      <span style={{ color: C.text, fontSize: 13 }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "repo context" && (
          <div>
            {/* Files read */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
                Files read from rsto-context
              </div>
              {(reqDoc._repoFilesRead || []).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(reqDoc._repoFilesRead || []).map((path, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.bgSubtle, borderRadius: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="1" width="9" height="12" rx="1.5" stroke={C.docColor} strokeWidth="1.2" fill="none"/>
                        <path d="M4 5h6M4 7.5h4" stroke={C.docColor} strokeWidth="1" strokeLinecap="round"/>
                      </svg>
                      <span style={{ color: C.textMuted, fontSize: 11, fontFamily: "monospace" }}>
                        {path.replace(CONTEXT_REPO + "/", "")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: C.textDim, fontSize: 13 }}>
                  No matching repo files found — requirement doc generated from Gate 1 summary only.
                </div>
              )}
            </div>

            {/* What the repo told us */}
            {reqDoc._repoFilesRead?.length > 0 && (
              <div style={{ background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
                <div style={{ color: C.tealDark, fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                  What the repo context informed
                </div>
                <div style={{ color: C.navy, fontSize: 13, lineHeight: 1.7 }}>
                  The requirements agent read {reqDoc._repoFilesRead.length} file{reqDoc._repoFilesRead.length !== 1 ? "s" : ""} from rsto-context.
                  Any confirmed fields in the confidence map were populated directly from these documents.
                  Assumed or unknown fields indicate gaps not covered by existing documentation.
                </div>
              </div>
            )}

            {/* Confidence breakdown by source */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
              <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>Confidence breakdown</div>
              {[
                { level: "confirmed", label: "Confirmed from repo or request", color: C.green },
                { level: "inferred", label: "Inferred from context", color: C.teal },
                { level: "assumed", label: "Assumed — needs verification", color: C.amber },
                { level: "unknown", label: "Unknown — blocks progress", color: C.red },
              ].map(({ level, label, color }) => {
                const count = (reqDoc.confidenceMap || []).filter(f => f.confidence === level).length;
                const total = (reqDoc.confidenceMap || []).length || 1;
                return (
                  <div key={level} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 80, fontSize: 11, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>{level}</div>
                    <div style={{ flex: 1, height: 6, background: C.bgSubtle, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(count / total) * 100}%`, height: "100%", background: color, borderRadius: 3 }} />
                    </div>
                    <span style={{ color: C.textMuted, fontSize: 12, minWidth: 20, textAlign: "right" }}>{count}</span>
                    <span style={{ color: C.textDim, fontSize: 11, minWidth: 180 }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {!approved ? (
        <div style={{ padding: "14px 32px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {!showFeedback ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setApproved(true); onGate2Approved(reqDoc); }} style={{
                background: C.teal, color: C.bg, border: "none", borderRadius: 6,
                padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer"
              }}>Approve — run delivery agent</button>
              <button onClick={() => setShowFeedback(true)} style={{
                background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "9px 14px", fontSize: 13, cursor: "pointer"
              }}>Request changes</button>
            </div>
          ) : (
            <div>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="What needs to change before this is ready for dev?"
                rows={2} style={{
                  width: "100%", background: C.bgCard, color: C.text,
                  border: `1px solid ${C.border}`, borderRadius: 7,
                  padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                  resize: "none", boxSizing: "border-box"
                }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={{ background: C.brand, color: C.bg, border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Submit — loop back to requirements agent
                </button>
                <button onClick={() => setShowFeedback(false)} style={{ background: "transparent", color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "14px 32px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: 12 }}>
            <div style={{ color: C.teal, fontWeight: 600, fontSize: 13 }}>✓ Gate 2 approved — delivery agent running</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delivery view ─────────────────────────────────────────────────────────────
function DeliveryView({ reqDoc, onDone, preloadedOutput, onOutputGenerated }) {
  const [output, setOutput] = useState(preloadedOutput || null);
  const [loading, setLoading] = useState(!preloadedOutput);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ticket");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (preloadedOutput) return; // Already have output, skip agent call
    async function runDeliveryAgent() {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            system: DELIVERY_SYSTEM,
            messages: [{ role: "user", content: `Generate delivery outputs for this approved requirement document:\n\n${JSON.stringify(reqDoc, null, 2)}` }]
          })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        const clean = text.replace(/```json|```/g, "").trim();
        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch {
          const match = clean.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          } else {
            throw new Error("Could not parse JSON from response");
          }
        }
        setOutput(parsed);
        onOutputGenerated?.(parsed);
      } catch (e) {
        setError("Failed to generate delivery outputs. " + e.message);
      }
      setLoading(false);
    }
    runDeliveryAgent();
  }, [reqDoc]);

  function copyMeetingPrep() {
    if (!output) return;
    const mp = output.meetingPrepDoc;
    const text = [
      `# ${mp.title}`,
      `\n## What we're building\n${mp.whatWeAreBuilding}`,
      `\n## Confirmed\n${mp.confirmedItems?.map(i => `- ${i}`).join("\n")}`,
      `\n## Decisions needed\n${mp.decisionsNeeded?.map(d => `- [${d.owner}] ${d.question}\n  Why: ${d.why}`).join("\n")}`,
      mp.devQuestions?.length ? `\n## Dev questions\n${mp.devQuestions.map(q => `- ${q}`).join("\n")}` : "",
      mp.rstoQuestions?.length ? `\n## RSTO questions\n${mp.rstoQuestions.map(q => `- ${q}`).join("\n")}` : "",
      `\n## Suggested agenda (30 min)\n${mp.suggestedAgenda?.map(a => `- ${a.item} (${a.minutes} min)`).join("\n")}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (loading) return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Final output</div>
      <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: "0 0 20px", fontFamily: "'Playfair Display', Georgia, serif" }}>Delivery agent</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.textMuted, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.brand, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
        </div>
        Generating Notion ticket and meeting prep...
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );

  if (error) return <div style={{ padding: "24px 32px", color: C.red, fontSize: 13 }}>{error}</div>;

  const tabs = ["ticket", "meeting prep", "sequencing"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 32px 0", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.bgPanel }}>
        <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Final output</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Delivery complete</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 6, padding: "5px 12px" }}>
              <span style={{ color: C.teal, fontSize: 12, fontWeight: 600 }}>✓ Pipeline complete</span>
            </div>
            {onDone && <button onClick={onDone} style={{ background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>← Back to tracker</button>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, marginBottom: 0 }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "transparent", border: "none", borderBottom: activeTab === tab ? `2px solid ${C.brand}` : "2px solid transparent",
              color: activeTab === tab ? C.brand : C.textMuted, fontSize: 12, fontWeight: activeTab === tab ? 500 : 400,
              padding: "6px 12px 10px", cursor: "pointer", textTransform: "capitalize"
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px" }}>

        {activeTab === "ticket" && output?.notionTicket && (
          <div>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
                <div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>{output.notionTicket.title}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <StatusPill status={output.notionTicket.status === "Ready" ? "ready" : "not-started"} />
                    <span style={{ color: priorityColor(reqDoc.priority), fontSize: 12, fontWeight: 500 }}>{output.notionTicket.priority}</span>
                  </div>
                </div>
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                {output.notionTicket.description}
              </div>
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>Acceptance criteria</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {(output.notionTicket.acceptanceCriteria || []).map((ac, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 16, height: 16, border: `1.5px solid ${C.border}`, borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>{ac}</span>
                  </div>
                ))}
              </div>
            </div>

            {output.notionTicket.linkedTickets?.length > 0 && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Linked tickets</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {output.notionTicket.linkedTickets.map(id => (
                    <span key={id} style={{ color: C.docColor, fontFamily: "monospace", fontSize: 12, background: C.docDim, padding: "3px 8px", borderRadius: 4 }}>{id}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "meeting prep" && output?.meetingPrepDoc && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={copyMeetingPrep} style={{
                background: copied ? C.tealDim : C.bgCard, color: copied ? C.teal : C.textMuted,
                border: `1px solid ${copied ? C.tealBorder : C.border}`,
                borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer"
              }}>{copied ? "✓ Copied" : "Copy as markdown"}</button>
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{output.meetingPrepDoc.title}</div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{output.meetingPrepDoc.whatWeAreBuilding}</div>
            </div>

            {output.meetingPrepDoc.decisionsNeeded?.length > 0 && (
              <div style={{ background: C.brandDim, border: `1px solid ${C.brandBorder}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
                <div style={{ color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Decisions needed in this meeting</div>
                {output.meetingPrepDoc.decisionsNeeded.map((d, i) => (
                  <div key={i} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: `2px solid ${C.brandBorder}` }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{d.question}</div>
                    <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>{d.why}</div>
                    <span style={{ color: C.brand, fontSize: 11, fontFamily: "monospace" }}>{d.owner}</span>
                  </div>
                ))}
              </div>
            )}

            {output.meetingPrepDoc.devQuestions?.length > 0 && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
                <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>Dev questions</div>
                {output.meetingPrepDoc.devQuestions.map((q, i) => (
                  <div key={i} style={{ color: C.text, fontSize: 13, lineHeight: 1.6, paddingLeft: 10, borderLeft: `2px solid ${C.tealBorder}`, marginBottom: 7 }}>{q}</div>
                ))}
              </div>
            )}

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
              <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>Suggested agenda (30 min)</div>
              {output.meetingPrepDoc.suggestedAgenda?.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < output.meetingPrepDoc.suggestedAgenda.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ color: C.brand, fontFamily: "monospace", fontSize: 12, minWidth: 48 }}>{a.minutes} min</span>
                  <span style={{ color: C.text, fontSize: 13 }}>{a.item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "sequencing" && output?.sequencingAdvice && (
          <div>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>Suggested sprint slot</div>
              <div style={{ color: C.teal, fontSize: 14, fontWeight: 500 }}>{output.sequencingAdvice.suggestedSprint}</div>
            </div>
            {output.sequencingAdvice.dependencies?.length > 0 && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
                <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>Dependencies</div>
                {output.sequencingAdvice.dependencies.map((d, i) => (
                  <div key={i} style={{ color: C.text, fontSize: 13, lineHeight: 1.6, paddingLeft: 10, borderLeft: `2px solid ${C.border}`, marginBottom: 7 }}>{d}</div>
                ))}
              </div>
            )}
            {output.sequencingAdvice.parallelWork && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
                <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Parallel work</div>
                <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{output.sequencingAdvice.parallelWork}</div>
              </div>
            )}
            {output.sequencingAdvice.risks?.length > 0 && (
              <div style={{ background: C.brandDim, border: `1px solid ${C.brandBorder}`, borderRadius: 10, padding: 18 }}>
                <div style={{ color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Risks</div>
                {output.sequencingAdvice.risks.map((r, i) => (
                  <div key={i} style={{ color: C.text, fontSize: 13, lineHeight: 1.6, paddingLeft: 10, borderLeft: `2px solid ${C.brandBorder}`, marginBottom: 7 }}>{r}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Request flow wrapper — contains intake + gate2 + delivery as one view ────
function ChecklistPanel({ checklistStatus, checklistLoading, onRecheck, open, onToggle }) {
  if (!checklistStatus && !checklistLoading) return null;

  if (!open) {
    return (
      <div style={{
        width: 40, flexShrink: 0,
        borderLeft: `1px solid ${C.border}`,
        background: C.bgPanel,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 14, gap: 10,
      }}>
        <button
          onClick={onToggle}
          title="Open checklist"
          style={{
            background: C.bgSubtle, border: `1px solid ${C.border}`,
            borderRadius: 6, width: 26, height: 26, cursor: "pointer",
            color: C.textMuted, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >◀</button>
        <div style={{
          writingMode: "vertical-rl", textOrientation: "mixed",
          color: C.textDim, fontSize: 9, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          transform: "rotate(180deg)", userSelect: "none",
        }}>Checklist</div>
      </div>
    );
  }

  return (
    <div style={{
      width: 300, flexShrink: 0,
      borderLeft: `1px solid ${C.border}`,
      background: C.bgPanel,
      overflowY: "auto",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ color: C.textDim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>Checklist audit</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {!checklistLoading && onRecheck && (
              <button onClick={onRecheck} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "2px 4px" }}>↻</button>
            )}
            <button onClick={onToggle} title="Close checklist" style={{ background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}>▶</button>
          </div>
        </div>
        {checklistLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 12 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.brand, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
            </div>
            Classifying…
          </div>
        )}
        {checklistStatus && !checklistLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 5, background: C.brandDim, color: C.brand, border: `1px solid ${C.brandBorder}` }}>{checklistStatus.typeLabel}</span>
            {checklistStatus.confidence === "low" && <span style={{ fontSize: 10, color: C.amber }}>low confidence</span>}
            {(() => {
              const items = checklistStatus.items || [];
              const confirmed = items.filter(i => i.status === "confirmed").length;
              const total = items.length;
              const pct = total ? Math.round((confirmed / total) * 100) : 0;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{confirmed}/{total} confirmed</span>
                  <div style={{ width: 60, height: 4, background: C.bgSubtle, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.green : pct > 60 ? C.teal : C.amber, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      {checklistStatus?.splitRequired && (
        <div style={{ margin: "10px 12px 0", background: C.amberDim, border: `1px solid ${C.amberBorder}`, borderRadius: 7, padding: "8px 10px", flexShrink: 0 }}>
          <div style={{ color: C.amber, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Split required</div>
          <div style={{ color: C.text, fontSize: 11, lineHeight: 1.55 }}>{checklistStatus.splitReason}</div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 0 16px" }}>
        {checklistLoading && !checklistStatus && (
          <div style={{ padding: "0 12px" }}>
            {[...Array(10)].map((_, i) => <div key={i} style={{ height: 26, background: C.bgSubtle, borderRadius: 5, marginBottom: 5, opacity: 1 - i * 0.07 }} />)}
          </div>
        )}
        {checklistStatus && (() => {
          const sections = [...new Set((checklistStatus.items || []).map(it => it.section))];
          return sections.map(section => {
            const items = (checklistStatus.items || []).filter(it => it.section === section);
            const confirmedCount = items.filter(i => i.status === "confirmed").length;
            return (
              <div key={section} style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 4px" }}>
                  <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{section}</div>
                  <span style={{ fontSize: 10, color: confirmedCount === items.length ? C.green : C.textDim }}>{confirmedCount}/{items.length}</span>
                </div>
                {items.map((item, ii) => {
                  const s = {
                    confirmed: { icon: "✓", color: C.green, bg: C.greenDim, bdr: `${C.green}33` },
                    partial:   { icon: "~", color: C.amber, bg: C.amberDim, bdr: `${C.amber}44` },
                    missing:   { icon: "?", color: C.red,   bg: C.redDim,   bdr: `${C.red}33` },
                  }[item.status] || { icon: "?", color: C.textDim, bg: C.bgSubtle, bdr: C.border };
                  return (
                    <div key={ii} title={item.evidence || undefined} style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "5px 14px", cursor: item.evidence ? "help" : "default" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, width: 14, height: 14, borderRadius: "50%", background: s.bg, color: s.color, border: `1px solid ${s.bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: item.status === "missing" ? C.text : C.textMuted, fontSize: 11, lineHeight: 1.45, fontWeight: item.status === "missing" ? 500 : 400 }}>{item.text}</div>
                        {item.evidence && item.status !== "missing" && (
                          <div style={{ color: C.textDim, fontSize: 10, marginTop: 1, lineHeight: 1.4 }}>{item.evidence}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ─── Gate 1 Review View ───────────────────────────────────────────────────────
function Gate1ReviewView({ gate1Content, onApproved, onRefine }) {
  const lines = (gate1Content || "").split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.replace("## ", ""), items: [] };
    } else if (line.startsWith("- ") && current) {
      current.items.push({ text: line.replace("- ", ""), plain: false });
    } else if (line.trim() && current) {
      current.items.push({ text: line.trim(), plain: true });
    }
  }
  if (current) sections.push(current);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px 16px", borderBottom: `1px solid ${C.border}`, background: C.bgPanel, flexShrink: 0 }}>
        <div style={{ color: C.brand, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Gate 1 — RSTO review</div>
        <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Review the intake summary</h1>
        <p style={{ margin: "6px 0 0", color: C.textMuted, fontSize: 13 }}>Approve to proceed to analysis, or go back to intake to add more context.</p>
      </div>

      {/* Summary content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {gate1Content ? (
          <div style={{ maxWidth: 720, background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.brand }} />
              <span style={{ color: C.brand, fontWeight: 600, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Agent summary — awaiting RSTO approval</span>
            </div>
            {sections.map((sec, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{sec.heading}</div>
                {sec.items.map((item, j) => (
                  <div key={j} style={{ color: C.text, fontSize: 13, lineHeight: 1.65, marginBottom: 3, paddingLeft: item.plain ? 0 : 12 }}>
                    {item.plain ? item.text : `· ${item.text}`}
                  </div>
                ))}
              </div>
            ))}
            {!sections.length && (
              <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{gate1Content}</pre>
            )}
          </div>
        ) : (
          <div style={{ color: C.textDim, fontSize: 13 }}>No summary available.</div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ padding: "14px 32px 20px", borderTop: `2px solid ${C.brand}`, background: C.brandDim, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ color: C.textMuted, fontSize: 13 }}>Does this capture what RSTO need?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onRefine}
            style={{ background: "transparent", color: C.brand, border: `1px solid ${C.brandBorder}`, borderRadius: 6, padding: "8px 16px", fontWeight: 500, fontSize: 13, cursor: "pointer" }}
          >← Refine in intake</button>
          <button
            onClick={() => onApproved(gate1Content)}
            style={{ background: C.brand, color: "#fff", border: "none", borderRadius: 6, padding: "8px 22px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >Approve — proceed to analysis</button>
        </div>
      </div>
    </div>
  );
}

function RequestFlow({ onComplete, initialRequest, onUpdate }) {
  const requestId = useRef(initialRequest?.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const latestIntakeSnapshot = useRef(initialRequest?.intakeSnapshot || null);
  const [stage, setStage] = useState(initialRequest?.stage || "intake");
  const [gate1Summary, setGate1Summary] = useState(initialRequest?.gate1Summary || null);
  const [approvedReqDoc, setApprovedReqDoc] = useState(initialRequest?.reqDoc || null);
  const [reqDocReady, setReqDocReady] = useState(!!(initialRequest?.reqDoc));
  const [savedReqDoc, setSavedReqDoc] = useState(initialRequest?.reqDoc || null);
  const [savedDeliveryOutput, setSavedDeliveryOutput] = useState(initialRequest?.deliveryOutput || null);
  const [reqTitle, setReqTitle] = useState(initialRequest?.title || null);
  const [viewStage, setViewStage] = useState(null);
  const [checklistStatus, setChecklistStatus] = useState(initialRequest?.intakeSnapshot?.checklistStatus || null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [pendingGate1Content, setPendingGate1Content] = useState(initialRequest?.intakeSnapshot?.gate1Content || null);
  const [checklistOpen, setChecklistOpen] = useState(true);

  function update(partial) {
    onUpdate?.({ id: requestId.current, title: reqTitle, ...partial });
  }

  function handleIntakeSnapshot(snapshot) {
    latestIntakeSnapshot.current = snapshot;
    const docMsg = snapshot.messages?.find(m => m.isDoc);
    const firstMsg = snapshot.messages?.find(m => m.role === "user" && !m.isDoc);
    const derivedTitle = docMsg?.docName || (firstMsg?.content?.slice(0, 70)) || null;
    if (derivedTitle && !reqTitle) setReqTitle(derivedTitle);
    if (snapshot.checklistStatus) setChecklistStatus(snapshot.checklistStatus);
    if (snapshot.checklistLoading !== undefined) setChecklistLoading(snapshot.checklistLoading);
    update({
      stage: "intake",
      title: derivedTitle || reqTitle,
      intakeSnapshot: snapshot,
      gate1Summary: snapshot.gate1Content || gate1Summary,
    });
  }

  const steps = [
    { id: "intake", label: "Intake" },
    { id: "gate1", label: "Gate 1 — RSTO" },
    { id: "analysis", label: "Analysis" },
    { id: "gate2", label: "Gate 2 — PALO" },
    { id: "delivery", label: "Delivery" },
  ];

  const currentStepIndex =
    stage === "intake" ? 0 :
    stage === "gate1-pending" ? 1 :
    stage === "gate2" && !reqDocReady ? 2 :
    stage === "gate2" && reqDocReady ? 3 :
    stage === "delivery" ? 4 : 0;

  const completedUpTo =
    stage === "gate1-pending" ? 1 :
    gate1Summary && !reqDocReady ? 2 :
    reqDocReady && !approvedReqDoc ? 3 :
    approvedReqDoc ? 4 : 0;

  function handleGate1Approved(summary) {
    setGate1Summary(summary);
    setStage("gate2");
    setPendingGate1Content(null);
    setReqDocReady(false);
    setSavedReqDoc(null);
    setApprovedReqDoc(null);
    setSavedDeliveryOutput(null);
    update({ stage: "gate2", gate1Summary: summary, reqDoc: null, deliveryOutput: null });
  }

  function handleGate1Ready(gate1Content) {
    setPendingGate1Content(gate1Content);
    setStage("gate1-pending");
  }

  function handleRefine() {
    setStage("intake");
  }

  function handleGate2Approved(reqDoc) {
    setSavedReqDoc(reqDoc);
    setApprovedReqDoc(reqDoc);
    setStage("delivery");
    update({ stage: "delivery", reqDoc });
  }

  function handleReqDocGenerated(reqDoc) {
    setSavedReqDoc(reqDoc);
    setReqDocReady(true);
    update({ stage: "gate2", reqDoc });
  }

  function handleDeliveryGenerated(deliveryOutput) {
    setSavedDeliveryOutput(deliveryOutput);
    update({ stage: "complete", deliveryOutput });
  }

  function rerunFromIntake() {
    setStage("intake");
    setViewStage(null);
    setGate1Summary(null);
    setPendingGate1Content(null);
    setReqDocReady(false);
    setSavedReqDoc(null);
    setApprovedReqDoc(null);
    setSavedDeliveryOutput(null);
    update({ stage: "intake", gate1Summary: null, reqDoc: null, deliveryOutput: null });
  }

  function rerunFromGate2() {
    setViewStage(null);
    setReqDocReady(false);
    setSavedReqDoc(null);
    setApprovedReqDoc(null);
    setSavedDeliveryOutput(null);
    update({ stage: "gate2", reqDoc: null, deliveryOutput: null });
  }

  function rerunFromDelivery() {
    setViewStage(null);
    setSavedDeliveryOutput(null);
    update({ stage: "delivery", deliveryOutput: null });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Request-scoped pipeline stepper */}
      <div style={{ padding: "16px 32px 0", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.bgPanel }}>
        <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>New request — pipeline</div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 0, overflowX: "auto" }}>
          {steps.map((step, i) => {
            const done = i < completedUpTo;
            const active = i === currentStepIndex && !viewStage;
            const reviewing = viewStage === step.id;
            const reachable = i <= currentStepIndex;
            const clickable = reachable;
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
                <div
                  onClick={() => {
                    if (!clickable) return;
                    if (i === currentStepIndex) { setViewStage(null); return; }
                    setViewStage(viewStage === step.id ? null : step.id);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "0 4px 12px",
                    borderBottom: reviewing ? `2px solid ${C.amber}` : active ? `2px solid ${C.brand}` : done ? `2px solid ${C.teal}` : "2px solid transparent",
                    opacity: reachable ? 1 : 0.4,
                    cursor: clickable ? "pointer" : "default",
                  }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: reviewing ? C.amber : done ? C.teal : active ? C.brand : C.bgSubtle,
                    color: done || active || reviewing ? "#fff" : C.textDim,
                    border: `1.5px solid ${reviewing ? C.amber : done ? C.teal : active ? C.brand : C.border}`,
                  }}>{reviewing ? "↩" : done ? "✓" : i + 1}</div>
                  <span style={{
                    fontSize: 12, whiteSpace: "nowrap",
                    color: reviewing ? C.amber : done ? C.tealDark : active ? C.brand : C.textDim,
                    fontWeight: active || done || reviewing ? 600 : 400,
                  }}>{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 20, height: 1, background: C.border, margin: "0 4px", flexShrink: 0, marginBottom: 12 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Review banner — shown when browsing a past step */}
      {viewStage && (
        <div style={{ background: `${C.amber}18`, borderBottom: `1px solid ${C.amber}44`, padding: "8px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12 }}>
          <span style={{ color: C.amber, fontSize: 12, fontWeight: 600 }}>Reviewing a previous step</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(viewStage === "intake" || viewStage === "gate1") && (
              <button onClick={rerunFromIntake} style={{ background: "transparent", border: `1px solid ${C.amber}`, borderRadius: 5, color: C.amber, fontSize: 12, fontWeight: 600, padding: "4px 12px", cursor: "pointer" }}>↩ Re-open Intake to amend</button>
            )}
            {(viewStage === "gate2" || viewStage === "analysis") && (
              <button onClick={rerunFromGate2} style={{ background: "transparent", border: `1px solid ${C.amber}`, borderRadius: 5, color: C.amber, fontSize: 12, fontWeight: 600, padding: "4px 12px", cursor: "pointer" }}>↩ Re-run Gate 2 analysis</button>
            )}
            {viewStage === "delivery" && (
              <button onClick={rerunFromDelivery} style={{ background: "transparent", border: `1px solid ${C.amber}`, borderRadius: 5, color: C.amber, fontSize: 12, fontWeight: 600, padding: "4px 12px", cursor: "pointer" }}>↩ Re-generate delivery output</button>
            )}
            <button onClick={() => setViewStage(null)} style={{ background: C.amber, border: "none", borderRadius: 5, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 12px", cursor: "pointer" }}>Back to current step</button>
          </div>
        </div>
      )}

      {/* Stage content + persistent checklist panel */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Current stage rendering */}
        {!viewStage && stage === "intake" && (
          <IntakeView
            initialSnapshot={initialRequest?.intakeSnapshot}
            onSnapshot={handleIntakeSnapshot}
            onGate1Ready={handleGate1Ready}
          />
        )}
        {!viewStage && stage === "gate1-pending" && (
          <Gate1ReviewView
            gate1Content={pendingGate1Content}
            onApproved={handleGate1Approved}
            onRefine={handleRefine}
          />
        )}
        {!viewStage && stage === "gate2" && (
          <Gate2View
            gate1Summary={gate1Summary}
            onGate2Approved={handleGate2Approved}
            onReqDocGenerated={handleReqDocGenerated}
            preloadedReqDoc={savedReqDoc}
          />
        )}
        {!viewStage && stage === "delivery" && (
          <DeliveryView
            reqDoc={approvedReqDoc}
            onDone={() => onComplete?.({ id: requestId.current, title: reqTitle, stage: "complete", gate1Summary, reqDoc: approvedReqDoc, deliveryOutput: savedDeliveryOutput, createdAt: initialRequest?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() })}
            preloadedOutput={savedDeliveryOutput}
            onOutputGenerated={handleDeliveryGenerated}
          />
        )}
        {/* Review mode — past step panels (read-only) */}
        {viewStage === "intake" && (
          <IntakeView
            initialSnapshot={latestIntakeSnapshot.current}
            onSnapshot={() => {}}
            readOnly={true}
          />
        )}
        {viewStage === "gate1" && (
          <div style={{ padding: "28px 32px", maxWidth: 760 }}>
            <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Gate 1 — RSTO review</div>
            <h1 style={{ color: C.navy, fontSize: 22, fontWeight: 700, margin: "0 0 20px", fontFamily: "'Playfair Display', Georgia, serif" }}>Approved summary</h1>
            {gate1Summary ? (
              <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal }} />
                  <span style={{ color: C.tealDark, fontSize: 12, fontWeight: 600 }}>Gate 1 approved by RSTO</span>
                </div>
                <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{gate1Summary}</pre>
              </div>
            ) : (
              <div style={{ color: C.textDim, fontSize: 13 }}>No Gate 1 summary available.</div>
            )}
          </div>
        )}
        {(viewStage === "gate2" || viewStage === "analysis") && (
          <Gate2View
            gate1Summary={gate1Summary}
            onGate2Approved={() => {}}
            onReqDocGenerated={() => {}}
            preloadedReqDoc={savedReqDoc || approvedReqDoc}
          />
        )}
        {viewStage === "delivery" && (
          <DeliveryView
            reqDoc={approvedReqDoc}
            onDone={() => {}}
            preloadedOutput={savedDeliveryOutput}
            onOutputGenerated={() => {}}
          />
        )}
        </div>{/* end inner stage scroll */}
        <ChecklistPanel
          checklistStatus={checklistStatus}
          checklistLoading={checklistLoading}
          open={checklistOpen}
          onToggle={() => setChecklistOpen(o => !o)}
        />
      </div>{/* end stage + checklist row */}
    </div>
  );
}

// ─── Pipeline guide page ──────────────────────────────────────────────────────
function PipelinePage() {
  const steps = [
    {
      type: "agent",
      number: 1,
      name: "Intake agent",
      badge: "Automated",
      color: C.brand,
      colorDim: C.brandDim,
      colorBorder: C.brandBorder,
      tagline: "Understands the request before anyone else touches it",
      description: "Reads the incoming request or uploaded feature request form, classifies the type, extracts all present details, and identifies genuine gaps. Asks clarifying questions scaled to complexity — a simple bug needs 1–2, a complex new feature may need 5–8.",
      inputs: ["Free-text description", "Feature request form (.docx)"],
      outputs: ["Plain-language summary", "Confidence map (confirmed / assumed / unknown)", "Clarifying questions"],
      note: "Never asks about information already in the document. Never artificially caps questions — every real gap gets a question.",
    },
    {
      type: "gate",
      name: "Gate 1",
      subtitle: "RSTO review",
      badge: "Human review",
      color: C.green,
      colorDim: C.greenDim,
      reviewer: "RSTO stakeholder",
      question: "Does this summary capture what you actually need?",
      pass: "Approve — proceed to codebase analysis",
      fail: "Request corrections — agent updates the summary and re-presents",
      note: "No technical analysis begins until Gate 1 is approved.",
    },
    {
      type: "agent",
      number: 2,
      name: "Context agent",
      badge: "Automated",
      color: C.teal,
      colorDim: C.tealDim,
      colorBorder: C.tealBorder,
      tagline: "Finds what already exists before anyone starts building",
      description: "Cross-references the approved request against the rsto-context repository — existing indicators, onboarding guides, partner files, in-development features, and platform architecture.",
      inputs: ["Gate 1 approved summary", "rsto-context repository"],
      outputs: ["Prior work map", "Data gaps and undefined variables", "Reuse opportunities", "Risk flags"],
      note: "Cites actual file paths and field names. Severity is flagged as: blocks / risk / minor.",
    },
    {
      type: "agent",
      number: 3,
      name: "Requirements agent",
      badge: "Automated",
      color: C.teal,
      colorDim: C.tealDim,
      colorBorder: C.tealBorder,
      tagline: "Turns approval and context into a document dev can act on",
      description: "Produces a structured requirement document combining the Gate 1 summary with context analysis. Every field is labelled with its confidence level — confirmed, inferred, assumed, or unknown. Nothing is silently assumed.",
      inputs: ["Gate 1 summary", "Context analysis"],
      outputs: ["Acceptance criteria", "Confidence map", "Open decisions", "Subtasks by layer", "Meeting prep questions", "Completeness score"],
      note: "Notion ticket status is 'Ready' only when zero fields remain unknown.",
    },
    {
      type: "gate",
      name: "Gate 2",
      subtitle: "PALO review",
      badge: "Human review",
      color: C.green,
      colorDim: C.greenDim,
      reviewer: "PO (PALO)",
      question: "Is this requirement doc complete enough to hand to the dev team?",
      pass: "Approve — proceed to delivery",
      fail: "Flag open decisions — gather remaining information before proceeding",
      note: "PALO owns the quality gate before anything reaches the dev team.",
    },
    {
      type: "agent",
      number: 4,
      name: "Delivery agent",
      badge: "Automated",
      color: C.brand,
      colorDim: C.brandDim,
      colorBorder: C.brandBorder,
      tagline: "Produces everything the dev team needs to start",
      description: "Takes the approved requirement doc and generates the final delivery package — a formatted Notion ticket, a structured 30-minute meeting prep brief, and sequencing advice for sprint planning.",
      inputs: ["Approved requirement document"],
      outputs: ["Notion ticket (formatted, ready to copy)", "Pre-meeting brief with 30-min agenda", "Sequencing advice and risk flags"],
      note: "Dev questions are always specific and technical. RSTO questions are always plain English.",
    },
  ];

  const workTypes = [
    {
      id: "design-task",
      label: "Design task",
      icon: "🎨",
      color: C.brand,
      colorDim: C.brandDim,
      colorBorder: C.brandBorder,
      owner: "Designer (PALO)",
      description: "Any work done in Figma — dashboard mockups, wireframes, new screen designs, visual specifications, or component explorations.",
      pipelineNote: "Skips the repo analysis step. No implementation context needed. The pipeline goes: Intake → Gate 1 RSTO → Gate 2 PALO spec → Delivery brief.",
      checklist: ["What screen or component is being designed", "Which SP or community it's for", "Strategy (PP / ECEC / ANC)", "Existing Figma file to update, or new design", "Data and labels to appear on screen", "Who from RSTO reviews and approves"],
    },
    {
      id: "sp-onboarding",
      label: "SP onboarding",
      icon: "🚀",
      color: C.teal,
      colorDim: C.tealDim,
      colorBorder: C.tealBorder,
      owner: "Dev + Data team",
      description: "Connecting a new service provider to the platform so their data flows through and their dashboard is live.",
      pipelineNote: "Full pipeline. High data readiness burden — someone must have actually seen an export from the SP's system before analysis begins.",
      checklist: ["SP name and strategy", "Which indicators are in scope", "Data management system (Apricot, Salesforce, etc.)", "Sample export available and reviewed", "Go-live date and external commitment driving it", "ABS or AEDC data required"],
    },
    {
      id: "community-onboarding",
      label: "Community onboarding",
      icon: "🏘️",
      color: C.teal,
      colorDim: C.tealDim,
      colorBorder: C.tealBorder,
      owner: "Dev + Designer",
      description: "Adding a community-level dashboard that aggregates data across multiple service providers in a geographic area.",
      pipelineNote: "Requires a confirmed design mockup before development begins. Often triggers a split: design ticket first, then data ticket once design is approved.",
      checklist: ["Design mockup confirmed and approved", "Which SPs are in scope and already onboarded", "Geographic boundary defined", "ABS census year and AEDC data agreement status", "Who needs access and go-live date"],
    },
    {
      id: "new-indicators",
      label: "New indicators",
      icon: "📊",
      color: "#5D7A45",
      colorDim: "#EDF0E5",
      colorBorder: "#A8B848",
      owner: "Dev + Data team",
      description: "Adding a new metric to the platform — quantity, participation, quality, or situational analysis — for one or more strategies.",
      pipelineNote: "Full pipeline with repo analysis. Every indicator needs a confirmed formula (numerator + denominator), confirmed data source, and a reviewed sample file.",
      checklist: ["Indicator name and type confirmed", "Formula numerator and denominator in writing", "Tiers or thresholds confirmed", "Data file named and sample reviewed", "Service-level, community-level, or both", "Design mockup or existing indicator to match"],
    },
    {
      id: "enhancement",
      label: "Enhancement",
      icon: "✨",
      color: C.amber,
      colorDim: "#FDF1E2",
      colorBorder: "#D4A87A",
      owner: "Dev team",
      description: "A change or improvement to an existing feature — a new filter, a layout change, a new comparison view, or a UX improvement.",
      pipelineNote: "Lighter pipeline. Repo analysis may be brief. Scope must be clearly bounded — enhancements that grow into new features should be split.",
      checklist: ["Which existing screen or feature is changing", "Exact change described in plain language", "Which SPs or communities are affected", "Any design changes — mockup required or not?", "Acceptance criteria: what does done look like"],
    },
    {
      id: "data-bug",
      label: "Data bug",
      icon: "🔧",
      color: C.red,
      colorDim: C.redDim,
      colorBorder: `${C.red}44`,
      owner: "Dev + Data team",
      description: "Something showing incorrectly on a dashboard — wrong values, missing data, or a calculation error.",
      pipelineNote: "Lightweight pipeline. Intake focuses on reproduction: which SP, which indicator, what's wrong vs what's expected. Analysis checks the ingestion pipeline for the affected SP.",
      checklist: ["SP and specific indicator/chart named", "Current (wrong) value and expected (correct) value", "Reporting period affected", "When it last showed correct data", "Recent changes to upload format or dashboard config"],
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px", background: C.bg }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Documentation</div>
        <h1 style={{ color: C.navy, fontSize: 26, fontWeight: 700, margin: "0 0 12px", fontFamily: "'Playfair Display', Georgia, serif" }}>Delivery pipeline</h1>
        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, maxWidth: 580, margin: 0 }}>
          Every request follows a five-step pipeline. Two review gates — one with RSTO, one with PALO — ensure nothing reaches the development team until it is fully understood, agreed, and specified.
        </p>
      </div>

      {/* Work types section */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ color: C.navy, fontSize: 17, fontWeight: 700, margin: "0 0 6px", fontFamily: "'Playfair Display', Georgia, serif" }}>Work types</h2>
        <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 560 }}>
          The agent classifies each request into one of these types. Each type has a different checklist, a different pipeline emphasis, and a different owner.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {workTypes.map(wt => (
            <div key={wt.id} style={{
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${wt.color}`, borderRadius: "0 10px 10px 0",
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{wt.icon}</span>
                <span style={{ color: C.navy, fontSize: 14, fontWeight: 700 }}>{wt.label}</span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                  background: wt.colorDim, color: wt.color, border: `1px solid ${wt.colorBorder}`,
                  whiteSpace: "nowrap",
                }}>{wt.owner}</span>
              </div>
              <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.55, marginBottom: 10 }}>{wt.description}</div>
              <div style={{ background: wt.colorDim, borderRadius: 6, padding: "7px 10px", marginBottom: 10, border: `1px solid ${wt.colorBorder}` }}>
                <div style={{ color: wt.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>Pipeline note</div>
                <div style={{ color: C.text, fontSize: 11, lineHeight: 1.5 }}>{wt.pipelineNote}</div>
              </div>
              <div style={{ color: C.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>Key checklist items</div>
              {wt.checklist.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 3 }}>
                  <span style={{ color: wt.color, fontSize: 9, flexShrink: 0, marginTop: 3 }}>●</span>
                  <span style={{ color: C.textMuted, fontSize: 11, lineHeight: 1.45 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline steps */}
      <h2 style={{ color: C.navy, fontSize: 17, fontWeight: 700, margin: "0 0 20px", fontFamily: "'Playfair Display', Georgia, serif" }}>Pipeline steps</h2>
      <div style={{ maxWidth: 660, position: "relative" }}>
        {/* Vertical connecting line */}
        <div style={{
          position: "absolute", left: 19, top: 20, bottom: 20, width: 2, zIndex: 0,
          background: `linear-gradient(to bottom, ${C.brandBorder} 0%, ${C.tealBorder} 50%, ${C.brandBorder} 100%)`,
        }} />

        {steps.map((step, i) => (
          step.type === "agent" ? (
            <div key={i} style={{ display: "flex", gap: 20, marginBottom: 24, position: "relative", zIndex: 1 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: step.color, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700,
                boxShadow: `0 0 0 4px ${step.colorDim}, 0 0 0 6px ${step.color}33`,
              }}>
                {step.number}
              </div>
              <div style={{
                flex: 1, background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${step.color}`,
                borderRadius: "0 10px 10px 0",
                padding: "16px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ color: C.navy, fontSize: 15, fontWeight: 700 }}>{step.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
                    padding: "2px 7px", borderRadius: 4,
                    background: step.colorDim, color: step.color, border: `1px solid ${step.color}44`,
                  }}>{step.badge}</span>
                </div>
                <div style={{ color: C.textMuted, fontSize: 12, fontStyle: "italic", marginBottom: 10 }}>{step.tagline}</div>
                <div style={{ color: C.text, fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>{step.description}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: C.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Inputs</div>
                    {step.inputs.map((inp, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                        <span style={{ color: C.borderStrong, fontSize: 11, lineHeight: 1.5, flexShrink: 0, marginTop: 1 }}>→</span>
                        <span style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.45 }}>{inp}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ color: C.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Outputs</div>
                    {step.outputs.map((out, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                        <span style={{ color: step.color, fontSize: 10, lineHeight: 1.5, flexShrink: 0, marginTop: 2 }}>✓</span>
                        <span style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.45 }}>{out}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  background: C.bgSubtle, borderRadius: 6, padding: "8px 12px",
                  color: C.textMuted, fontSize: 11, lineHeight: 1.55,
                  borderLeft: `2px solid ${C.borderMed}`,
                }}>{step.note}</div>
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", gap: 20, marginBottom: 24, position: "relative", zIndex: 1 }}>
              <div style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{
                  width: 26, height: 26, background: step.color,
                  transform: "rotate(45deg)", borderRadius: 4,
                  boxShadow: `0 0 0 4px ${step.colorDim}, 0 0 0 6px ${step.color}33`,
                }} />
                <span style={{ position: "absolute", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0 }}>G</span>
              </div>
              <div style={{
                flex: 1, background: step.colorDim,
                border: `1px solid ${step.color}55`,
                borderLeft: `3px solid ${step.color}`,
                borderRadius: "0 10px 10px 0",
                padding: "16px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: C.navy, fontSize: 15, fontWeight: 700 }}>{step.name}</span>
                  <span style={{ color: C.textMuted, fontSize: 13 }}>—</span>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{step.subtitle}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
                    textTransform: "uppercase", padding: "2px 7px", borderRadius: 4,
                    background: step.color + "22", color: step.color, border: `1px solid ${step.color}44`,
                  }}>{step.badge}</span>
                </div>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
                  Reviewer: <span style={{ fontWeight: 600, color: C.text }}>{step.reviewer}</span>
                </div>
                <div style={{ color: C.navy, fontSize: 13, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>"{step.question}"</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: C.green, fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", flexShrink: 0, paddingTop: 2 }}>PASS</span>
                    <span style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>{step.pass}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: C.amber, fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", flexShrink: 0, paddingTop: 2 }}>REVISE</span>
                    <span style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>{step.fail}</span>
                  </div>
                </div>
                <div style={{ color: C.textMuted, fontSize: 11, lineHeight: 1.55, borderTop: `1px solid ${step.color}33`, paddingTop: 10 }}>
                  {step.note}
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

// ─── Repo audit view ──────────────────────────────────────────────────────────
const REPO_AUDIT_SYSTEM = `You are auditing the rsto-context repository to produce a structured status report of what has been built, what is in progress, and what is missing or unknown.

Respond with ONLY valid JSON — no preamble, no markdown fences.

Produce this structure:
{
  "indicators": {
    "pp": [{ "id": "QN1", "name": "string", "status": "implemented|in-development|planned|unknown", "notes": "one line" }],
    "ecec": [...],
    "anc": [...]
  },
  "serviceProviders": [
    { "name": "string", "strategy": "PP|ECEC|ANC", "community": "string", "status": "implemented|in-development|planned", "dashboards": ["service|community"], "dataFiles": ["file names if known"], "notes": "one line" }
  ],
  "communities": [
    { "name": "string", "strategy": "PP|ECEC|ANC", "status": "implemented|in-development|design-discovery|not-started", "designConfirmed": true, "notes": "one line" }
  ],
  "platformFeatures": [
    { "id": "string", "name": "string", "status": "implemented|in-development|planned", "notes": "one line" }
  ],
  "knownGaps": [
    { "area": "string", "gap": "string", "severity": "blocks|risk|minor" }
  ],
  "summary": "2-3 sentences describing the overall build status"
}

Base your audit strictly on the files provided. Do not invent. Mark status as "unknown" if you cannot determine it from the content.`;

function RepoAuditView() {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("indicators");

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      // Read key audit files from the repo
      const filesToRead = [
        "docs/06-indicators/pp/pp-indicator-overview.md",
        "docs/06-indicators/ecec",
        "docs/06-indicators/anc",
        "docs/05-partners/service-providers-and-communities.md",
        "docs/05-partners/service-providers/pp",
        "docs/05-partners/service-providers/ecec",
        "docs/08-features/implemented",
        "docs/08-features/in-development",
        "docs/08-features/planning",
        "docs/07-onboarding/onboarding-guides",
        "docs/project-structure.md",
      ];

      const repoContext = await readRepoFiles(filesToRead, null);

      if (repoContext.length === 0) {
        setError("Could not read the rsto-context repository. The filesystem connection may not be available in this environment. Run the audit from your local dev server.");
        setLoading(false);
        return;
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: REPO_AUDIT_SYSTEM,
          messages: [{
            role: "user",
            content: `Audit the rsto-context repository based on these files:\n\n${repoContext.map(f => `### ${f.path}\n${f.content}`).join("\n\n")}`,
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(clean); }
      catch { const m = clean.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error("Could not parse audit JSON"); }
      setAudit(parsed);
    } catch (e) {
      setError("Audit failed: " + e.message);
    }
    setLoading(false);
  }

  function statusStyle(s) {
    const map = {
      "implemented":      { color: C.green,    bg: C.greenDim,   label: "Built" },
      "in-development":   { color: C.teal,     bg: C.tealDim,    label: "In dev" },
      "planned":          { color: C.brand,    bg: C.brandDim,   label: "Planned" },
      "design-discovery": { color: C.amber,    bg: C.amberDim,   label: "Design" },
      "not-started":      { color: C.textDim,  bg: C.bgSubtle,   label: "Not started" },
      "unknown":          { color: C.textDim,  bg: C.bgSubtle,   label: "Unknown" },
      "partial":          { color: C.amber,    bg: C.amberDim,   label: "Partial" },
    };
    return map[s] || map["unknown"];
  }

  function StatusBadge({ status }) {
    const s = statusStyle(status);
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.color}44`, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {s.label}
      </span>
    );
  }

  const tabs = ["indicators", "service providers", "communities", "features", "gaps"];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: C.bgPanel, borderBottom: `1px solid ${C.border}`, padding: "20px 32px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Repository</div>
            <h1 style={{ color: C.navy, fontSize: 26, fontWeight: 700, margin: "0 0 6px", fontFamily: "'Playfair Display', Georgia, serif" }}>Build audit</h1>
            <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
              {audit ? `Last run ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} — reads rsto-context directly` : "Reads rsto-context and reports what is built, in progress, and missing."}
            </p>
          </div>
          {!audit && !loading && (
            <button onClick={runAudit} style={{
              background: C.brand, color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: `0 1px 3px ${C.brand}44`,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>
              Run audit
            </button>
          )}
          {audit && (
            <button onClick={runAudit} disabled={loading} style={{
              background: C.bgCard, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 14px", fontSize: 12, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1,
            }}>
              {loading ? "Running…" : "Re-run audit"}
            </button>
          )}
        </div>
        {audit && (
          <div style={{ display: "flex", gap: 2 }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: "transparent", border: "none",
                borderBottom: activeTab === tab ? `2px solid ${C.teal}` : "2px solid transparent",
                color: activeTab === tab ? C.teal : C.textMuted,
                fontSize: 12, fontWeight: activeTab === tab ? 600 : 400,
                padding: "6px 12px 10px", cursor: "pointer", textTransform: "capitalize",
              }}>{tab}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.textMuted, fontSize: 13 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.brand, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
              </div>
              Reading rsto-context and generating audit…
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 8, padding: 16, color: C.red, fontSize: 13 }}>{error}</div>
        )}

        {!audit && !loading && !error && (
          <div style={{ maxWidth: 480, color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>
            The audit reads the rsto-context repository directly — indicators, service provider specs, feature docs, and onboarding guides — and produces a structured status report. It requires the filesystem connection to be available (local dev environment only).
          </div>
        )}

        {audit && (
          <>
            {/* Summary banner */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>Summary</div>
              <div style={{ color: C.navy, fontSize: 13, lineHeight: 1.7 }}>{audit.summary}</div>
            </div>

            {activeTab === "indicators" && (
              <div>
                {[["pp","PP — Parenting Programs"], ["ecec","ECEC — Early Childhood"], ["anc","ANC — Antenatal Care"]].map(([key, label]) => {
                  const items = audit.indicators?.[key] || [];
                  return (
                    <div key={key} style={{ marginBottom: 20 }}>
                      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
                      {items.length === 0 ? (
                        <div style={{ color: C.textDim, fontSize: 13, padding: "10px 0" }}>No indicators found in repo</div>
                      ) : (
                        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                          {items.map((ind, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < items.length-1 ? `1px solid ${C.border}` : "none" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 12, color: C.textDim, minWidth: 36 }}>{ind.id}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: C.navy, fontSize: 13, fontWeight: 500 }}>{ind.name}</div>
                                {ind.notes && <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{ind.notes}</div>}
                              </div>
                              <StatusBadge status={ind.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "service providers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(audit.serviceProviders || []).map((sp, i) => (
                  <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, background: C.tealDim, color: C.tealDark, padding: "2px 6px", borderRadius: 3 }}>{sp.strategy}</span>
                          <span style={{ color: C.navy, fontSize: 13, fontWeight: 600 }}>{sp.name}</span>
                          {sp.community && <span style={{ color: C.textMuted, fontSize: 12 }}>· {sp.community}</span>}
                        </div>
                        {sp.notes && <div style={{ color: C.textMuted, fontSize: 12 }}>{sp.notes}</div>}
                      </div>
                      <StatusBadge status={sp.status} />
                    </div>
                    {(sp.dashboards?.length > 0 || sp.dataFiles?.length > 0) && (
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                        {sp.dashboards?.length > 0 && (
                          <div>
                            <div style={{ color: C.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Dashboards</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {sp.dashboards.map(d => <span key={d} style={{ fontSize: 11, background: C.bgSubtle, color: C.textMuted, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>{d}</span>)}
                            </div>
                          </div>
                        )}
                        {sp.dataFiles?.length > 0 && (
                          <div>
                            <div style={{ color: C.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Data files</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {sp.dataFiles.map(f => <span key={f} style={{ fontSize: 11, background: C.docDim, color: C.docColor, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.docBorder}` }}>{f}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "communities" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(audit.communities || []).map((c, i) => (
                  <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, background: C.tealDim, color: C.tealDark, padding: "2px 6px", borderRadius: 3 }}>{c.strategy}</span>
                          <span style={{ color: C.navy, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                          {c.designConfirmed !== undefined && (
                            <span style={{ fontSize: 11, color: c.designConfirmed ? C.green : C.amber }}>
                              {c.designConfirmed ? "✓ Design confirmed" : "⚠ Design TBC"}
                            </span>
                          )}
                        </div>
                        {c.notes && <div style={{ color: C.textMuted, fontSize: 12 }}>{c.notes}</div>}
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "features" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(audit.platformFeatures || []).map((f, i) => (
                  <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: C.textDim, minWidth: 60 }}>{f.id}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.navy, fontSize: 13, fontWeight: 500 }}>{f.name}</div>
                      {f.notes && <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{f.notes}</div>}
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "gaps" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(audit.knownGaps || []).length === 0 && (
                  <div style={{ color: C.textMuted, fontSize: 13 }}>No gaps identified in current repo content.</div>
                )}
                {(audit.knownGaps || []).map((g, i) => {
                  const sev = { blocks: { color: C.red, bg: C.redDim }, risk: { color: C.amber, bg: C.amberDim }, minor: { color: C.textMuted, bg: C.bgSubtle } }[g.severity] || {};
                  return (
                    <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderLeft: `4px solid ${sev.color}`, borderRadius: "0 10px 10px 0", padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: sev.bg, color: sev.color, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>{g.severity}</span>
                        <div>
                          <div style={{ color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{g.area}</div>
                          <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>{g.gap}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── Markdown generator for saved requests ────────────────────────────────────
function generateMarkdown(request) {
  const { title, gate1Summary, reqDoc, deliveryOutput, createdAt } = request;
  const lines = [];
  lines.push(`# ${reqDoc?.title || title || "Requirement Document"}`);
  lines.push(`\n_Generated: ${new Date(createdAt).toLocaleDateString("en-AU")}_\n`);

  if (gate1Summary) {
    lines.push(`## Gate 1 Summary\n\n${gate1Summary}\n`);
  }

  if (reqDoc) {
    lines.push(`## Description\n\n${reqDoc.description}\n`);
    if (reqDoc.why) lines.push(`### Why\n\n${reqDoc.why}\n`);
    lines.push(`## Priority\n\n${reqDoc.priority}\n`);

    if (reqDoc.acceptanceCriteria?.length) {
      lines.push(`## Acceptance Criteria\n`);
      reqDoc.acceptanceCriteria.forEach(ac => {
        lines.push(`- [ ] ${ac.text || ac} _(${ac.confidence || "assumed"})_`);
      });
      lines.push("");
    }

    if (reqDoc.openDecisions?.length) {
      lines.push(`## Open Decisions\n`);
      reqDoc.openDecisions.forEach(d => {
        lines.push(`- **${d.owner}**${d.blocksProgress ? " 🚫 BLOCKS" : ""}: ${d.question}`);
      });
      lines.push("");
    }

    if (reqDoc.subtasks?.length) {
      lines.push(`## Subtasks\n`);
      reqDoc.subtasks.forEach(t => {
        lines.push(`- [${t.id}] ${t.title} _(${t.layer})_`);
      });
      lines.push("");
    }
  }

  if (deliveryOutput?.notionTicket) {
    const nt = deliveryOutput.notionTicket;
    lines.push(`## Notion Ticket\n`);
    lines.push(`**Title:** ${nt.title}`);
    lines.push(`**Status:** ${nt.status}`);
    lines.push(`**Priority:** ${nt.priority}\n`);
    lines.push(`${nt.description}\n`);
    if (nt.acceptanceCriteria?.length) {
      lines.push(`### Acceptance Criteria\n`);
      nt.acceptanceCriteria.forEach(ac => lines.push(`- [ ] ${ac}`));
      lines.push("");
    }
  }

  if (deliveryOutput?.meetingPrepDoc) {
    const mp = deliveryOutput.meetingPrepDoc;
    lines.push(`## Meeting Prep\n`);
    lines.push(`### What we're building\n\n${mp.whatWeAreBuilding}\n`);
    if (mp.decisionsNeeded?.length) {
      lines.push(`### Decisions needed\n`);
      mp.decisionsNeeded.forEach(d => lines.push(`- [${d.owner}] ${d.question}`));
      lines.push("");
    }
    if (mp.devQuestions?.length) {
      lines.push(`### Dev questions\n`);
      mp.devQuestions.forEach(q => lines.push(`- ${q}`));
      lines.push("");
    }
    if (mp.suggestedAgenda?.length) {
      lines.push(`### Agenda (30 min)\n`);
      mp.suggestedAgenda.forEach(a => lines.push(`- ${a.minutes} min: ${a.item}`));
      lines.push("");
    }
  }

  if (deliveryOutput?.sequencingAdvice) {
    const sa = deliveryOutput.sequencingAdvice;
    lines.push(`## Sequencing\n`);
    if (sa.suggestedSprint) lines.push(`**Sprint:** ${sa.suggestedSprint}\n`);
    if (sa.dependencies?.length) {
      lines.push(`### Dependencies\n`);
      sa.dependencies.forEach(d => lines.push(`- ${d}`));
      lines.push("");
    }
    if (sa.risks?.length) {
      lines.push(`### Risks\n`);
      sa.risks.forEach(r => lines.push(`- ${r}`));
      lines.push("");
    }
  }

  // ── Dev workflow sections ──────────────────────────────────────────────────
  lines.push(`---\n`);
  lines.push(`## Section: Scope\n`);
  lines.push(`### Strategy & Indicators\n`);
  lines.push(`| Strategy | Indicators | Frequency | Type |`);
  lines.push(`|----------|-----------|-----------|------|`);
  lines.push(`| | | | |\n`);
  lines.push(`### Service Providers Affected\n`);
  lines.push(`| SP Name | Group Alias | Strategy | Notes |`);
  lines.push(`|---------|-------------|----------|-------|`);
  lines.push(`| | | | |\n`);

  lines.push(`## Section: Data Design\n`);
  lines.push(`### Database Tables Involved\n`);
  lines.push(`| Table | Role | Key Fields |`);
  lines.push(`|-------|------|------------|`);
  lines.push(`| \`f_service_provider\` | SP entity | \`id\`, \`group_alias\`, \`type\` |`);
  lines.push(`| \`service_provider_strategy\` | SP ↔ strategy link | \`frequency\`, \`next_reporting_period_id\` |`);
  lines.push(`| \`submission_record\` | Upload tracking | \`status\`, \`publish_status\`, \`reporting_period_id\` |`);
  lines.push(`| \`reporting_period\` | Period definition | \`start_date\`, \`end_date\`, \`frequency\` |\n`);

  lines.push(`### Migration Requirements\n`);
  lines.push(`**Seed data needed?** Yes / No\n`);
  lines.push(`- [ ] Service provider entity (\`f_service_provider\`)`);
  lines.push(`- [ ] Strategy link (\`service_provider_strategy\`)`);
  lines.push(`- [ ] Submission record (\`submission_record\`)`);
  lines.push(`- [ ] Document link (\`service_provider_document\`)`);
  lines.push(`- [ ] Coverage area (\`service_provider_coverage\`)`);
  lines.push(`- [ ] Indicator details (\`service_provider_indicator_detail\`)`);
  lines.push(`- [ ] Strategy-specific tables (e.g., \`f_ecec_p_centre\`, \`f_anc_facility\`)`);
  lines.push(`- [ ] Community join table (\`community_service_provider\`)\n`);
  lines.push(`**Reporting period**: Which period should the initial submission point to?`);
  lines.push(`- Period: [e.g., Q4 2025 (2025-10-01 to 2025-12-31)]`);
  lines.push(`- Rationale: [e.g., mock data dates fall within this range]\n`);

  lines.push(`### Mock Data\n`);
  lines.push(`| File | Date field | Date range | Notes |`);
  lines.push(`|------|-----------|------------|-------|`);
  lines.push(`| | | | |\n`);

  lines.push(`## Section: Backend Implementation\n`);
  lines.push(`### API Endpoints\n`);
  lines.push(`| Method | Path | Purpose |`);
  lines.push(`|--------|------|---------|`);
  lines.push(`| \`GET\` | \`/v1/[strategy]/[indicator]/insight\` | Insight card data |`);
  lines.push(`| \`GET\` | \`/v1/[strategy]/[indicator]/chart\` | Chart data |\n`);

  lines.push(`### Key Services\n`);
  lines.push(`| Service | Location | Purpose |`);
  lines.push(`|---------|----------|---------|`);
  lines.push(`| | \`src/indicator/[strategy]/[indicator]/\` | |\n`);

  lines.push(`### Query Logic\n`);
  lines.push(`**Insight query filters**:`);
  lines.push(`- \`[date_field] >= reporting_period.start_date\``);
  lines.push(`- \`[date_field] <= reporting_period.end_date\``);
  lines.push(`- \`submission_id IN (submission records with status = 'SUCCESS')\`\n`);
  lines.push(`**Chart query filters**:`);
  lines.push(`- Same as insight but looks back 1 year from reporting period start\n`);

  lines.push(`### Transformer\n`);
  lines.push(`| Transformer | Location | Document Type |`);
  lines.push(`|-------------|----------|---------------|`);
  lines.push(`| | \`src/transformation/spData/[strategy]/\` | |\n`);

  lines.push(`## Section: Frontend Implementation\n`);
  lines.push(`### Existing Components to Reuse\n`);
  lines.push(`Check these locations before creating anything new:`);
  lines.push(`- \`src/components/atoms/\` — Base UI components`);
  lines.push(`- \`src/components/molecules/\` — Composite UI components`);
  lines.push(`- \`src/lib/\` — Utility functions (dates, numbers, colours)\n`);

  lines.push(`### New Components Needed\n`);
  lines.push(`| Component | Location | Type | Notes |`);
  lines.push(`|-----------|----------|------|-------|`);
  lines.push(`| | \`src/components/organisms/Indicator/Implementations/[Name]/\` | Organism | |\n`);

  lines.push(`### Store & Hooks\n`);
  lines.push(`| Item | Location | Notes |`);
  lines.push(`|------|----------|-------|`);
  lines.push(`| MobX Store | \`src/stores/indicatorStores/serviceProvider/[name]Store/\` | Register in \`rootStore/index.tsx\` |`);
  lines.push(`| Graph Hook | \`src/hooks/apiHooks/indicators/[strategy]/[name]/use[Name]GraphData/\` | SWR-based |`);
  lines.push(`| Insight Hook | \`src/hooks/apiHooks/indicators/[strategy]/[name]/use[Name]InsightsData/\` | SWR-based |`);
  lines.push(`| Hydrator | \`src/hooks/apiHooks/indicators/[strategy]/[name]/use[Name]StoreHydrator/\` | Connects hooks to store |\n`);

  lines.push(`## Section: UI Components\n`);
  lines.push(`### Insight Cards\n`);
  lines.push(`| Card | Metric | Description Text |`);
  lines.push(`|------|--------|-----------------|`);
  lines.push(`| | | |\n`);
  lines.push(`### Charts\n`);
  lines.push(`| Chart | Type | X-Axis | Y-Axis | Filters |`);
  lines.push(`|-------|------|--------|--------|---------|`);
  lines.push(`| | | | | |\n`);

  lines.push(`## Section: Implementation Checklist\n`);
  lines.push(`### Backend (rsto-data)`);
  lines.push(`- [ ] Create migration seed file (\`src/migrations/data-seed-migrations/\`)`);
  lines.push(`- [ ] Verify transformer handles new SP (\`src/transformation/spData/transformerFactory.ts\`)`);
  lines.push(`- [ ] Verify indicator service works for new SP`);
  lines.push(`- [ ] Test upload → transform → query flow locally\n`);
  lines.push(`### Frontend (rsto-app)`);
  lines.push(`- [ ] Verify existing indicator components render for new SP`);
  lines.push(`- [ ] Check routing / navigation includes new SP`);
  lines.push(`- [ ] Test insight cards show correct data`);
  lines.push(`- [ ] Test charts render with correct date ranges`);
  lines.push(`- [ ] Test empty states / loading states\n`);
  lines.push(`### Data Validation`);
  lines.push(`- [ ] Mock CSV dates align with reporting period`);
  lines.push(`- [ ] Upload via UI succeeds (status → SUCCESS)`);
  lines.push(`- [ ] Insight cards show non-zero values`);
  lines.push(`- [ ] Chart shows data across expected time range`);
  lines.push(`- [ ] Publish flow creates next reporting period correctly\n`);

  lines.push(`## Decisions\n`);
  lines.push(`| # | Decision | Choice | Reason |`);
  lines.push(`|---|----------|--------|--------|`);
  lines.push(`| 1 | | | |\n`);

  lines.push(`## Remaining Questions\n`);
  lines.push(`- [ ] \n`);

  lines.push(`## Change History\n`);
  lines.push(`| Date | Change | Description |`);
  lines.push(`|------|--------|-------------|`);
  lines.push(`| ${new Date().toISOString().slice(0, 10)} | Initial draft | Generated by PO agent |`);

  return lines.join("\n");
}

function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function saveDocToRepo(content, filename) {
  const outputDir = `${REPO_BASE}/rsto-context/docs/10-generated-requirements`;
  try {
    const res = await fetch("/api/save-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: `${outputDir}/${filename}`, content }),
    });
    const data = await res.json();
    return data.ok ? null : (data.error || "Unknown error");
  } catch (e) {
    return e.message;
  }
}

// ─── Requests list + detail ────────────────────────────────────────────────────
function stageLabel(req) {
  if (req.stage === "complete" || req.deliveryOutput) return "Complete";
  if (req.stage === "delivery") return "Generating delivery";
  if (req.stage === "gate2") return "Gate 2 pending";
  return "In intake";
}

function stageBadgeStyle(req) {
  if (req.stage === "complete" || req.deliveryOutput) return { color: C.green, bg: C.greenDim, border: `${C.green}44` };
  if (req.stage === "gate2") return { color: C.teal, bg: C.tealDim, border: `${C.teal}44` };
  return { color: C.brand, bg: C.brandDim, border: `${C.brand}44` };
}

function RequestsList({ onOpenRequest, onNewRequest }) {
  const [requests, setRequests] = useState(() => getRequests());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [tab, setTab] = useState("all"); // all | docs
  const [saveStatus, setSaveStatus] = useState({}); // id → "saving" | "saved" | "error"

  function refresh() { setRequests(getRequests()); }

  function handleDelete(id) {
    deleteRequest(id);
    setConfirmDelete(null);
    refresh();
  }

  async function handleSaveToRepo(req) {
    const slug = (req.title || req.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    const filename = `${slug}-${req.id.slice(-6)}.md`;
    setSaveStatus(s => ({ ...s, [req.id]: "saving" }));
    const err = await saveDocToRepo(generateMarkdown(req), filename);
    setSaveStatus(s => ({ ...s, [req.id]: err ? "error" : "saved" }));
    if (err) setTimeout(() => setSaveStatus(s => ({ ...s, [req.id]: null })), 3000);
  }

  function handleDownload(req) {
    const slug = (req.title || req.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    downloadMarkdown(generateMarkdown(req), `${slug}.md`);
  }

  const allRequests = requests;
  const docRequests = requests.filter(r => r.reqDoc || r.deliveryOutput);
  const displayed = tab === "docs" ? docRequests : allRequests;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: C.bgPanel, borderBottom: `1px solid ${C.border}`, padding: "20px 32px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ color: C.navy, fontSize: 26, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Requests</h1>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{allRequests.length} total · {docRequests.length} with generated docs</div>
          </div>
          <button onClick={onNewRequest} style={{
            background: C.brand, color: "#fff", border: "none", borderRadius: 8,
            padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New request
          </button>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {[["all", "All requests"], ["docs", "Generated docs"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: "transparent", border: "none",
              borderBottom: tab === id ? `2px solid ${C.teal}` : "2px solid transparent",
              color: tab === id ? C.teal : C.textMuted,
              fontSize: 12, fontWeight: tab === id ? 600 : 400,
              padding: "6px 14px 10px", cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {displayed.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 13, padding: "32px 0" }}>
            {tab === "docs" ? "No generated documents yet. Complete a request to produce requirement docs and meeting prep." : "No requests yet. Use 'New request' to start one."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {displayed.map(req => {
              const badge = stageBadgeStyle(req);
              const isDeleting = confirmDelete === req.id;
              const saveState = saveStatus[req.id];
              const hasDoc = req.reqDoc || req.deliveryOutput;
              return (
                <div key={req.id} style={{
                  background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: "14px 18px", cursor: "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                }}
                  onClick={() => !isDeleting && onOpenRequest(req)}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = C.borderMed; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = C.border; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                          background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                          letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
                        }}>{stageLabel(req)}</span>
                        {req.reqDoc?.requestType && (
                          <span style={{ color: C.textDim, fontSize: 11, background: C.bgSubtle, padding: "2px 7px", borderRadius: 4, fontFamily: "monospace" }}>
                            {req.reqDoc.requestType}
                          </span>
                        )}
                      </div>
                      <div style={{ color: C.navy, fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {req.reqDoc?.title || req.title || req.id}
                      </div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>
                        Started {new Date(req.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        {req.updatedAt !== req.createdAt && ` · Updated ${new Date(req.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      {hasDoc && (
                        <>
                          <button
                            onClick={() => handleDownload(req)}
                            title="Download as markdown"
                            style={{ background: C.bgSubtle, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 19h14"/><path d="M5 12l7 7 7-7"/></svg>
                            .md
                          </button>
                          <button
                            onClick={() => handleSaveToRepo(req)}
                            disabled={saveState === "saving"}
                            title="Save to rsto-context repo"
                            style={{
                              background: saveState === "saved" ? C.tealDim : saveState === "error" ? C.redDim : C.docDim,
                              color: saveState === "saved" ? C.teal : saveState === "error" ? C.red : C.docColor,
                              border: `1px solid ${saveState === "saved" ? C.tealBorder : saveState === "error" ? C.red + "44" : C.docBorder}`,
                              borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: saveState === "saving" ? "default" : "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Error" : "→ repo"}
                          </button>
                        </>
                      )}
                      {isDeleting ? (
                        <>
                          <span style={{ color: C.red, fontSize: 11 }}>Delete?</span>
                          <button onClick={() => handleDelete(req.id)} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Yes</button>
                          <button onClick={() => setConfirmDelete(null)} style={{ background: C.bgSubtle, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>No</button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(req.id)}
                          title="Delete request"
                          style={{ background: "transparent", color: C.textDim, border: `1px solid transparent`, borderRadius: 6, padding: "5px 7px", fontSize: 14, cursor: "pointer", lineHeight: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red + "44"; e.currentTarget.style.background = C.redDim; }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                        >×</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("tracker");
  const [openRequest, setOpenRequest] = useState(null); // null = new request

  function handleRequestUpdate(req) {
    saveRequest(req);
    // If the sidebar shows a requests count badge, no extra state needed — RequestsList reads localStorage directly
  }

  function handleOpenRequest(req) {
    setOpenRequest(req);
    setView("request");
  }

  function handleNewRequest() {
    setOpenRequest(null);
    setView("request");
  }

  function handleRequestComplete(req) {
    if (req) saveRequest({ ...req, stage: "complete" });
    setView("tracker");
    setOpenRequest(null);
  }

  const navItems = [
    { id: "tracker", label: "Work tracker", icon: "◫" },
    { id: "requests", label: "Requests", icon: "⊞" },
    { id: "request", label: "New request", icon: "+" },
    { id: "pipeline", label: "Pipeline guide", icon: "⊙" },
    { id: "audit", label: "Build audit", icon: "⊛" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet" />

      {/* Sidebar — full text nav */}
      <div style={{
        width: 220, background: C.bgPanel,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        flexShrink: 0,
      }}>
        {/* Logo / brand */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: C.brand,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 10h16M4 14h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ color: C.navy, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>RSTO PO</div>
              <div style={{ color: C.textDim, fontSize: 10, lineHeight: 1.4 }}>Delivery agent</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ padding: "12px 10px", flex: 1 }}>
          <div style={{ color: C.textDim, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 8px", marginBottom: 4 }}>Workspace</div>
          {navItems.map(item => {
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => {
                if (item.id === "request") handleNewRequest();
                else setView(item.id);
              }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 7, border: "none",
                background: active ? C.brandDim : "transparent",
                color: active ? C.brand : C.textMuted,
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: "pointer", marginBottom: 2, textAlign: "left",
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.bgSubtle; e.currentTarget.style.color = C.text; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; }}}
              >
                <span style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
                {item.id === "request" && view === "request" && (
                  <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: C.brand, flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px 20px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ color: C.textDim, fontSize: 10, lineHeight: 1.6 }}>RSTO PO agent · v0.1</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {view === "tracker" && <WorkTracker onNewRequest={handleNewRequest} onOpenRequest={handleOpenRequest} />}
        {view === "requests" && (
          <RequestsList
            onOpenRequest={handleOpenRequest}
            onNewRequest={handleNewRequest}
          />
        )}
        {view === "request" && (
          <RequestFlow
            key={openRequest?.id || "new"}
            initialRequest={openRequest}
            onUpdate={handleRequestUpdate}
            onComplete={handleRequestComplete}
          />
        )}
        {view === "pipeline" && <PipelinePage />}
        {view === "audit" && <RepoAuditView />}
      </div>
    </div>
  );
}

