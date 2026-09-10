export type DsoMode = "check" | "application";
export type Address = { id: string; label: string; coordinates: [number, number] };
export type DsoWork = { ref: string; label: string };
export type DsoAnswer = { id: number; antwoord: string };
export type DsoReference = { functioneleStructuurRef: string; antwoorden: DsoAnswer[] };
export type DsoQuestion = {
  key: string;
  ref: string;
  id: number;
  title: string;
  type: string;
  multiple: boolean;
  options: { label: string; exclusive: boolean }[];
  required: boolean;
  prefilled: string;
  helpIds: number[];
  hint: string;
  multiline: boolean;
  geo: boolean;
};
export type DsoConclusion = { title: string; text: string; code?: string; warning?: string };
export type DsoResult = {
  questions: DsoQuestion[];
  conclusions: DsoConclusion[];
  attachments: string[];
  ready: boolean;
  complete: boolean;
  hasMissingData: boolean;
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
  let hasMissingData = false;

  for (const item of payload) {
    const entry = object(item);
    const reference = string(entry.functioneleStructuurRef);
    const activities = list(mode === "check" ? entry.activiteiten : entry.subactiviteiten);
    if (activities.length === 0) hasMissingData = true;
    for (const activityValue of activities) {
      const activity = object(activityValue);
      const title = plainText(activity.subactiviteitNaam) || "Uw werkzaamheden";
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
        conclusions.push({ title, text: plainText(permission.waarde) || "Controleer deze activiteit in het Omgevingsloket.", code: string(permission.code), warning: warningParts.join(" ") || undefined });
      }
      if (warningParts.length && !list(activity.conclusies).length) conclusions.push({ title, text: "Voor deze activiteit is nog geen volledige conclusie beschikbaar.", warning: warningParts.join(" ") });
      for (const attachmentValue of list(activity.bijlagen)) {
        const attachment = object(attachmentValue);
        attachments.push(plainText(attachment.tekst || attachment.omschrijving || attachment.naam || attachment.documenttypeGeneriek) || "Bijlage bij uw aanvraag");
      }
      for (const groupValue of list(activity.vraaggroepen)) {
        for (const questionValue of list(object(groupValue).vragen)) {
          const question = object(questionValue);
          if (typeof question.id !== "number" || !reference) continue;
          const prefilled = string(question.gewijzigdAntwoord ?? question.vooringevuldAntwoord);
          if (question.uitvoeringsregelType === "uitkomstHerbruikbareBeslissing") {
            if (!prefilled || prefilled === "nietBeschikbaar") hasMissingData = true;
            continue;
          }
          if (question.verborgenStuurvraag && prefilled) continue;
          const explanation = object(question.toelichting);
          const key = `${reference}::${question.id}`;
          questions.set(key, {
            key, ref: reference, id: question.id, title: plainText(question.tekst), type: string(question.antwoordType),
            multiple: question.optieType === "meerdereAntwoorden",
            options: list(question.opties).map((optionValue) => { const option = object(optionValue); return { label: plainText(option.optieTekst), exclusive: option.optieGeenVanBovenstaande === true }; }),
            required: question.verplicht === true, prefilled,
            helpIds: [explanation.korteToelichtingId, explanation.langeToelichtingId].filter((value): value is number => typeof value === "number"),
            hint: plainText(question.invulinstructie), multiline: question.invoertype === "tekstveld", geo: question.uitvoeringsregelType === "geoVerwijzing",
          });
        }
      }
    }
  }
  return { questions: [...questions.values()], conclusions, attachments: [...new Set(attachments)], ready: payload.length > 0 && payload.every((entry) => object(entry).indienbaar === true), complete: payload.length > 0 && payload.every((entry) => object(entry).compleet === true), hasMissingData };
}
