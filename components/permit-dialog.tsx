"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@/components/icon";
import { downloadText } from "@/lib/pricing";
import { buildDsoReferences, formatDsoAnswer, selectedDsoOptions, updateDsoHistory, type DsoAnsweredQuestion } from "@/lib/dso-flow";
import type { Address, DsoMode, DsoQuestion, DsoResult, DsoWork } from "@/lib/dso";

const checkUrl = "https://omgevingswet.overheid.nl/checken";
const applicationUrl = "https://omgevingswet.overheid.nl/aanvragen";
const QuestionExplanation = dynamic(() => import("@/components/question-explanation"), { loading: () => <p role="status">Toelichting opmaken…</p> });

async function requestDso<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/omgevingswet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "De gegevens konden niet worden opgehaald.");
  return data as T;
}

function QuestionHelp({ ids, label = "Toelichting bij deze vraag" }: { ids: number[]; label?: string }) {
  const [help, setHelp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function loadHelp() {
    setLoading(true);
    setError("");
    try { const data = await Promise.all(ids.map((id) => requestDso<{ text: string }>({ action: "help", id }))); setHelp(data.map((item) => item.text).join("\n\n") || "DSO heeft geen toelichting bij dit onderdeel geleverd."); }
    catch { setError("De toelichting is nu niet beschikbaar. Probeer opnieuw of bekijk dit onderdeel in het Omgevingsloket."); }
    finally { setLoading(false); }
  }
  return <details className="help-details" onToggle={(event) => { if (event.currentTarget.open && help === null && !loading) loadHelp(); }}><summary>{label}</summary>{loading ? <p role="status">Toelichting ophalen…</p> : help && <QuestionExplanation text={help} />}{error && <><p role="alert">{error}</p><button className="back-link" type="button" disabled={loading} onClick={loadHelp}>Toelichting opnieuw ophalen</button></>}</details>;
}

function QuestionField({ question, value, onChange, disabled, focusRef }: { question: DsoQuestion; value: string; onChange: (value: string) => void; disabled?: boolean; focusRef?: Ref<HTMLFieldSetElement> }) {
  const choices = question.geo ? [{ label: "Ja", value: "ja", exclusive: false }, { label: "Nee", value: "nee", exclusive: false }, { label: "Deels", value: "deels", exclusive: false }]
    : question.type === "boolean" ? [{ label: "Ja", value: "true", exclusive: false }, { label: "Nee", value: "false", exclusive: false }]
    : question.options.map((option) => ({ ...option, value: option.value ?? option.label }));
  const selectedOptions = question.multiple ? selectedDsoOptions(question, value) : [];
  const htmlId = `question-${question.id}-${encodeURIComponent(question.ref)}`;
  const dateMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  const dateValue = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : "";
  return <fieldset className="dso-question form-question-enter" disabled={disabled} ref={focusRef} tabIndex={-1}><legend>{question.title}{question.required ? " *" : ""}</legend>{question.hint && <p className="question-hint">{question.hint}</p>}
    {choices.length > 0 ? <div className="dso-choices">{choices.map((option) => <label key={option.value}><input type={question.multiple ? "checkbox" : "radio"} name={question.key} value={option.value} checked={question.multiple ? selectedOptions.includes(option.value) : value === option.value} required={question.required && !question.multiple} onChange={(event) => {
      if (!question.multiple) return onChange(option.value);
      const selected = selectedOptions;
      if (!event.target.checked) return onChange(selected.filter((item) => item !== option.value).join(", "));
      if (option.exclusive) return onChange(option.value);
      const exclusiveOptions = choices.filter((item) => item.exclusive).map((item) => item.value);
      onChange([...selected.filter((item) => !exclusiveOptions.includes(item)), option.value].join(", "));
    }} />{option.label}</label>)}</div>
    : question.type === "string" && question.multiline ? <textarea id={htmlId} aria-label={question.title} value={value} required={question.required} maxLength={6144} onChange={(event) => onChange(event.target.value)} />
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
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [selectedWorks, setSelectedWorks] = useState<DsoWork[]>([]);
  const [result, setResult] = useState<DsoResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<DsoAnsweredQuestion[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const requestVersion = useRef(0);
  const questionRef = useRef<HTMLFieldSetElement>(null);
  const currentQuestion = (editingKey ? history.find((entry) => entry.question.key === editingKey)?.question : result?.questions.find((question) => !history.some((entry) => entry.question.key === question.key))) ?? null;

  useEffect(() => {
    if (stage === "questions") questionRef.current?.focus({ preventScroll: true });
  }, [stage, currentQuestion?.key]);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/omgevingswet", { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "De verbinding met het Omgevingsloket is nu niet beschikbaar.");
      return data;
    }).then((data) => { setAvailable(data.available); setTestEnvironment(data.environment === "preproduction"); }).catch((failure) => {
      if (controller.signal.aborted) return;
      setAvailable(false);
      setError(failure instanceof Error ? failure.message : "De verbinding met het Omgevingsloket is nu niet beschikbaar.");
    });
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
    setHistory([]);
    setEditingKey(null);
    setWorks([]);
    setNextPage(null);
    setSearched(false);
    setError("");
    setDirty(false);
  }

  async function findWorks(page = 1) {
    if (!address) return;
    await runRequest(async () => {
      const data = await requestDso<{ works: DsoWork[]; nextPage: number | null }>({ action: "search", mode, query, coordinates: address.coordinates, page });
      setWorks((current) => [...new Map([...(page === 1 ? [] : current), ...data.works].map((work) => [work.ref, work])).values()]);
      setNextPage(data.nextPage);
      setSearched(true);
    });
  }

  function clearQuestions() {
    requestVersion.current += 1;
    setResult(null);
    setAnswers({});
    setHistory([]);
    setEditingKey(null);
    setDirty(false);
  }

  async function executeQuestions(question: DsoQuestion | null = null, skip = false) {
    if (!address || !selectedWorks.length) return;
    const value = question ? skip ? "" : answers[question.key] ?? question.prefilled : "";
    if (question && ((!skip && !value.trim()) || (skip && question.required))) {
      setError(question.required ? "Beantwoord deze verplichte vraag voordat u verdergaat." : "Kies of vul een antwoord in, of sla deze vraag over als u het antwoord nog niet weet.");
      return;
    }
    const nextHistory = question ? updateDsoHistory(history, question, value) : history;
    const version = ++requestVersion.current;
    await runRequest(async () => {
      const references = buildDsoReferences(selectedWorks, nextHistory);
      const data = await requestDso<DsoResult>({ action: "execute", mode, coordinates: address.coordinates, references });
      if (version !== requestVersion.current) return;
      setResult(data);
      setHistory(nextHistory);
      setEditingKey(null);
      setAnswers(Object.fromEntries([...data.questions.map((question) => [question.key, question.prefilled]), ...nextHistory.map((entry) => [entry.question.key, entry.value])]));
      setStage("questions");
      setDirty(false);
      requestAnimationFrame(() => dialogRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    });
  }

  function editAnswer(entry: DsoAnsweredQuestion) {
    setEditingKey(entry.question.key);
    setAnswers((current) => ({ ...current, [entry.question.key]: entry.value }));
    setDirty(true);
    setError("");
    dialogRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function prepareApplication() {
    const applicationWorks = [...new Map((result?.conclusions ?? []).flatMap((conclusion) => conclusion.applicationRef ? [[conclusion.applicationRef, { ref: conclusion.applicationRef, label: conclusion.title }] as const] : [])).values()];
    reset("application");
    setSelectedWorks(applicationWorks);
    setWorks(applicationWorks);
    setStage("works");
  }

  function exportAnswers() {
    if (!result || !address) return;
    downloadText("plan-bouw-vergunningvoorbereiding.txt", ["PLAN BOUW — Vergunningvoorbereiding", `Datum: ${new Date().toLocaleDateString("nl-NL")}`, `Adres: ${address.label}`, `Werkzaamheden: ${selectedWorks.map((work) => work.label).join("; ")}`, `Route: ${mode === "check" ? "Vergunningcheck" : "Aanvraag voorbereiden"}`, "", "VRAGEN EN ANTWOORDEN", ...history.map((entry) => `${entry.question.title}\n${formatDsoAnswer(entry.question, entry.value)}\n`), "UITKOMSTEN", ...result.conclusions.map((conclusion) => `${conclusion.title}: ${conclusion.text}${conclusion.warning ? `\n${conclusion.warning}` : ""}`), "", "Dit document is een voorbereiding. Er is geen vergunningaanvraag ingediend. De check gebruikt het adrespunt en alleen de geselecteerde werkzaamheden. Controleer de exacte werklocatie, overige werkzaamheden en uitkomsten in het Omgevingsloket. Antwoorden worden niet automatisch overgenomen in het Omgevingsloket.", testEnvironment ? "LET OP: deze gegevens komen uit de testomgeving en zijn niet geschikt voor een echte vergunningcheck." : ""].join("\n"));
  }

  const supportedQuestion = !currentQuestion || ["boolean", "numeriek", "lijstwaarde", "datum", "string"].includes(currentQuestion.type);

  return <dialog className="modal permit-modal" ref={dialogRef} onClose={onClose} aria-labelledby="permit-dialog-title"><button className="modal-close" onClick={onClose} aria-label="Vergunninghulp sluiten"><Icon name="close" size={21} /></button><div className="modal-body"><p className="eyebrow"><span /> UW VERGUNNING, STAP VOOR STAP</p><h2 id="permit-dialog-title">Een goed plan begint<br />met duidelijkheid.</h2>
    {available === null && <p className="status-loading" role="status">We controleren de verbinding met het Omgevingsloket…</p>}
    {available === false && <><p>Of u een vergunning nodig heeft, hangt af van uw plannen én de locatie van uw woning. De officiële Vergunningcheck helpt u op weg.</p><div className="permit-status-note"><Icon name="shield" size={23} /><div><strong>Ga verder via het Omgevingsloket</strong><p>De vragenlijst op deze website is nog niet beschikbaar. U kunt uw plannen nu al controleren en een aanvraag starten op de officiële website.</p></div></div><div className="permit-modal-actions"><a className="button button-bordeaux" href={checkUrl} target="_blank" rel="noopener noreferrer">Heb ik een vergunning nodig? <Icon name="arrow-up" size={17} /></a><a className="button button-outline" href={applicationUrl} target="_blank" rel="noopener noreferrer">Een vergunning aanvragen <Icon name="arrow-up" size={17} /></a></div><p className="fine-print">Het Omgevingsloket opent in een nieuw tabblad. Een aanvraag wordt pas ingediend nadat u deze daar zelf afrondt.</p></>}
    {available && <div key={stage} className="permit-step form-step-enter">
      {testEnvironment && <p className="error-notice" role="status">Dit is de DSO-testomgeving. De antwoorden zijn niet geschikt voor een echte vergunningcheck of aanvraag.</p>}
      {stage === "start" && <><p>Wilt u weten wat er nodig is, of weet u al dat u een aanvraag wilt voorbereiden?</p><div className="permit-modal-actions"><button className="button button-bordeaux" onClick={() => reset("check")}>Ik wil een vergunningcheck <Icon name="arrow" size={17} /></button><button className="button button-outline" onClick={() => reset("application")}>Ik wil mijn aanvraag voorbereiden <Icon name="file" size={17} /></button></div><p className="fine-print">We halen de officiële vragen op. Uw aanvraag dient u daarna zelf in via het Omgevingsloket.</p></>}
      {stage !== "start" && <p className="permit-form-note">{mode === "check" ? "Vergunningcheck" : "Aanvraag voorbereiden"} · {stage === "address" ? "Stap 1: uw adres" : stage === "works" ? "Stap 2: uw werkzaamheden" : "Stap 3: de officiële vragen"}</p>}
      {stage === "address" && <><form className="permit-form" onSubmit={(event) => { event.preventDefault(); runRequest(async () => { const data = await requestDso<{ addresses: Address[] }>({ action: "address", postcode, houseNumber }); setAddresses(data.addresses); setAddress(null); if (!data.addresses.length) setError("Geen adres gevonden. Controleer de postcode en het huisnummer."); }); }}><div className="address-fields"><label>Postcode<input autoComplete="postal-code" placeholder="1234 AB" required pattern="[1-9][0-9]{3}\s?[a-zA-Z]{2}" maxLength={7} value={postcode} onChange={(event) => { setPostcode(event.target.value); setAddresses([]); setAddress(null); }} /></label><label>Huisnummer<input inputMode="numeric" placeholder="12" required pattern="[1-9][0-9]{0,4}" maxLength={5} value={houseNumber} onChange={(event) => { setHouseNumber(event.target.value); setAddresses([]); setAddress(null); }} /></label></div><p className="permit-form-note">Vul het huisnummer zonder toevoeging in. Selecteer daarna uw volledige adres. Uw adres wordt hiervoor gedeeld met PDOK.</p><button className="button button-navy" disabled={busy} type="submit">{busy ? "Adres opzoeken…" : "Zoek mijn adres"}<Icon name="pin" size={17} /></button></form>{addresses.length > 0 && <div className="permit-form"><fieldset className="dso-question"><legend>Selecteer en bevestig uw adres</legend><div className="permit-search-list">{addresses.map((item) => <label key={item.id}><input type="radio" name="address" checked={address?.id === item.id} onChange={() => { setAddress(item); clearQuestions(); setWorks([]); setSelectedWorks([]); setNextPage(null); setSearched(false); }} />{item.label}</label>)}</div></fieldset><p className="permit-form-note">Deze check gebruikt het adrespunt. Voor werk achter op uw perceel of meerdere werklocaties moet u ook de exacte locatie op de kaart van het Omgevingsloket controleren.</p><button className="button button-bordeaux" disabled={!address || busy} onClick={() => { setStage("works"); setError(""); }}>Dit is mijn adres <Icon name="arrow" size={17} /></button></div>}</>}
      {stage === "works" && <>{address && <div className="selected-address"><Icon name="pin" size={17} />{address.label}</div>}<form className="permit-form" onSubmit={(event) => { event.preventDefault(); findWorks(); }}><label>Welke werkzaamheden gaat u uitvoeren?<input value={query} minLength={2} maxLength={150} required placeholder={mode === "application" ? "Bijvoorbeeld: bouwactiviteit of slopen" : "Bijvoorbeeld: uitbouw, dakkapel of slopen"} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} /></label><button className="button button-navy" type="submit" disabled={busy}>{busy ? "Werkzaamheden zoeken…" : "Zoek officiële werkzaamheden"}<Icon name="arrow" size={17} /></button></form>{works.length > 0 && <div className="permit-form"><fieldset className="dso-question"><legend>Selecteer wat u gaat doen. Meerdere keuzes zijn mogelijk.</legend><div className="permit-search-list">{works.map((work) => <label key={work.ref}><input type="checkbox" checked={selectedWorks.some((selected) => selected.ref === work.ref)} onChange={(event) => { setSelectedWorks(event.target.checked ? [...selectedWorks, work] : selectedWorks.filter((selected) => selected.ref !== work.ref)); clearQuestions(); }} />{work.label}{work.permission ? ` · ${work.permission}` : ""}</label>)}</div></fieldset><p className="permit-form-note">{selectedWorks.length} geselecteerd. Controleer alle werkzaamheden die bij uw plan horen; deze lijst is gebaseerd op uw zoekterm.{mode === "application" ? " Aanvraagactiviteiten zijn gefilterd op uw bevestigde adrespunt." : ""}</p>{nextPage && searched && <button className="back-link" type="button" disabled={busy} onClick={() => findWorks(nextPage)}>Meer resultaten laden</button>}{selectedWorks.length > 20 && <p className="error-notice">Selecteer maximaal 20 werkzaamheden per check.</p>}<button className="button button-bordeaux" disabled={!selectedWorks.length || busy || selectedWorks.length > 20} onClick={() => executeQuestions()}>{busy ? "Officiële vragen ophalen…" : "Naar de officiële vragen"}<Icon name="arrow" size={17} /></button></div>}{searched && works.length === 0 && <p className="error-notice">Geen werkzaamheden gevonden. {mode === "application" ? "Aanvragen gebruiken officiële activiteitnamen. Zoek bijvoorbeeld op ‘bouwactiviteit’ in plaats van ‘uitbouw’, of gebruik het Omgevingsloket." : "Probeer een andere zoekterm of gebruik het Omgevingsloket."}</p>}<button className="back-link" disabled={busy} onClick={() => { setStage("address"); setError(""); }}>← Wijzig uw adres</button></>}
      {stage === "questions" && result && <>
        {address && <div className="selected-address"><Icon name="pin" size={17} />{address.label}</div>}
        {result.hasMissingData && <div className="error-notice">Voor één of meer werkzaamheden zijn de officiële gegevens niet compleet. Er kan nog geen volledige conclusie worden getrokken. Controleer uw plannen in het Omgevingsloket of bij uw gemeente.</div>}
        {!currentQuestion && history.some((entry) => !entry.value.trim()) && <p className="error-notice" role="status">U heeft vragen overgeslagen. Daardoor kan de uitkomst onvolledig zijn. Vul deze antwoorden aan of controleer uw plan in het Omgevingsloket.</p>}
        {result.conclusions.length > 0 && !dirty && !currentQuestion && <div className="dso-results" aria-live="polite">{result.conclusions.map((conclusion, index) => <div className="dso-result" key={`${conclusion.title}-${index}`}><h3>{conclusion.title}</h3><p>{conclusion.text}</p>{conclusion.warning && <small>{conclusion.warning}</small>}{Boolean(conclusion.helpIds?.length) && <QuestionHelp ids={conclusion.helpIds!} label="Uitleg en vervolgstappen bij deze uitkomst" />}</div>)}</div>}
        {mode === "application" && !dirty && !currentQuestion && <div className="permit-status-note"><Icon name="file" size={22} /><div><strong>{result.ready && !result.hasMissingData ? "De beantwoorde set voldoet aan de indieningsvereisten." : "Uw aanvraag is in voorbereiding."}</strong><p>{result.complete ? "Deze vragenset is compleet. " : "Vul de resterende gegevens aan. "}Er is nog niets ingediend. Controleer uw volledige plan, bijlagen en persoonsgegevens in het Omgevingsloket.</p></div></div>}
        {currentQuestion && supportedQuestion && <form className="permit-form question-step" onSubmit={(event) => { event.preventDefault(); executeQuestions(currentQuestion); }}>
          <div className="question-progress"><span>{editingKey ? "Antwoord wijzigen" : `Vraag ${history.length + 1}`}</span><p>We controleren na ieder antwoord welke vragen nog nodig zijn.</p></div>
          {editingKey && <p className="permit-form-note">Wijzigt u dit antwoord? Dan controleren we de vervolgvragen opnieuw. Eerdere antwoorden blijven bewaard.</p>}
          <QuestionField key={currentQuestion.key} question={currentQuestion} value={answers[currentQuestion.key] ?? currentQuestion.prefilled} disabled={busy} focusRef={questionRef} onChange={(value) => { setAnswers((current) => ({ ...current, [currentQuestion.key]: value })); setDirty(true); }} />
          <div className="question-actions"><button className="button button-bordeaux" type="submit" disabled={busy}>{busy ? "Vervolgvragen ophalen…" : "Volgende vraag"}<Icon name="arrow" size={17} /></button>{!currentQuestion.required && <button className="back-link" type="button" disabled={busy} onClick={() => executeQuestions(currentQuestion, true)}>Deze vraag overslaan</button>}</div>
          <p className="permit-form-note">Niet-relevante vragen worden automatisch overgeslagen. Vragen met * zijn verplicht.</p>
        </form>}
        {!supportedQuestion && <p className="error-notice">Deze vraag kunt u alleen in het Omgevingsloket beantwoorden. U kunt daar verdergaan.</p>}
        {history.length > 0 && <details className="answer-history"><summary>Uw antwoorden ({history.length})</summary><ol>{history.map((entry) => <li key={entry.question.key}><div><strong>{entry.question.title}</strong><span>{formatDsoAnswer(entry.question, entry.value)}</span></div><button className="back-link" type="button" disabled={busy} aria-label={`Wijzig antwoord: ${entry.question.title}`} onClick={() => editAnswer(entry)}>Wijzig</button></li>)}</ol></details>}
        {!currentQuestion && !result.conclusions.length && mode === "check" && <p className="error-notice">Er is geen conclusie beschikbaar voor deze selectie. Ga verder via het Omgevingsloket; dit betekent niet dat u vergunningvrij mag bouwen.</p>}
        {!currentQuestion && result.attachments.length > 0 && <div className="permit-status-note"><Icon name="file" size={22} /><div><strong>Benodigde bijlagen</strong><p>{result.attachments.join(" · ")}. Voeg deze bijlagen toe in het Omgevingsloket.</p></div></div>}
        {!currentQuestion && <div className="permit-modal-actions"><button className="button button-outline" onClick={exportAnswers} disabled={dirty || busy}><Icon name="download" size={16} /> Download uw voorbereiding</button>{mode === "check" && <button className="button button-outline" disabled={busy} onClick={prepareApplication}>Aanvraag voorbereiden <Icon name="arrow" size={16} /></button>}<a className="button button-navy" href={mode === "check" ? checkUrl : applicationUrl} target="_blank" rel="noopener noreferrer">{mode === "check" ? "Controleer uw volledige plan" : "Aanvraag afronden in het Omgevingsloket"}<Icon name="arrow-up" size={17} /></a></div>}<p className="fine-print">Alleen de geselecteerde werkzaamheden en het adrespunt zijn gecontroleerd. Uw antwoorden worden niet automatisch overgenomen in het Omgevingsloket. Er is nog geen aanvraag ingediend.</p><button className="back-link" disabled={busy} onClick={() => { setStage("works"); setError(""); }}>← Wijzig uw werkzaamheden</button>
      </>}
    </div>}
    {error && <p className="error-notice" role="alert">{error}</p>}
    {available && stage !== "start" && <a className="text-link" href={mode === "check" ? checkUrl : applicationUrl} target="_blank" rel="noopener noreferrer">Liever verder in het Omgevingsloket? <Icon name="arrow-up" size={15} /></a>}
  </div></dialog>;
}
