import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { open, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { enquiryDirectory, type Enquiry } from "./delicent-enquiry";

type StoredEnquiry = Omit<Enquiry, "requestId"> & {
  reference: string;
  receivedAt: string;
};
type EmailStatus = {
  status: "pending" | "queued";
  attempts: number;
  lastAttemptAt?: string;
  queuedAt?: string;
};

function directory(reference: string) {
  if (!/^DEL-[A-F0-9]{16}$/.test(reference))
    throw new Error("Invalid enquiry reference.");
  return join(enquiryDirectory(), reference);
}

export function enquiryEmailConfigured() {
  return process.env.DELICENT_EMAIL_ENABLED === "true";
}

export async function readEnquiryEmailStatus(reference: string): Promise<EmailStatus> {
  try {
    return JSON.parse(await readFile(join(directory(reference), "email.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { status: "pending", attempts: 0 };
    throw error;
  }
}

async function writeStatus(reference: string, status: EmailStatus) {
  const root = directory(reference);
  const temporary = join(root, `.email-${randomUUID()}.json`);
  try {
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(status));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, join(root, "email.json"));
    const folder = await open(root, "r");
    try { await folder.sync(); } finally { await folder.close(); }
  } finally {
    await rm(temporary, { force: true });
  }
}

function queueMessage(record: StoredEnquiry) {
  // Fixed addresses; user input is never used in command arguments or a shell.
  // Reject header separators even when processing an older saved record.
  if (!/^[^\s<>(),;:"\\]+@[^\s<>(),;:"\\]+\.[^\s<>(),;:"\\]+$/.test(record.email))
    throw new Error("Invalid reply address.");
  const text = [
    "Nieuwe aanvraag via de website van Dèlicent",
    "",
    `Kenmerk: ${record.reference}`,
    `Ontvangen: ${record.receivedAt}`,
    `Dienst / project: ${record.project}`,
    `Naam: ${record.name}`,
    `E-mailadres: ${record.email}`,
    `Telefoon: ${record.phone || "Niet opgegeven"}`,
    `Plaats: ${record.location}`,
    "",
    "Plannen:",
    record.message,
    "",
    "Beantwoord deze e-mail om rechtstreeks contact op te nemen met de aanvrager.",
  ].join("\n");
  const message = [
    "From: =?UTF-8?B?RMOobGljZW50?= <website@delicent.nl>",
    "To: info@delicent.nl",
    `Reply-To: ${record.email}`,
    `Subject: Nieuwe aanvraag ${record.reference}`,
    `Date: ${new Date(record.receivedAt).toUTCString()}`,
    `Message-ID: <${record.reference}@delicent.nl>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(text).toString("base64").match(/.{1,76}/g)!.join("\r\n"),
    "",
  ].join("\r\n");
  return new Promise<void>((resolve, reject) => {
    const child = execFile(
      process.env.DELICENT_SENDMAIL_PATH?.trim() || "/usr/sbin/sendmail",
      ["-i", "-f", "website@delicent.nl", "--", "info@delicent.nl"],
      { timeout: 8_000, maxBuffer: 16_384, killSignal: "SIGKILL" },
      (error) => error ? reject(new Error("Local mail queue unavailable.")) : resolve(),
    );
    // EPIPE can occur if sendmail exits before consuming the message.
    child.stdin?.on("error", () => reject(new Error("Local mail input unavailable.")));
    child.stdin?.end(message);
  });
}

// Only saved enquiries can be mailed. "queued" means Postfix accepted the
// message; delivery/retries/bounces after that belong to the local mail server.
export async function sendEnquiryEmail(reference: string): Promise<EmailStatus> {
  if (!enquiryEmailConfigured()) return readEnquiryEmailStatus(reference);
  const lockPath = join(directory(reference), ".email.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      return readEnquiryEmailStatus(reference);
    throw error;
  }
  try {
    const previous = await readEnquiryEmailStatus(reference);
    if (previous.status === "queued") return previous;
    const record: StoredEnquiry = JSON.parse(
      await readFile(join(directory(reference), "enquiry.json"), "utf8"),
    );
    if (record.reference !== reference) throw new Error("Invalid saved enquiry.");
    const status: EmailStatus = {
      status: "pending",
      attempts: previous.attempts + 1,
      lastAttemptAt: new Date().toISOString(),
    };
    try {
      await queueMessage(record);
      status.status = "queued";
      status.queuedAt = new Date().toISOString();
    } catch {
      // Keep the saved enquiry pending for a later retry, without logging PII.
    }
    await writeStatus(reference, status);
    return status;
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
