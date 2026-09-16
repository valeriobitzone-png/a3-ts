// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    reporters: ["verbose"]
  }
});
