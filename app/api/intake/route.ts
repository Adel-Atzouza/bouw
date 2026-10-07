import { createHash } from "node:crypto";
import { activeIntake, supportedIntakeFile } from "@/lib/intake-submission";
import { exportIntake, value, type Answers, type IntakeFiles } from "@/lib/intake";
import { workTypes, type WorkId } from "@/lib/pricing";

export const runtime = "nodejs";
const maxBody = 102 * 1024 * 1024;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function destination() {
  try {
    const url = new URL(process.env.INTAKE_WEBHOOK_URL ?? "");
    return url.protocol === "https:" && process.env.INTAKE_WEBHOOK_TOKEN ? url : null;
  } catch { return null; }
}

export function GET() {
  return reply({ available: Boolean(destination()) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (origin) {
    try { if (new URL(origin).host !== host) return reply({ error: "Verstuur uw aanvraag vanaf deze website." }, 403); }
    catch { return reply({ error: "Ongeldige herkomst." }, 403); }
  }
  const url = destination();
  if (!url) return reply({ error: "Online versturen is nog niet beschikbaar. Download uw dossier om het zelf te delen." }, 503);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return reply({ error: "Ongeldige aanvraag." }, 415);
  if (Number(request.headers.get("content-length")) > maxBody) return reply({ error: "Uw bijlagen zijn te groot. Gebruik samen maximaal 100 MB." }, 413);

  let data: FormData;
  try {
    // Bound streamed requests too, rather than relying on Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Uw aanvraag is leeg." }, 400);
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBody) { await reader.cancel(); return reply({ error: "Uw bijlagen zijn te groot. Gebruik samen maximaal 100 MB." }, 413); }
      chunks.push(chunk.value);
    }
    data = await new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
  } catch { return reply({ error: "Uw aanvraag kon niet worden gelezen. Probeer opnieuw." }, 400); }

  let selected: WorkId[], answers: Answers;
  const files: IntakeFiles = {};
  const requestId = data.get("requestId");
  try {
    const raw = data.get("intake");
    if (typeof raw !== "string" || raw.length > 250_000) throw new Error();
    const payload = JSON.parse(raw);
    if (payload.consent !== true || typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId)) throw new Error();
    if (!Array.isArray(payload.selected) || !payload.selected.length || payload.selected.length > workTypes.length || payload.selected.some((id: unknown) => !workTypes.some((work) => work.id === id))) throw new Error();
    if (!payload.answers || typeof payload.answers !== "object" || Array.isArray(payload.answers) || Object.keys(payload.answers).length > 1500) throw new Error();
    if (Object.values(payload.answers).some((answer) => typeof answer === "string" ? answer.length > 4000 : !Array.isArray(answer) || answer.length > 100 || answer.some((item) => typeof item !== "string" || item.length > 500))) throw new Error();
    selected = [...new Set(payload.selected)] as WorkId[];
    answers = payload.answers;
    if (!value(answers, "contact.name").trim() || value(answers, "contact.name").length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value(answers, "contact.email")) || value(answers, "contact.email").length > 254 || value(answers, "contact.phone").length > 80) throw new Error();
    let total = 0, count = 0;
    for (const [key, file] of data) {
      if (["intake", "requestId"].includes(key)) continue;
      if (!key.startsWith("file:") || !(file instanceof File) || file.size > 20 * 1024 * 1024 || !supportedIntakeFile(file)) throw new Error();
      total += file.size; count++;
      if (total > 100 * 1024 * 1024 || count > 100) throw new Error();
      (files[key.slice(5)] ??= []).push(file);
    }
  } catch { return reply({ error: "Controleer uw naam, e-mailadres en bijlagen. Gebruik foto's of PDF (maximaal 20 MB per bestand en 100 MB samen) en bevestig dat we contact mogen opnemen." }, 400); }

  const active = activeIntake(selected, answers, files);
  const hash = createHash("sha256").update(requestId as string).update(JSON.stringify({ selected, answers: active.answers }));
  const forward = new FormData();
  for (const [id, attachments] of Object.entries(active.files)) {
    for (const file of attachments) {
      hash.update(id).update(file.name).update(new Uint8Array(await file.arrayBuffer()));
      forward.append(`file:${id}`, file, file.name);
    }
  }
  const reference = `BAH-${hash.digest("hex").slice(0, 16).toUpperCase()}`;
  forward.set("reference", reference);
  forward.set("intake", JSON.stringify({ selected, answers: active.answers, consent: true }));
  forward.set("dossier", exportIntake(selected, active.answers, active.files));
  try {
    const response = await fetch(url, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.INTAKE_WEBHOOK_TOKEN}`, "Idempotency-Key": reference },
      body: forward, signal: AbortSignal.timeout(30_000), redirect: "error",
    });
    if (!response.ok) throw new Error();
    const receipt = await response.json();
    // The receiving service must confirm durable receipt and deduplicate retries.
    if (receipt.accepted !== true || receipt.reference !== reference || typeof receipt.receivedAt !== "string" || !Number.isFinite(Date.parse(receipt.receivedAt))) throw new Error();
    return reply({ reference, receivedAt: receipt.receivedAt });
  } catch {
    return reply({ error: "We kunnen de ontvangst nog niet bevestigen. Uw antwoorden blijven behouden. Probeer opnieuw; dezelfde aanvraag wordt met hetzelfde kenmerk aangeboden." }, 502);
  }
}
