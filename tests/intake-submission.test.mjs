import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/lib/")) return nextResolve(new URL(`../lib/${specifier.slice(6)}.ts`, import.meta.url).href, context);
    if (["./intake", "./pricing"].includes(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\/(lib\/(intake|intake-server|intake-submission|pricing|intake-pdf)|app\/api\/intake\/route)\.ts$/.test(url)) return { format: "module", source: stripTypeScriptTypes(readFileSync(new URL(url), "utf8")), shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { readStoredIntake, readDelivery, forwardStoredIntake } = await import("../lib/intake-server.ts");
const { GET, POST } = await import("../app/api/intake/route.ts");
const { activeIntake, isIntakeReceipt, supportedIntakeFile } = await import("../lib/intake-submission.ts");
const { exportIntake } = await import("../lib/intake.ts");
const { createIntakePdf } = await import("../lib/intake-pdf.ts");
const answers = { "contact.name": "Test Klant", "contact.email": "test@example.test", "home.method": "Ik vul de online opname in" };
const requestId = "7b139dd5-f3c4-43d6-96a8-3e806d5b06c2";
const photo = new File(["photo"], "ruimte.jpg", { type: "image/jpeg" });

function configure(t, connected = true) {
  const root = mkdtempSync(join(tmpdir(), "bouw-intake-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [key, value] of Object.entries({ INTAKE_STORAGE_DIR: root, INTAKE_WEBHOOK_URL: connected ? "https://receiver.example.test/intake" : "", INTAKE_WEBHOOK_TOKEN: connected ? "test-token" : "" })) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
  }
  return root;
}

function request(overrides = {}, attachments = {}, headers = {}) {
  const data = new FormData();
  data.set("requestId", requestId);
  data.set("intake", JSON.stringify({ selected: ["badkamer"], answers, consent: true, ...overrides }));
  for (const [id, file] of Object.entries(attachments)) data.set(`file:${id}`, file);
  return new Request("http://localhost:3000/api/intake", { method: "POST", headers: { Origin: "http://localhost:3000", ...headers }, body: data });
}

test("without email configured, enquiries and photos are privately stored and survive a fresh process", async (t) => {
  const root = configure(t, false);
  assert.deepEqual(await (await GET()).json(), { available: true });
  t.mock.method(globalThis, "fetch", () => assert.fail("No delivery should be attempted"));
  const response = await POST(request({}, { "badkamer.overviewPhotos": photo }));
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert(isIntakeReceipt(receipt));
  const record = await readStoredIntake(receipt.reference);
  assert.equal(record.answers["contact.email"], answers["contact.email"]);
  assert.equal(record.attachments.length, 1);
  assert.equal(readFileSync(join(root, receipt.reference, record.attachments[0].storedName), "utf8"), "photo");
  assert.match(readFileSync(join(root, receipt.reference, "dossier.txt"), "utf8"), /ontvangen door bouwregieaanhuis/);
  assert.equal((await readDelivery(receipt.reference)).status, "pending");
  assert.equal(statSync(join(root, receipt.reference)).mode & 0o777, 0o700);
  assert.equal(statSync(join(root, receipt.reference, "intake.json")).mode & 0o777, 0o600);
  const child = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/intakes.mjs", "show", receipt.reference], { encoding: "utf8", env: process.env });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).reference, receipt.reference);
});

test("receipt follows server storage, forwarding includes attachments, and retries do not duplicate delivery", async (t) => {
  configure(t);
  const keys = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.href, "https://receiver.example.test/intake");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    const reference = options.headers["Idempotency-Key"];
    keys.push(reference);
    assert.equal(options.body.get("reference"), reference);
    assert.equal(await options.body.get("file:badkamer.overviewPhotos").text(), "photo");
    assert.equal(options.body.get("file:keuken.photos"), null);
    const payload = JSON.parse(options.body.get("intake"));
    assert.equal(payload.answers["contact.email"], "test@example.test");
    assert.equal(payload.answers["keuken.otherRefresh"], undefined);
    return Response.json({ accepted: true, reference, receivedAt: "2026-10-07T12:00:00.000Z" });
  });
  for (let i = 0; i < 2; i++) {
    const response = await POST(request({ answers: { ...answers, "keuken.otherRefresh": "stale private answer" } }, { "badkamer.overviewPhotos": photo, "keuken.photos": photo }));
    assert.equal(response.status, 200);
    assert.equal(isIntakeReceipt(await response.json()), true);
  }
  assert.equal(keys.length, 1);
  assert.equal((await readDelivery(keys[0])).status, "delivered");
});

