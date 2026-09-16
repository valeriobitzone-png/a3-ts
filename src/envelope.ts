// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
/**
 * CloudEvents 1.0 envelope. Identity is SHA-256 of RFC 8785(payload),
 * never a random UUID. time equals t_present. fold_ref omitted if absent.
 * Lock v2 type registry is io.a3ep.*; a3.* aliases normalize on parse.
 */

import { sha256Utf8 } from "./hash.ts";
import { serialize, type JsonValue } from "./jcs.ts";
import { stamp, stampJson, type TemporalStamp } from "./temporal.ts";
import { parseBearer, type TruthBearer, bearerJson } from "./truth.ts";

export class EnvelopeReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvelopeReject";
  }
}

export const CLOUD_EVENTS_SPEC = "1.0";
export const DATA_CONTENT_TYPE = "application/json";

export const TYPE_BELIEF_ADMITTED = "io.a3ep.belief.admitted";
export const TYPE_ACTION_AUTHORIZED = "io.a3ep.action.authorized";
export const TYPE_ENV_POSTCONDITION = "io.a3ep.env.postcondition";

export const CORE_TYPES: ReadonlySet<string> = new Set([
  TYPE_BELIEF_ADMITTED,
  TYPE_ACTION_AUTHORIZED,
  TYPE_ENV_POSTCONDITION
]);

const TYPE_ALIASES: Record<string, string> = {
  "a3.belief.admitted": TYPE_BELIEF_ADMITTED,
  "a3.action.authorized": TYPE_ACTION_AUTHORIZED,
  "a3.observation.admitted": TYPE_ENV_POSTCONDITION,
  "a3.env.postcondition": TYPE_ENV_POSTCONDITION,
  [TYPE_BELIEF_ADMITTED]: TYPE_BELIEF_ADMITTED,
  [TYPE_ACTION_AUTHORIZED]: TYPE_ACTION_AUTHORIZED,
  [TYPE_ENV_POSTCONDITION]: TYPE_ENV_POSTCONDITION
};

export const LOCK_V2_ATTESTER = "urn:a3:party:attester";
export const LOCK_V2_REQUESTER = "urn:a3:party:requester";

export type Attestation = {
  attesterId: string;
  requesterId: string;
};

export type EnvelopePayload = {
  temporal: TemporalStamp;
  truth: TruthBearer;
  content: JsonValue;
  foldRef?: string;
  attestation?: Attestation;
};

export type CloudEventEnvelope = {
  specversion: string;
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: string;
  subject: string;
  data: EnvelopePayload;
};

export function normalizeType(raw: string): string {
  const key = raw.trim();
  if (!key) throw new EnvelopeReject("type must be non-blank");
  return TYPE_ALIASES[key] ?? key;
}

export function isIrreversibleType(raw: string): boolean {
  return normalizeType(raw) === TYPE_ACTION_AUTHORIZED;
}

export function attestation(attesterId: string, requesterId: string): Attestation {
  if (!attesterId.trim()) throw new EnvelopeReject("attester_id must be non-blank");
  if (!requesterId.trim()) throw new EnvelopeReject("requester_id must be non-blank");
  return { attesterId, requesterId };
}

export function lockV2Attestation(): Attestation {
  return attestation(LOCK_V2_ATTESTER, LOCK_V2_REQUESTER);
}

export function attestationJson(value: Attestation): Record<string, string> {
  return {
    attester_id: value.attesterId,
    requester_id: value.requesterId
  };
}

export function parseAttestation(raw: unknown): Attestation | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new EnvelopeReject("attestation must be an object");
  }
  const map = raw as Record<string, unknown>;
  const attester = typeof map["attester_id"] === "string" ? map["attester_id"].trim() : "";
  const requester = typeof map["requester_id"] === "string" ? map["requester_id"].trim() : "";
  if (!attester || !requester) {
    throw new EnvelopeReject("attestation missing attester_id or requester_id");
  }
  return attestation(attester, requester);
}

export function validateAttestation(value: Attestation, irreversible: boolean): void {
  if (irreversible && value.attesterId === value.requesterId) {
    throw new EnvelopeReject(
      "attester_id must not equal requester_id on irreversible action"
    );
  }
}

export function isIrreversible(event: CloudEventEnvelope): boolean {
  if (isIrreversibleType(event.type)) return true;
  const content = event.data.content;
  if (content === null || typeof content !== "object" || Array.isArray(content)) {
    return false;
  }
  const flag = (content as { [key: string]: JsonValue })["irreversible"];
  return flag === true || flag === "true";
}

export function sourceUri(sourceId: string): string {
  if (!sourceId.trim()) throw new EnvelopeReject("source must be non-blank");
  return `urn:a3:source:${sourceId}`;
}

export function payloadJson(data: EnvelopePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {
    content: data.content,
    temporal: stampJson(data.temporal),
    truth: bearerJson(data.truth)
  };
  if (data.attestation !== undefined) {
    out.attestation = attestationJson(data.attestation);
  }
  if (data.foldRef !== undefined) out.fold_ref = data.foldRef;
  return out;
}

export function contentId(data: EnvelopePayload): string {
  return sha256Utf8(serialize(payloadJson(data) as JsonValue));
}

export function eventJson(event: CloudEventEnvelope): Record<string, unknown> {
  return {
    data: payloadJson(event.data),
    datacontenttype: event.datacontenttype,
    id: event.id,
    source: event.source,
    specversion: event.specversion,
    subject: event.subject,
    time: event.time,
    type: event.type
  };
}

