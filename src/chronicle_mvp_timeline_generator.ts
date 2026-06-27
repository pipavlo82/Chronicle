import { createChronicleTimeline as createChronicleTimelineCore } from "./chronicle_mvp_timeline_generator_core.mjs"
import type {
  ChronicleEdge,
  ChronicleEntry,
  ChronicleTimeline,
} from "./chronicle_mvp_data_model"

export type CreateChronicleTimelineInput = {
  entries: ChronicleEntry[]
  edges: ChronicleEdge[]
  timeline_id?: string
  title?: string
}

export function createChronicleTimeline(input: CreateChronicleTimelineInput): ChronicleTimeline {
  return createChronicleTimelineCore(input) as ChronicleTimeline
}
