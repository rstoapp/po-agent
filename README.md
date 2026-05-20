# RSTO PO Agent

A browser-based AI-powered product owner assistant for the RSTO delivery pipeline. It guides stakeholders through a structured intake process for incoming product requests, produces Gate 1 summaries, generates requirement documents, and outputs Notion-ready delivery tickets.

---

## What it does

The PO Agent runs a multi-stage pipeline for every incoming request: fghfgh

| Stage                       | Agent                | What it produces                                                                                                       |
| --------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **1. Intake**         | Intake Agent         | Classifies the request, asks clarifying questions, produces a Gate 1 plain-language summary                            |
| **2. Classification** | Classification Agent | Audits which required fields are confirmed, partial, or missing — displayed as a checklist                            |
| **3. Context**        | Context Agent        | Cross-references the request against the `rsto-context` repository to surface prior work, data gaps, and risks       |
| **4. Requirements**   | Requirements Agent   | Generates a structured requirement document with acceptance criteria, data specification, subtasks, and open decisions |
| **5. Delivery**       | Delivery Agent       | Outputs a Notion ticket draft and 30-minute meeting prep brief                                                         |

Each stage gates the next — the stakeholder reviews and approves before the pipeline advances.

---

## Request types

| Type                     | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `sp-onboarding`        | Adding a new service provider to the platform       |
| `community-onboarding` | Adding a new community-level dashboard              |
| `new-indicators`       | New data indicators in an existing or new dashboard |
| `data-bug`             | Incorrect, missing, or miscalculated data           |
| `enhancement`          | Improving an existing feature                       |
| `design-task`          | UX/visual design work (Figma, wireframes, mockups)  |
| `platform-admin`       | User access, exports, configuration                 |

---

## Tech stack

- **React 18** — UI
- **Vite 5** — dev server and build tool
- **Anthropic Claude** — AI pipeline (via `VITE_ANTHROPIC_KEY`)
- **Notion API** — live ticket data from STO and SUP databases (via Vite dev-server proxy)
- **localStorage** — request state persistence between sessions

---

## Getting started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- (Optional) A Notion integration token and database IDs for live ticket data

### Install

```bash
npm install
```

### Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Required — Claude AI
VITE_ANTHROPIC_KEY=sk-ant-your-key-here

# Optional — Notion live data
VITE_NOTION_TOKEN=secret_your-notion-token
VITE_NOTION_DATABASE_ID_STO=your-sto-database-id
VITE_NOTION_DATABASE_ID_SUP=your-sup-database-id
```

If Notion credentials are not provided the app falls back to built-in sample ticket data.

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
```

---

## Notion integration

The dev server proxies all `/api/notion` requests to `https://api.notion.com/v1`, injecting the `Authorization` and `Notion-Version` headers automatically. No CORS issues in development.

Two databases are supported:

| Variable                        | Database                           |
| ------------------------------- | ---------------------------------- |
| `VITE_NOTION_DATABASE_ID_STO` | STO — backlog and feature tickets |
| `VITE_NOTION_DATABASE_ID_SUP` | SUP — support and bug tickets     |

If your Notion database property names differ from the defaults, update the `FIELDS` mapping in `src/notionService.js`. To inspect the raw property names for your database, run this in the browser console while the dev server is running:

```js
import { fetchRawNotionPage } from "/src/notionService.js";
fetchRawNotionPage("sto"); // or "sup"
```

---

## Strategies

RSTO delivers dashboards for Australian early childhood service providers across three strategies:

- **PP** — Parenting Programs
- **ECEC** — Early Childhood Education and Care
- **ANC** — Antenatal Care

---

## Project structure

```
src/
  App.jsx           # Main UI — full pipeline, all agent prompts and stages
  notionService.js  # Notion API client — fetches and normalises tickets
  requestsStore.js  # localStorage persistence for pipeline requests
  main.jsx          # React entry point
vite.config.js      # Vite config — Notion proxy and save-doc middleware
```

---

## Requests store

All pipeline state is stored in `localStorage` under the key `rsto_requests_v1`. Each request persists its full stage history so it can be resumed or reviewed later. Requests survive page refreshes and browser restarts.
