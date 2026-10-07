"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { activeIntake, isIntakeReceipt, type IntakeReceipt } from "@/lib/intake-submission";
import { exportIntake, outcomes, value, type Answers, type IntakeFiles } from "@/lib/intake";
import { downloadText, workTypes, type WorkId } from "@/lib/pricing";

export function IntakeSubmit({ selected, answers, files, requestId, onChange, onReceipt, onBusy, receipt }: {
  selected: WorkId[]; answers: Answers; files: IntakeFiles; requestId: string;
  onChange: (id: string, answer: string) => void; onReceipt: (receipt: IntakeReceipt) => void; onBusy: (busy: boolean) => void; receipt: IntakeReceipt | null;
}) {
  const [availability, setAvailability] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const submitting = useRef(false);
  const active = activeIntake(selected, answers, files);
  const attachments = Object.values(active.files).flat();
  const needsSite = outcomes(selected, answers, active.files).some((result) => result.next === "site");
  const email = value(answers, "contact.email");
  const contactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "") ? process.env.NEXT_PUBLIC_CONTACT_EMAIL : null;
  const dossier = () => exportIntake(selected, answers, active.files, receipt ?? undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/intake", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setAvailability(data.available === true ? "ready" : "unavailable"))
      .catch(() => { if (!controller.signal.aborted) setAvailability("error"); });
    return () => controller.abort();
  }, [retry]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || receipt || !consent || availability !== "ready") return;
    submitting.current = true; setBusy(true); onBusy(true); setError("");
    try {
      const data = new FormData();
      data.set("requestId", requestId);
      data.set("intake", JSON.stringify({ selected, answers: active.answers, consent }));
      for (const [id, uploads] of Object.entries(active.files)) for (const file of uploads) data.append(`file:${id}`, file);
      const response = await fetch("/api/intake", { method: "POST", body: data, signal: AbortSignal.timeout(60_000) });
      const result = await response.json();
      if (!response.ok || !isIntakeReceipt(result)) throw new Error(result.error || "We kunnen de ontvangst nog niet bevestigen. Probeer opnieuw.");
      onReceipt(result);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "TypeError" ? cause.message : "De verbinding is onderbroken. We kunnen de ontvangst nog niet bevestigen. Uw antwoorden blijven staan; probeer het opnieuw.");
    } finally { submitting.current = false; setBusy(false); onBusy(false); }
  }

  async function download() {
    setDownloading(true); setError("");
    try {
      const { createIntakePdf } = await import("@/lib/intake-pdf");
      await createIntakePdf(dossier(), Boolean(receipt)).save(receipt ? `bouwaanhuis-${receipt.reference}.pdf` : "bouwaanhuis-online-opname.pdf", { returnPromise: true });
    } catch { setError("De pdf kon niet worden gemaakt. U kunt uw dossier ook als tekstbestand bewaren."); }
    finally { setDownloading(false); }
  }

  return <div className="intake-submission">
    {receipt ? <>
      <div className="intake-receipt" role="status">
        <span className="intake-success-icon"><Icon name="check" size={30} /></span>
        <span className="intake-receipt-label">GOED ONTVANGEN</span>
        <h4>Bedankt, {value(answers, "contact.name").trim().split(/\s+/)[0]}. Uw plannen zijn bij ons.</h4>
        <p>Uw aanvraag en {attachments.length ? `${attachments.length} bijlage${attachments.length === 1 ? "" : "n"}` : "antwoorden"} zijn ontvangen. U hoeft nu niets meer op te sturen.</p>
        <dl><div><dt>Uw aanvraagnummer</dt><dd>{receipt.reference}</dd></div><div><dt>Ontvangen op</dt><dd>{new Date(receipt.receivedAt).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}</dd></div></dl>
      </div>
      <div className="intake-expectations"><h4>Hoe gaat het nu verder?</h4><ol>
        <li><span>1</span><div><strong>We bekijken uw plannen</strong><p>We beoordelen uw wensen, maten en eventuele foto&apos;s. Ontbreekt er iets? Dan bespreken we dat met u.</p></div></li>
        <li><span>2</span><div><strong>U hoort persoonlijk van ons</strong><p>We nemen contact op via <strong>{email}</strong>{value(answers, "contact.phone") ? ` of ${value(answers, "contact.phone")}` : ""} om uw plannen en de vervolgstap te bespreken.</p></div></li>
        <li><span>3</span><div><strong>{needsSite ? "Samen de volgende stap plannen" : "Toewerken naar een duidelijke offerte"}</strong><p>{needsSite ? "Als een bezoek nodig is, spreken we samen een moment af. Er is nog geen afspraak geboekt." : "Na beoordeling bespreken we de mogelijkheden en wat nodig is voor een offerte op maat."} U beslist daarna of u verder wilt.</p></div></li>
      </ol></div>
      <p className="intake-hint">Uw aanvraag is vrijblijvend. Een ontvangstbevestiging is nog geen offerte, opdracht of vergunningaanvraag. Bewaar hieronder uw aanvraagnummer en een kopie voor uzelf.</p>
    </> : <>
      <div className="intake-send-summary"><Icon name="file" size={24} /><div><strong>Dit sturen we voor u door</strong><p>{selected.map((id) => workTypes.find((work) => work.id === id)?.name).join(" · ")}</p><span>Uw antwoorden{attachments.length ? ` + ${attachments.length} bijlage${attachments.length === 1 ? "" : "n"} (${(attachments.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} MB)` : " · geen bijlagen toegevoegd"}</span></div></div>
      {availability === "ready" && <form className="intake-send-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}><legend>Waar kunnen we u bereiken?</legend><p className="intake-hint">Vul uw naam en e-mailadres in. Uw telefoonnummer is optioneel.</p>
          <label htmlFor="send-name">Uw naam <span>verplicht</span></label><input id="send-name" autoComplete="name" required maxLength={150} pattern=".*\S.*" value={value(answers, "contact.name")} onChange={(event) => onChange("contact.name", event.target.value)} />
          <label htmlFor="send-email">E-mailadres <span>verplicht</span></label><input id="send-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => onChange("contact.email", event.target.value)} /><p className="intake-field-help">Via dit adres nemen we contact met u op over uw aanvraag.</p>
          <label htmlFor="send-phone">Telefoonnummer <span>optioneel</span></label><input id="send-phone" type="tel" autoComplete="tel" maxLength={80} value={value(answers, "contact.phone")} onChange={(event) => onChange("contact.phone", event.target.value)} />
          <label className="intake-consent"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Ik wil mijn antwoorden, contactgegevens en bijlagen delen met bouwaanhuis en hierover worden benaderd.</span></label>
          <div className="intake-submit-expectation"><Icon name="lock" size={18} /><p>Na het versturen krijgt u hier uw aanvraagnummer. We bekijken uw plannen en nemen persoonlijk contact met u op. U zit nergens aan vast.</p></div>
          <button className="button button-bordeaux intake-send-button" type="submit">{busy ? "Uw aanvraag wordt verstuurd…" : "Verstuur mijn aanvraag"}<Icon name={busy ? "clock" : "arrow"} size={18} /></button>
        </fieldset>
      </form>}
      {availability === "loading" && <p className="intake-hint" role="status">We controleren of u uw aanvraag kunt versturen…</p>}
      {availability === "error" && <div className="intake-callout" role="status"><div><strong>Versturen is even niet bereikbaar</strong><p>Uw antwoorden zijn behouden. Probeer opnieuw of download alvast uw dossier.</p><button className="button button-outline" onClick={() => { setAvailability("loading"); setRetry((current) => current + 1); }}>Opnieuw proberen</button></div></div>}
      {availability === "unavailable" && <div className="intake-callout"><Icon name="file" size={22} /><div><strong>Uw dossier is klaar om te delen</strong><p>Rechtstreeks versturen via de website is nog niet beschikbaar. Download uw dossier{contactEmail ? " en stuur het naar ons per e-mail" : " en bewaar het voor uw contact met bouwaanhuis"}. Uw aanvraag is nog niet verzonden.</p>{contactEmail && <a className="text-link" href={`mailto:${contactEmail}?subject=${encodeURIComponent("Mijn verbouwplannen — bouwaanhuis")}`}>Open uw e-mailprogramma <Icon name="arrow" size={16} /></a>}</div></div>}
    </>}
    {error && <p className="error-notice" role="alert">{error}</p>}
    <div className="intake-receipt-download"><div><strong>{receipt ? "Uw aanvraag, ook voor uzelf" : "Liever eerst bewaren?"}</strong><p>{receipt ? "Download uw dossier met de ontvangstbevestiging." : "U kunt uw dossier ook downloaden zonder het te versturen."}</p></div><button className="button button-outline" disabled={downloading || busy} onClick={download}><Icon name="download" size={18} />{downloading ? "Pdf maken…" : "Download mijn dossier"}</button><button className="text-link" disabled={busy} onClick={() => downloadText("bouwaanhuis-online-opname.txt", dossier())}>Als tekstbestand</button></div>
    <p className="intake-hint">{attachments.length > 0 ? <>De download bevat uw antwoorden en bestandsnamen. Foto&apos;s en documenten zijn niet in de download opgenomen{receipt ? "; ze zijn wel meegestuurd met uw aanvraag" : ". Voeg ze apart toe als u uw dossier zelf per e-mail verstuurt"}.</> : <>De download bevat uw antwoorden{receipt ? " en uw ontvangstbevestiging" : ""}. U heeft geen bijlagen toegevoegd.</>}</p>
  </div>;
}
