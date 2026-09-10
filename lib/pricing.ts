import type { IconName } from "@/components/icon";

export const workTypes = [
  { id: "uitbouw", name: "Aan- of uitbouw", short: "Uitbouw", detail: "Meer ruimte om te leven", icon: "extension" as IconName, unit: "m²", defaultSize: 20, min: 5, max: 100, low: 2200, high: 3100, base: 4500 },
  { id: "badkamer", name: "Badkamer", short: "Badkamer", detail: "Uw eigen plek voor rust", icon: "bath" as IconName, unit: "m²", defaultSize: 8, min: 2, max: 40, low: 1100, high: 1700, base: 3000 },
  { id: "keuken", name: "Keuken", short: "Keuken", detail: "Het hart van uw huis", icon: "kitchen" as IconName, unit: "m²", defaultSize: 12, min: 4, max: 60, low: 650, high: 1100, base: 5000 },
  { id: "dakkapel", name: "Dakkapel", short: "Dakkapel", detail: "Licht en ruimte op zolder", icon: "roof" as IconName, unit: "m breed", defaultSize: 4, min: 2, max: 10, low: 1800, high: 2600, base: 1500 },
  { id: "renovatie", name: "Totale renovatie", short: "Renovatie", detail: "Een nieuw begin, thuis", icon: "renovation" as IconName, unit: "m²", defaultSize: 80, min: 15, max: 300, low: 750, high: 1250, base: 5000 },
  { id: "afwerking", name: "Binnenafwerking", short: "Afwerking", detail: "Het verschil zit in de details", icon: "paint" as IconName, unit: "m²", defaultSize: 40, min: 5, max: 300, low: 90, high: 160, base: 750 },
] as const;

export type WorkId = typeof workTypes[number]["id"];
export type Finish = "basis" | "comfort" | "luxe";
export type PermitStatus = "unknown" | "needed" | "obtained";

export const finishOptions: { id: Finish; name: string; description: string; multiplier: number }[] = [
  { id: "basis", name: "Basis", description: "Mooi & praktisch", multiplier: 1 },
  { id: "comfort", name: "Comfort", description: "Net dat beetje extra", multiplier: 1.18 },
  { id: "luxe", name: "Luxe", description: "Hoogwaardig & op maat", multiplier: 1.45 },
];

export function calculateEstimate(workId: WorkId, size: number, finish: Finish, structural: boolean) {
  const work = workTypes.find((item) => item.id === workId);
  const finishOption = finishOptions.find((item) => item.id === finish);
  if (!work || !finishOption || !Number.isFinite(size) || size < work.min || size > work.max) throw new Error("Vul een geldige oppervlakte of breedte in.");
  return {
    low: Math.round(((size * work.low + work.base) * finishOption.multiplier + (structural ? 3500 : 0)) / 500) * 500,
    high: Math.round(((size * work.high + work.base) * finishOption.multiplier + (structural ? 7500 : 0)) / 500) * 500,
  };
}

export function euro(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
