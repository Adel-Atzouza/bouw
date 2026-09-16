import type { DsoQuestion, DsoReference, DsoWork } from "@/lib/dso";

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
  return value;
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
