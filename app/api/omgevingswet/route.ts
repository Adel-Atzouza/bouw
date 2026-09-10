import { normalizeDsoResponse, plainText, type DsoMode, type DsoReference } from "@/lib/dso";

export const dynamic = "force-dynamic";

const requestHeaders = { "Cache-Control": "no-store, max-age=0" };
const officialUrl = "https://omgevingswet.overheid.nl/home";

function respond(body: unknown, status = 200) {
  return Response.json(body, { status, headers: requestHeaders });
}

function serviceBase() {
  return process.env.DSO_ENVIRONMENT === "preproduction"
    ? "https://service.pre.omgevingswet.overheid.nl/publiek/toepasbare-regels/api"
    : "https://service.omgevingswet.overheid.nl/publiek/toepasbare-regels/api";
}

async function dsoFetch(path: string, body?: unknown, accept = "application/json") {
  const response = await fetch(`${serviceBase()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "x-api-key": process.env.DSO_API_KEY!, "Content-Type": "application/json", "Content-Crs": "EPSG:28992", Accept: accept },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("De verbinding met het Omgevingsloket is nog niet beschikbaar. U kunt verder op de officiële website.");
    if (response.status === 429) throw new Error("Het Omgevingsloket is druk. Probeer het over een minuut opnieuw.");
    if (response.status === 400) throw new Error("Het Omgevingsloket kan deze antwoorden niet verwerken. Controleer uw invoer of vervolg de check in het Omgevingsloket.");
    throw new Error("Het Omgevingsloket is tijdelijk niet bereikbaar. Uw antwoorden staan nog in dit venster. Probeer het opnieuw.");
  }
  return response.json();
}

function validCoordinates(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)) && value[0] >= -7000 && value[0] <= 300000 && value[1] >= 289000 && value[1] <= 630000;
}

function validReferences(value: unknown): value is DsoReference[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 20 && value.every((reference) =>
    reference && typeof reference === "object" && typeof reference.functioneleStructuurRef === "string" && /^https?:\/\/toepasbare-regels\.omgevingswet\.overheid\.nl\//.test(reference.functioneleStructuurRef) && reference.functioneleStructuurRef.length <= 1000 &&
    Array.isArray(reference.antwoorden) && reference.antwoorden.length <= 500 && reference.antwoorden.every((answer: { id?: unknown; antwoord?: unknown }) => Number.isInteger(answer?.id) && typeof answer.antwoord === "string" && answer.antwoord.length <= 6144)
  );
}

export async function GET() {
  return respond({ available: Boolean(process.env.DSO_API_KEY?.trim()), environment: process.env.DSO_ENVIRONMENT === "preproduction" ? "preproduction" : "production", officialUrl });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return respond({ error: "Dit verzoek komt niet van deze website." }, 403);
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 128000) return respond({ error: "Er zijn te veel gegevens verstuurd." }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return respond({ error: "Ongeldig verzoek." }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return respond({ error: "De gegevens konden niet worden gelezen." }, 400);
  }

  try {
    if (body.action === "address") {
      const postcode = typeof body.postcode === "string" ? body.postcode.replace(/\s/g, "").toUpperCase() : "";
      const houseNumber = typeof body.houseNumber === "string" ? body.houseNumber.trim() : "";
      if (!/^[1-9][0-9]{3}[A-Z]{2}$/.test(postcode) || !/^[1-9][0-9]{0,4}$/.test(houseNumber)) return respond({ error: "Vul een geldige postcode en een huisnummer zonder toevoeging in." }, 400);
      const parameters = new URLSearchParams({ rows: "100", fl: "id,weergavenaam,centroide_rd" });
      parameters.append("fq", "type:adres");
      parameters.append("fq", `postcode:${postcode}`);
      parameters.append("fq", `huisnummer:${houseNumber}`);
      const response = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?${parameters}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("Het adres kan nu niet worden opgezocht. Probeer het opnieuw.");
      const data = await response.json();
      const addresses = (data.response?.docs ?? []).flatMap((document: { id: string; weergavenaam: string; centroide_rd: string }) => {
        const match = /^POINT\(([\d.-]+) ([\d.-]+)\)$/.exec(document.centroide_rd ?? "");
        if (!match) return [];
        const coordinates = [Number(match[1]), Number(match[2])];
        return validCoordinates(coordinates) ? [{ id: document.id, label: document.weergavenaam, coordinates }] : [];
      });
      return respond({ addresses });
    }

    if (!["search", "execute", "help"].includes(String(body.action))) return respond({ error: "Onbekende handeling." }, 400);
    if (!process.env.DSO_API_KEY?.trim()) return respond({ error: "De vergunninghulp is nog niet verbonden met het Omgevingsloket. U kunt de officiële Vergunningcheck gebruiken.", code: "DSO_NOT_CONFIGURED", officialUrl }, 503);

    if (body.action === "search") {
      if (typeof body.query !== "string" || body.query.trim().length < 2 || body.query.length > 150 || !["check", "application"].includes(String(body.mode))) return respond({ error: "Vul minimaal twee letters in voor uw werkzaamheden." }, 400);
      const collection = body.mode === "application" ? "activiteiten" : "werkzaamheden";
      const data = await dsoFetch(`/zoekinterface/v2/${collection}/_zoek?pageSize=100`, { zoekterm: body.query.trim(), sortering: "besteMatch" }, "application/hal+json");
      const works = (data._embedded?.[collection] ?? []).map((work: { functioneleStructuurRef: string; omschrijving: string }) => ({ ref: work.functioneleStructuurRef, label: plainText(work.omschrijving) }));
      return respond({ works });
    }

    if (body.action === "help") {
      if (!Number.isInteger(body.id) || Number(body.id) < 0) return respond({ error: "Ongeldige toelichting." }, 400);
      const data = await dsoFetch(`/toepasbareregelsuitvoerenservices/v3/toelichtingen/${body.id}`);
      return respond({ text: plainText(data.toelichting) });
    }

    if (!validCoordinates(body.coordinates) || !validReferences(body.references) || !["check", "application"].includes(String(body.mode))) return respond({ error: "Selecteer een geldig adres en werkzaamheden en controleer uw antwoorden." }, 400);
    const mode = body.mode as DsoMode;
    const path = mode === "application" ? "indieningsvereisten" : "conclusie";
    const data = await dsoFetch(`/toepasbareregelsuitvoerenservices/v3/${path}/_bepaal`, {
      functioneleStructuurRefs: body.references,
      _geo: { intersects: { type: "Point", coordinates: body.coordinates } },
      ...(mode === "application" ? { rolaanduiding: { rol: "INITIATIEFNEMER" } } : {}),
    });
    return respond(normalizeDsoResponse(data, mode));
  } catch (error) {
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return respond({ error: timeout ? "Het ophalen duurt te lang. Uw invoer is behouden. Probeer het opnieuw of ga naar het Omgevingsloket." : error instanceof Error ? error.message : "Er is iets misgegaan. Probeer het opnieuw." }, 502);
  }
}
