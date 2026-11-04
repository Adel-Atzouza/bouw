"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Icon } from "@/components/icon";
import { contactEmail, contactPhone, phoneHref } from "@/lib/contact";
import { isIntakeReceipt, supportedIntakeFile, type IntakeReceipt } from "@/lib/intake-submission";
import { exportIntake, type Answers } from "@/lib/intake";
import { downloadText, workTypes, type WorkId } from "@/lib/pricing";

export type QuoteRequestHandle = { open: (mode: "contact" | "guided", work?: WorkId) => void };
const stepNames = ["Uw project", "Uw wensen", "Planning", "Contact"];
const budgetOptions = ["Tot € 50.000", "€ 50.000 – € 100.000", "€ 100.000 – € 200.000", "Meer dan € 200.000", "Bespreek ik graag samen"];

export default function QuoteRequest({ ref }: { ref: Ref<QuoteRequestHandle> }) {
  const [mode, setMode] = useState<"contact" | "guided">("contact");
  const [step, setStep] = useState(0);
  const [work, setWork] = useState<WorkId>("renovatie");
  const [answers, setAnswers] = useState<Answers>({});
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [receipt, setReceipt] = useState<IntakeReceipt | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const requestId = useRef("");
  const submitting = useRef(false);
  const get = (id: string) => typeof answers[id] === "string" ? answers[id] as string : "";
  const change = (id: string, value: string) => setAnswers((current) => ({ ...current, [id]: value }));
  const project = workTypes.find((item) => item.id === work)!;
  const drawingService = work === "bouwtekeningen";
  const showContact = mode === "contact" || step === 3;
  const payloadAnswers = { ...answers, "contact.route": mode === "contact" ? "Contactformulier" : "Offertevragen" };

  function focusHeading() {
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
  }
  function selectWork(nextWork: WorkId) {
    if ((nextWork === "bouwtekeningen") !== drawingService) {
      setAnswers((current) => {
        const next = { ...current };
        delete next["contact.finish"];
        delete next["contact.budget"];
        return next;
      });
    }
    setWork(nextWork);
  }
  function personalContact() { setMode("contact"); focusHeading(); }
  useImperativeHandle(ref, () => ({ open(nextMode, nextWork) {
    if (!receipt) {
      setMode(nextMode);
      if (nextWork && !submitting.current) selectWork(nextWork);
      if (nextMode === "guided") setStep(nextWork ? 1 : 0);
    }
    focusHeading();
  } }));

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/intake", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (response.ok) setAvailable((await response.json()).available === true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const additions = Array.from(incoming);
    if (additions.some((file) => !supportedIntakeFile(file))) { setFileError("Kies foto's (JPG, PNG, WebP, HEIC) of een PDF."); return; }
    if (additions.some((file) => file.size > 20 * 1024 * 1024)) { setFileError("Een bestand mag maximaal 20 MB zijn."); return; }
    const next = [...files];
    for (const file of additions) if (!next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) next.push(file);
    if (next.length > 10 || next.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024) { setFileError("Voeg maximaal 10 bestanden toe, samen maximaal 100 MB."); return; }
    setFiles(next); setFileError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || receipt || !consent) return;
    if (!get("contact.name").trim() || !get("contact.notes").trim()) { setError("Vul uw naam in en vertel kort wat u wilt laten doen."); return; }
    submitting.current = true; setBusy(true); setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const body = new FormData();
      body.set("requestId", requestId.current);
      body.set("intake", JSON.stringify({ selected: [work], answers: payloadAnswers, consent }));
      files.forEach((file) => body.append("file:contact.photos", file));
      const response = await fetch("/api/intake", { method: "POST", body, signal: AbortSignal.timeout(60_000) });
      const result = await response.json();
      if (!response.ok || !isIntakeReceipt(result)) throw new Error(result.error || "We kunnen de ontvangst nog niet bevestigen. Probeer opnieuw.");
      setReceipt(result); focusHeading();
    } catch (cause) {
      setError(cause instanceof Error && !["TypeError", "TimeoutError", "SyntaxError"].includes(cause.name) ? cause.message : "We kunnen de ontvangst nog niet bevestigen. Uw gegevens en foto's blijven staan. Probeer opnieuw.");
    } finally { submitting.current = false; setBusy(false); }
  }

  function choice(id: string, label: string, options: string[]) {
    return <fieldset className="quote-choice"><legend>{label}</legend><div>{options.map((option) => <label key={option} className={get(id) === option ? "is-selected" : ""}><input type="radio" name={id} checked={get(id) === option} onChange={() => change(id, option)} />{option}</label>)}</div></fieldset>;
  }

  return <section className="quote-section section" id="contact" aria-labelledby="quote-title">
    <div className="container quote-layout" id="offerte">
      <aside className="quote-intro">
        <p className="eyebrow"><span /> UW PLANNEN BEGINNEN HIER</p>
        <h2>Een grote verbouwing.<br /><span>Eén vertrouwd aanspreekpunt.</span></h2>
        <p>Uw woning helemaal vernieuwen? Wij regelen het complete traject: van het eerste plan en de juiste vakmensen tot de planning, bouwbegeleiding en oplevering.</p>
        <ul><li><Icon name="check" size={18} /> Vrijblijvend kennismaken</li><li><Icon name="check" size={18} /> Geen bouwkennis nodig</li><li><Icon name="check" size={18} /> Een offerte voor het complete project</li></ul>
        <div className="quote-human"><Icon name="phone" size={25} /><div><strong>Een eerste idee is genoeg.</strong><p>De technische details bespreken we samen.</p></div></div>
        <a href={phoneHref} className="text-link">{contactPhone} <Icon name="arrow" size={16} /></a>
        <a href={`mailto:${contactEmail}`} className="text-link">{contactEmail} <Icon name="arrow" size={16} /></a>
      </aside>
      <div className="quote-card">
        {mode === "guided" && !receipt && <div className="quote-escape"><span>Komt u er niet uit?</span><button type="button" onClick={personalContact}><Icon name="phone" size={17} /> Liever persoonlijk contact <Icon name="arrow" size={16} /></button></div>}
        <div className="quote-card-body">
          {mode === "guided" && !receipt && <ol className="quote-steps" aria-label="Stappen van uw offerteaanvraag">{stepNames.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={step >= index ? "is-active" : ""}><span>{index < step ? <Icon name="check" size={13} /> : index + 1}</span>{label}</li>)}</ol>}
          <p className="eyebrow">{receipt ? "GOED ONTVANGEN" : showContact ? "VERTEL ONS UW WOONWENSEN" : `OFFERTE OPVRAGEN · STAP ${step + 1} VAN 4`}</p>
          <h3 id="quote-title" ref={heading} tabIndex={-1}>{receipt ? "Bedankt. We bekijken uw plannen." : showContact ? "Wat mogen we voor u regelen?" : ["Waar kunnen we u bij helpen?", "Hoe ziet uw plan eruit?", drawingService ? "Wanneer heeft u onze hulp nodig?" : "Wanneer wilt u aan de slag?"][step]}</h3>
          {receipt ? <div className="quote-success" role="status"><Icon name="check" size={32} /><p>Uw aanvraag{files.length ? ` en ${files.length} bijlage${files.length === 1 ? "" : "n"}` : ""} zijn ontvangen. We nemen persoonlijk contact met u op via {get("contact.email")}{get("contact.phone") ? ` of ${get("contact.phone")}` : ""} om uw wensen en de volgende stap te bespreken.</p><p>Uw aanvraagnummer: <strong>{receipt.reference}</strong></p><p>U zit nergens aan vast. Na ons gesprek werken we toe naar een offerte op maat.</p></div> : <>
            <p className="quote-lead">{showContact ? "Laat uw gegevens achter en beschrijf uw plannen. Foto's of tekeningen mogen erbij, maar zijn niet nodig. Wij denken met u mee." : "Vul in wat u al weet. U hoeft niets op te meten of technische keuzes te maken."}</p>
            {!showContact && <>
              {step === 0 && <div className="quote-projects">{[...workTypes].sort((a, b) => Number(b.id === "renovatie") - Number(a.id === "renovatie")).map((item) => <button type="button" key={item.id} className={work === item.id ? "is-selected" : ""} aria-pressed={work === item.id} onClick={() => selectWork(item.id)}><Icon name={item.icon} size={27} /><strong>{item.name}</strong><span>{item.id === "renovatie" ? "Het hele traject uit handen" : item.detail}</span>{work === item.id && <Icon name="check" size={17} />}</button>)}</div>}
              {step === 1 && <div className="quote-fields">
                <p className="quote-project-label"><Icon name={project.icon} size={20} />{project.name}<button type="button" className="text-link" onClick={() => { setStep(0); focusHeading(); }}>Wijzigen</button></p>
                {choice("contact.scope", "Hoe ver zijn uw plannen?", ["Ik heb een eerste idee", "Ik weet al wat ik wil", "Ik heb tekeningen of een ontwerp", "Ik wil graag samen de mogelijkheden bekijken"])}
                <label>{drawingService ? "Waar gaat uw bouwplan over?" : "Hoe groot is uw project ongeveer?"} <span>optioneel</span><input value={get("contact.size")} maxLength={150} onChange={(event) => change("contact.size", event.target.value)} placeholder={drawingService ? "Bijvoorbeeld een uitbouw of een nieuwe indeling" : work === "uitbouw" ? "Bijvoorbeeld 5 meter breed en 3 meter diep" : "Bijvoorbeeld de hele begane grond of circa 80 m²"} /><small>Weet u het nog niet? Laat dit gerust leeg.</small></label>
                {choice("contact.finish", "Wat wilt u ons uit handen geven?", drawingService ? ["Bouwtekeningen", "Vergunningbegeleiding", "Bouwtekeningen en vergunningbegeleiding", "Dat bespreek ik graag samen"] : ["Alles, van voorbereiding tot oplevering", "De uitvoering en afwerking", "Dat bespreek ik graag samen"])}
              </div>}
              {step === 2 && <div className="quote-fields">{choice("contact.planning", drawingService ? "Wanneer heeft u de tekeningen of begeleiding nodig?" : "Wanneer zou u willen starten?", ["Zo snel mogelijk", "Binnen 3 tot 6 maanden", "Over 6 tot 12 maanden", "Ik ben me nog aan het oriënteren"])}{!drawingService && choice("contact.budget", "Heeft u een budget in gedachten?", budgetOptions)}<p className="quote-help">Dit helpt ons meedenken. Het is geen prijsopgave of toezegging over de startdatum.</p></div>}
              <div className="quote-navigation">{step > 0 ? <button type="button" className="back-link" onClick={() => { setStep(step - 1); focusHeading(); }}>← Vorige stap</button> : <span>Vrijblijvend · op uw tempo</span>}<button type="button" className="button button-bordeaux" onClick={() => { if (step === 0 && work === "renovatie") setMode("contact"); else setStep(step + 1); focusHeading(); }}>{step === 0 && work === "renovatie" ? "Vertel ons uw plannen" : step === 2 ? "Naar uw contactgegevens" : "Volgende"}<Icon name="arrow" size={17} /></button></div>
            </>}
            {showContact && <form className="quote-form" onSubmit={submit} aria-busy={busy}>
              <fieldset disabled={busy} className="quote-fields"><legend className="sr-only">Uw project en contactgegevens</legend>
                <label>Waar gaat uw project over?<select value={work} onChange={(event) => selectWork(event.target.value as WorkId)}>{[...workTypes].sort((a, b) => Number(b.id === "renovatie") - Number(a.id === "renovatie")).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
                <label>Vertel ons over uw plannen <span>verplicht</span><textarea name="description" required maxLength={4000} rows={4} value={get("contact.notes")} onChange={(event) => change("contact.notes", event.target.value)} placeholder="Wat wilt u veranderen aan uw woning? Vertel gerust in uw eigen woorden. Een eerste idee is genoeg." /></label>
                <div className="quote-field-row"><label>Uw naam <span>verplicht</span><input name="name" autoComplete="name" required maxLength={150} pattern=".*\S.*" value={get("contact.name")} onChange={(event) => change("contact.name", event.target.value)} /></label><label>E-mailadres <span>verplicht</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={get("contact.email")} onChange={(event) => change("contact.email", event.target.value)} /></label></div>
                <div className="quote-field-row"><label>Telefoonnummer <span>optioneel</span><input name="phone" type="tel" autoComplete="tel" maxLength={80} value={get("contact.phone")} onChange={(event) => change("contact.phone", event.target.value)} /></label><label>Plaats van de verbouwing <span>optioneel</span><input name="city" autoComplete="address-level2" maxLength={150} value={get("contact.city")} onChange={(event) => change("contact.city", event.target.value)} /></label></div>
                <div className="quote-uploads"><label htmlFor="quote-photos"><Icon name="file" size={24} /><strong>Voeg foto&apos;s of tekeningen toe</strong><span>Optioneel · maximaal 10 bestanden · 20 MB per bestand, 100 MB samen</span></label><input id="quote-photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/bmp,image/tiff,.heic,.heif,.pdf" multiple aria-describedby="quote-upload-help" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} /><p id="quote-upload-help">Foto&apos;s van uw woning, een plattegrond of een voorbeeld van wat u mooi vindt.</p></div>
                {fileError && <p className="error-notice" role="alert">{fileError}</p>}
                {files.length > 0 && <ul className="quote-file-list" aria-label="Toegevoegde bestanden">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}><Icon name="file" size={18} /><span>{file.name}<small>{(file.size / 1024 / 1024).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} MB</small></span><button type="button" onClick={() => { setFiles(files.filter((_, i) => i !== index)); setFileError(""); }} aria-label={`Verwijder ${file.name}`}><Icon name="close" size={18} /></button></li>)}</ul>}
                {Object.keys(answers).some((id) => id.startsWith("contact.") && ["scope", "size", "finish", "planning", "budget"].includes(id.slice(8)) && get(id)) && <details className="quote-summary"><summary>Uw eerdere antwoorden gaan mee</summary><dl>{[["scope", "Uw plannen"], ["size", "Omvang"], ["finish", "Onze rol"], ["planning", "Planning"], ["budget", "Budget"]].filter(([id]) => get(`contact.${id}`)).map(([id, label]) => <div key={id}><dt>{label}</dt><dd>{get(`contact.${id}`)}</dd></div>)}</dl></details>}
                <label className="quote-consent"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>bouwregieaanhuis mag mijn gegevens en eventuele bijlagen gebruiken om contact met mij op te nemen over mijn plannen.</span></label>
                {available === false && <div className="quote-unavailable" role="status"><strong>Online versturen is nog niet beschikbaar.</strong><p>Uw aanvraag is nog niet verzonden. U kunt uw ingevulde gegevens bewaren en ons bellen of mailen. Voeg foto&apos;s zelf toe aan uw e-mail.</p><button type="button" className="text-link" onClick={() => downloadText("bouwregieaanhuis-woonwensen.txt", exportIntake([work], payloadAnswers, { "contact.photos": files }))}>Bewaar mijn ingevulde gegevens <Icon name="download" size={17} /></button></div>}
                <button className="button button-bordeaux quote-submit" type="submit" disabled={available === false}>{busy ? "Uw aanvraag wordt verstuurd…" : "Verstuur mijn aanvraag"}<Icon name={busy ? "clock" : "arrow"} size={18} /></button>
                <p className="quote-help"><Icon name="lock" size={15} /> Vrijblijvend. We bespreken eerst uw wensen en de mogelijkheden.</p>
              </fieldset>
              {error && <p className="error-notice" role="alert">{error}</p>}
              {mode === "guided" && <button type="button" className="back-link" disabled={busy} onClick={() => { setStep(2); focusHeading(); }}>← Terug naar de vragen</button>}
            </form>}
          </>}
        </div>
      </div>
    </div>
  </section>;
}
