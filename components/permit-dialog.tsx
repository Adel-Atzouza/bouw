"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { QuestionField } from "@/components/permit-question";
import PermitLocation from "@/components/permit-location";
import PermitResults from "@/components/permit-results";
import { downloadText } from "@/lib/pricing";
import { requestDso } from "@/lib/dso-client";
import { applicationWorks, buildDsoReferences, checkIsComplete, formatDsoAnswer, reconcileDsoHistory, unansweredQuestions, updateDsoHistory, type DsoAnsweredQuestion } from "@/lib/dso-flow";
import { emptyFlow, newPermitSession, parsePermitDraft, permitStorageKey, type PermitSession, type PermitStage } from "@/lib/permit-state";
import type { Address, DsoEnvironment, DsoMode, DsoQuestion, DsoResult, DsoWork } from "@/lib/dso";

export const checkUrl = "https://omgevingswet.overheid.nl/checken";
export const applicationUrl = "https://omgevingswet.overheid.nl/aanvragen";
type Connection = { available: boolean; environment: DsoEnvironment | null };
type Props = { open: boolean; onClose: () => void; initialWork: string; initialContext?: { postcode: string; houseNumber: string }; onResult?: (text: string, context: { postcode: string; houseNumber: string }) => void };
const stageLabels = ["Locatie", "Werkzaamheden", "Vragen", "Uitkomst"];
const stageIds: PermitStage[] = ["location", "works", "questions", "result"];

