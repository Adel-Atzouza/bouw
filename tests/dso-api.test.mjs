import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/lib/")) return nextResolve(new URL(`../lib/${specifier.slice(6)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\/(lib\/(dso[^/]*|permit-state)|app\/api\/omgevingswet\/route)\.ts$/.test(url)) return { format: "module", source: stripTypeScriptTypes(readFileSync(new URL(url), "utf8")), shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { POST } = await import("../app/api/omgevingswet/route.ts");
const { buildDsoReferences, updateDsoHistory } = await import("../lib/dso-flow.ts");
const { normalizeDsoResponse } = await import("../lib/dso.ts");
const { applicationWorks, reconcileDsoHistory, checkIsComplete } = await import("../lib/dso-flow.ts");
const { validGeometry, mapPoint } = await import("../lib/dso-geometry.ts");
const { newPermitSession, parsePermitDraft } = await import("../lib/permit-state.ts");
const workRef = "https://toepasbare-regels.omgevingswet.overheid.nl/id/concept/TestWerkzaamheid";
const generalRef = "https://toepasbare-regels.omgevingswet.overheid.nl/id/concept/TestAlgemeneVragen";
const question = (id, ref = workRef) => ({ key: `${ref}::${id}`, ref, id, title: `Vraag ${id}`, type: "boolean", multiple: false, options: [], required: true, prefilled: "", helpIds: [], hint: "", multiline: false, geo: false });

test("confirmed answers are grouped by official reference, including general questions", () => {
  assert.deepEqual(buildDsoReferences([{ ref: workRef, label: "Dakkapel" }], [
    { question: question(12), value: "false" },
    { question: question(7, generalRef), value: "Tekst met & en accenten: é" },
  ]), [
    { functioneleStructuurRef: workRef, antwoorden: [{ id: 12, antwoord: "false" }] },
    { functioneleStructuurRef: generalRef, antwoorden: [{ id: 7, antwoord: "Tekst met & en accenten: é" }] },
  ]);
});

test("editing an earlier answer removes obsolete dependent answers before the next API request", () => {
  const history = [{ question: question(12), value: "false" }, { question: question(13), value: "true" }];
  const changed = updateDsoHistory(history, question(12), "true");
  assert.deepEqual(buildDsoReferences([{ ref: workRef, label: "Dakkapel" }], changed), [{ functioneleStructuurRef: workRef, antwoorden: [{ id: 12, antwoord: "true" }] }]);
  assert.equal(updateDsoHistory(history, question(12), "false"), history);
});

for (const mode of ["check", "application"]) {
  test(`${mode} POST forwards the supplied answers to the correct DSO endpoint`, async (t) => {
    const oldKey = process.env.DSO_API_KEY;
    const oldEnvironment = process.env.DSO_ENVIRONMENT;
    process.env.DSO_API_KEY = "test-only-key";
    process.env.DSO_ENVIRONMENT = "preproduction";
    t.after(() => {
      if (oldKey === undefined) delete process.env.DSO_API_KEY; else process.env.DSO_API_KEY = oldKey;
      if (oldEnvironment === undefined) delete process.env.DSO_ENVIRONMENT; else process.env.DSO_ENVIRONMENT = oldEnvironment;
    });
    const references = [{ functioneleStructuurRef: workRef, antwoorden: [{ id: 12, antwoord: "false" }, { id: 13, antwoord: "60 × 60" }] }];
    let calls = 0;
    t.mock.method(globalThis, "fetch", async (url, options) => {
      calls++;
      assert.equal(url, `https://service.pre.omgevingswet.overheid.nl/publiek/toepasbare-regels/api/toepasbareregelsuitvoerenservices/v3/${mode === "check" ? "conclusie" : "indieningsvereisten"}/_bepaal`);
      assert.equal(options.method, "POST");
      assert.equal(options.headers["x-api-key"], "test-only-key");
      assert.equal(options.headers["Content-Crs"], "EPSG:28992");
      const body = JSON.parse(options.body);
      assert.deepEqual(body.functioneleStructuurRefs, references);
      assert.deepEqual(body._geo, { intersects: { type: "Point", coordinates: [121687, 487484] } });
      assert.deepEqual(body.rolaanduiding, mode === "application" ? { rol: "INITIATIEFNEMER" } : undefined);
      return Response.json([{ functioneleStructuurRef: workRef, [mode === "check" ? "activiteiten" : "subactiviteiten"]: [{ subactiviteitNaam: "Testwerkzaamheid", vraaggroepen: [], conclusies: [{ toestemmingstype: { waarde: "Testuitkomst" } }] }] }]);
    });
    const request = new Request("http://localhost:3000/api/omgevingswet", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ action: "execute", mode, coordinates: [121687, 487484], references }) });
    const response = await POST(request);
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal((await response.json()).conclusions[0].text, "Testuitkomst");
  });
}

