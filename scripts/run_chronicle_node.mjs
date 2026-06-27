import fs from "node:fs"
import path from "node:path"
import http from "node:http"
import { fileURLToPath } from "node:url"
import { createChronicleTimeline } from "../src/chronicle_mvp_timeline_generator_core.mjs"

const PORT = 8080
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, "../data")
const STORE_PATH = path.join(DATA_DIR, "chronicle-local-store.json")

/** @type {import('../src/chronicle_mvp_data_model.ts').ChronicleEntry[]} */
const entryStore = []

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadStore() {
  ensureDataDir()

  if (!fs.existsSync(STORE_PATH)) {
    entryStore.splice(0, entryStore.length)
    return
  }

  const raw = fs.readFileSync(STORE_PATH, "utf8")
  const parsed = raw ? JSON.parse(raw) : { entries: [] }
  const entries = Array.isArray(parsed.entries) ? parsed.entries : []

  entryStore.splice(0, entryStore.length, ...entries)
}

function saveStore() {
  ensureDataDir()
  fs.writeFileSync(STORE_PATH, JSON.stringify({ entries: entryStore }, null, 2) + "\n", "utf8")
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" })
  response.end(JSON.stringify(payload, null, 2))
}

function text(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "text/markdown; charset=utf-8" })
  response.end(payload)
}

function html(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "text/html; charset=utf-8" })
  response.end(payload)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ""

    request.on("data", (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"))
        request.destroy()
      }
    })

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })

    request.on("error", reject)
  })
}

function isValidProofObjectRef(ref) {
  return (
    ref &&
    typeof ref === "object" &&
    typeof ref.proof_object_id === "string" &&
    typeof ref.proof_system === "string"
  )
}

function isValidChronicleEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.entry_id === "string" &&
    Array.isArray(entry.proof_object_refs) &&
    entry.proof_object_refs.length > 0 &&
    entry.proof_object_refs.every(isValidProofObjectRef) &&
    typeof entry.created_at === "string"
  )
}

function isValidReceiptProofObject(proof) {
  return (
    proof &&
    typeof proof === "object" &&
    typeof proof.proof_object_id === "string" &&
    typeof proof.proof_system === "string" &&
    proof.proof_system === "ReceiptOS"
  )
}

function compareEntries(a, b) {
  const aTs = a.created_at ?? ""
  const bTs = b.created_at ?? ""
  if (aTs !== bTs) return aTs.localeCompare(bTs)

  const aPos = a.chronology_position ?? ""
  const bPos = b.chronology_position ?? ""
  if (aPos !== bPos) return String(aPos).localeCompare(String(bPos))

  return a.entry_id.localeCompare(b.entry_id)
}

function deriveChronicleEdges(entries) {
  const ordered = [...entries].sort(compareEntries)
  const edges = []

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]

    edges.push({
      edge_id: `edge-${previous.entry_id}-to-${current.entry_id}`,
      from_entry_id: previous.entry_id,
      to_entry_id: current.entry_id,
      relation_type: current.relation_type ?? "continuation_of",
      created_at: current.created_at,
      metadata: {
        derived_by: "chronicle-local-node",
        derived: true,
      },
    })
  }

  return edges
}

function buildTimeline() {
  const edges = deriveChronicleEdges(entryStore)
  return createChronicleTimeline({
    entries: entryStore,
    edges,
    timeline_id: "chronicle-local-node-timeline",
    title: "Chronicle Local Node Timeline",
  })
}

function renderMarkdownTimeline(timeline) {
  const lines = ["# Chronicle Local Node History", ""]

  if (timeline.events.length === 0) {
    lines.push("No Chronicle entries stored yet.")
    return lines.join("\n")
  }

  for (const event of timeline.events) {
    lines.push(`- **${event.timestamp ?? "unknown time"}** — ${event.display_label}`)
    lines.push(`  - relation: \`${event.relation_type}\``)
    lines.push(`  - entry: \`${event.entry_id}\``)
    if (event.edge_id) lines.push(`  - edge: \`${event.edge_id}\``)
    lines.push(`  - proof refs: ${event.proof_object_refs.map((ref) => `\`${ref.proof_object_id}\``).join(", ")}`)
  }

  return lines.join("\n")
}

function renderHtmlView(timeline) {
  const eventItems = timeline.events.length === 0
    ? `<p class="empty">No Chronicle entries stored yet.</p>`
    : timeline.events.map((event) => `
      <article class="event">
        <div class="event-header">
          <div class="timestamp">${escapeHtml(event.timestamp ?? "unknown time")}</div>
          <div class="label">${escapeHtml(event.display_label)}</div>
        </div>
        <ul>
          <li><strong>relation_type:</strong> <code>${escapeHtml(event.relation_type)}</code></li>
          <li><strong>entry_id:</strong> <code>${escapeHtml(event.entry_id)}</code></li>
          <li><strong>proof refs:</strong> ${event.proof_object_refs.map((ref) => `<code>${escapeHtml(ref.proof_object_id)}</code>`).join(", ")}</li>
        </ul>
      </article>
    `).join("\n")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicle Local Node History</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f7f9;
        --card: #ffffff;
        --text: #1f2937;
        --muted: #6b7280;
        --border: #d1d5db;
        --accent: #111827;
      }
      body {
        margin: 0;
        font-family: Inter, Segoe UI, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 2rem;
      }
      p.lead {
        margin: 0 0 20px;
        color: var(--muted);
      }
      .links {
        margin: 0 0 24px;
      }
      .links a {
        color: var(--accent);
        text-decoration: none;
        margin-right: 16px;
      }
      .meta {
        margin: 0 0 24px;
        padding: 12px 16px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .event {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px 18px;
        margin-bottom: 14px;
      }
      .event-header {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        align-items: baseline;
        margin-bottom: 10px;
      }
      .timestamp {
        color: var(--muted);
        font-size: 0.95rem;
      }
      .label {
        font-weight: 700;
        font-size: 1.05rem;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      code {
        background: #eef2f7;
        padding: 1px 5px;
        border-radius: 6px;
      }
      .empty {
        background: var(--card);
        border: 1px dashed var(--border);
        border-radius: 12px;
        padding: 20px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Chronicle Local Node History</h1>
      <p class="lead">A simple local browser view over persisted Chronicle timeline events.</p>
      <div class="links">
        <a href="/chronicle.md">View Markdown history</a>
        <a href="/timeline">View JSON timeline</a>
        <a href="/entries">View stored entries</a>
      </div>
      <div class="meta">
        <strong>Timeline:</strong> ${escapeHtml(timeline.title)}<br />
        <strong>Event count:</strong> ${escapeHtml(timeline.events.length)}
      </div>
      ${eventItems}
    </main>
  </body>
</html>`
}

