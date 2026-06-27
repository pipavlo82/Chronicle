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
  console.log("Endpoints: GET /health, POST /entries, GET /entries, GET /timeline, GET /chronicle.md")
})
