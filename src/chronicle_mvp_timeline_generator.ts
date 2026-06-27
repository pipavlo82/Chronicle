import type {
  ChronicleEdge,
  ChronicleEntry,
  ChronicleTimeline,
  ChronicleTimelineEvent,
} from "./chronicle_mvp_data_model"

export type CreateChronicleTimelineInput = {
  entries: ChronicleEntry[]
  edges: ChronicleEdge[]
  timeline_id?: string
  title?: string
}

function compareChronologyPosition(a?: string, b?: string): number {
  if (a === b) return 0
  if (a == null) return 1
  if (b == null) return -1

  const aNum = Number(a)
  const bNum = Number(b)
  const aIsNum = Number.isFinite(aNum)
  const bIsNum = Number.isFinite(bNum)

  if (aIsNum && bIsNum) return aNum - bNum
  return a.localeCompare(b)
}

function compareEventOrder(a: ChronicleTimelineEvent, b: ChronicleTimelineEvent): number {
  const aTs = a.timestamp ?? ""
  const bTs = b.timestamp ?? ""

  if (aTs !== bTs) return aTs.localeCompare(bTs)

  const chronologyCompare = compareChronologyPosition(a.chronology_position, b.chronology_position)
  if (chronologyCompare !== 0) return chronologyCompare

  return a.entry_id.localeCompare(b.entry_id)
}

function selectRelatedEdge(entry: ChronicleEntry, edges: ChronicleEdge[]): ChronicleEdge | undefined {
  const related = edges.filter((edge) => edge.to_entry_id === entry.entry_id || edge.from_entry_id === entry.entry_id)

  if (related.length === 0) return undefined

  related.sort((a, b) => {
    if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at)
    return a.edge_id.localeCompare(b.edge_id)
  })

  const incoming = related.find((edge) => edge.to_entry_id === entry.entry_id)
  return incoming ?? related[0]
}

export function createChronicleTimeline(input: CreateChronicleTimelineInput): ChronicleTimeline {
  const events: ChronicleTimelineEvent[] = input.entries.map((entry) => {
    const relatedEdge = selectRelatedEdge(entry, input.edges)

    return {
      entry_id: entry.entry_id,
      edge_id: relatedEdge?.edge_id,
      timestamp: entry.created_at,
      chronology_position: entry.chronology_position,
      relation_type: relatedEdge?.relation_type ?? entry.relation_type ?? "entry",
      display_label:
        typeof entry.metadata?.label === "string"
          ? entry.metadata.label
          : entry.entry_id,
      proof_object_refs: entry.proof_object_refs.map((ref) => ({ ...ref })),
      metadata: {
        source: relatedEdge ? "entry+edge" : "entry",
        related_entry_id: relatedEdge?.from_entry_id === entry.entry_id ? relatedEdge.to_entry_id : relatedEdge?.from_entry_id,
        edge_created_at: relatedEdge?.created_at,
        edge_metadata: relatedEdge?.metadata ? { ...relatedEdge.metadata } : undefined,
        entry_metadata: entry.metadata ? { ...entry.metadata } : undefined,
      },
    }
  })

  const sortedEvents = [...events].sort(compareEventOrder)

  return {
    timeline_id: input.timeline_id ?? "chronicle-mvp-timeline",
    title: input.title ?? "Chronicle MVP Timeline",
    events: sortedEvents,
    metadata: {
      generated_by: "createChronicleTimeline",
      event_count: sortedEvents.length,
      edge_count: input.edges.length,
      mvp_flow: "ReceiptOS Proof Object -> Chronicle Entry -> Chronicle Graph -> Chronicle Timeline",
    },
  }
}
