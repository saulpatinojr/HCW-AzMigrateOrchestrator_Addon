import { test } from "node:test";
import assert from "node:assert/strict";
import { createZip, crc32 } from "./zip.js";

test("crc32 known vector and zip structure", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  const z = createZip({ "a/b.txt": "hello", "c.md": "# x" }, new Date(2026, 9, 3, 12, 0, 0));
  assert.equal(z.readUInt32LE(0), 0x04034b50);
  assert.equal(z.readUInt32LE(z.length - 22), 0x06054b50);
  assert.equal(z.readUInt16LE(z.length - 22 + 10), 2);
  assert.throws(() => createZip({ "../evil": "x" }));
});
