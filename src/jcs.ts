/**
 * RFC 8785 JSON Canonicalization Scheme.
 *
 * Implemented from the RFC: sorted object keys (UTF-16 code unit order),
 * ES6 NumberToString for numbers, compact punctuation, no insignificant
 * whitespace. This is not a wrapper around a third-party JCS library.
 */

export class JcsReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JcsReject";
  }
}

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export function canonicalize(json: string): string {
  return serialize(JSON.parse(json) as JsonValue);
}

export function serialize(value: unknown): string {
  return write(value as JsonValue);
}

export function utf8(jsonCanonical: string): Uint8Array {
  return new TextEncoder().encode(jsonCanonical);
}

function write(value: JsonValue): string {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return serializeNumber(value);
  if (typeof value === "string") return serializeString(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => write(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const item = value[key];
    if (item === undefined) continue;
    parts.push(`${serializeString(key)}:${write(item)}`);
  }
  return `{${parts.join(",")}}`;
}

/**
 * ES6 NumberToString as required by RFC 8785 §3.2.2.3.
 * Finite JSON numbers only; -0 becomes 0.
 */
export function serializeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new JcsReject("JCS cannot encode non-finite number");
  }
  if (value === 0) return "0";
  return JSON.stringify(value);
}

function serializeString(value: string): string {
  let out = "\"";
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    switch (c) {
      case 0x08:
        out += "\\b";
        break;
      case 0x09:
        out += "\\t";
        break;
      case 0x0a:
        out += "\\n";
        break;
      case 0x0c:
        out += "\\f";
        break;
      case 0x0d:
        out += "\\r";
        break;
      case 0x22:
        out += "\\\"";
        break;
      case 0x5c:
        out += "\\\\";
        break;
      default:
        if (c < 0x20) {
          out += "\\u" + c.toString(16).padStart(4, "0");
        } else {
          out += value.charAt(i);
        }
    }
  }
  return out + "\"";
}
