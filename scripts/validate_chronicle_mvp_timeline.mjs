import fixture from "../examples/chronicle-mvp-example.json" with { type: "json" }
import generatedFixture from "../examples/chronicle-mvp-generated-timeline.json" with { type: "json" }
import { createChronicleTimeline } from "../src/chronicle_mvp_timeline_generator.ts"

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const timeline = createChronicleTimeline({
  entries: fixture.entries,
  edges: fixture.edges,
  timeline_id: fixture.timeline.timeline_id,
  title: fixture.timeline.title,
})

assert(Array.isArray(fixture.entries), "fixture entries must exist")
assert(Array.isArray(fixture.edges), "fixture edges must exist")
assert(timeline && Array.isArray(timeline.events), "generator must return a timeline with events")
assert(timeline.events.length === fixture.entries.length, "timeline should include one event per entry")

for (let i = 1; i < timeline.events.length; i += 1) {
  const prev = timeline.events[i - 1]
  const current = timeline.events[i]
  const prevKey = `${prev.timestamp ?? ""}|${prev.chronology_position ?? ""}|${prev.entry_id}`
  const currentKey = `${current.timestamp ?? ""}|${current.chronology_position ?? ""}|${current.entry_id}`
  assert(prevKey <= currentKey, "timeline events must be deterministically sorted")
}

for (const event of timeline.events) {
  assert(Array.isArray(event.proof_object_refs), `event ${event.entry_id} must preserve proof references`)
  assert(event.proof_object_refs.length > 0, `event ${event.entry_id} must include at least one proof reference`)
}

assert(generatedFixture.events.length === timeline.events.length, "generated example timeline must match event count")
assert(generatedFixture.events[0].entry_id === timeline.events[0].entry_id, "generated example first event should match generator output")
assert(generatedFixture.events[1].entry_id === timeline.events[1].entry_id, "generated example second event should match generator output")

console.log("Chronicle MVP timeline validation passed")
console.log(JSON.stringify({
  timeline_id: timeline.timeline_id,
  title: timeline.title,
  event_count: timeline.events.length,
  event_ids: timeline.events.map((event) => event.entry_id),
}, null, 2))
