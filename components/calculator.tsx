"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { IntakeQuestion, MeasureHelp } from "@/components/intake-question";
import { IntakeSubmit } from "@/components/intake-submit";
import type { IntakeReceipt } from "@/lib/intake-submission";
import { IntakeReview } from "@/components/intake-review";
import { workTypes, type WorkId } from "@/lib/pricing";
import { buildSections, effectiveWorks, value, visible, type Answer, type Answers, type IntakeDraft, type IntakeFiles } from "@/lib/intake";
import { deleteDraft, readDraft, writeDraft } from "@/lib/intake-storage";

export type PermitContext = { postcode: string; houseNumber: string };
export type IntakePermitResult = { work: string; text: string; context?: PermitContext };
export default function Calculator({ onPermit, permitResult }: { onPermit: (work: string, context?: PermitContext) => void; permitResult?: IntakePermitResult | null }) {
  const [selected, setSelected] = useState<WorkId[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [files, setFiles] = useState<IntakeFiles>({});
  const [sectionId, setSectionId] = useState("start");
  const [receipt, setReceipt] = useState<IntakeReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [editingReview, setEditingReview] = useState(false);
  const [savedDraft, setSavedDraft] = useState<IntakeDraft | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const appliedPermit = useRef<typeof permitResult>(null);
  const revision = useRef(0);
  const sections = buildSections(selected, answers);
  const sectionIndex = sections.findIndex((item) => item.id === sectionId);
  const currentSection = sections[sectionIndex];
  const review = sectionId === "review";
  const sending = sectionId === "submit";
  const start = sectionId === "start" || (!currentSection && !review && !sending);
  const canStart = selected.length > 0;
  const canSave = canStart && storageReady && !saving;
  const works = effectiveWorks(selected, answers);
  const overallStep = sending ? 4 : start ? 0 : review ? 3 : currentSection?.id === "home.address" ? 1 : 2;
  const progress = receipt ? 100 : sending ? 95 : start ? 0 : review ? 90 : Math.round((sectionIndex + 1) / (sections.length + 1) * 85);

  useEffect(() => {
    let active = true;
    readDraft().then((draft) => { if (active) setSavedDraft(draft); }).catch(() => {
      if (active) setStatus("Opslaan op dit apparaat is niet beschikbaar. U kunt uw opname wel downloaden.");
    }).finally(() => { if (active) setStorageReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (receipt || submitting || !permitResult || permitResult === appliedPermit.current) return;
    appliedPermit.current = permitResult;
    queueMicrotask(() => {
      setAnswers((current) => ({ ...current,
        ...(permitResult.text ? { [`${permitResult.work}.permitConclusion`]: permitResult.text } : {}),
        ...(!value(current, "home.postcode") && permitResult.context ? { "home.postcode": permitResult.context.postcode } : {}),
        ...(!value(current, "home.number") && permitResult.context ? { "home.number": permitResult.context.houseNumber } : {}),
      }));
      setStatus(permitResult.text ? "De uitkomst van uw vergunningcheck is toegevoegd. Controleer de vergunningstatus in uw opname." : "Uw adres uit de vergunningcheck is overgenomen waar het nog ontbrak.");
      revision.current++;
    });
  }, [permitResult, receipt, submitting]);

  function change(id: string, answer: Answer) {
    setAnswers((current) => {
      const next = { ...current, [id]: answer };
      if ((id === "home.postcode" || id === "home.number") && current[id] !== answer) {
        for (const work of ["uitbouw", "dakopbouw", "dakkapel"]) {
          if (next[`${work}.permitConclusion`]) { delete next[`${work}.permitConclusion`]; delete next[`${work}.permit`]; }
        }
      }
      return next;
    });
    setStatus(""); setError(""); revision.current++;
  }
  function goTo(id: string) {
    if (submitting) return;
    if (id === "submit" && !requestId) setRequestId(crypto.randomUUID());
    setSectionId(id); setError("");
    requestAnimationFrame(() => { headingRef.current?.focus({ preventScroll: true }); headingRef.current?.scrollIntoView({ behavior: "auto", block: "start" }); });
  }
  function next() {
    if (start) { if (canStart) goTo(sections[0].id); return; }
    if (!formRef.current?.reportValidity()) return;
    if (editingReview) { setEditingReview(false); goTo("review"); return; }
    goTo(sections[sectionIndex + 1]?.id ?? "review");
  }
  async function save() {
    // Enforce availability in the action itself, including keyboard and programmatic clicks.
    if (!canSave) return;
    setSaving(true); setError("");
    const snapshotRevision = revision.current;
    const draft: IntakeDraft = { version: 1, selected, answers, files, sectionId, savedAt: new Date().toISOString() };
    try {
      await writeDraft(draft); setSavedDraft(null);
      setStatus(snapshotRevision === revision.current ? "Uw opname en bijlagen zijn bewaard op dit apparaat. U kunt hier later verdergaan." : "De opname is bewaard. Bewaar opnieuw om uw laatste wijziging mee te nemen.");
    } catch { setError("Opslaan is niet gelukt, mogelijk is er te weinig opslagruimte. Uw antwoorden staan nog in dit scherm. Probeer opnieuw of download uw dossier."); }
    finally { setSaving(false); }
  }
  function updateFiles(id: string, nextFiles: File[]) {
    const next = { ...files, [id]: nextFiles };
    if (Object.values(next).flat().length > 100) { setError("U kunt maximaal 100 bijlagen toevoegen. Verwijder eerst een bestand."); return; }
    if (Object.values(next).flat().reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024) { setError("Uw bijlagen zijn samen groter dan 100 MB. Verklein enkele bestanden of verwijder een bijlage."); return; }
    setFiles(next); setStatus(""); setError(""); revision.current++;
  }
  function removeRoom(index: number) {
    const remap = <T,>(record: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(record).flatMap(([key, answer]) => {
      const match = /^afwerking\.(\d+)\.(.*)$/.exec(key);
      if (!match) return [[key, answer]];
      const number = Number(match[1]);
      return number === index ? [] : [[`afwerking.${number > index ? number - 1 : number}.${match[2]}`, answer]];
    }));
    const rooms = Array.isArray(answers["afwerking.rooms"]) ? answers["afwerking.rooms"] : [];
    setAnswers({ ...remap(answers), "afwerking.rooms": rooms.filter((_, i) => i !== index) });
    setFiles(remap(files)); setStatus(""); revision.current++;
  }
  const permitWork = currentSection?.work;
  const permitPage = currentSection?.id.endsWith(".permit");

  return <section className="calculator-section section" id="prijsindicatie" aria-labelledby="calculator-title"><div className="container">
    <div className="section-heading calculator-heading"><div><p className="eyebrow"><span /> UW PLANNEN, STAP VOOR STAP</p><h2 id="calculator-title">Wat kost uw verbouwing?</h2><p>Vertel ons uw wensen. Samen maken we de stap naar een heldere prijs.</p></div><span className="time-pill"><Icon name="file" size={16} /> Online opname · op uw tempo</span></div>
    {savedDraft && <div className="intake-resume" role="status"><div><strong>U heeft een bewaarde opname.</strong><p>Laatst bewaard op {new Date(savedDraft.savedAt).toLocaleString("nl-NL")}. Inclusief uw bijlagen, op dit apparaat.</p></div><button className="button button-bordeaux" onClick={() => {
      setSelected(savedDraft.selected.filter((id) => workTypes.some((work) => work.id === id))); setAnswers(savedDraft.answers); setFiles(savedDraft.files); goTo(savedDraft.sectionId); setSavedDraft(null); revision.current++; setStatus("Uw bewaarde opname is geopend.");
    }}>Verder met mijn opname <Icon name="arrow" size={16} /></button><button className="back-link" onClick={async () => { try { await deleteDraft(); setSavedDraft(null); } catch { setError("De bewaarde opname kon niet worden verwijderd."); } }}>Bewaarde opname verwijderen</button></div>}
    <div className="calculator-shell intake-shell"><div className="calculator-main">
      <ol className="steps intake-steps">{["Uw plannen", "Uw woning", "De details", "Overzicht", receipt ? "Ontvangen" : "Versturen"].map((label, index) => <li className={overallStep === index ? "active" : overallStep > index ? "complete" : ""} key={label} aria-current={overallStep === index ? "step" : undefined}><span>{(overallStep > index || (receipt && index === 4)) ? <Icon name="check" size={14} /> : index + 1}</span>{label}</li>)}</ol>
      <div className="intake-progress" role="progressbar" aria-label="Voortgang van de opname" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={receipt ? "Aanvraag ontvangen" : `${progress}% · ${sending ? "Klaar om te versturen" : review ? "Controleer uw overzicht" : start ? "Kies uw werkzaamheden" : currentSection?.title}`}><span style={{ width: `${progress}%` }} /></div>
      <div className="calculator-content intake-content" key={start ? "start" : sectionId}>
        <div className="intake-step-meta"><span>{sending ? receipt ? "Uw aanvraag is ontvangen" : "De laatste stap · vrijblijvend versturen" : start ? "Begin bij uw woonwens" : review ? "Uw dossier in één overzicht" : `Onderdeel ${sectionIndex + 1} van ${sections.length}`}</span>{!start && !receipt && <button className="back-link" disabled={submitting} onClick={() => goTo("start")}>Werkzaamheden wijzigen</button>}</div>
        <h3 ref={headingRef} tabIndex={-1}>{sending ? receipt ? "Een goed begin voor uw verbouwing." : "Zullen we uw plannen samen bekijken?" : start ? "Wat wilt u verbouwen?" : review ? "Uw plannen. Een helder vervolg." : currentSection?.title}</h3>
        <p className="step-description">{sending ? receipt ? "Hier leest u wat u van ons kunt verwachten." : "Controleer uw contactgegevens. Daarna sturen we uw wensen en bijlagen veilig door." : start ? "Kies één of meer verbouwingen. We vragen uw woninggegevens maar één keer." : review ? "Controleer uw antwoorden, hoeveelheden en open punten. U kunt alles nog aanpassen." : currentSection?.hint ?? "Vul in wat u al weet. Onbekende gegevens kunt u later aanvullen."}</p>
        {start && <div className="work-grid">{workTypes.map((work) => <button key={work.id} className={`work-option ${selected.includes(work.id) ? "selected" : ""}`} aria-pressed={selected.includes(work.id)} onClick={() => { setSelected((current) => current.includes(work.id) ? current.filter((id) => id !== work.id) : [...current, work.id]); setStatus(""); revision.current++; }}><span className="selection-dot">{selected.includes(work.id) && <Icon name="check" size={10} />}</span><Icon name={work.icon} size={33} /><strong>{work.name}</strong><span>{work.detail}</span></button>)}</div>}
        {!start && !review && !sending && currentSection && <form ref={formRef} className="intake-form" id="intake-form" onSubmit={(event) => { event.preventDefault(); next(); }}>
          {currentSection.questions.some((question) => question.type === "number" && visible(question, answers)) && <MeasureHelp />}
          {currentSection.questions.filter((question) => visible(question, answers)).map((question, index) => <IntakeQuestion number={index + 1} key={question.id} question={question} answer={answers[question.id]} files={files[question.id]} onChange={(answer) => change(question.id, answer)} onFiles={(nextFiles) => updateFiles(question.id, nextFiles)} onRemoveRoom={removeRoom} />)}
          {permitPage && permitWork && <div className="intake-callout"><Icon name="shield" size={24} /><div><strong>Vergunningcheck bij uw plannen</strong><p>Uw opname blijft open. De check kan ook een melding of informatieplicht aangeven. Vul na de check de uitkomst hierboven aan.</p><button type="button" className="button button-outline" onClick={() => onPermit(permitWork, { postcode: value(answers, "home.postcode"), houseNumber: value(answers, "home.number") })}>Start de vergunningcheck <Icon name="arrow" size={16} /></button>{value(answers, `${permitWork}.permitConclusion`) && <p className="intake-permit-conclusion">{value(answers, `${permitWork}.permitConclusion`)}</p>}</div></div>}
          {currentSection.id === "contact.closing" && <p className="intake-hint">Contactgegevens zijn optioneel voor uw eigen overzicht. Uw opname wordt pas gedeeld wanneer u deze zelf verstuurt. Een afspraak is pas geboekt na bevestiging van een beschikbaar tijdslot.</p>}
        </form>}
        {start && <div className="intake-start-note"><Icon name="spark" size={20} /><div><strong>U hoeft nog niet alles te weten</strong><p>Beantwoord wat u al weet, bekijk uw overzicht en kies daarna of u uw aanvraag wilt versturen.</p></div></div>}
        {sending && <IntakeSubmit selected={selected} answers={answers} files={files} requestId={requestId} onChange={change} onBusy={setSubmitting} receipt={receipt} onReceipt={(result) => { setReceipt(result); setSavedDraft(null); setStatus(""); requestAnimationFrame(() => { headingRef.current?.focus({ preventScroll: true }); headingRef.current?.scrollIntoView({ block: "start" }); }); }} />}
        {review && <IntakeReview selected={selected} answers={answers} files={files} onContinue={() => goTo("submit")} onEdit={(id) => { setEditingReview(true); goTo(id); }} onPermit={(work) => onPermit(work, { postcode: value(answers, "home.postcode"), houseNumber: value(answers, "home.number") })} />}
      </div>
      {!receipt && <div className="calculator-bottom intake-bottom">{!start ? <button className="back-link" disabled={submitting} onClick={() => goTo(sending ? "review" : review ? sections[sections.length - 1].id : sections[sectionIndex - 1]?.id ?? "start")}>← {sending ? "Terug naar overzicht" : "Vorige stap"}</button> : <span><Icon name="lock" size={14} /> {canStart ? `${selected.length} ${selected.length === 1 ? "verbouwing" : "verbouwingen"} gekozen` : "Kies uw werkzaamheden om te beginnen"}</span>}{!review && !sending && <div className="intake-continue"><button className="button button-bordeaux" aria-disabled={start && !canStart} type={start ? "button" : "submit"} form={start ? undefined : "intake-form"} onClick={start ? next : undefined}>{start ? "Vertel over uw woning" : editingReview ? "Bewaar en bekijk overzicht" : sectionIndex === sections.length - 1 ? "Bekijk mijn overzicht" : "Verder"}<Icon name="arrow" size={18} /></button>{!start && <span>Hierna: {editingReview ? "uw overzicht" : sections[sectionIndex + 1]?.title ?? "uw overzicht"}</span>}</div>}</div>}
      {editingReview && !review && !start && !sending && <div className="intake-return"><button className="text-link" onClick={() => { if (formRef.current?.reportValidity()) goTo("review"); }}>Terug naar mijn overzicht <Icon name="arrow" size={16} /></button></div>}
      {!receipt && <div className="intake-save-bar"><button className="text-link" type="button" aria-disabled={!canSave || submitting} aria-busy={saving} onClick={() => { if (!submitting) void save(); }}><Icon name="file" size={17} />{saving ? "Opname bewaren…" : "Bewaar mijn opname"}</button>{!start && !review && !sending && <button className="back-link" onClick={() => { change("contact.next", "Ik wil een opname op locatie plannen"); goTo("contact.closing"); }}>Liever hulp? Vraag een opname aan</button>}</div>}
      {status && <p className="intake-status" role="status">{status}</p>}{error && <p className="intake-status error-notice" role="alert">{error}</p>}
    </div><aside className="calculator-aside intake-aside"><span className="aside-icon"><Icon name="house" size={26} /></span><span className="mini-eyebrow">BOUWAANHUIS</span><h3>Uw verbouwing.<br />Uw wensen.<br /><span>Een goed begin.</span></h3><p>Van de eerste maten tot de materiaalkeuzes: we helpen u uw plannen concreet te maken.</p><div className="aside-checks"><span><Icon name="check" size={17} /> Vragen die bij uw verbouwing passen</span><span><Icon name="check" size={17} /> Weet u iets niet? Gewoon verder</span><span><Icon name="check" size={17} /> Bewaar uw opname voor later</span></div>
      {!start && !sending && <nav className="intake-section-nav" aria-label="Onderdelen van uw opname"><strong>Uw stappen</strong>{sections.map((section, index) => <button type="button" key={section.id} disabled={!review && index > sectionIndex} aria-current={section.id === sectionId ? "step" : undefined} onClick={() => { if (review) setEditingReview(true); goTo(section.id); }}><span>{review || index < sectionIndex ? <Icon name="check" size={12} /> : index + 1}</span>{section.title.replace(/.* · /, "")}</button>)}</nav>}
      {works.length > 0 && <div className="intake-project-list"><strong>In uw opname</strong>{works.map((id) => { const work = workTypes.find((item) => item.id === id)!; return <span key={id}><Icon name={work.icon} size={17} />{work.name}</span>; })}</div>}
      <div className="aside-note"><Icon name="ruler" size={20} /><p>Geen maten of foto&apos;s?<br /><strong>Dan bekijken we samen wat nodig is.</strong></p></div></aside></div>
    <p className="calculator-footnote">Een online opname is het begin van uw prijsindicatie. Onbekende gegevens blijven open; een definitieve offerte volgt na beoordeling van uw dossier.</p>
  </div></section>;
}
