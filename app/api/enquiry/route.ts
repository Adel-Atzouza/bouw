import { parseEnquiry, saveEnquiry } from "@/lib/delicent-enquiry";
import { sendEnquiryEmail } from "@/lib/delicent-email";

export const runtime = "nodejs";
const maxBody = 24_000;
const reply = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (
        new URL(origin).host !==
        (request.headers.get("host") || new URL(request.url).host)
      )
        return reply(
          { error: "Verstuur uw aanvraag vanaf deze website." },
          403,
        );
    } catch {
      return reply({ error: "Ongeldige herkomst." }, 403);
    }
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "Ongeldig aanvraagformaat." }, 415);
  if (Number(request.headers.get("content-length")) > maxBody)
    return reply({ error: "Uw bericht is te lang." }, 413);
  let raw: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Uw aanvraag is leeg." }, 400);
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBody) {
        await reader.cancel();
        return reply({ error: "Uw bericht is te lang." }, 413);
      }
      chunks.push(chunk.value);
    }
    raw = JSON.parse(await new Blob(chunks).text());
  } catch {
    return reply(
      { error: "Uw aanvraag kon niet worden gelezen. Probeer opnieuw." },
      400,
    );
  }
  const enquiry = parseEnquiry(raw);
  if (!enquiry)
    return reply(
      {
        error:
          "Controleer uw naam, e-mailadres, projectplaats en bericht (minimaal 10 tekens).",
      },
      400,
    );
  try {
    const receipt = await saveEnquiry(enquiry);
    try {
      const email = await sendEnquiryEmail(receipt.reference);
      if (email.status !== "queued")
        console.warn("Enquiry email pending:", receipt.reference);
    } catch {
      console.error("Enquiry email needs retry:", receipt.reference);
    }
    return reply(receipt);
  } catch {
    return reply(
      {
        error:
          "Uw aanvraag kon niet worden opgeslagen. Uw gegevens blijven in het formulier staan. Probeer het opnieuw.",
      },
      503,
    );
  }
}