test("edits use a different delivery reference", async (t) => {
  configure(t);
  const references = [];
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const reference = options.headers["Idempotency-Key"];
    references.push(reference);
    return Response.json({ accepted: true, reference, receivedAt: "2026-10-07T12:00:00Z" });
  });
  await POST(request());
  await POST(request({ answers: { ...answers, "contact.notes": "Nieuwe wens" } }));
  assert.notEqual(references[0], references[1]);
});

test("unacknowledged forwarding stays pending while the visitor receives the saved receipt", async (t) => {
  configure(t);
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ accepted: true, reference: "wrong", receivedAt: "2026-10-07" }));
  const response = await POST(request());
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert(isIntakeReceipt(receipt));
  assert.equal((await readDelivery(receipt.reference)).status, "pending");
  mock.mock.restore();
  t.mock.method(globalThis, "fetch", async (_url, options) => Response.json({ accepted: true, reference: options.headers["Idempotency-Key"], receivedAt: "2026-11-05T12:00:00Z" }));
  await forwardStoredIntake(await readStoredIntake(receipt.reference));
  const delivery = await readDelivery(receipt.reference);
  assert.equal(delivery.status, "delivered");
  assert.equal(delivery.attempts, 2);
  assert.equal((await readStoredIntake(receipt.reference)).receivedAt, receipt.receivedAt);
});

test("network failures do not lose server-saved enquiries", async (t) => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("timeout"); });
  const response = await POST(request());
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.equal((await readStoredIntake(receipt.reference)).reference, receipt.reference);
  assert.equal((await readDelivery(receipt.reference)).status, "pending");
});

test("storage failures never return a success receipt", async (t) => {
  const root = configure(t, false);
  const blocked = join(root, "not-a-directory");
  writeFileSync(blocked, "blocked");
  process.env.INTAKE_STORAGE_DIR = blocked;
  assert.deepEqual(await (await GET()).json(), { available: false });
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(isIntakeReceipt(await response.json()), false);
});

test("simultaneous retries save one complete enquiry with the same receipt", async (t) => {
  const root = configure(t, false);
  const results = await Promise.all(Array.from({ length: 4 }, () => POST(request({}, { "badkamer.overviewPhotos": photo }))));
  const receipts = await Promise.all(results.map((response) => response.json()));
  assert(results.every((response) => response.status === 200));
  receipts.forEach((receipt) => assert.deepEqual(receipt, receipts[0]));
  assert.deepEqual(readdirSync(root), [receipts[0].reference]);
});

test("contact, consent, work selection, file type and cross-origin checks block invalid submissions", async (t) => {
  configure(t);
  t.mock.method(globalThis, "fetch", () => assert.fail("Invalid requests must not reach delivery"));
  for (const payload of [{ consent: false }, { answers: { ...answers, "contact.email": "invalid" } }, { answers: { ...answers, "contact.name": " " } }, { selected: [] }, { selected: ["unknown"] }]) assert.equal((await POST(request(payload))).status, 400);
  assert.equal((await POST(request({}, { "badkamer.overviewPhotos": new File(["script"], "script.html", { type: "text/html" }) }))).status, 400);
  assert.equal((await POST(request({}, {}, { origin: "https://attacker.test", "x-forwarded-host": "attacker.test" }))).status, 403);
  assert.equal((await POST(request({}, {}, { "content-length": String(103 * 1024 * 1024) }))).status, 413);
});

