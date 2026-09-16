// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
import { createHash } from "node:crypto";
import { utf8 } from "./jcs.ts";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Utf8(canonical: string): string {
  return sha256Hex(utf8(canonical));
}

export function sha1Hex(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}