test("check responses retain official obligations, unresolved dependencies and reservations", () => {
  const data = normalizeDsoResponse([{ functioneleStructuurRef: workRef, activiteiten: [{
    subactiviteitNaam: "Bouwen &amp; aanpassen", toepasbareRegelsIdentifiers: [91, 7],
    voorbehouden: [{ tekst: "Controleer ook de erfgrens." }],
    conclusies: [{ toestemmingstype: { code: "Meldingsplicht", waarde: "U moet een melding doen" }, toonbareActiviteitFunctioneleStructuurRef: generalRef }],
    vraaggroepen: [{ groepNaam: "Uw plan", vragen: [
      { id: 1, tekst: "Wat wilt u doen?", uitvoeringsregelType: "vraag", antwoordType: "lijstwaarde", verplicht: true, optieType: "enkelAntwoord", opties: [{ sequenceId: 2, optieTekst: "B &amp; C" }, { sequenceId: 1, optieTekst: "A" }] },
      { id: 2, uitvoeringsregelType: "uitkomstHerbruikbareBeslissing", vooringevuldAntwoord: "nietBeschikbaar", herbruikbareBeslissingFunctioneleStructuurRefs: [generalRef] },
    ] }],
  }] }], "check");
  assert.equal(data.questions[0].group, "Uw plan");
  assert.equal(data.questions[0].options[1].value, "B &amp; C");
  assert.equal(data.questions[0].options[1].label, "B & C");
  assert.equal(data.conclusions[0].code, "Meldingsplicht");
  assert.match(data.conclusions[0].warning, /erfgrens/);
  assert.deepEqual(data.dependencies, [generalRef]);
  assert.deepEqual(data.ruleIds, [7, 91]);
  assert.equal(data.hasMissingData, true);
  assert.equal(checkIsComplete(data, []), false);
});

test("documents retain their IDs, required flags and help, independently of completeness", () => {
  const data = normalizeDsoResponse([{ functioneleStructuurRef: workRef, indienbaar: false, compleet: false, subactiviteiten: [{ subactiviteitNaam: "Bouwen", bijlagen: [{ id: 42, documenttypeGeneriek: "Bouwtekening", verplicht: true, vraagReferentie: "imam:tekening", toelichting: { korteToelichtingId: 9 } }], vraaggroepen: [] }] }], "application");
  assert.deepEqual(data.attachmentDetails[0], { key: `${workRef}::42`, ref: workRef, id: 42, title: "Bouwtekening", required: true, questionRef: "imam:tekening", helpIds: [9] });
  assert.equal(data.ready, false);
  assert.equal(data.complete, false);
});

test("a conclusion for one activity cannot hide another activity without a conclusion", () => {
  const data = normalizeDsoResponse([{ functioneleStructuurRef: workRef, activiteiten: [
    { subactiviteitNaam: "Eerste activiteit", conclusies: [{ toestemmingstype: { code: "Toestemmingsvrij", waarde: "Geen toestemming nodig" } }] },
    { subactiviteitNaam: "Tweede activiteit", vraaggroepen: [{ vragen: [{ id: 1, tekst: "Uw plan?", antwoordType: "string" }] }] },
  ] }], "check");
  assert.equal(checkIsComplete(data, [{ question: data.questions[0], value: "Beantwoord" }]), false);
});

test("obsolete branches are removed and DSO's changed answers are used", () => {
  const data = { questions: [{ ...question(1), changed: "false" }, question(3)] };
  const history = [{ question: question(1), value: "true" }, { question: question(2), value: "old branch" }];
  const accepted = reconcileDsoHistory(data, history);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].value, "false");
  assert.equal(accepted[0].question.id, 1);
});

