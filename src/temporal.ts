// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
/**
 * Four explicit times. No clock. Order is (t_observe, source_id, seq).
 * Fold is last-wins per key after dedup, commutative, no combined confidence.
 */

export class TemporalReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemporalReject";
  }
}

export type Instant = string;

export type TemporalStamp = {
  tEvent: Instant;
  tObserve: Instant;
  tAdmit: Instant;
  tPresent: Instant;
};

export type Observation = {
  sourceId: string;
  subject: string;
  key: string;
  seq: number;
  stamp: TemporalStamp;
  value: unknown;
};

export type FoldField = {
  key: string;
  seq: number;
  sourceId: string;
  tObserve: Instant;
  value: unknown;
};

export type ObservationFold = {
  subject: string;
  fields: Record<string, FoldField>;
  history: Observation[];
};

export type DedupView = {
  log: Observation[];
  current: Array<{
    sourceId: string;
    subject: string;
    key: string;
    seq: number;
    value: unknown;
  }>;
};

export function stamp(fields: TemporalStamp): TemporalStamp {
  if (fields.tObserve < fields.tEvent) {
    throw new TemporalReject("t_observe < t_event");
  }
  if (fields.tAdmit < fields.tObserve) {
    throw new TemporalReject("t_admit < t_observe");
  }
  return fields;
}

export function sourceId(raw: string): string {
  const canonical = raw.trim().toLowerCase();
  if (!canonical) throw new TemporalReject("source_id must be non-blank");
  return canonical;
}

export function observation(row: Observation): Observation {
  if (!row.subject.trim()) throw new TemporalReject("subject must be non-blank");
  if (!row.key.trim()) throw new TemporalReject("key must be non-blank");
  return {
    ...row,
    sourceId: sourceId(row.sourceId),
    stamp: stamp(row.stamp)
  };
}

export function compareOrder(a: Observation, b: Observation): number {
  if (a.stamp.tObserve !== b.stamp.tObserve) {
    return a.stamp.tObserve < b.stamp.tObserve ? -1 : 1;
  }
  if (a.sourceId !== b.sourceId) {
    return a.sourceId < b.sourceId ? -1 : 1;
  }
  if (a.seq !== b.seq) return a.seq < b.seq ? -1 : 1;
  return 0;
}

export function order(stream: Observation[]): Observation[] {
  return [...stream].sort(compareOrder);
}

function dedupKey(row: Observation): string {
  return `${row.sourceId}\0${row.subject}\0${row.key}`;
}

export function dedup(stream: Observation[]): DedupView {
  const log = order(stream);
  const latest = new Map<string, Observation>();
  for (const row of log) {
    latest.set(dedupKey(row), row);
  }
  const current = [...latest.values()]
    .map((row) => ({
      key: row.key,
      seq: row.seq,
      sourceId: row.sourceId,
      subject: row.subject,
      value: row.value
    }))
    .sort((a, b) => {
      if (a.sourceId !== b.sourceId) return a.sourceId < b.sourceId ? -1 : 1;
      if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
      if (a.key !== b.key) return a.key < b.key ? -1 : 1;
      return 0;
    });
  return { log, current };
}

export function fold(stream: Observation[]): ObservationFold[] {
  const { log } = dedup(stream);
  const bySubject = new Map<string, Observation[]>();
  for (const row of log) {
    const list = bySubject.get(row.subject) ?? [];
    list.push(row);
    bySubject.set(row.subject, list);
  }
  const subjects = [...bySubject.keys()].sort();
  return subjects.map((subject) => {
    const history = bySubject.get(subject) ?? [];
    const fields: Record<string, FoldField> = {};
    for (const row of history) {
      fields[row.key] = {
        key: row.key,
        seq: row.seq,
        sourceId: row.sourceId,
        tObserve: row.stamp.tObserve,
        value: row.value
      };
    }
    return { subject, fields, history };
  });
}

export function stampJson(s: TemporalStamp): Record<string, string> {
  return {
    t_admit: s.tAdmit,
    t_event: s.tEvent,
    t_observe: s.tObserve,
    t_present: s.tPresent
  };
}

export function observationJson(row: Observation): Record<string, unknown> {
  return {
    key: row.key,
    seq: row.seq,
    source_id: row.sourceId,
    stamp: stampJson(row.stamp),
    subject: row.subject,
    value: row.value
  };
}

export function currentJson(view: DedupView): Record<string, unknown> {
  return {
    current: view.current.map((row) => ({
      key: row.key,
      seq: row.seq,
      source_id: row.sourceId,
      subject: row.subject,
      value: row.value
    })),
    log: view.log.map(observationJson)
  };
}

export function foldJson(one: ObservationFold): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(one.fields).sort()) {
    const f = one.fields[key];
    if (!f) continue;
    fields[key] = {
      key: f.key,
      seq: f.seq,
      source_id: f.sourceId,
      t_observe: f.tObserve,
      value: f.value
    };
  }
  return {
    fields,
    history: one.history.map(observationJson),
    subject: one.subject
  };
}

export function referenceCorpus(): Observation[] {
  const t0 = "2026-08-27T08:00:00Z";
  const present = "2026-08-27T11:00:00Z";
  const at = (seconds: number): Instant =>
    new Date(Date.parse(t0) + seconds * 1000).toISOString().replace(".000Z", "Z");
  const row = (
    src: string,
    key: string,
    seq: number,
    tObserve: Instant,
    value: string
  ): Observation =>
    observation({
      sourceId: src,
      subject: "trip.milano",
      key,
      seq,
      stamp: stamp({
        tEvent: t0,
        tObserve,
        tAdmit: new Date(Date.parse(tObserve) + 1000)
          .toISOString()
          .replace(".000Z", "Z"),
        tPresent: present
      }),
      value
    });
  return [
    row("hotel", "price", 1, at(7200), "89.00"),
    row("train", "depart", 1, at(1), "09:00"),
    row("train", "depart", 2, at(30), "09:30"),
    row("calendar", "slot", 1, at(10), "09:00")
  ];
}
