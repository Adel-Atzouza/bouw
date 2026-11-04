import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./pricing" && context.parentURL?.endsWith("/lib/intake.ts")) return nextResolve("./pricing.ts", context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\/lib\/(intake|pricing|intake-pdf)\.ts$/.test(url)) return { format: "module", source: stripTypeScriptTypes(readFileSync(new URL(url), "utf8")), shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { buildSections, effectiveWorks, visible, toggleOption, outcomes, quantityFor, quantityModes, bathroomAreas, exportIntake } = await import("../lib/intake.ts");
const all = ["uitbouw", "dakopbouw", "badkamer", "keuken", "afwerking", "renovatie", "bouwtekeningen"];

test("all routes coexist with one address and unique question IDs", () => {
  const sections = buildSections(all, { "afwerking.rooms": ["Woonkamer", "Hal"], "afwerking.0.work": ["Stucwerk", "Plinten"] });
  assert.equal(sections.filter((s) => s.id === "home.address").length, 1);
  assert.equal(new Set(sections.map((s) => s.id)).size, sections.length);
  const ids = sections.flatMap((s) => s.questions.map((q) => q.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const work of all) assert(sections.some((s) => s.work === work));
  assert(!ids.some((id) => id.startsWith("dakkapel.")));
});
test("renovation reuses selected work routes once", () => {
  const answers = { "renovatie.work": ["Badkamer vernieuwen", "Wanden en plafonds afwerken", "Vloeren vernieuwen", "Dakopbouw realiseren"] };
  assert.deepEqual(effectiveWorks(["renovatie", "badkamer"], answers), ["renovatie", "badkamer", "afwerking", "dakopbouw"]);
  assert.equal(buildSections(["renovatie", "badkamer"], answers).filter((s) => s.id === "badkamer.wish").length, 1);
});
test("direct location route skips detailed questions and ignores stale budgets", () => {
  const answers = { "home.method": "Ik wil direct een opname op locatie plannen", "renovatie.sizeMode": "Ik weet de oppervlakte", "renovatie.area": "80", "renovatie.quality": "Comfort — net dat beetje extra" };
  assert.deepEqual(buildSections(all, answers).map((s) => s.id), ["home.address", "contact.closing"]);
  assert(outcomes(all, answers, {}).every((result) => result.next === "site" && !result.estimate));
});
test("exclusive options and incompatible installation choices cannot coexist", () => {
  const questions = buildSections(["keuken", "renovatie"], {}).flatMap((s) => s.questions);
  const floors = questions.find((q) => q.id === "renovatie.floors");
  assert.deepEqual(toggleOption(floors, ["Begane grond"], "De hele woning"), ["De hele woning"]);
  assert.deepEqual(toggleOption(floors, ["De hele woning"], "Begane grond"), ["Begane grond"]);
  const kitchen = questions.find((q) => q.id === "keuken.work");
  assert.deepEqual(toggleOption(kitchen, ["Elektra aanpassen", "Nieuwe keuken monteren"], "Alleen bouwkundige voorbereiding; montage regelt de keukenleverancier"), ["Elektra aanpassen", "Alleen bouwkundige voorbereiding; montage regelt de keukenleverancier"]);
});
test("hidden nested answers stay out of the active route and export", () => {
  const answers = { "keuken.task": "Een nieuwe keuken plaatsen; ik moet deze nog uitzoeken", "keuken.refresh": ["Anders"], "keuken.otherRefresh": "OLD-INACTIVE-ANSWER" };
  const question = buildSections(["keuken"], answers).flatMap((s) => s.questions).find((q) => q.id === "keuken.otherRefresh");
  assert.equal(visible(question, answers), false);
  assert(!exportIntake(["keuken"], answers, {}).includes("OLD-INACTIVE-ANSWER"));
});
test("partial bathroom avoids unrelated tiles and furniture", () => {
  const answers = { "badkamer.task": "Een deel van de badkamer vernieuwen", "badkamer.parts": ["Toilet"] };
  const ids = buildSections(["badkamer"], answers).flatMap((s) => s.questions.map((q) => q.id));
  assert(ids.includes("badkamer.toilet"));
  assert(!ids.includes("badkamer.vanity"));
  assert(!ids.includes("badkamer.wallTile"));
});
test("unknown measurements never generate zero or default estimates", () => {
  for (const result of outcomes(all, {}, {})) assert.equal(result.estimate, undefined);
  assert.equal(quantityFor({ "test.quantity": "40" }, "test"), null);
  assert.equal(quantityFor({ "test.quantityMode": quantityModes[3], "test.quantity": "40" }, "test"), null);
});
test("interior dimensions distinguish areas, wall height and linear lengths", () => {
  const answers = { "room.quantityMode": quantityModes[1], "room.width": "4", "room.depth": "5", "room.measureSurface": "Vloer of plafond" };
  assert.equal(quantityFor(answers, "room"), 20);
  assert.equal(quantityFor({ ...answers, "room.measureSurface": "Wanden" }, "room"), null);
  assert.equal(quantityFor({ ...answers, "room.measureSurface": "Wanden", "room.height": "2.5" }, "room"), 45);
  assert.equal(quantityFor({ ...answers, "room.measureSurface": "Wanden en plafond", "room.height": "2.5" }, "room"), 65);
  assert.equal(quantityFor({ ...answers, "room.measureSurface": "Omtrek van de ruimte", "room.deduction": "1" }, "room"), 17);
  assert.equal(quantityFor({ ...answers, "room.deduction": "21" }, "room"), null);
});
test("bathroom deductions stay unknown until explicitly supplied", () => {
  const answers = { "badkamer.sizeMode": "Ik vul de maten in", "badkamer.shape": "Nee, rechthoekig of vierkant", "badkamer.width": "2", "badkamer.depth": "3", "badkamer.height": "2.5", "badkamer.tileHeight": "Tot aan het plafond" };
  assert.deepEqual(bathroomAreas(answers), { floor: 6, wall: 25, netWall: null });
  assert.equal(bathroomAreas({ ...answers, "badkamer.openingArea": "0" }).netWall, 25);
  assert.equal(bathroomAreas({ ...answers, "badkamer.shape": "Weet ik niet" }), null);
  assert.equal(bathroomAreas({ ...answers, "badkamer.tileHeight": "Gedeeltelijk, met volledige betegeling bij de douche", "badkamer.partialHeight": "120" }).wall, null);
});
test("whole renovation estimates do not add overlapping sub-budgets", () => {
  const answers = { "renovatie.sizeMode": "Ik weet de oppervlakte", "renovatie.area": "80", "renovatie.quality": "Comfort — net dat beetje extra", "badkamer.task": "De hele badkamer vernieuwen", "badkamer.sizeMode": "Ik vul de maten in", "badkamer.width": "2", "badkamer.depth": "3", "badkamer.quality": "Basis — mooi en praktisch" };
  const result = outcomes(["renovatie", "badkamer"], answers, {});
  assert(result[0].estimate);
  assert.equal(result[1].estimate, undefined);
});
test("PDF paginates a full multi-project dossier and includes brand metadata", async () => {
  const { createIntakePdf } = await import("../lib/intake-pdf.ts");
  const pdf = createIntakePdf(exportIntake(all, {}, {}));
  assert(pdf.getNumberOfPages() > 1);
  const content = pdf.output();
  assert(content.startsWith("%PDF"));
  assert(content.includes("bouwregieaanhuis"));
  assert(!content.includes("Plan Bouw"));
});
