import fixture from "../examples/chronicle-mvp-example.json" with { type: "json" }
import { createChronicleTimeline } from "../src/chronicle_mvp_timeline_generator_core.mjs"

function formatProofRefs(proofRefs) {
  return proofRefs
    .map((ref) => `- ${ref.proof_object_id} (${ref.proof_system}) :: ${ref.proof_ref ?? "no-proof-ref"}`)
    .join("\n")
}

function formatEntries(entries) {
  return entries
    .map(
      (entry) => [
        `- ${entry.entry_id}`,
        `  label: ${entry.metadata?.label ?? entry.entry_id}`,
        `  created_at: ${entry.created_at}`,
        `  chronology_position: ${entry.chronology_position ?? "n/a"}`,
        `  relation_type: ${entry.relation_type ?? "n/a"}`,
        `  proof_refs: ${entry.proof_object_refs.map((ref) => ref.proof_object_id).join(", ")}`,
      ].join("\n"),
    )
    .join("\n")
}

function formatEdges(edges) {
  return edges
    .map(
      (edge) => [
        `- ${edge.edge_id}`,
        `  from: ${edge.from_entry_id}`,
        `  to: ${edge.to_entry_id}`,
        `  relation_type: ${edge.relation_type}`,
        `  created_at: ${edge.created_at}`,
      ].join("\n"),
    )
    .join("\n")
}

function formatTimelineEvents(events) {
  return events
    .map(
      (event) => [
        `- ${event.entry_id}`,
        `  label: ${event.display_label}`,
        `  timestamp: ${event.timestamp ?? "n/a"}`,
        `  chronology_position: ${event.chronology_position ?? "n/a"}`,
        `  relation_type: ${event.relation_type}`,
        `  edge_id: ${event.edge_id ?? "none"}`,
        `  proof_refs: ${event.proof_object_refs.map((ref) => ref.proof_object_id).join(", ")}`,
      ].join("\n"),
    )
    .join("\n")
}

function renderMarkdownTimeline(timeline) {
  const lines = [`# ${timeline.title}`, ""]

  for (const event of timeline.events) {
    lines.push(`- **${event.timestamp ?? "unknown time"}** — ${event.display_label}`)
    lines.push(`  - relation: \`${event.relation_type}\``)
    if (event.edge_id) lines.push(`  - edge: \`${event.edge_id}\``)
    lines.push(`  - entry: \`${event.entry_id}\``)
    lines.push(`  - proof refs: ${event.proof_object_refs.map((ref) => `\`${ref.proof_object_id}\``).join(", ")}`)
  }

  return lines.join("\n")
}

const timeline = createChronicleTimeline({
  entries: fixture.entries,
  edges: fixture.edges,
  timeline_id: fixture.timeline.timeline_id,
  title: fixture.timeline.title,
})

console.log("Chronicle MVP CLI Demo")
console.log("======================")
console.log("")
console.log("Flow:")
console.log("ReceiptOS Proof Object -> Chronicle Entry -> Chronicle Graph -> Chronicle Timeline -> Human-readable Output")
console.log("")
console.log("Proof Object References")
console.log("-----------------------")
console.log(formatProofRefs([fixture.proof_object_ref]))
console.log("")
console.log("Chronicle Entries")
console.log("-----------------")
console.log(formatEntries(fixture.entries))
console.log("")
console.log("Chronicle Graph Edges")
console.log("---------------------")
console.log(formatEdges(fixture.edges))
console.log("")
console.log("Generated Timeline Events")
console.log("-------------------------")
console.log(formatTimelineEvents(timeline.events))
console.log("")
console.log("Final Markdown / History View")
console.log("-----------------------------")
console.log(renderMarkdownTimeline(timeline))