export default function PermitDialog({ open, onClose, initialWork, initialContext, onResult }: Props) {
  const [session, setSession] = useState(() => newPermitSession(initialContext));
  const [connection, setConnection] = useState<Connection | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [searchResults, setSearchResults] = useState<DsoWork[]>([]);
  const [query, setQuery] = useState(initialWork);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<PermitSession | null>(null);
  const [restart, setRestart] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const questionField = useRef<HTMLFieldSetElement>(null);
  const operation = useRef<AbortController | null>(null);
  const flow = session[session.mode];
  const pending = unansweredQuestions(flow.result, flow.history);
  const currentQuestion = (editingKey ? flow.history.find((item) => item.question.key === editingKey)?.question : pending[0]) ?? null;
  const currentValue = draftValue ?? (editingKey ? flow.history.find((item) => item.question.key === editingKey)?.value : undefined) ?? currentQuestion?.prefilled ?? "";
  const testEnvironment = connection?.environment === "preproduction";

  useEffect(() => {
    if (open) dialog.current?.showModal(); else dialog.current?.close();
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/omgevingswet", { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "De verbinding is tijdelijk niet beschikbaar.");
      if (controller.signal.aborted) return;
      setConnection(data);
      setSession((current) => ({ ...current, environment: current.environment ?? data.environment }));
      try { const raw = localStorage.getItem(permitStorageKey); if (raw) setSaved(parsePermitDraft(raw)); } catch { setNotice("Een eerdere check kon niet worden geopend. U kunt een nieuwe check starten."); }
    }).catch((failure) => { if (!controller.signal.aborted) { setConnection({ available: false, environment: null }); setError(failure instanceof Error && !["TypeError", "SyntaxError"].includes(failure.name) ? failure.message : "De verbinding met het Omgevingsloket is tijdelijk niet beschikbaar."); } });
    return () => { controller.abort(); operation.current?.abort(); operation.current = null; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (session.stage === "questions" && currentQuestion) questionField.current?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
    dialog.current?.scrollTo({ top: 0 });
  }, [open, session.stage, currentQuestion?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (operation.current) return;
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(""); setNotice("");
    try { await action(controller.signal); }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Er ging iets mis. Uw antwoorden zijn behouden."); }
    finally { if (operation.current === controller) { operation.current = null; setBusy(false); } }
  }
  function go(stage: PermitStage) { setSession((s) => ({ ...s, stage })); setError(""); setDraftValue(null); setEditingKey(null); }
  function begin(mode: DsoMode) {
    setSession((s) => ({ ...s, mode, stage: s.locationConfirmed ? "works" : "location" }));
    setSearchResults([]); setSearchedQuery(""); setNextPage(null); setError(""); setDraftValue(null); setEditingKey(null);
    setQuery(mode === "check" ? initialWork : "bouwactiviteit");
  }
  function changeAddressField(field: "postcode" | "houseNumber", value: string) {
    setSession((s) => ({ ...s, [field]: value, address: null, geometry: null, locationConfirmed: false, check: emptyFlow(), application: emptyFlow() }));
    setAddresses([]); setSearchResults([]); setSearchedQuery(""); setNextPage(null);
  }
  function chooseAddress(address: Address) {
    if (address.id === session.address?.id) return;
    setSession((s) => ({ ...s, address, geometry: null, locationConfirmed: false, check: emptyFlow(), application: emptyFlow() }));
    setSearchResults([]); setSearchedQuery(""); setNextPage(null);
  }
  async function findWorks(text = query, page = 1) {
    if (text.trim().length < 2) { setError("Vul minimaal twee letters in."); return; }
    setQuery(text);
    await run(async (signal) => {
      const data = await requestDso<{ works: DsoWork[]; nextPage: number | null }>({ action: "search", mode: session.mode, query: text, geometry: session.geometry, page }, signal);
      if (signal.aborted) return;
      setSearchResults((previous) => [...new Map([...(page === 1 ? [] : previous), ...data.works].map((work) => [work.ref, work])).values()]);
      setNextPage(data.nextPage); setSearchedQuery(text);
    });
  }
  function toggleWork(work: DsoWork) {
    const works = flow.works.some((item) => item.ref === work.ref) ? flow.works.filter((item) => item.ref !== work.ref) : [...flow.works, work];
    setSession((s) => ({ ...s, [s.mode]: { ...emptyFlow(), works }, ...(s.mode === "check" ? { application: emptyFlow() } : {}) }));
    setNotice("Na een wijziging in de werkzaamheden begint de vragenlijst opnieuw.");
  }
  async function evaluate(snapshot: PermitSession, history = snapshot[snapshot.mode].history, works = snapshot[snapshot.mode].works) {
    if (!snapshot.geometry || !snapshot.locationConfirmed || !works.length) return;
    if (snapshot.environment !== connection?.environment) { setError("Deze check hoort bij een andere omgeving. Start een nieuwe check voor de huidige verbinding."); return; }
    await run(async (signal) => {
      const data = await requestDso<DsoResult>({ action: "execute", mode: snapshot.mode, geometry: snapshot.geometry, references: buildDsoReferences(works, history) }, signal);
      if (signal.aborted) return;
      const reconciled = reconcileDsoHistory(data, history);
      const previousRuleIds = snapshot[snapshot.mode].result?.ruleIds ?? snapshot[snapshot.mode].ruleIds;
      const rulesChanged = previousRuleIds?.length && JSON.stringify(previousRuleIds) !== JSON.stringify(data.ruleIds);
      // Reconfirm answers when the rule files themselves changed, rather than
      // carrying user answers into a different version without review.
      const acceptedHistory = rulesChanged ? [] : reconciled;
      const stage = unansweredQuestions(data, acceptedHistory).length ? "questions" : "result";
      setSession({ ...snapshot, stage, [snapshot.mode]: { works, history: acceptedHistory, result: data, checkedAt: new Date().toISOString(), ruleIds: data.ruleIds }, ...(snapshot.mode === "check" && editingKey ? { application: emptyFlow() } : {}) });
      setEditingKey(null); setDraftValue(null);
      if (rulesChanged) setNotice("De officiële regels zijn intussen gewijzigd. Controleer en bevestig uw antwoorden opnieuw.");
    });
  }
  function answer(question: DsoQuestion, skip = false) {
    const value = skip ? "" : currentValue;
    if ((!skip && !value.trim()) || (skip && question.required)) { setError("Beantwoord deze vraag of kies ‘Weet ik nog niet’ als overslaan mogelijk is."); return; }
    void evaluate(session, updateDsoHistory(flow.history, question, value));
  }
  function edit(entry: DsoAnsweredQuestion) { setEditingKey(entry.question.key); setDraftValue(entry.value); setSession((s) => ({ ...s, stage: "questions" })); setError(""); }
  function prepareApplication() {
    const works = applicationWorks(session.check.result?.conclusions ?? []);
    const same = JSON.stringify(works.map((w) => w.ref).sort()) === JSON.stringify(session.application.works.map((w) => w.ref).sort());
    setSession((s) => ({ ...s, mode: "application", stage: "works", application: same ? s.application : { ...emptyFlow(), works } }));
    setSearchResults([]); setSearchedQuery(""); setNextPage(null); setQuery("bouwactiviteit"); setError(""); setDraftValue(null);
  }
  function save() {
    if (!session.address || !session.geometry || !session.environment || busy) return;
    try { localStorage.setItem(permitStorageKey, JSON.stringify(session)); setSaved(parsePermitDraft(JSON.stringify(session))); setNotice("Uw bevestigde antwoorden zijn bewaard op dit apparaat. Een volgende gebruiker van dit apparaat kan ze openen."); }
    catch { setError("Bewaren is niet gelukt. Download uw overzicht om de antwoorden te behouden."); }
  }
  function exportAnswers() {
    const lines = ["BOUWAANHUIS — Vergunningdossier", `Datum: ${new Date().toLocaleString("nl-NL")}`, `Adres: ${session.address?.label ?? "Nog niet gekozen"}`, `Werklocatie (RD): ${JSON.stringify(session.geometry)}`, testEnvironment ? "TESTOMGEVING — geen geldige check voor uw echte bouwplan" : "Productieomgeving", ""];
    for (const mode of ["check", "application"] as const) {
      const data = session[mode]; if (!data.works.length) continue;
      lines.push(mode === "check" ? "VERGUNNINGCHECK" : "AANVRAAGVOORBEREIDING", ...data.works.map((work) => work.label), "", ...data.history.map((entry) => `${entry.question.title}\n${formatDsoAnswer(entry.question, entry.value)}\n`), ...(data.result?.conclusions.map((c) => `${c.title}: ${c.text}${c.warning ? `\n${c.warning}` : ""}`) ?? []), ...(data.result?.notices ?? []), "Benodigde bijlagen:", ...(data.result?.attachmentDetails.map((a) => `${a.title}${a.required ? " (verplicht)" : " (optioneel)"}`) ?? []), "");
    }
    lines.push("Er is geen aanvraag ingediend. De uitkomst geldt alleen voor de gekozen werklocatie en werkzaamheden. Een los geopend Omgevingsloket neemt deze antwoorden niet automatisch over.");
    downloadText("bouwaanhuis-vergunningdossier.txt", lines.join("\n"));
  }
  function close() {
    operation.current?.abort(); operation.current = null; setBusy(false);
    const check = session.check;
    const context = { postcode: session.postcode, houseNumber: initialContext?.houseNumber.match(/^\d+/)?.[0] === session.houseNumber ? initialContext.houseNumber : session.houseNumber };
    if (session.address) onResult?.(check.result && !unansweredQuestions(check.result, check.history).length ? [testEnvironment ? "TESTOMGEVING — niet geschikt als vergunningcheck." : "Uitkomst vergunningcheck", session.address.label, ...check.result.conclusions.map((c) => `${c.title}: ${c.text}${c.warning ? ` — ${c.warning}` : ""}`), checkIsComplete(check.result, check.history) ? "" : "Onvolledige check; aanvullende beoordeling nodig.", session.geometry?.type === "Polygon" ? "Voor het getekende werkgebied en de gekozen werkzaamheden." : "Alleen voor het gekozen punt en de gekozen werkzaamheden.", "Er is geen aanvraag ingediend."].filter(Boolean).join("\n") : "", context);
    onClose();
  }
  const titles: Record<PermitStage, string> = { intro: "Duidelijkheid over uw vergunning.", location: "Waar wilt u verbouwen?", works: "Wat gaat u doen?", questions: "Vertel ons over uw plannen.", result: session.mode === "check" ? "Dit betekent het voor uw plannen." : "Uw aanvraagvoorbereiding." };
  const stepIndex = stageIds.indexOf(session.stage);

  return <dialog ref={dialog} className="modal permit-modal permit-v2" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { if (open) close(); }} aria-labelledby="permit-dialog-title">
    <button className="modal-close" type="button" onClick={close} aria-label="Vergunninghulp sluiten"><Icon name="close" size={21} /></button>
    <div className="permit-layout"><aside className="permit-sidebar"><span className="permit-brand"><Icon name="house" size={26} /> bouwaanhuis</span><h2>Een goed plan.<br />Ook op papier.</h2><p>De officiële vragen, met overzicht bij elke stap.</p><ol aria-label="Stappen van uw vergunningcheck">{stageLabels.map((label, index) => <li key={label} className={stepIndex === index ? "active" : stepIndex > index ? "done" : ""} aria-current={stepIndex === index ? "step" : undefined}><span>{stepIndex > index ? <Icon name="check" size={14} /> : index + 1}</span>{label}</li>)}</ol><div className="permit-sidebar-note"><Icon name="shield" size={22} /><p>Gebaseerd op de regels van het Omgevingsloket voor uw locatie.</p></div></aside>
    <div className="modal-body permit-content"><p className="eyebrow"><span /> {session.mode === "check" ? "UW VERGUNNINGCHECK" : "UW AANVRAAG VOORBEREIDEN"}</p><h2 id="permit-dialog-title" ref={heading} tabIndex={-1}>{titles[session.stage]}</h2>
      {testEnvironment && <p className="permit-test-banner" role="status">Testomgeving · U oefent met testgegevens. De uitkomst is niet geschikt voor een echte verbouwing.</p>}
      {connection === null && <p role="status" className="status-loading">Verbinding met het Omgevingsloket controleren…</p>}
      {connection?.available === false && <div className="permit-status-note"><Icon name="shield" size={22} /><div><strong>De verbinding is nu niet beschikbaar.</strong><p>Uw antwoorden blijven in dit venster. U kunt uw dossier downloaden of de officiële check openen.</p><a className="text-link" href={checkUrl} target="_blank" rel="noopener noreferrer">Open de officiële Vergunningcheck <Icon name="arrow-up" size={16} /></a></div></div>}
      {session.stage === "intro" && <><p className="permit-lead">Ontdek welke regels voor uw verbouwing gelden. Kies uw locatie en werkzaamheden; daarna krijgt u alleen de vragen die daarbij horen.</p><div className="permit-intro-steps"><span><Icon name="pin" size={21} /> Uw werklocatie</span><span><Icon name="file" size={21} /> Gerichte vragen</span><span><Icon name="check" size={21} /> Een helder vervolg</span></div><button className="button button-bordeaux" disabled={!connection?.available} onClick={() => begin("check")}>Start mijn vergunningcheck <Icon name="arrow" size={18} /></button><details className="permit-application-entry"><summary>Ik weet al dat ik een aanvraag moet voorbereiden</summary><p>U kunt hier de officiële aanvraagvragen invullen. Rechtstreeks indienen via bouwaanhuis is nog niet beschikbaar. Een nieuw tabblad van het Omgevingsloket neemt uw antwoorden niet over.</p><button className="button button-outline" disabled={!connection?.available} onClick={() => begin("application")}>Aanvraag voorbereiden</button></details></>}
      {session.stage === "intro" && saved && <div className="permit-resume"><strong>Verder met uw bewaarde dossier?</strong><p>{saved.address?.label}</p><div className="permit-modal-actions"><button className="button button-outline" disabled={busy || !connection?.available} onClick={() => { if (saved.environment !== connection?.environment) { setError("Dit dossier hoort bij een andere DSO-omgeving. Start een nieuwe check."); return; } if (saved[saved.mode].works.length) void evaluate(saved); else setSession(saved); }}>Hervatten en opnieuw controleren</button><button className="back-link" onClick={() => { try { localStorage.removeItem(permitStorageKey); setSaved(null); } catch { setError("De bewaarde check kon niet worden verwijderd."); } }}>Bewaard dossier verwijderen</button></div></div>}
      {session.stage !== "intro" && <>
        {session.address && session.stage !== "location" && <div className="permit-context"><Icon name="pin" size={18} /><div><strong>{session.address.label}</strong><span>{session.geometry?.type === "Polygon" ? "Getekend werkgebied" : "Gekozen locatiepunt"}</span></div><button className="back-link" disabled={busy} onClick={() => go("location")}>Wijzig</button></div>}
        {session.mode === "application" && <div className="permit-submission-notice"><strong>Voorbereiden kan; rechtstreeks indienen is nog niet aangesloten.</strong><p>Uw antwoorden worden gecontroleerd en blijven in uw dossier. Er wordt hiermee geen aanvraag verstuurd. In het Omgevingsloket moet u deze gegevens zelf overnemen.</p><button className="back-link" disabled={busy} onClick={() => { setSession((s) => ({ ...s, mode: "check", stage: s.check.result ? unansweredQuestions(s.check.result, s.check.history).length ? "questions" : "result" : "works" })); setDraftValue(null); setEditingKey(null); }}>Terug naar mijn vergunningcheck</button></div>}
        {session.stage === "location" && <><form className="permit-form" onSubmit={(event) => { event.preventDefault(); void run(async (signal) => { const data = await requestDso<{ addresses: Address[] }>({ action: "address", postcode: session.postcode, houseNumber: session.houseNumber }, signal); if (!signal.aborted) { setAddresses(data.addresses); if (!data.addresses.length) setError("Geen adres gevonden. Controleer uw postcode en huisnummer."); } }); }}><fieldset disabled={busy}><div className="address-fields"><label>Postcode<input autoComplete="postal-code" required pattern="[1-9][0-9]{3}\s?[a-zA-Z]{2}" maxLength={7} placeholder="1234 AB" value={session.postcode} onChange={(e) => changeAddressField("postcode", e.target.value)} /></label><label>Huisnummer<input inputMode="numeric" required pattern="[1-9][0-9]{0,4}" maxLength={5} placeholder="12" value={session.houseNumber} onChange={(e) => changeAddressField("houseNumber", e.target.value)} /></label></div><p className="permit-form-note">Zonder toevoeging. Kies daarna uw volledige adres. We zoeken uw adres op bij PDOK.</p><button className="button button-outline" type="submit">{busy ? "Adres zoeken…" : "Zoek mijn adres"} <Icon name="pin" size={17} /></button></fieldset></form>
        {addresses.length > 0 && <fieldset className="dso-question permit-address-options" disabled={busy}><legend>Kies uw volledige adres</legend><div className="permit-search-list">{addresses.map((item) => <label key={item.id}><input type="radio" name="permit-address" checked={item.id === session.address?.id} onChange={() => chooseAddress(item)} />{item.label}</label>)}</div></fieldset>}
        {session.address && <><PermitLocation key={session.address.id} address={session.address} geometry={session.geometry} onChange={(geometry) => { setSession((s) => ({ ...s, geometry, locationConfirmed: false, check: emptyFlow(), application: emptyFlow() })); setSearchResults([]); setSearchedQuery(""); setNextPage(null); }} /><label className="permit-confirm"><input type="checkbox" disabled={!session.geometry} checked={session.locationConfirmed} onChange={(e) => setSession((s) => ({ ...s, locationConfirmed: e.target.checked }))} />Dit is de locatie waarvoor ik de werkzaamheden wil controleren.</label><button className="button button-bordeaux" disabled={!session.locationConfirmed || busy || !connection?.available} onClick={() => go("works")}>Naar mijn werkzaamheden <Icon name="arrow" size={18} /></button></>}
        </>}
        {session.stage === "works" && <><p className="permit-lead">Een verbouwing kan uit meerdere werkzaamheden bestaan. Denk bij een uitbouw ook aan slopen, een gevel aanpassen of een boom verwijderen.</p><form className="permit-form" onSubmit={(e) => { e.preventDefault(); void findWorks(); }}><label>Zoek een werkzaamheid<input value={query} minLength={2} maxLength={150} required onChange={(e) => setQuery(e.target.value)} placeholder={session.mode === "check" ? "Bijvoorbeeld dakkapel" : "Bijvoorbeeld bouwactiviteit"} disabled={busy} /></label><button className="button button-outline" type="submit" disabled={busy || !connection?.available}>{busy ? "Zoeken…" : "Zoek werkzaamheden"}<Icon name="arrow" size={17} /></button></form><div className="permit-suggestions" aria-label="Veelgezochte werkzaamheden">{(session.mode === "check" ? ["Uitbouw", "Dakkapel", "Dakopbouw", "Slopen", "Kozijnen"] : ["Bouwactiviteit", "Slopen"]).map((term) => <button type="button" disabled={busy} key={term} onClick={() => void findWorks(term)}>{term}</button>)}</div>
        {flow.works.length > 0 && <div className="permit-selected"><strong>In uw {session.mode === "check" ? "check" : "voorbereiding"} ({flow.works.length})</strong>{flow.works.map((work) => <div key={work.ref}><span>{work.label}</span><button type="button" className="back-link" disabled={busy} onClick={() => toggleWork(work)} aria-label={`Verwijder ${work.label}`}><Icon name="close" size={16} /></button></div>)}</div>}
        {searchResults.length > 0 && <fieldset className="dso-question" disabled={busy}><legend>Resultaten voor ‘{searchedQuery}’</legend><div className="permit-search-list">{searchResults.map((work) => <label key={work.ref}><input type="checkbox" checked={flow.works.some((item) => item.ref === work.ref)} onChange={() => toggleWork(work)} /><span>{work.label}{work.permission && <small>{work.permission}</small>}</span></label>)}</div></fieldset>}
        {searchedQuery && !searchResults.length && <p className="permit-form-note">Geen resultaten voor ‘{searchedQuery}’. Gebruik een algemenere term{session.mode === "application" ? ", zoals ‘bouwactiviteit’" : ""}.</p>}
        {nextPage && <button className="back-link" disabled={busy} onClick={() => void findWorks(searchedQuery, nextPage)}>Meer resultaten</button>}
        <div className="permit-step-actions"><button className="back-link" disabled={busy} onClick={() => go("location")}>← Locatie</button><button className="button button-bordeaux" disabled={busy || !connection?.available || !flow.works.length || flow.works.length > 20} onClick={() => void evaluate(session)}>{busy ? "Vragen ophalen…" : flow.history.length ? "Verder met mijn antwoorden" : "Naar de vragen"}<Icon name="arrow" size={18} /></button></div>{flow.works.length > 20 && <p className="error-notice">Kies maximaal 20 werkzaamheden per check.</p>}
        </>}
        {session.stage === "questions" && currentQuestion && <><div className="permit-question-context"><span>{currentQuestion.activity}</span><strong>{currentQuestion.group || "Uw plannen"}</strong></div><p className="permit-form-note">{flow.history.filter((entry) => entry.value.trim()).length} antwoorden bevestigd · De vervolgvragen passen zich aan uw antwoorden aan.</p>{editingKey && <p className="permit-edit-note">Als u dit antwoord wijzigt, vragen we de antwoorden daarna opnieuw. Zo blijven alleen antwoorden bij uw huidige plan over.</p>}<form className="permit-form question-step" onSubmit={(e) => { e.preventDefault(); answer(currentQuestion); }}><QuestionField key={currentQuestion.key} question={currentQuestion} value={currentValue} disabled={busy} focusRef={questionField} onChange={setDraftValue} />{currentQuestion.prefilled && draftValue === null && !editingKey && <p className="permit-form-note">Deze waarde is ingevuld vanuit de officiële gegevens. Controleer of die klopt.</p>}<div className="question-actions"><button className="button button-bordeaux" disabled={busy || !connection?.available} type="submit">{busy ? "Antwoord controleren…" : "Bevestig en ga verder"}<Icon name="arrow" size={18} /></button>{!currentQuestion.required && <button className="back-link" type="button" disabled={busy || !connection?.available} onClick={() => answer(currentQuestion, true)}>Weet ik nog niet · overslaan</button>}</div></form><div className="permit-step-actions">{editingKey ? <button className="back-link" disabled={busy} onClick={() => { setEditingKey(null); setDraftValue(null); if (!pending.length) go("result"); }}>Wijziging annuleren</button> : flow.history.length > 0 ? <button className="back-link" disabled={busy} onClick={() => edit(flow.history.at(-1)!)}>← Vorige vraag</button> : <button className="back-link" disabled={busy} onClick={() => go("works")}>← Werkzaamheden</button>}</div></>}
        {session.stage === "result" && flow.result && <PermitResults mode={session.mode} result={flow.result} history={flow.history} testEnvironment={testEnvironment} busy={busy} onPrepare={prepareApplication} onDownload={exportAnswers} onRecheck={() => void evaluate(session)} onDependencies={flow.result.dependencies.some((ref) => !flow.works.some((work) => work.ref === ref)) ? () => { const dependencies = flow.result!.dependencies.filter((ref) => !flow.works.some((work) => work.ref === ref)); if (dependencies.length + flow.works.length > 100) { setError("Voor dit plan zijn te veel gerelateerde activiteiten nodig. Vervolg uw check in het Omgevingsloket."); return; } void evaluate(session, flow.history, [...flow.works, ...dependencies.map((ref, index) => ({ ref, label: `Gerelateerde werkzaamheid ${index + 1}` }))]); } : undefined} />}
        {flow.history.length > 0 && session.stage !== "location" && <details className="answer-history"><summary>Uw bevestigde antwoorden ({flow.history.length})</summary><ol>{flow.history.map((entry) => <li key={entry.question.key}><div><strong>{entry.question.title}</strong><span>{formatDsoAnswer(entry.question, entry.value)}</span></div><button className="back-link" type="button" disabled={busy} onClick={() => edit(entry)} aria-label={`Wijzig antwoord: ${entry.question.title}`}>Wijzig</button></li>)}</ol></details>}
        {session.stage === "result" && <button className="back-link" disabled={busy} onClick={() => go("works")}>← Werkzaamheden aanpassen</button>}
        <div className="permit-save-row"><button className="text-link" disabled={busy || !session.geometry || !session.environment} onClick={save}><Icon name="file" size={17} /> Bewaar mijn dossier</button><button className="back-link" disabled={busy} onClick={() => setRestart(true)}>Nieuwe check</button></div><p className="permit-form-note">Bewaren slaat uw bevestigde antwoorden op dit apparaat op. Zonder bewaren blijven ze alleen in dit venster.</p>
      </>}
      {restart && <div className="permit-restart" role="alert"><strong>Een nieuwe check starten?</strong><p>De antwoorden in dit venster worden gewist. Een bewaard dossier blijft beschikbaar.</p><div className="permit-modal-actions"><button className="button button-outline" onClick={() => setRestart(false)}>Terug</button><button className="button button-bordeaux" onClick={() => { setSession({ ...newPermitSession(initialContext), environment: connection?.environment ?? null }); setAddresses([]); setSearchResults([]); setSearchedQuery(""); setNextPage(null); setEditingKey(null); setDraftValue(null); setRestart(false); setError(""); setNotice(""); }}>Start opnieuw</button></div></div>}
      {notice && <p className="permit-notice" role="status">{notice}</p>}{error && <p className="error-notice" role="alert">{error}</p>}
      <p className="permit-footer-note">Uw locatie, werkzaamheden en bevestigde antwoorden worden voor deze beoordeling met het Omgevingsloket gedeeld. Een check is geen ingediende aanvraag.</p>
    </div></div>
  </dialog>;
}