test("active submission prunes hidden files but retains permit outcomes from renovation subprojects", () => {
  const state = activeIntake(["renovatie"], { "renovatie.work": ["Dakopbouw realiseren"], "dakopbouw.permitConclusion": "Controle vereist", "keuken.otherRefresh": "old" }, { "keuken.photos": [photo] });
  assert.equal(state.answers["dakopbouw.permitConclusion"], "Controle vereist");
  assert.equal(state.answers["keuken.otherRefresh"], undefined);
  assert.deepEqual(state.files, {});
  assert.equal(supportedIntakeFile(new File(["heic"], "photo.heic")), true);
});

test("confirmed downloads include the receipt without conflicting draft status", () => {
  const receipt = { reference: "BAH-0123456789ABCDEF", receivedAt: "2026-10-07T12:00:00Z" };
  const text = exportIntake(["badkamer"], answers, { "badkamer.overviewPhotos": [photo] }, receipt);
  assert.match(text, /BAH-0123456789ABCDEF/);
  assert.match(text, /oorspronkelijke bijlagen zijn meegestuurd/);
  assert.doesNotMatch(text, /concept op uw apparaat|nog niet verzonden|Verstuur de oorspronkelijke/);
  const pdf = createIntakePdf(text, true);
  assert(pdf.getNumberOfPages() >= 1);
});

test("simple renovation contact keeps descriptions, previous quote answers and photos without technical questions", async (t) => {
  configure(t);
  const contact = { ...answers, "contact.route": "Contactformulier", "contact.notes": "Complete begane grond renoveren", "contact.phone": "0612345678", "contact.city": "Amsterdam", "contact.scope": "Ik heb een eerste idee", "contact.size": "80 m²", "contact.finish": "Alles, van voorbereiding tot oplevering", "contact.planning": "Binnen 3 tot 6 maanden", "contact.budget": "€ 50.000 – € 100.000", "badkamer.width": "stale" };
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const payload = JSON.parse(options.body.get("intake"));
    for (const [key, value] of Object.entries(contact).filter(([key]) => key.startsWith("contact."))) assert.equal(payload.answers[key], value);
    assert.equal(payload.answers["badkamer.width"], undefined);
    assert.equal(await options.body.get("file:contact.photos").text(), "photo");
    assert.equal(options.body.get("file:badkamer.overviewPhotos"), null);
    assert.match(options.body.get("dossier"), /Complete begane grond renoveren/);
    assert.match(options.body.get("dossier"), /ruimte.jpg/);
    assert.doesNotMatch(options.body.get("dossier"), /HOEVEELHEDEN|Afmetingen.*ontbreken/);
    const reference = options.headers["Idempotency-Key"];
    return Response.json({ accepted: true, reference, receivedAt: "2026-11-05T12:00:00Z" });
  });
  const response = await POST(request({ selected: ["renovatie"], answers: contact }, { "contact.photos": photo, "badkamer.overviewPhotos": photo }));
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert(isIntakeReceipt(receipt));
  assert.equal((await readDelivery(receipt.reference)).status, "delivered");
});

test("guided quotes accept unknown measurements and optional photos, but require a description", async (t) => {
  configure(t);
  let delivered = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    delivered++;
    const payload = JSON.parse(options.body.get("intake"));
    assert.equal(payload.answers["contact.route"], "Offertevragen");
    assert.equal(payload.answers["contact.size"], undefined);
    const reference = options.headers["Idempotency-Key"];
    return Response.json({ accepted: true, reference, receivedAt: "2026-11-05T12:00:00Z" });
  });
  const guided = { ...answers, "contact.route": "Offertevragen", "contact.notes": "Graag een uitbouw, advies over de mogelijkheden" };
  assert.equal((await POST(request({ selected: ["uitbouw"], answers: guided }))).status, 200);
  assert.equal((await POST(request({ answers: { ...guided, "contact.notes": "   " } }))).status, 400);
  assert.equal((await POST(request({ selected: ["dakkapel"], answers: guided }))).status, 400);
  assert.equal((await POST(request({ selected: ["bouwtekeningen"], answers: { ...guided, "contact.notes": "Graag bouwtekeningen en begeleiding bij de vergunningaanvraag", "contact.finish": "Bouwtekeningen en vergunningbegeleiding" } }))).status, 200);
  assert.equal(delivered, 2);
});