test("only actionable official conclusions become application activities", () => {
  const conclusions = ["Toestemmingsvrij", "NietVanToepassing", "Verbod", "NeemContactOpMet", "Vergunningplicht", "Meldingsplicht", "Informatieplicht"].map((code) => ({ code, title: code, text: code, applicationRef: `${workRef}/${code}` }));
  assert.deepEqual(applicationWorks(conclusions).map((work) => work.label), ["Vergunningplicht", "Meldingsplicht", "Informatieplicht"]);
  assert.deepEqual(applicationWorks([{ code: "Vergunningplicht", title: "Bouwen", text: "Vergunning nodig" }]), []);
});

const polygon = { type: "Polygon", coordinates: [[[121600, 487400], [121620, 487400], [121620, 487420], [121600, 487420], [121600, 487400]]] };

test("work areas reject crossed edges, open rings and invalid coordinates", () => {
  assert.equal(validGeometry(polygon), true);
  assert.equal(validGeometry({ type: "Point", coordinates: [121687, 487484] }), true);
  assert.equal(validGeometry({ type: "Point", coordinates: [NaN, 487484] }), false);
  assert.equal(validGeometry({ type: "Point", coordinates: [4.9, 52.3] }), false);
  assert.equal(validGeometry({ type: "Polygon", coordinates: [polygon.coordinates[0].slice(0, -1)] }), false);
  assert.equal(validGeometry({ type: "Polygon", coordinates: [[[121600, 487400], [121620, 487420], [121620, 487400], [121600, 487420], [121600, 487400]]] }), false);
  assert.deepEqual(mapPoint([121687, 487484], 14, [300, 180], [600, 360]), [121687, 487484]);
});

test("the API uses the drawn area for official rule execution", async (t) => {
  const previous = process.env.DSO_API_KEY;
  process.env.DSO_API_KEY = "test-only-key";
  t.after(() => { if (previous === undefined) delete process.env.DSO_API_KEY; else process.env.DSO_API_KEY = previous; });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    calls++;
    assert.deepEqual(JSON.parse(options.body)._geo.intersects, polygon);
    return Response.json([]);
  });
  const response = await POST(new Request("http://localhost:3000/api/omgevingswet", { method: "POST", body: JSON.stringify({ action: "execute", mode: "check", geometry: polygon, references: [{ functioneleStructuurRef: workRef, antwoorden: [] }] }) }));
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
});

test("saved drafts keep both routes but require a fresh evaluation", () => {
  const draft = { ...newPermitSession({ postcode: "1234AB", houseNumber: "12" }), environment: "preproduction", address: { id: "address", label: "Voorbeeld 12", coordinates: [121687, 487484] }, geometry: polygon, locationConfirmed: true, stage: "result" };
  draft.check = { works: [{ ref: workRef, label: "Dakkapel" }], history: [{ question: question(1), value: "false" }], result: { ready: true }, checkedAt: "2026-01-01" };
  draft.application = { ...draft.check, works: [{ ref: generalRef, label: "Bouwen" }] };
  const restored = parsePermitDraft(JSON.stringify(draft));
  assert.equal(restored.check.result, null);
  assert.equal(restored.application.result, null);
  assert.equal(restored.check.history.length, 1);
  assert.equal(restored.application.works[0].ref, generalRef);
  assert.equal(restored.stage, "works");
  assert.throws(() => parsePermitDraft('{"version":1}'));
});

test("submission cannot accidentally be treated as a completed check", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { assert.fail("No formal submission may be attempted without the integration."); });
  const response = await POST(new Request("http://localhost:3000/api/omgevingswet", { method: "POST", body: JSON.stringify({ action: "submit" }) }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "DSO_SUBMISSION_NOT_CONNECTED");
});

test("same-origin requests use the browser's real Host despite Next URL normalization", async () => {
  const request = new Request("http://localhost:3000/api/omgevingswet", { method: "POST", headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" }, body: JSON.stringify({ action: "submit" }) });
  assert.equal((await POST(request)).status, 503);
});

test("cross-origin requests cannot bypass the check using forwarded host", async () => {
  const request = new Request("http://localhost:3000/api/omgevingswet", { method: "POST", headers: { origin: "https://other.example", host: "bouwaanhuis.example", "x-forwarded-proto": "https", "x-forwarded-host": "other.example" }, body: JSON.stringify({ action: "submit" }) });
  assert.equal((await POST(request)).status, 403);
});
