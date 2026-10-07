import type { Address, DsoEnvironment, DsoGeometry, DsoMode, DsoResult, DsoWork } from "@/lib/dso";
import type { DsoAnsweredQuestion } from "@/lib/dso-flow";
import { validCoordinates, validGeometry } from "@/lib/dso-geometry";

export type PermitStage = "intro" | "location" | "works" | "questions" | "result";
export type PermitFlow = { works: DsoWork[]; history: DsoAnsweredQuestion[]; result: DsoResult | null; checkedAt: string | null; ruleIds?: number[] };
export type PermitSession = {
  version: 2;
  environment: DsoEnvironment | null;
  mode: DsoMode;
  stage: PermitStage;
  postcode: string;
  houseNumber: string;
  address: Address | null;
  geometry: DsoGeometry | null;
  locationConfirmed: boolean;
  check: PermitFlow;
  application: PermitFlow;
};
export const emptyFlow = (): PermitFlow => ({ works: [], history: [], result: null, checkedAt: null });
export const newPermitSession = (context?: { postcode: string; houseNumber: string }): PermitSession => ({ version: 2, environment: null, mode: "check", stage: "intro", postcode: context?.postcode ?? "", houseNumber: context?.houseNumber.match(/^\d+/)?.[0] ?? "", address: null, geometry: null, locationConfirmed: false, check: emptyFlow(), application: emptyFlow() });
export const permitStorageKey = "bouwaanhuis.permit.v2";

// Stored results are never trusted as current: resuming always reruns the rules.
export function parsePermitDraft(raw: string): PermitSession {
  if (raw.length > 2_000_000) throw new Error("De bewaarde check is te groot.");
  const draft = JSON.parse(raw) as PermitSession;
  if (draft.version !== 2 || !["check", "application"].includes(draft.mode) || !["production", "preproduction"].includes(draft.environment ?? "") || typeof draft.postcode !== "string" || typeof draft.houseNumber !== "string" || !draft.address || typeof draft.address.id !== "string" || typeof draft.address.label !== "string" || !validCoordinates(draft.address.coordinates) || !validGeometry(draft.geometry)) throw new Error("De bewaarde check kan niet worden gelezen. Start een nieuwe check.");
  for (const mode of ["check", "application"] as const) {
    const flow = draft[mode];
    if (!flow || !Array.isArray(flow.works) || flow.works.length > 100 || !Array.isArray(flow.history) || flow.history.length > 2000) throw new Error("Ongeldige bewaarde check.");
    for (const work of flow.works) if (typeof work.ref !== "string" || !/^https?:\/\/toepasbare-regels\.omgevingswet\.overheid\.nl\//.test(work.ref) || typeof work.label !== "string") throw new Error("Ongeldige werkzaamheid.");
    for (const entry of flow.history) if (!entry.question || !Number.isInteger(entry.question.id) || typeof entry.question.ref !== "string" || entry.question.key !== `${entry.question.ref}::${entry.question.id}` || typeof entry.value !== "string" || entry.value.length > 6144) throw new Error("Ongeldig bewaard antwoord.");
    const ruleIds = flow.result?.ruleIds ?? flow.ruleIds;
    flow.ruleIds = Array.isArray(ruleIds) && ruleIds.every(Number.isInteger) ? ruleIds : undefined;
    flow.result = null;
    flow.checkedAt = null;
  }
  return { ...draft, stage: "works", locationConfirmed: true };
}
