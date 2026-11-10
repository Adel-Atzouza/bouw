import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  parseEnquiry,
  saveEnquiry,
  enquiryDirectory,
} from "../lib/delicent-enquiry.ts";

const valid = () => ({
  requestId: randomUUID(),
  name: "Testaanvraag",
  email: "test@example.com",
  phone: "",
  location: "Utrecht",
  project: "Aanbouw of uitbouw",
  message: "Dit is een geautomatiseerde testaanvraag.",
  website: "",
});

test("accepts an enquiry without optional phone and rejects invalid or oversized personal data", () => {
  const input = valid();
  delete input.phone;
  assert.equal(parseEnquiry(input).phone, "");
  for (const patch of [
    { name: "  " },
    { email: "invalid" },
    { location: "" },
    { message: "te kort" },
    { message: "a".repeat(4001) },
    { project: "Renovation" },
    { requestId: "../../public" },
    { website: "spam.example" },
    { phone: [] },
  ])
    assert.equal(parseEnquiry({ ...input, ...patch }), null);
});

test("stores a complete private record and deduplicates concurrent retries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "delicent-test-"));
  const previous = process.env.DELICENT_ENQUIRY_DIR;
  process.env.DELICENT_ENQUIRY_DIR = directory;
  try {
    const enquiry = parseEnquiry(valid());
    const receipts = await Promise.all([
      saveEnquiry(enquiry),
      saveEnquiry(enquiry),
    ]);
    assert.deepEqual(receipts[0], receipts[1]);
    assert.deepEqual(await readdir(directory), [receipts[0].reference]);
    const filename = join(directory, receipts[0].reference, "enquiry.json");
    const stored = JSON.parse(await readFile(filename, "utf8"));
    assert.equal(stored.email, enquiry.email);
    assert.equal(stored.requestId, undefined);
    assert.equal((await stat(filename)).mode & 0o777, 0o600);
    assert.deepEqual(await saveEnquiry(enquiry), receipts[0]);
    process.env.DELICENT_ENQUIRY_DIR = join(
      process.cwd(),
      "public",
      "enquiries",
    );
    assert.throws(enquiryDirectory, /publicly served/);
  } finally {
    if (previous === undefined) delete process.env.DELICENT_ENQUIRY_DIR;
    else process.env.DELICENT_ENQUIRY_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
