"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { downloadText } from "@/lib/pricing";
import type { Address, DsoMode, DsoQuestion, DsoResult, DsoWork } from "@/lib/dso";

const checkUrl = "https://omgevingswet.overheid.nl/checken";
const applicationUrl = "https://omgevingswet.overheid.nl/aanvragen";

async function requestDso<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/omgevingswet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "De gegevens konden niet worden opgehaald.");
  return data as T;
}

function QuestionHelp({ ids }: { ids: number[] }) {
  const [help, setHelp] = useState("");
  const [loading, setLoading] = useState(false);
  return <details className="help-details" onToggle={async (event) => {
    if (!event.currentTarget.open || help || loading) return;
    setLoading(true);
    try { const data = await Promise.all(ids.map((id) => requestDso<{ text: string }>({ action: "help", id }))); setHelp(data.map((item) => item.text).join("\n\n")); }
    catch { setHelp("De toelichting is nu niet beschikbaar. U kunt deze vraag ook in het Omgevingsloket bekijken."); }
    finally { setLoading(false); }
  }}><summary>Toelichting bij deze vraag</summary><p>{loading ? "Toelichting ophalen…" : help}</p></details>;
}

function QuestionField({ question, value, onChange }: { question: DsoQuestion; value: string; onChange: (value: string) => void }) {
  const choices = question.geo ? [{ label: "Ja", value: "ja", exclusive: false }, { label: "Nee", value: "nee", exclusive: false }, { label: "Deels", value: "deels", exclusive: false }]
    : question.type === "boolean" ? [{ label: "Ja", value: "true", exclusive: false }, { label: "Nee", value: "false", exclusive: false }]
    : question.options.map((option) => ({ ...option, value: option.label }));
  const htmlId = `question-${question.id}-${encodeURIComponent(question.ref)}`;
  const dateMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  const dateValue = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : "";
  return <fieldset className="dso-question form-question-enter"><legend>{question.title}{question.required ? " *" : ""}</legend>{question.hint && <p className="question-hint">{question.hint}</p>}
    {choices.length > 0 ? <div className="dso-choices">{choices.map((option) => <label key={option.value}><input type={question.multiple ? "checkbox" : "radio"} name={question.key} value={option.value} checked={question.multiple ? value.split(", ").includes(option.value) : value === option.value} required={question.required && !question.multiple} onChange={(event) => {
      if (!question.multiple) return onChange(option.value);
      const selected = value ? value.split(", ") : [];
      if (!event.target.checked) return onChange(selected.filter((item) => item !== option.value).join(", "));
      if (option.exclusive) return onChange(option.value);
      const exclusiveOptions = choices.filter((item) => item.exclusive).map((item) => item.value);
      onChange([...selected.filter((item) => !exclusiveOptions.includes(item)), option.value].join(", "));
    }} />{option.label}</label>)}</div>
    : question.multiline ? <textarea id={htmlId} aria-label={question.title} value={value} required={question.required} maxLength={6144} onChange={(event) => onChange(event.target.value)} />
    : <input id={htmlId} aria-label={question.title} type={question.type === "numeriek" ? "number" : question.type === "datum" ? "date" : "text"} step={question.type === "numeriek" ? "any" : undefined} value={question.type === "datum" ? dateValue : value} maxLength={6144} required={question.required} onChange={(event) => {
      const answer = event.target.value;
      if (question.type === "datum" && answer) { const [year, month, day] = answer.split("-"); onChange(`${day}-${month}-${year}`); }
      else onChange(answer);
    }} />}
    {question.helpIds.length > 0 && <QuestionHelp ids={question.helpIds} />}
  </fieldset>;
}

