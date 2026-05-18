// ─── Notion field name mapping ────────────────────────────────────────────────
// Update these constants to match your actual Notion database property names.
// Run `fetchRawNotionPage("sto")` or `fetchRawNotionPage("sup")` in the browser
// console to see the raw property names for each database, then update below.
// STO and SUP databases can have different property names — that's fine.
const FIELDS = {
  sto: {
    id:       "ID",           // unique_id → formats as "STO-166"
    title:    "Backlog Item", // title property
    type:     "Category",     // select — mapped to normaliseType below
    status:   "Status",       // status
    priority: "Priority",     // select
    strategy: null,           // not present in STO database
    sp:       null,           // not present in STO database
    created:  "Created :",    // created_time (note the space + colon)
  },
  sup: {
    id:       "Ticket ID",    // unique_id → formats as "SUP-59"
    title:    "Title",        // title
    type:     "Category",     // multi_select — first value mapped to normaliseType
    status:   "Status",       // status
    priority: "Priority",     // select
    strategy: "Strategy",     // multi_select — first value used
    sp:       "Requester",    // rich_text — person who raised the ticket
    created:  "Created time", // created_time
  },
};

const BASE = "/api/notion";
const TOKEN    = import.meta.env.VITE_NOTION_TOKEN;
const DB_STO   = import.meta.env.VITE_NOTION_DATABASE_ID_STO;
const DB_SUP   = import.meta.env.VITE_NOTION_DATABASE_ID_SUP;

function notionHeaders() {
  return { "Content-Type": "application/json" };
}

function extractText(prop) {
  if (!prop) return null;
  if (prop.type === "title")      return prop.title?.map(t => t.plain_text).join("") || null;
  if (prop.type === "rich_text")  return prop.rich_text?.map(t => t.plain_text).join("") || null;
  if (prop.type === "select")       return prop.select?.name ?? null;
  if (prop.type === "multi_select") return prop.multi_select?.[0]?.name ?? null;
  if (prop.type === "status")     return prop.status?.name ?? null;
  if (prop.type === "formula")    return prop.formula?.string ?? prop.formula?.number?.toString() ?? null;
  if (prop.type === "relation")   return prop.relation?.length > 0 ? prop.relation.map(r => r.id) : [];
  if (prop.type === "created_time") return prop.created_time ?? null;
  if (prop.type === "date")       return prop.date?.start ?? null;
  if (prop.type === "unique_id")  {
    const u = prop.unique_id;
    return u ? `${u.prefix ? u.prefix + '-' : ''}${u.number}` : null;
  }
  return null;
}

function ageInDays(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function normaliseStatus(raw) {
  if (!raw) return "not-started";
  const s = raw.toLowerCase();
  const map = {
    "in-progress": "in-progress", "in progress": "in-progress",
    "not-started": "not-started", "not started": "not-started",
    "new": "new", "paused": "paused", "blocked": "blocked",
    "ready": "ready", "done": "done",
  };
  return map[s] || map[s.replace(/\s+/g, "-")] || "not-started";
}

function normalisePriority(raw) {
  if (!raw) return "medium";
  const p = raw.toLowerCase();
  return ["critical", "high", "medium", "low"].includes(p) ? p : "medium";
}

function normaliseType(raw) {
  if (!raw) return "feature";
  const map = { feature: "feature", onboarding: "onboarding", bug: "bug", enhancement: "enhancement", admin: "admin" };
  return map[raw.toLowerCase()] || "feature";
}

function pageToTicket(page, fields) {
  const p = page.properties;
  const titleProp = p[fields.title] || Object.values(p).find(v => v.type === "title");
  const title      = extractText(titleProp) || "Untitled";
  const id         = extractText(p[fields.id]) || page.id.slice(0, 8).toUpperCase();
  const createdStr = (fields.created ? extractText(p[fields.created]) : null) || page.created_time;
  const subtasksRaw = extractText(p["Sub-tasks"]);

  return {
    id,
    title,
    type:      normaliseType(fields.type ? extractText(p[fields.type]) : null),
    status:    normaliseStatus(extractText(p[fields.status])),
    priority:  normalisePriority(extractText(p[fields.priority])),
    strategy:  fields.strategy ? extractText(p[fields.strategy]) : null,
    sp:        fields.sp ? extractText(p[fields.sp]) : null,
    age:       ageInDays(createdStr),
    subtasks:  Array.isArray(subtasksRaw) ? subtasksRaw : [],
    notionUrl: page.url,
    notionId:  page.id,
  };
}

async function queryDatabase(dbId, fields) {
  const res = await fetch(`${BASE}/databases/${dbId}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 50,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Notion API ${res.status}: ${err.message || res.statusText}`);
  }
  const data = await res.json();
  return data.results.map(page => pageToTicket(page, fields));
}

export async function fetchTickets() {
  if (!TOKEN) return null; // signals caller to use fallback data

  const queries = [];
  if (DB_STO) queries.push(queryDatabase(DB_STO, FIELDS.sto));
  if (DB_SUP) queries.push(queryDatabase(DB_SUP, FIELDS.sup));
  if (queries.length === 0) return null;

  const results = await Promise.allSettled(queries);
  const tickets = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);

  const failures = results.filter(r => r.status === "rejected");
  if (failures.length > 0) {
    console.warn("Some Notion databases failed to load:", failures.map(f => f.reason?.message));
  }

  return tickets.length > 0 ? tickets : null;
}

// Dev helper — call in browser console to inspect raw property names.
// Usage: fetchRawNotionPage("sto") or fetchRawNotionPage("sup")
export async function fetchRawNotionPage(db = "sto") {
  const dbId = db === "sup" ? DB_SUP : DB_STO;
  if (!TOKEN) { console.warn("Set VITE_NOTION_TOKEN in .env first"); return; }
  if (!dbId)  { console.warn(`Set VITE_NOTION_DATABASE_ID_${db.toUpperCase()} in .env first`); return; }
  const res = await fetch(`${BASE}/databases/${dbId}/query`, {
    method: "POST", headers: notionHeaders(),
    body: JSON.stringify({ page_size: 1 }),
  });
  const data = await res.json();
  const page = data.results?.[0];
  if (!page) { console.warn("No pages found in database"); return; }
  console.log(`${db.toUpperCase()} property names and types:`);
  Object.entries(page.properties).forEach(([name, val]) => console.log(`  "${name}" → ${val.type}`));
  return page.properties;
}
