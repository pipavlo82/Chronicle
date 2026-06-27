export type ProofObjectRef = {
  proof_object_id: string
  proof_system: "ReceiptOS"
  receipt_root?: string
  proof_ref?: string
  replay_ref?: string
  anchor_ref?: string
  metadata?: Record<string, unknown>
}

export type ChronicleEntry = {
  entry_id: string
  proof_object_refs: ProofObjectRef[]
  identity_refs?: string[]
  project_refs?: string[]
  organization_refs?: string[]
  relation_type?: string
  chronology_position?: string
  created_at: string
  metadata?: Record<string, unknown>
}

export type ChronicleEdge = {
  edge_id: string
  from_entry_id: string
  to_entry_id: string
  relation_type: string
  created_at: string
  metadata?: Record<string, unknown>
}

export type ChronicleTimelineEvent = {
  entry_id: string
  edge_id?: string
  timestamp?: string
  chronology_position?: string
  relation_type: string
  display_label: string
  proof_object_refs: ProofObjectRef[]
  metadata?: Record<string, unknown>
}

export type ChronicleTimeline = {
  timeline_id: string
  title: string
  events: ChronicleTimelineEvent[]
  metadata?: Record<string, unknown>
}

/**
 * Chronicle MVP data model.
 *
 * This file intentionally defines only the minimum implementation-neutral
 * model needed for the first Chronicle build:
 *
 * ReceiptOS Proof Object -> Chronicle Entry -> Chronicle Graph -> Chronicle Timeline
 *
 * Non-goals for this model:
 * - UI
 * - renderer logic
 * - ownership systems
 * - NFT systems
 * - marketplace logic
 * - reputation systems
 */