export default function PermitDialog({ open, onClose, initialWork }: { open: boolean; onClose: () => void; initialWork: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [testEnvironment, setTestEnvironment] = useState(false);
  const [mode, setMode] = useState<DsoMode>("check");
  const [stage, setStage] = useState<"start" | "address" | "works" | "questions">("start");
  const [postcode, setPostcode] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [address, setAddress] = useState<Address | null>(null);
  const [query, setQuery] = useState(initialWork);
  const [works, setWorks] = useState<DsoWork[]>([]);
  const [selectedWorks, setSelectedWorks] = useState<DsoWork[]>([]);
  const [result, setResult] = useState<DsoResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/omgevingswet", { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error("Verbinding niet beschikbaar");
      return response.json();
    }).then((data) => { setAvailable(data.available); setTestEnvironment(data.environment === "preproduction"); }).catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, [open]);

  async function runRequest(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Er is iets misgegaan. Probeer het opnieuw."); }
    finally { setBusy(false); }
  }

  function reset(nextMode: DsoMode) {
    requestVersion.current += 1;
    setMode(nextMode);
    setStage("address");
    setResult(null);
    setSelectedWorks([]);
    setAnswers({});
    setWorks([]);
    setSearched(false);
    setError("");
    setDirty(false);
  }

  async function findWorks() {
    await runRequest(async () => {
      const data = await requestDso<{ works: DsoWork[] }>({ action: "search", mode, query });
      setWorks(data.works);
      setSearched(true);
    });
  }

  async function executeQuestions() {
    if (!address || !selectedWorks.length) return;
    if (result?.questions.some((question) => question.required && !(answers[question.key] ?? question.prefilled).trim())) {
      setError("Beantwoord de verplichte vragen voordat u verdergaat.");
      return;
    }
    const version = ++requestVersion.current;
    await runRequest(async () => {
      const references = selectedWorks.map((work) => ({ functioneleStructuurRef: work.ref, antwoorden: (result?.questions ?? []).filter((question) => question.ref === work.ref && (Object.hasOwn(answers, question.key) || question.prefilled !== "")).map((question) => ({ id: question.id, antwoord: answers[question.key] ?? question.prefilled })) }));
      const data = await requestDso<DsoResult>({ action: "execute", mode, coordinates: address.coordinates, references });
      if (version !== requestVersion.current) return;
      setResult(data);
      setAnswers(Object.fromEntries(data.questions.map((question) => [question.key, answers[question.key] ?? question.prefilled])));
      setStage("questions");
      setDirty(false);
      requestAnimationFrame(() => dialogRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    });
  }

  function exportAnswers() {
    if (!result || !address) return;
    downloadText("plan-bouw-vergunningvoorbereiding.txt", ["PLAN BOUW — Vergunningvoorbereiding", `Datum: ${new Date().toLocaleDateString("nl-NL")}`, `Adres: ${address.label}`, `Werkzaamheden: ${selectedWorks.map((work) => work.label).join("; ")}`, `Route: ${mode === "check" ? "Vergunningcheck" : "Aanvraag voorbereiden"}`, "", "VRAGEN EN ANTWOORDEN", ...result.questions.map((question) => `${question.title}\n${answers[question.key] || "Nog niet beantwoord"}\n`), "UITKOMSTEN", ...result.conclusions.map((conclusion) => `${conclusion.title}: ${conclusion.text}${conclusion.warning ? `\n${conclusion.warning}` : ""}`), "", "Dit document is een voorbereiding. Er is geen vergunningaanvraag ingediend. De check gebruikt het adrespunt en alleen de geselecteerde werkzaamheden. Controleer de exacte werklocatie, overige werkzaamheden en uitkomsten in het Omgevingsloket. Antwoorden worden niet automatisch overgenomen in het Omgevingsloket.", testEnvironment ? "LET OP: deze gegevens komen uit de testomgeving en zijn niet geschikt voor een echte vergunningcheck." : ""].join("\n"));
  }

  const supportedQuestions = result?.questions.every((question) => ["boolean", "numeriek", "lijstwaarde", "datum", "string"].includes(question.type)) ?? true;

  return <dialog className="modal permit-modal" ref={dialogRef} onClose={onClose} aria-labelledby="permit-dialog-title"><button className="modal-close" onClick={onClose} aria-label="Vergunninghulp sluiten"><Icon name="close" size={21} /></button><div className="modal-body"><p className="eyebrow"><span /> UW VERGUNNING, STAP VOOR STAP</p><h2 id="permit-dialog-title">Een goed plan begint<br />met duidelijkheid.</h2>
    {available === null && <p className="status-loading" role="status">We controleren de verbinding met het Omgevingsloket…</p>}
    {available === false && <><p>Of u een vergunning nodig heeft, hangt af van uw plannen én de locatie van uw woning. De officiële Vergunningcheck helpt u op weg.</p><div className="permit-status-note"><Icon name="shield" size={23} /><div><strong>Ga verder via het Omgevingsloket</strong><p>De vragenlijst op deze website is nog niet beschikbaar. U kunt uw plannen nu al controleren en een aanvraag starten op de officiële website.</p></div></div><div className="permit-modal-actions"><a className="button button-bordeaux" href={checkUrl} target="_blank" rel="noopener noreferrer">Heb ik een vergunning nodig? <Icon name="arrow-up" size={17} /></a><a className="button button-outline" href={applicationUrl} target="_blank" rel="noopener noreferrer">Een vergunning aanvragen <Icon name="arrow-up" size={17} /></a></div><p className="fine-print">Het Omgevingsloket opent in een nieuw tabblad. Een aanvraag wordt pas ingediend nadat u deze daar zelf afrondt.</p></>}
    {available && <div key={stage} className="permit-step form-step-enter">
      {testEnvironment && <p className="error-notice" role="status">Dit is de DSO-testomgeving. De antwoorden zijn niet geschikt voor een echte vergunningcheck of aanvraag.</p>}
      {stage === "start" && <><p>Wilt u weten wat er nodig is, of weet u al dat u een aanvraag wilt voorbereiden?</p><div className="permit-modal-actions"><button className="button button-bordeaux" onClick={() => reset("check")}>Ik wil een vergunningcheck <Icon name="arrow" size={17} /></button><button className="button button-outline" onClick={() => reset("application")}>Ik wil mijn aanvraag voorbereiden <Icon name="file" size={17} /></button></div><p className="fine-print">We halen de officiële vragen op. Uw aanvraag dient u daarna zelf in via het Omgevingsloket.</p></>}
      {stage !== "start" && <p className="permit-form-note">{mode === "check" ? "Vergunningcheck" : "Aanvraag voorbereiden"} · {stage === "address" ? "Stap 1: uw adres" : stage === "works" ? "Stap 2: uw werkzaamheden" : "Stap 3: de officiële vragen"}</p>}
      {stage === "address" && <><form className="permit-form" onSubmit={(event) => { event.preventDefault(); runRequest(async () => { const data = await requestDso<{ addresses: Address[] }>({ action: "address", postcode, houseNumber }); setAddresses(data.addresses); setAddress(null); if (!data.addresses.length) setError("Geen adres gevonden. Controleer de postcode en het huisnummer."); }); }}><div className="address-fields"><label>Postcode<input autoComplete="postal-code" placeholder="1234 AB" required pattern="[1-9][0-9]{3}\s?[a-zA-Z]{2}" maxLength={7} value={postcode} onChange={(event) => { setPostcode(event.target.value); setAddresses([]); setAddress(null); }} /></label><label>Huisnummer<input inputMode="numeric" placeholder="12" required pattern="[1-9][0-9]{0,4}" maxLength={5} value={houseNumber} onChange={(event) => { setHouseNumber(event.target.value); setAddresses([]); setAddress(null); }} /></label></div><p className="permit-form-note">Vul het huisnummer zonder toevoeging in. Selecteer daarna uw volledige adres. Uw adres wordt hiervoor gedeeld met PDOK.</p><button className="button button-navy" disabled={busy} type="submit">{busy ? "Adres opzoeken…" : "Zoek mijn adres"}<Icon name="pin" size={17} /></button></form>{addresses.length > 0 && <div className="permit-form"><fieldset className="dso-question"><legend>Selecteer en bevestig uw adres</legend><div className="permit-search-list">{addresses.map((item) => <label key={item.id}><input type="radio" name="address" checked={address?.id === item.id} onChange={() => setAddress(item)} />{item.label}</label>)}</div></fieldset><p className="permit-form-note">Deze check gebruikt het adrespunt. Voor werk achter op uw perceel of meerdere werklocaties moet u ook de exacte locatie op de kaart van het Omgevingsloket controleren.</p><button className="button button-bordeaux" disabled={!address || busy} onClick={() => { setStage("works"); setError(""); }}>Dit is mijn adres <Icon name="arrow" size={17} /></button></div>}</>}
      {stage === "works" && <>{address && <div className="selected-address"><Icon name="pin" size={17} />{address.label}</div>}<form className="permit-form" onSubmit={(event) => { event.preventDefault(); findWorks(); }}><label>Welke werkzaamheden gaat u uitvoeren?<input value={query} minLength={2} maxLength={150} required placeholder="Bijvoorbeeld: uitbouw, dakkapel of slopen" onChange={(event) => { setQuery(event.target.value); setSearched(false); }} /></label><button className="button button-navy" type="submit" disabled={busy}>{busy ? "Werkzaamheden zoeken…" : "Zoek officiële werkzaamheden"}<Icon name="arrow" size={17} /></button></form>{works.length > 0 && <div className="permit-form"><fieldset className="dso-question"><legend>Selecteer wat u gaat doen. Meerdere keuzes zijn mogelijk.</legend><div className="permit-search-list">{works.map((work) => <label key={work.ref}><input type="checkbox" checked={selectedWorks.some((selected) => selected.ref === work.ref)} onChange={(event) => { setSelectedWorks(event.target.checked ? [...selectedWorks, work] : selectedWorks.filter((selected) => selected.ref !== work.ref)); setResult(null); setAnswers({}); }} />{work.label}</label>)}</div></fieldset><p className="permit-form-note">{selectedWorks.length} geselecteerd. Controleer alle werkzaamheden die bij uw plan horen; deze lijst is gebaseerd op uw zoekterm.</p><button className="button button-bordeaux" disabled={!selectedWorks.length || busy || selectedWorks.length > 20} onClick={executeQuestions}>{busy ? "Officiële vragen ophalen…" : "Naar de officiële vragen"}<Icon name="arrow" size={17} /></button></div>}{searched && works.length === 0 && <p className="error-notice">Geen werkzaamheden gevonden. Probeer een andere zoekterm of gebruik het Omgevingsloket.</p>}<button className="back-link" onClick={() => { setStage("address"); setError(""); }}>← Wijzig uw adres</button></>}
      {stage === "questions" && result && <>
        {address && <div className="selected-address"><Icon name="pin" size={17} />{address.label}</div>}
        {result.hasMissingData && <div className="error-notice">Voor één of meer werkzaamheden zijn de officiële gegevens niet compleet. Er kan nog geen volledige conclusie worden getrokken. Controleer uw plannen in het Omgevingsloket of bij uw gemeente.</div>}
        {result.conclusions.length > 0 && !dirty && <div className="dso-results" aria-live="polite">{result.conclusions.map((conclusion, index) => <div className="dso-result" key={`${conclusion.title}-${index}`}><h3>{conclusion.title}</h3><p>{conclusion.text}</p>{conclusion.warning && <small>{conclusion.warning}</small>}</div>)}</div>}
        {mode === "application" && !dirty && <div className="permit-status-note"><Icon name="file" size={22} /><div><strong>{result.ready && !result.hasMissingData ? "De beantwoorde set voldoet aan de indieningsvereisten." : "Uw aanvraag is in voorbereiding."}</strong><p>{result.complete ? "Deze vragenset is compleet. " : "Vul de resterende gegevens aan. "}Er is nog niets ingediend. Controleer uw volledige plan, bijlagen en persoonsgegevens in het Omgevingsloket.</p></div></div>}
        {result.questions.length > 0 && supportedQuestions && <form className="permit-form" onSubmit={(event) => { event.preventDefault(); executeQuestions(); }}><p className="permit-form-note">De volgende vragen komen rechtstreeks uit het Omgevingsloket. Vragen met * zijn verplicht. Na uw antwoorden kunnen nieuwe vragen verschijnen.</p>{result.questions.map((question) => <QuestionField key={question.key} question={question} value={answers[question.key] ?? question.prefilled} onChange={(value) => { setAnswers((current) => ({ ...current, [question.key]: value })); setDirty(true); }} />)}<button className="button button-bordeaux" type="submit" disabled={busy}>{busy ? "Antwoorden controleren…" : "Controleer mijn antwoorden"}<Icon name="arrow" size={17} /></button></form>}
        {!supportedQuestions && <p className="error-notice">Deze vragenset bevat een vraag die u in het Omgevingsloket moet beantwoorden. U kunt daar verdergaan.</p>}
        {!result.questions.length && !result.conclusions.length && mode === "check" && <p className="error-notice">Er is geen conclusie beschikbaar voor deze selectie. Ga verder via het Omgevingsloket; dit betekent niet dat u vergunningvrij mag bouwen.</p>}
        {result.attachments.length > 0 && <div className="permit-status-note"><Icon name="file" size={22} /><div><strong>Benodigde bijlagen</strong><p>{result.attachments.join(" · ")}. Voeg deze bijlagen toe in het Omgevingsloket.</p></div></div>}
        <div className="permit-modal-actions"><button className="button button-outline" onClick={exportAnswers} disabled={dirty || busy}><Icon name="download" size={16} /> Download uw voorbereiding</button>{mode === "check" && <button className="button button-outline" disabled={busy} onClick={() => { reset("application"); setStage("works"); }}>Aanvraag voorbereiden <Icon name="arrow" size={16} /></button>}<a className="button button-navy" href={mode === "check" ? checkUrl : applicationUrl} target="_blank" rel="noopener noreferrer">{mode === "check" ? "Controleer uw volledige plan" : "Aanvraag afronden in het Omgevingsloket"}<Icon name="arrow-up" size={17} /></a></div><p className="fine-print">Alleen de geselecteerde werkzaamheden en het adrespunt zijn gecontroleerd. Uw antwoorden worden niet automatisch overgenomen in het Omgevingsloket. Er is nog geen aanvraag ingediend.</p><button className="back-link" disabled={busy} onClick={() => { setStage("works"); setError(""); }}>← Wijzig uw werkzaamheden</button>
      </>}
    </div>}
    {error && <p className="error-notice" role="alert">{error}</p>}
    {available && stage !== "start" && <a className="text-link" href={mode === "check" ? checkUrl : applicationUrl} target="_blank" rel="noopener noreferrer">Liever verder in het Omgevingsloket? <Icon name="arrow-up" size={15} /></a>}
  </div></dialog>;
}
