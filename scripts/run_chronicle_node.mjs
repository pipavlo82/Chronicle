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

function isValidReceiptTimelineCapsule(capsule) {
  return (
    capsule &&
    typeof capsule === "object" &&
    isValidReceiptProofObject(capsule.proof_object_ref) &&
    Array.isArray(capsule.events) &&
    capsule.events.every((event) =>
      event &&
      typeof event === "object" &&
      typeof event.event_id === "string" &&
      typeof event.label === "string" &&
      typeof event.created_at === "string" &&
      typeof event.relation_type === "string",
    )
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

function getProjectRefs(entries = entryStore) {
  return [...new Set(entries.flatMap((entry) => Array.isArray(entry.project_refs) ? entry.project_refs : []))].sort((a, b) => a.localeCompare(b))
}

function getEntriesForProject(projectRef) {
  return entryStore.filter((entry) => Array.isArray(entry.project_refs) && entry.project_refs.includes(projectRef))
}

function buildTimeline(entries = entryStore, options = {}) {
  const edges = deriveChronicleEdges(entries)
  return createChronicleTimeline({
    entries,
    edges,
    timeline_id: options.timeline_id ?? "chronicle-local-node-timeline",
    title: options.title ?? "Chronicle Local Node Timeline",
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

function renderProjectLinks(projectRefs) {
  if (projectRefs.length === 0) return "<p class=\"empty\">No project refs found yet.</p>"

  return `
    <div class="projects">
      <strong>Projects</strong>
      <ul>
        ${projectRefs.map((projectRef) => `<li><a href="/project/${encodeURIComponent(projectRef)}/view">${escapeHtml(projectRef)}</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderHtmlView(timeline, options = {}) {
  const heading = options.heading ?? "Chronicle Local Node History"
  const lead = options.lead ?? "A simple local browser view over persisted Chronicle timeline events."
  const backLink = options.backLink ? `<a href="${options.backLink}">Back to all history</a>` : ""
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
    <title>${escapeHtml(heading)}</title>
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
      .meta, .projects {
        margin: 0 0 24px;
        padding: 12px 16px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .projects ul {
        margin: 8px 0 0;
      }
      .projects a {
        color: var(--accent);
        text-decoration: none;
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
      <h1>${escapeHtml(heading)}</h1>
      <p class="lead">${escapeHtml(lead)}</p>
      <div class="links">
        <a href="/chronicle.md">View Markdown history</a>
        <a href="/timeline">View JSON timeline</a>
        <a href="/entries">View stored entries</a>
        ${backLink}
      </div>
      <div class="meta">
        <strong>Timeline:</strong> ${escapeHtml(timeline.title)}<br />
        <strong>Event count:</strong> ${escapeHtml(timeline.events.length)}
      </div>
      ${renderProjectLinks(getProjectRefs())}
      ${eventItems}
    </main>
  </body>
</html>`
}

function findExistingEntryByProofOrEntryId(entryId, proofObjectId) {
  return entryStore.find((entry) => {
    if (entry.entry_id === entryId) return true
    return Array.isArray(entry.proof_object_refs) && entry.proof_object_refs.some((ref) => ref.proof_object_id === proofObjectId)
  })
}

function findExistingEntryByEntryId(entryId) {
  return entryStore.find((entry) => entry.entry_id === entryId)
}

function createProofObjectRef(proof) {
  return {
    proof_object_id: proof.proof_object_id,
    proof_system: proof.proof_system,
    receipt_root: proof.receipt_root,
    proof_ref: proof.proof_ref,
    replay_ref: proof.replay_ref,
    anchor_ref: proof.anchor_ref,
    metadata: proof.metadata && typeof proof.metadata === "object" ? { ...proof.metadata } : undefined,
  }
}

function createEntryFromReceiptProof(proof) {
  const proofRef = createProofObjectRef(proof)

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

function createEntriesFromReceiptTimelineCapsule(capsule) {
  const proofRef = createProofObjectRef(capsule.proof_object_ref)
  const projectRefs = Array.isArray(capsule.project_refs) ? [...capsule.project_refs] : undefined

  return capsule.events.map((event) => ({
    entry_id: `entry-${event.event_id}`,
    proof_object_refs: [proofRef],
    project_refs: projectRefs,
    relation_type: event.relation_type,
    chronology_position: typeof event.chronology_position === "string" ? event.chronology_position : undefined,
    created_at: event.created_at,
    metadata: {
      label: event.label,
      imported_from: "ReceiptOS.timeline",
      source_event_id: event.event_id,
      source_proof_object_id: capsule.proof_object_ref.proof_object_id,
      event_metadata: event.metadata && typeof event.metadata === "object" ? { ...event.metadata } : undefined,
    },
  }))
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
      const existing = findExistingEntryByProofOrEntryId(entry.entry_id, proof.proof_object_id)

      if (existing) {
        return json(response, 200, {
          ok: true,
          imported: false,
          existing: true,
          entry_id: existing.entry_id,
          entry_count: entryStore.length,
          store_path: STORE_PATH,
        })
      }

      entryStore.push(structuredClone(entry))
      saveStore()

      return json(response, 201, {
        ok: true,
        imported: true,
        existing: false,
        imported_proof_object_id: proof.proof_object_id,
        created_entry_id: entry.entry_id,
        entry_count: entryStore.length,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "POST" && url.pathname === "/import/receipt-timeline") {
      const capsule = await readJsonBody(request)

      if (!isValidReceiptTimelineCapsule(capsule)) {
        return json(response, 400, {
          ok: false,
          error: "Invalid ReceiptOS timeline capsule payload",
          required: ["proof_object_ref", "project_refs", "events[]"],
        })
      }

      const candidateEntries = createEntriesFromReceiptTimelineCapsule(capsule)
      let importedCount = 0
      let existingCount = 0
      const importedEntryIds = []
      const existingEntryIds = []

      for (const entry of candidateEntries) {
        const existing = findExistingEntryByEntryId(entry.entry_id)
        if (existing) {
          existingCount += 1
          existingEntryIds.push(existing.entry_id)
          continue
        }

        entryStore.push(structuredClone(entry))
        importedCount += 1
        importedEntryIds.push(entry.entry_id)
      }

      if (importedCount > 0) saveStore()

      return json(response, importedCount > 0 ? 201 : 200, {
        ok: true,
        imported: importedCount > 0,
        imported_count: importedCount,
        existing_count: existingCount,
        imported_entry_ids: importedEntryIds,
        existing_entry_ids: existingEntryIds,
        entry_count: entryStore.length,
        project_refs: capsule.project_refs,
        proof_object_id: capsule.proof_object_ref.proof_object_id,
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

    if (request.method === "GET" && url.pathname === "/projects") {
      const projects = getProjectRefs()
      return json(response, 200, {
        ok: true,
        count: projects.length,
        projects,
      })
    }

    if (request.method === "GET" && url.pathname.startsWith("/project/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const projectRef = parts[1] ? decodeURIComponent(parts[1]) : ""
      const projectEntries = getEntriesForProject(projectRef)
      const projectTimeline = buildTimeline(projectEntries, {
        timeline_id: `chronicle-project-${projectRef}-timeline`,
        title: `Chronicle Project Timeline: ${projectRef}`,
      })

      if (parts.length === 2) {
        return json(response, 200, {
          ok: true,
          project_ref: projectRef,
          count: projectEntries.length,
          entries: projectEntries,
          timeline: projectTimeline,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderHtmlView(projectTimeline, {
          heading: `Chronicle Project History: ${projectRef}`,
          lead: `A project-filtered browser view for ${projectRef}.`,
          backLink: "/view",
        }))
      }
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
  console.log("Endpoints: GET /health, POST /entries, POST /import/receipt, POST /import/receipt-timeline, GET /entries, GET /projects, GET /project/:project_ref, GET /timeline, GET /chronicle.md, GET /view")
})
