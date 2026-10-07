import type { DsoConclusion, DsoQuestion, DsoReference, DsoResult, DsoWork } from "@/lib/dso";

export type DsoAnsweredQuestion = { question: DsoQuestion; value: string };

export function updateDsoHistory(history: DsoAnsweredQuestion[], question: DsoQuestion, value: string): DsoAnsweredQuestion[] {
  const index = history.findIndex((entry) => entry.question.key === question.key);
  if (index >= 0 && history[index].value === value) return history;
  return [...(index < 0 ? history : history.slice(0, index)), { question, value }];
}

export function buildDsoReferences(works: DsoWork[], history: DsoAnsweredQuestion[]): DsoReference[] {
  const references = new Map<string, DsoReference>(works.map((work) => [work.ref, { functioneleStructuurRef: work.ref, antwoorden: [] }]));
  for (const { question, value } of history) {
    const reference = references.get(question.ref) ?? { functioneleStructuurRef: question.ref, antwoorden: [] };
    reference.antwoorden.push({ id: question.id, antwoord: value });
    references.set(question.ref, reference);
  }
  return [...references.values()];
}

export function formatDsoAnswer(question: DsoQuestion, value: string): string {
  if (!value.trim()) return "Overgeslagen";
  if (question.type === "boolean" && value === "true") return "Ja";
  if (question.type === "boolean" && value === "false") return "Nee";
  if (question.type === "lijstwaarde") {
    const values = question.multiple ? selectedDsoOptions(question, value) : [value];
    return values.map((item) => question.options.find((option) => option.value === item)?.label ?? item).join(", ") || value;
  }
  return value;
}

export function unansweredQuestions(result: DsoResult | null, history: DsoAnsweredQuestion[]) {
  return result?.questions.filter((q) => !history.some((entry) => entry.question.key === q.key)) ?? [];
}

// DSO returns both answered and unanswered relevant questions. Drop answers from
// branches it no longer returns, and retain its current wording/options/overrides.
export function reconcileDsoHistory(result: DsoResult, history: DsoAnsweredQuestion[]): DsoAnsweredQuestion[] {
  const questions = new Map(result.questions.map((q) => [q.key, q]));
  return history.flatMap((entry) => {
    const question = questions.get(entry.question.key);
    return question ? [{ question, value: question.changed ?? entry.value }] : [];
  });
}

export function applicationWorks(conclusions: DsoConclusion[]): DsoWork[] {
  const actionable = ["Vergunningplicht", "Meldingsplicht", "Informatieplicht"];
  return [...new Map(conclusions.flatMap((item) => item.applicationRef && actionable.includes(item.code ?? "") ? [[item.applicationRef, { ref: item.applicationRef, label: item.title, permission: item.text }] as const] : [])).values()];
}

export function checkIsComplete(result: DsoResult | null, history: DsoAnsweredQuestion[]) {
  return Boolean(result && !result.hasMissingData && result.conclusions.length && !unansweredQuestions(result, history).length && !history.some((entry) => !entry.value.trim()));
}

export function selectedDsoOptions(question: DsoQuestion, value: string): string[] {
  const options = question.options.map((option) => option.value ?? option.label).sort((first, second) => second.length - first.length);
  const selected: string[] = [];
  let remaining = value;
  while (remaining) {
    const option = options.find((candidate) => candidate && (remaining === candidate || remaining.startsWith(`${candidate}, `)));
    if (!option) return [];
    selected.push(option);
    remaining = remaining.slice(option.length + 2);
  }
  return selected;
}
