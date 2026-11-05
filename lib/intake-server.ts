import { constants } from "node:fs";
import { access, mkdir, mkdtemp, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import type { Answers, IntakeFiles } from "./intake";
import type { WorkId } from "./pricing";

export type StoredIntake = {
  version: 1;
  reference: string;
  receivedAt: string;
  selected: WorkId[];
  answers: Answers;
  consent: true;
  attachments: { field: string; name: string; type: string; size: number; storedName: string }[];
};
type Delivery = { status: "pending" | "delivered"; attempts: number; lastAttemptAt?: string; deliveredAt?: string };

export function intakeDirectory() {
  const root = resolve(process.env.INTAKE_STORAGE_DIR?.trim() || join(process.cwd(), ".data", "intakes"));
  for (const exposed of ["public", ".next", "out"]) {
    const directory = resolve(process.cwd(), exposed);
    if (root === directory || root.startsWith(`${directory}${sep}`)) throw new Error("Intake storage must be outside public/build directories.");
  }
  return root;
}

function recordDirectory(reference: string) {
  if (!/^BAH-[A-F0-9]{16}$/.test(reference)) throw new Error("Invalid intake reference.");
  return join(intakeDirectory(), reference);
}

async function syncDirectory(path: string) {
  const directory = await open(path, "r");
  try { await directory.sync(); } finally { await directory.close(); }
}

async function writePrivateFile(path: string, content: string | Uint8Array) {
  const file = await open(path, "wx", 0o600);
  try { await file.writeFile(content); await file.sync(); } finally { await file.close(); }
}

export async function intakeStorageAvailable() {
  try {
    const root = intakeDirectory();
    await mkdir(root, { recursive: true, mode: 0o700 });
    await access(root, constants.W_OK);
    return true;
  } catch { return false; }
}

export async function readStoredIntake(reference: string): Promise<StoredIntake | null> {
  try {
    const record = JSON.parse(await readFile(join(recordDirectory(reference), "intake.json"), "utf8")) as StoredIntake;
    if (record.version !== 1 || record.reference !== reference || !Number.isFinite(Date.parse(record.receivedAt)) || !Array.isArray(record.attachments)) throw new Error("Invalid saved intake.");
    return record;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function storeIntake(input: { reference: string; selected: WorkId[]; answers: Answers; files: IntakeFiles; dossier: (receipt: { reference: string; receivedAt: string }) => string }): Promise<StoredIntake> {
  const root = intakeDirectory();
  const destination = recordDirectory(input.reference);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const existing = await readStoredIntake(input.reference);
  if (existing) { await syncDirectory(root); return existing; }

  // A complete directory is published atomically; partial uploads are never acknowledged.
  const staging = await mkdtemp(join(root, ".pending-"));
  try {
    const record: StoredIntake = { version: 1, reference: input.reference, receivedAt: new Date().toISOString(), selected: input.selected, answers: input.answers, consent: true, attachments: [] };
    for (const [field, files] of Object.entries(input.files)) {
      for (const file of files) {
        const suffix = extname(file.name).toLowerCase();
        const extension = /^\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?|pdf)$/.test(suffix) ? suffix : ".bin";
        const storedName = `attachment-${String(record.attachments.length + 1).padStart(3, "0")}${extension}`;
        await writePrivateFile(join(staging, storedName), new Uint8Array(await file.arrayBuffer()));
        record.attachments.push({ field, name: file.name, type: file.type, size: file.size, storedName });
      }
    }
    await writePrivateFile(join(staging, "dossier.txt"), input.dossier(record));
    await writePrivateFile(join(staging, "delivery.json"), JSON.stringify({ status: "pending", attempts: 0 } satisfies Delivery));
    await writePrivateFile(join(staging, "intake.json"), JSON.stringify(record, null, 2));
    await syncDirectory(staging);
    try { await rename(staging, destination); }
    catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      const concurrent = await readStoredIntake(input.reference);
      if (!concurrent) throw error;
      await syncDirectory(root);
      return concurrent;
    }
    await syncDirectory(root);
    return record;
  } finally { await rm(staging, { recursive: true, force: true }); }
}

export async function listStoredIntakes() {
  let names: string[];
  try { names = await readdir(intakeDirectory()); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const records: StoredIntake[] = [];
  for (const name of names.filter((name) => /^BAH-[A-F0-9]{16}$/.test(name))) {
    const record = await readStoredIntake(name);
    if (record) records.push(record);
  }
  return records.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export async function readDelivery(reference: string): Promise<Delivery> {
  return JSON.parse(await readFile(join(recordDirectory(reference), "delivery.json"), "utf8"));
}

async function writeDelivery(reference: string, delivery: Delivery) {
  const directory = recordDirectory(reference);
  const temporary = join(directory, `.delivery-${randomUUID()}.json`);
  try {
    await writePrivateFile(temporary, JSON.stringify(delivery));
    await rename(temporary, join(directory, "delivery.json"));
    await syncDirectory(directory);
  } finally { await rm(temporary, { force: true }); }
}

// Notification/delivery is independent of receipt. The saved request is the source of truth.
export async function forwardStoredIntake(record: StoredIntake) {
  const delivery = await readDelivery(record.reference);
  if (delivery.status === "delivered") return;
  let destination: URL;
  try { destination = new URL(process.env.INTAKE_WEBHOOK_URL ?? ""); } catch { return; }
  if (destination.protocol !== "https:" || !process.env.INTAKE_WEBHOOK_TOKEN) return;
  const attempt: Delivery = { status: "pending", attempts: delivery.attempts + 1, lastAttemptAt: new Date().toISOString() };
  try {
    const directory = recordDirectory(record.reference);
    const body = new FormData();
    body.set("reference", record.reference);
    body.set("intake", JSON.stringify({ selected: record.selected, answers: record.answers, consent: true }));
    body.set("dossier", await readFile(join(directory, "dossier.txt"), "utf8"));
    for (const attachment of record.attachments) {
      if (!/^attachment-\d+\.[a-z0-9]+$/.test(attachment.storedName)) throw new Error("Invalid stored attachment.");
      body.append(`file:${attachment.field}`, new Blob([await readFile(join(directory, attachment.storedName))], { type: attachment.type }), attachment.name);
    }
    const response = await fetch(destination, { method: "POST", body, headers: { Authorization: `Bearer ${process.env.INTAKE_WEBHOOK_TOKEN}`, "Idempotency-Key": record.reference }, signal: AbortSignal.timeout(5_000), redirect: "error" });
    if (!response.ok) throw new Error("Delivery failed.");
    const result = await response.json();
    if (result.accepted !== true || result.reference !== record.reference || typeof result.receivedAt !== "string" || !Number.isFinite(Date.parse(result.receivedAt))) throw new Error("Delivery not acknowledged.");
    attempt.status = "delivered";
    attempt.deliveredAt = new Date().toISOString();
  } catch { /* Leave it pending for a later retry, without losing the received enquiry. */ }
  await writeDelivery(record.reference, attempt);
}