export function validateCloudEvent(event: CloudEventEnvelope): void {
  if (event.specversion !== CLOUD_EVENTS_SPEC) {
    throw new EnvelopeReject("specversion must be 1.0");
  }
  if (!event.type.trim()) throw new EnvelopeReject("type must be non-blank");
  if (!event.id.trim()) throw new EnvelopeReject("id must be non-blank");
  if (event.datacontenttype !== DATA_CONTENT_TYPE) {
    throw new EnvelopeReject("datacontenttype must be application/json");
  }
  if (!event.subject.trim()) throw new EnvelopeReject("subject must be non-blank");
  try {
    new URL(event.source);
  } catch {
    throw new EnvelopeReject("source is not a URI");
  }
  if (event.time !== event.data.temporal.tPresent) {
    throw new EnvelopeReject("time must equal t_present");
  }
  if (event.id !== contentId(event.data)) {
    throw new EnvelopeReject("id is not SHA-256 of JCS payload");
  }
  if (event.data.attestation !== undefined) {
    validateAttestation(event.data.attestation, isIrreversible(event));
  }
}

export function pack(args: {
  type: string;
  sourceId: string;
  subject: string;
  stamp: TemporalStamp;
  truth: TruthBearer;
  content: JsonValue;
  foldRef?: string;
  attestation?: Attestation;
}): CloudEventEnvelope {
  if (!args.type.trim()) throw new EnvelopeReject("type must be non-blank");
  if (!args.subject.trim()) throw new EnvelopeReject("subject must be non-blank");
  let emittedType = args.type;
  if (args.attestation !== undefined) {
    const normalized = normalizeType(args.type);
    if (!CORE_TYPES.has(normalized)) {
      throw new EnvelopeReject("type not in CORE registry");
    }
    emittedType = normalized;
  }
  const data: EnvelopePayload = {
    temporal: stamp(args.stamp),
    truth: args.truth,
    content: args.content,
    ...(args.foldRef !== undefined ? { foldRef: args.foldRef } : {}),
    ...(args.attestation !== undefined ? { attestation: args.attestation } : {})
  };
  const event: CloudEventEnvelope = {
    specversion: CLOUD_EVENTS_SPEC,
    type: emittedType,
    source: sourceUri(args.sourceId),
    id: contentId(data),
    time: data.temporal.tPresent,
    datacontenttype: DATA_CONTENT_TYPE,
    subject: args.subject,
    data
  };
  validateCloudEvent(event);
  return event;
}

export function encodeEvent(event: CloudEventEnvelope): string {
  return serialize(eventJson(event) as JsonValue);
}

export function encodePayload(data: EnvelopePayload): string {
  return serialize(payloadJson(data) as JsonValue);
}

function asRecord(raw: unknown, field: string): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new EnvelopeReject(`missing ${field}`);
  }
  return raw as Record<string, unknown>;
}

function text(raw: unknown, field: string): string {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new EnvelopeReject(`missing ${field}`);
  }
  return raw;
}

function parseStamp(fields: Record<string, unknown>): TemporalStamp {
  return stamp({
    tEvent: text(fields["t_event"], "t_event"),
    tObserve: text(fields["t_observe"], "t_observe"),
    tAdmit: text(fields["t_admit"], "t_admit"),
    tPresent: text(fields["t_present"], "t_present")
  });
}

export function parseEvent(json: string): CloudEventEnvelope {
  const root = asRecord(JSON.parse(json), "event");
  const dataMap = asRecord(root["data"], "data");
  const temporal = parseStamp(asRecord(dataMap["temporal"], "temporal"));
  const truth = parseBearer(asRecord(dataMap["truth"], "truth"));
  const foldRaw = dataMap["fold_ref"];
  const parsedAttestation = parseAttestation(dataMap["attestation"]);
  const data: EnvelopePayload = {
    temporal,
    truth,
    content: (dataMap["content"] ?? null) as JsonValue,
    ...(typeof foldRaw === "string" ? { foldRef: foldRaw } : {}),
    ...(parsedAttestation !== undefined ? { attestation: parsedAttestation } : {})
  };
  const event: CloudEventEnvelope = {
    specversion: text(root["specversion"], "specversion"),
    type: normalizeType(text(root["type"], "type")),
    source: text(root["source"], "source"),
    id: text(root["id"], "id"),
    time: text(root["time"], "time"),
    datacontenttype: text(root["datacontenttype"], "datacontenttype"),
    subject: text(root["subject"], "subject"),
    data
  };
  validateCloudEvent(event);
  return event;
}

export function packFromPayloadObject(
  payload: Record<string, unknown>,
  headers: { type: string; sourceId: string; subject: string }
): CloudEventEnvelope {
  const temporal = parseStamp(asRecord(payload["temporal"], "temporal"));
  const truth = parseBearer(asRecord(payload["truth"], "truth"));
  const foldRaw = payload["fold_ref"];
  const parsedAttestation = parseAttestation(payload["attestation"]);
  return pack({
    type: headers.type,
    sourceId: headers.sourceId,
    subject: headers.subject,
    stamp: temporal,
    truth,
    content: (payload["content"] ?? null) as JsonValue,
    ...(typeof foldRaw === "string" ? { foldRef: foldRaw } : {}),
    ...(parsedAttestation !== undefined ? { attestation: parsedAttestation } : {})
  });
}
