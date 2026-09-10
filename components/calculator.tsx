"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { calculateEstimate, euro, finishOptions, workTypes, type Finish, type PermitStatus, type WorkId } from "@/lib/pricing";

export default function Calculator({ onPermit }: { onPermit: (work: string) => void }) {
  const [step, setStep] = useState(0);
  const [stepDirection, setStepDirection] = useState("forward");
  const [workId, setWorkId] = useState<WorkId>("uitbouw");
  const [size, setSize] = useState("20");
  const [finish, setFinish] = useState<Finish>("comfort");
  const [structural, setStructural] = useState(false);
  const [permit, setPermit] = useState<PermitStatus>("unknown");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const work = workTypes.find((item) => item.id === workId)!;
  const validSize = Number.isFinite(Number(size)) && Number(size) >= work.min && Number(size) <= work.max;
  const estimate = validSize ? calculateEstimate(workId, Number(size), finish, structural) : null;

  function goToStep(nextStep: number) {
    setStepDirection(nextStep < step ? "backward" : "forward");
    setStep(nextStep);
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  async function downloadEstimate() {
    if (!estimate || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const { createEstimatePdf } = await import("@/lib/estimate-pdf");
      const document = createEstimatePdf({ workId, size: Number(size), finish, structural, permit });
      await document.save("plan-bouw-prijsindicatie.pdf", { returnPromise: true });
    } catch {
      setDownloadError("De pdf kon niet worden gemaakt. Probeer het opnieuw; uw keuzes zijn bewaard.");
    } finally {
      setDownloading(false);
    }
  }

  return <section className="calculator-section section" id="prijsindicatie" aria-labelledby="calculator-title">
    <div className="container">
      <div className="section-heading calculator-heading"><div><p className="eyebrow"><span /> VAN WOONWENS NAAR WERKELIJKHEID</p><h2 id="calculator-title">Wat kost uw verbouwing?</h2><p>Een paar vragen. Een helder beeld. Zo eenvoudig kan het zijn.</p></div><span className="time-pill"><Icon name="clock" size={16} /> In ongeveer 2 minuten</span></div>
      <div className="calculator-shell">
        <div className="calculator-main">
          <ol className="steps">{["Uw woonwens", "De details", "Uw prijsindicatie"].map((label, index) => <li className={step === index ? "active" : step > index ? "complete" : ""} key={label} aria-current={step === index ? "step" : undefined}><span>{step > index ? <Icon name="check" size={14} /> : `0${index + 1}`}</span>{label}</li>)}</ol>
          <div key={step} className={`calculator-content form-step-enter ${stepDirection === "backward" ? "form-step-back" : ""}`}>
            <h3 ref={headingRef} tabIndex={-1}>{step === 0 ? "Wat wilt u verbouwen?" : step === 1 ? "Vertel ons iets meer over uw plannen." : "Dit is uw eerste stap naar iets moois."}</h3>
            <p className="step-description">{step === 0 ? "Kies de verbouwing die bij uw plannen past." : step === 1 ? "Met deze details maken we uw indicatie persoonlijker." : "Een transparante bandbreedte op basis van uw keuzes."}</p>
            {step === 0 && <div className="work-grid">{workTypes.map((item) => <button key={item.id} className={`work-option ${workId === item.id ? "selected" : ""}`} aria-pressed={workId === item.id} onClick={() => { setWorkId(item.id); setSize(String(item.defaultSize)); }}><span className="selection-dot">{workId === item.id && <Icon name="check" size={10} />}</span><Icon name={item.icon} size={33} /><strong>{item.name}</strong><span>{item.detail}</span></button>)}</div>}
            {step === 1 && <form id="details-form" className="details-form" onSubmit={(event) => { event.preventDefault(); if (validSize) goToStep(2); }}>
              <div className="size-field"><label htmlFor="project-size">{workId === "dakkapel" ? "Hoe breed wordt uw dakkapel?" : "Hoe groot is de ruimte?"}<span>Een schatting is voldoende.</span></label><div className="input-unit"><input id="project-size" type="number" min={work.min} max={work.max} step="0.5" required value={size} onChange={(event) => setSize(event.target.value)} /><span>{work.unit}</span></div></div>
              <fieldset><legend>Welke afwerking past bij u?</legend><div className="finish-options">{finishOptions.map((option) => <label key={option.id} className={finish === option.id ? "selected" : ""}><input type="radio" name="finish" value={option.id} checked={finish === option.id} onChange={() => setFinish(option.id)} /><strong>{option.name}</strong><span>{option.description}</span></label>)}</div></fieldset>
              <label className="checkbox-row"><input type="checkbox" checked={structural} onChange={(event) => setStructural(event.target.checked)} /><span>Er moet een draagmuur worden aangepast of verwijderd.</span></label>
              <label className="permit-select" htmlFor="permit-status">Heeft u al een vergunning?<select id="permit-status" value={permit} onChange={(event) => setPermit(event.target.value as PermitStatus)}><option value="unknown">Dat weet ik nog niet / weet niet of het nodig is</option><option value="needed">Ik heb nog geen vergunning</option><option value="obtained">Ja, ik heb een vergunning</option></select></label>
            </form>}
            {step === 2 && estimate && <div className="estimate-result" aria-live="polite">
              <span className="result-label">UW PERSOONLIJKE PRIJSINDICATIE</span>
              <div className="result-price">{euro(estimate.low)} <span>–</span> {euro(estimate.high)}</div>
              <span className="result-vat">Inclusief btw, materiaal en arbeid</span>
              <div className="result-tags"><span>{work.short}</span><span>{size} {work.unit}</span><span>{finishOptions.find((item) => item.id === finish)?.name}</span>{structural && <span>Constructieve aanpassing</span>}</div>
              <p className="estimate-note">Een eerste rekenindicatie, geen definitieve offerte. Vergunningen, leges, tekeningen, constructieberekeningen en onvoorziene werkzaamheden vallen buiten deze bandbreedte.</p>
              <button className="button button-navy" onClick={downloadEstimate} disabled={downloading} aria-busy={downloading}><Icon name="download" size={18} /> {downloading ? "Uw pdf wordt gemaakt…" : "Download uw prijsindicatie (PDF)"}</button>
              {downloadError && <p className="error-notice" role="alert">{downloadError}</p>}
              {permit !== "obtained" && <div className="result-permit-card">
                <span className="result-permit-icon"><Icon name="shield" size={26} /></span>
                <div><h4>{permit === "needed" ? "Nog geen vergunning?" : "Heeft u een vergunning nodig?"}</h4><p>Ontdek wat er nodig is voor uw plannen en hoe u een aanvraag voorbereidt.</p></div>
                <button className="button button-bordeaux" onClick={() => onPermit(work.short)}>Start de vergunningcheck <Icon name="arrow" size={18} /></button>
              </div>}
            </div>}
          </div>
          <div className="calculator-bottom">{step > 0 ? <button className="back-link" onClick={() => goToStep(step - 1)}>← {step === 2 ? "Pas uw keuzes aan" : "Vorige stap"}</button> : <span><Icon name="lock" size={14} /> Zonder contactgegevens</span>}{step === 0 && <button className="button button-bordeaux" onClick={() => goToStep(1)}>Volgende stap <Icon name="arrow" size={18} /></button>}{step === 1 && <button className="button button-bordeaux" type="submit" form="details-form">Bereken mijn prijs <Icon name="arrow" size={18} /></button>}{step === 2 && <span className="result-finish"><Icon name="check" size={16} /> Een helder begin</span>}</div>
        </div>
        <aside className="calculator-aside"><span className="aside-icon"><Icon name="calculator" size={26} /></span><span className="mini-eyebrow">GOED BEGINNEN IS HALF GEBOUWD</span><h3>Uw plannen.<br />Onze expertise.<br /><span>Direct duidelijkheid.</span></h3><p>Geen lange wachttijd op een eerste prijs. Ontdek meteen wat er mogelijk is binnen uw budget.</p><div className="aside-checks"><span><Icon name="check" size={17} /> Direct een heldere bandbreedte</span><span><Icon name="check" size={17} /> Afgestemd op uw woonwensen</span><span><Icon name="check" size={17} /> Helemaal gratis en vrijblijvend</span></div><div className="aside-note"><Icon name="file" size={20} /><p>Een indicatie is het begin.<br /><strong>Een goed plan maken we samen.</strong></p></div></aside>
      </div>
      <p className="calculator-footnote">De berekening gebruikt voorlopige modeltarieven. Uw definitieve offerte volgt na een persoonlijke opname.</p>
    </div>
  </section>;
}
