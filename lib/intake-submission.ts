import { buildSections, effectiveWorks, visible, type Answers, type IntakeFiles } from "./intake";
import type { WorkId } from "./pricing";

export type IntakeReceipt = { reference: string; receivedAt: string };

// Answers and attachments from abandoned branches must never be submitted.
export function activeIntake(selected: WorkId[], answers: Answers, files: IntakeFiles) {
  const questions = buildSections(selected, answers).flatMap((section) => section.questions).filter((question) => visible(question, answers));
  const answerIds = new Set(questions.map((question) => question.id));
  for (const work of effectiveWorks(selected, answers)) {
    if (questions.some((question) => question.id === `${work}.permit`)) answerIds.add(`${work}.permitConclusion`);
  }
  const uploadIds = new Set(questions.filter((question) => question.type === "upload").map((question) => question.id));
  return {
    answers: Object.fromEntries(Object.entries(answers).filter(([id]) => answerIds.has(id))),
    files: Object.fromEntries(Object.entries(files).filter(([id]) => uploadIds.has(id))),
  };
}

export function isIntakeReceipt(receipt: unknown): receipt is IntakeReceipt {
  if (!receipt || typeof receipt !== "object") return false;
  const data = receipt as Record<string, unknown>;
  return typeof data.reference === "string" && /^BAH-[A-F0-9]{16}$/.test(data.reference)
    && typeof data.receivedAt === "string" && Number.isFinite(Date.parse(data.receivedAt));
}

export function supportedIntakeFile(file: File) {
  return /^(image\/(jpeg|png|webp|gif|heic|heif|avif|bmp|tiff)|application\/pdf)$/.test(file.type)
    || ((!file.type || file.type === "application/octet-stream") && /\.(heic|heif|pdf)$/i.test(file.name));
}
