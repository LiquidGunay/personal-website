import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { parsePostSource } from "../lib/content";

function fixture(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "scripts", "fixtures", name), "utf-8");
}

const codeBlocks = parsePostSource(fixture("code.md"));
assert.equal(codeBlocks.length, 2, "code.md includes prose + python block");
assert.equal(codeBlocks[1].kind, "python");

const outputBlocks = parsePostSource(fixture("output.md"));
assert.equal(outputBlocks.length, 2, "output.md includes prose + output block");
assert.equal(outputBlocks[1].kind, "output");

const chartBlocks = parsePostSource(fixture("chart.md"));
assert.equal(chartBlocks.length, 2, "chart.md includes prose + chart block");
assert.equal(chartBlocks[1].kind, "chart");
assert.equal(typeof (chartBlocks[1] as { spec: unknown }).spec, "object");

const proseOnly = parsePostSource(fixture("prose.md"));
assert.equal(proseOnly.length, 1, "prose fixture becomes single prose block");
assert.equal(proseOnly[0].kind, "prose");
assert.ok(typeof (proseOnly[0] as { markdown: string }).markdown === "string");
