import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/lib/delicent-"))
      return nextResolve(new URL(`../lib/${specifier.slice(6)}.ts`, import.meta.url).href, context);
    if (specifier === "./delicent-enquiry") return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});
const { saveEnquiry } = await import("../lib/delicent-enquiry.ts");
const { sendEnquiryEmail, readEnquiryEmailStatus } = await import("../lib/delicent-email.ts");
const { POST } = await import("../app/api/enquiry/route.ts");
const enquiry = () => ({ requestId: randomUUID(), name: "Zoë de Vries", email: "test@example.com", phone: "", location: "Utrecht", project: "Bouwkundige tekeningen", message: "Een café verbouwen.\n.\nBcc: another@example.com\n$(do-not-execute)", website: "" });

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), "delicent-email-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const binary = join(root, "sendmail");
  const log = join(root, "messages.jsonl");
  for (const [key, value] of Object.entries({ DELICENT_ENQUIRY_DIR: join(root, "records"), DELICENT_EMAIL_ENABLED: "true", DELICENT_SENDMAIL_PATH: binary })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const fake = async (exitCode = 0) => writeFile(binary, `#!/bin/sh
printf '%s\\n' "$@" > '${root}/args'
cat > '${root}/message'
printf 'attempt\\n' >> '${log}'
exit ${exitCode}
`, { mode: 0o700 });
  await fake();
  return { root, fake, messages: async () => {
    const attempts = (await readFile(log, "utf8")).trim().split("\n");
    const args = (await readFile(join(root, "args"), "utf8")).trim().split("\n");
    const message = await readFile(join(root, "message"), "utf8");
    return attempts.map(() => ({ args, message }));
  } };

}

test("queues a UTF-8 notification to the fixed inbox, with safe reply-to, and prevents concurrent/repeated sends", async (t) => {
  const fixture = await setup(t);
  const input = enquiry();
  const receipt = await saveEnquiry(input);
  await Promise.all([sendEnquiryEmail(receipt.reference), sendEnquiryEmail(receipt.reference)]);
  assert.equal((await readEnquiryEmailStatus(receipt.reference)).status, "queued");
  await sendEnquiryEmail(receipt.reference);
  const messages = await fixture.messages();
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0].args, ["-i", "-f", "website@delicent.nl", "--", "info@delicent.nl"]);
  const [headers, encoded] = messages[0].message.split("\r\n\r\n");
  assert.match(headers, /To: info@delicent.nl/);
  assert.match(headers, /Reply-To: test@example.com/);
  assert.ok(!headers.includes("Bcc:"));
  const text = Buffer.from(encoded, "base64").toString("utf8");
  assert.ok(text.includes(input.name));
  assert.ok(text.includes(input.message));
  assert.ok(text.includes(input.project));
});

test("disabled email and a missing mail binary leave enquiries pending", async (t) => {
  const fixture = await setup(t);
  const receipt = await saveEnquiry(enquiry());
  process.env.DELICENT_EMAIL_ENABLED = "false";
  assert.deepEqual(await sendEnquiryEmail(receipt.reference), { status: "pending", attempts: 0 });
  process.env.DELICENT_EMAIL_ENABLED = "true";
  process.env.DELICENT_SENDMAIL_PATH = join(fixture.root, "missing-sendmail");
  assert.equal((await sendEnquiryEmail(receipt.reference)).status, "pending");
  assert.equal((await readEnquiryEmailStatus(receipt.reference)).attempts, 1);
});

test("API still confirms durable receipt on mail failure, then a retry queues the saved request", async (t) => {
  const fixture = await setup(t);
  await fixture.fake(75);
  const response = await POST(new Request("https://delicent.nl/api/enquiry", {
    method: "POST", headers: { "content-type": "application/json", origin: "https://delicent.nl" }, body: JSON.stringify(enquiry()),
  }));
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.equal((await readEnquiryEmailStatus(receipt.reference)).status, "pending");
  const stored = JSON.parse(await readFile(join(process.env.DELICENT_ENQUIRY_DIR, receipt.reference, "enquiry.json"), "utf8"));
  assert.equal(stored.email, "test@example.com");
  await fixture.fake();
  const result = await sendEnquiryEmail(receipt.reference);
  assert.equal(result.status, "queued");
  assert.equal(result.attempts, 2);
});

test("mail is not sent for invalid submissions or unsafe stored reply headers", async (t) => {
  const fixture = await setup(t);
  const response = await POST(new Request("https://delicent.nl/api/enquiry", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...enquiry(), email: "test@example.com\r\nBcc: another@example.com" }),
  }));
  assert.equal(response.status, 400);
  const receipt = await saveEnquiry({ ...enquiry(), email: "test@example.com\r\nBcc: another@example.com" });
  assert.equal((await sendEnquiryEmail(receipt.reference)).status, "pending");
  await assert.rejects(fixture.messages(), { code: "ENOENT" });
  await assert.rejects(sendEnquiryEmail("../public"), /Invalid enquiry reference/);
});