function createEntryFromReceiptProof(proof) {
  const proofRef = {
    proof_object_id: proof.proof_object_id,
    proof_system: proof.proof_system,
    receipt_root: proof.receipt_root,
    proof_ref: proof.proof_ref,
    replay_ref: proof.replay_ref,
    anchor_ref: proof.anchor_ref,
    metadata: proof.metadata && typeof proof.metadata === "object" ? { ...proof.metadata } : undefined,
  }

  return {
    entry_id: `entry-${proof.proof_object_id}`,
    proof_object_refs: [proofRef],
    project_refs: Array.isArray(proof.project_refs) ? [...proof.project_refs] : undefined,
    organization_refs: Array.isArray(proof.organization_refs) ? [...proof.organization_refs] : undefined,
    relation_type: typeof proof.relation_type === "string" ? proof.relation_type : "imported",
    chronology_position: typeof proof.chronology_position === "string" ? proof.chronology_position : undefined,
    created_at: typeof proof.created_at === "string" ? proof.created_at : new Date().toISOString(),
    metadata: {
      label:
        typeof proof.metadata?.label === "string"
          ? proof.metadata.label
          : `Imported proof ${proof.proof_object_id}`,
      imported_from: "ReceiptOS",
      source_proof_object_id: proof.proof_object_id,
      source_proof_ref: proof.proof_ref,
    },
  }
}

loadStore()

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${PORT}`}`)

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, { ok: true })
    }

    if (request.method === "POST" && url.pathname === "/entries") {
      const entry = await readJsonBody(request)

      if (!isValidChronicleEntry(entry)) {
        return json(response, 400, {
          ok: false,
          error: "Invalid Chronicle Entry payload",
          required: ["entry_id", "proof_object_refs[]", "created_at"],
        })
      }

      entryStore.push(structuredClone(entry))
      saveStore()
      return json(response, 201, {
        ok: true,
        stored: entry.entry_id,
        entry_count: entryStore.length,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "POST" && url.pathname === "/import/receipt") {
      const proof = await readJsonBody(request)

      if (!isValidReceiptProofObject(proof)) {
        return json(response, 400, {
          ok: false,
          error: "Invalid ReceiptOS proof object payload",
          required: ["proof_object_id", "proof_system=ReceiptOS"],
        })
      }

      const entry = createEntryFromReceiptProof(proof)
      entryStore.push(structuredClone(entry))
      saveStore()

      return json(response, 201, {
        ok: true,
        imported_proof_object_id: proof.proof_object_id,
        created_entry_id: entry.entry_id,
        entry_count: entryStore.length,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "GET" && url.pathname === "/entries") {
      return json(response, 200, {
        ok: true,
        count: entryStore.length,
        entries: entryStore,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "GET" && url.pathname === "/timeline") {
      return json(response, 200, buildTimeline())
    }

    if (request.method === "GET" && url.pathname === "/chronicle.md") {
      return text(response, 200, renderMarkdownTimeline(buildTimeline()))
    }

    if (request.method === "GET" && url.pathname === "/view") {
      return html(response, 200, renderHtmlView(buildTimeline()))
    }

    return json(response, 404, { ok: false, error: "Not found" })
  } catch (error) {
    return json(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

server.listen(PORT, () => {
  console.log(`Chronicle local node listening on http://localhost:${PORT}`)
  console.log(`Persistent store: ${STORE_PATH}`)
  console.log("Endpoints: GET /health, POST /entries, POST /import/receipt, GET /entries, GET /timeline, GET /chronicle.md, GET /view")
})
