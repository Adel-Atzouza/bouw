export type DsoMode = "check" | "application";
export type DsoEnvironment = "production" | "preproduction";
export type DsoGeometry = { type: "Point"; coordinates: [number, number] } | { type: "Polygon"; coordinates: [number, number][][] };
export type Address = { id: string; label: string; coordinates: [number, number] };
export type DsoWork = { ref: string; label: string; permission?: string };
export type DsoAnswer = { id: number; antwoord: string };
export type DsoReference = { functioneleStructuurRef: string; antwoorden: DsoAnswer[] };
export type DsoQuestion = {
  key: string;
  ref: string;
  id: number;
  title: string;
  type: string;
  multiple: boolean;
  options: { label: string; value: string; exclusive: boolean }[];
  required: boolean;
  prefilled: string;
  helpIds: number[];
  hint: string;
  multiline: boolean;
  geo: boolean;
  group?: string;
  activity?: string;
  source?: string;
  changed?: string;
  questionRef?: string;
  classification?: string;
  public?: boolean;
  confidential?: boolean;
};
export type DsoConclusion = { title: string; text: string; code?: string; warning?: string; helpIds?: number[]; applicationRef?: string; authority?: string };
export type DsoAttachment = { key: string; ref: string; id: number; title: string; required: boolean; helpIds: number[]; questionRef: string };
export type DsoResult = {
  questions: DsoQuestion[];
  conclusions: DsoConclusion[];
  attachments: string[];
  ready: boolean;
  complete: boolean;
  hasMissingData: boolean;
  attachmentDetails: DsoAttachment[];
  dependencies: string[];
  ruleIds: number[];
  notices: string[];
};

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function plainText(value: unknown): string {
  return string(value)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

export function normalizeDsoResponse(payload: unknown, mode: DsoMode): DsoResult {
  if (!Array.isArray(payload)) throw new Error("Ongeldig antwoord van het Omgevingsloket.");
  const questions = new Map<string, DsoQuestion>();
  const conclusions: DsoConclusion[] = [];
  const attachments: string[] = [];
  const attachmentDetails: DsoAttachment[] = [];
  const dependencies = new Set<string>();
  const ruleIds = new Set<number>();
  const notices: string[] = [];
  let hasMissingData = payload.length === 0;

  for (const item of payload) {
    const entry = object(item);
    const reference = string(entry.functioneleStructuurRef);
    const activities = list(mode === "check" ? entry.activiteiten : entry.subactiviteiten);
    if (activities.length === 0) hasMissingData = true;
    for (const activityValue of activities) {
      const activity = object(activityValue);
      const title = plainText(activity.subactiviteitNaam) || "Uw werkzaamheden";
      const authority = plainText(object(activity.bestuursorgaan).bestuurslaag);
      for (const id of list(activity.toepasbareRegelsIdentifiers)) if (typeof id === "number") ruleIds.add(id);
      const warningParts: string[] = [];
      if (activity.ontbrekendeData) {
        hasMissingData = true;
        warningParts.push("Er ontbreken officiële regels voor deze activiteit. Neem contact op met het bevoegd gezag.");
      }
      for (const reservationValue of list(activity.voorbehouden)) {
        const reservation = object(reservationValue);
        warningParts.push(plainText(reservation.tekst || reservation.omschrijving || reservation.waarde) || "Er geldt een voorbehoud. Controleer deze activiteit in het Omgevingsloket.");
      }
      for (const conclusionValue of list(activity.conclusies)) {
        const conclusion = object(conclusionValue);
        const permission = object(conclusion.toestemmingstype);
        if (conclusion.ontbrekendeData) {
          hasMissingData = true;
          warningParts.push("Er ontbreken gegevens voor het vervolg. Controleer de uitkomst bij het bevoegd gezag.");
        }
        conclusions.push({ title, text: plainText(permission.waarde) || "Controleer deze activiteit in het Omgevingsloket.", code: string(permission.code), warning: warningParts.join(" ") || undefined, helpIds: typeof conclusion.toelichtingId === "number" ? [conclusion.toelichtingId] : [], applicationRef: string(conclusion.toonbareActiviteitFunctioneleStructuurRef) || undefined, authority });
      }
      if (warningParts.length && !list(activity.conclusies).length) notices.push(`${title}: ${warningParts.join(" ")}`);
      if (mode === "check" && !list(activity.conclusies).length) hasMissingData = true;
      for (const attachmentValue of list(activity.bijlagen)) {
        const attachment = object(attachmentValue);
        const label = plainText(attachment.tekst || attachment.omschrijving || attachment.naam || attachment.documenttypeGeneriek) || "Bijlage bij uw aanvraag";
        attachments.push(label);
        if (Number.isInteger(attachment.id)) attachmentDetails.push({ key: `${reference}::${attachment.id}`, ref: reference, id: attachment.id as number, title: label, required: attachment.verplicht === true, questionRef: string(attachment.vraagReferentie), helpIds: Object.values(object(attachment.toelichting)).filter((id): id is number => typeof id === "number") });
      }
      for (const groupValue of list(activity.vraaggroepen)) {
        for (const questionValue of list(object(groupValue).vragen)) {
          const question = object(questionValue);
          if (typeof question.id !== "number" || !reference) continue;
          const prefilled = string(question.gewijzigdAntwoord ?? question.vooringevuldAntwoord);
          if (question.uitvoeringsregelType === "uitkomstHerbruikbareBeslissing") {
            if (!prefilled || prefilled === "nietBeschikbaar") {
              hasMissingData = true;
              for (const ref of list(question.herbruikbareBeslissingFunctioneleStructuurRefs)) if (typeof ref === "string") dependencies.add(ref);
            }
            continue;
          }
          if (question.verborgenStuurvraag && prefilled) continue;
          const explanation = object(question.toelichting);
          const key = `${reference}::${question.id}`;
          questions.set(key, {
            key, ref: reference, id: question.id, title: plainText(question.tekst), type: string(question.antwoordType),
            multiple: question.optieType === "meerdereAntwoorden",
            options: list(question.opties).map(object).sort((first, second) => Number(first.sequenceId ?? 0) - Number(second.sequenceId ?? 0)).map((option) => ({ label: plainText(option.optieTekst), value: string(option.optieTekst), exclusive: option.optieGeenVanBovenstaande === true })),
            required: question.verplicht === true, prefilled,
            helpIds: [explanation.korteToelichtingId, explanation.langeToelichtingId].filter((value): value is number => typeof value === "number"),
            hint: plainText(question.invulinstructie), multiline: question.antwoordType === "string" && question.invoertype === "tekstveld", geo: question.uitvoeringsregelType === "geoVerwijzing",
            group: plainText(object(groupValue).groepNaam), activity: title, source: string(question.uitvoeringsregelType),
            changed: typeof question.gewijzigdAntwoord === "string" ? question.gewijzigdAntwoord : undefined,
            questionRef: string(question.vraagReferentie), classification: string(question.classificatie), public: question.publiceerbaar === true, confidential: question.potentieelVertrouwelijk === true,
          });
        }
      }
    }
  }
  return { questions: [...questions.values()], conclusions, attachments: [...new Set(attachments)], attachmentDetails, dependencies: [...dependencies], ruleIds: [...ruleIds].sort((a, b) => a - b), notices, ready: payload.length > 0 && payload.every((entry) => object(entry).indienbaar === true), complete: payload.length > 0 && payload.every((entry) => object(entry).compleet === true), hasMissingData };
}
