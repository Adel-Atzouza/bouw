"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { downloadText, euro, type WorkId } from "@/lib/pricing";
import { answerText, bathroomAreas, buildSections, exportIntake, finishingRates, finishingServices, includes, outcomes, quantityFor, quantityModes, roomNames, value, visible, type Answers, type IntakeFiles } from "@/lib/intake";

function safeUrl(raw: string | undefined) {
  try { const url = new URL(raw ?? ""); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}
const bookingUrl = safeUrl(process.env.NEXT_PUBLIC_BOOKING_URL);
const showroomUrl = safeUrl(process.env.NEXT_PUBLIC_SHOWROOM_URL);
const contactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "") ? process.env.NEXT_PUBLIC_CONTACT_EMAIL : null;
const nextLabels = { site: "Opname op locatie nodig", review: "Uw dossier laten beoordelen", partner: "Eerst uw keuken uitzoeken", online: "Op afstand verder uitwerken" };
const priceItems: Record<WorkId, string[]> = {
  uitbouw: ["Oppervlakte en uitvoering", "Sloop en afvoer", "Fundering, geveldoorbraak en constructie", "Kozijnen, installaties en afwerking", "Bereikbaarheid en bouwplaats"],
  dakopbouw: ["Oppervlakte en bouwwijze", "Dakverwijdering en constructieve aanpassingen", "Trap en installaties", "Gevel, kozijnen en afwerking", "Hijs- en steigerwerk"],
  dakkapel: ["Type en breedte per dakkapel", "Kozijnen en buitenafwerking", "Binnenafwerking en extra's", "Verwijderen bestaande dakkapel", "Plaatsing en controle productiematen"],
  badkamer: ["Sloop en afvoer", "Ondergrondherstel, egalisatie en waterdichting", "Wand- en vloertegelwerk afzonderlijk", "Tegelformaat, patroon, nissen en details", "Sanitair en meubels: levering en montage apart", "Leidingen, elektra, ventilatie en plafond"],
  keuken: ["Keukenlevering volgens partner of leverancier", "Demonteren en afvoeren", "Water, afvoer, elektra en ventilatie", "Wanden, plafond en vloer", "Montage door bouwaanhuis óf de keukenleverancier"],
  afwerking: ["Hoeveelheid per ruimte en werkzaamheid", "Ondergrond en voorbereiding", "Gekozen materiaal en afwerking", "Bereikbaarheid en bescherming"],
  renovatie: ["Deelbegrotingen per ruimte", "Constructie en installaties", "Fasering en bewoning", "Bouwplaats, afvoer en begeleiding één keer"],
};

export function IntakeReview({ selected, answers, files, onEdit, onPermit, onContinue }: { selected: WorkId[]; answers: Answers; files: IntakeFiles; onContinue: () => void; onEdit: (id: string) => void; onPermit: (work: string) => void }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const sections = buildSections(selected, answers);
  const results = outcomes(selected, answers, files);
  const directSite = value(answers, "home.method") === "Ik wil direct een opname op locatie plannen";
  const areas = !directSite && results.some((result) => result.work === "badkamer") ? bathroomAreas(answers) : null;
  const needsSite = results.some((result) => result.next === "site");
  const needsPartner = results.some((result) => result.next === "partner") || value(answers, "contact.next") === "Ik wil een showroomafspraak";
  const needsPermit = results.some((result) => ["Ja, volgens de check is mogelijk een vergunning nodig", "Ja, maar de uitkomst is mij niet duidelijk"].includes(value(answers, `${result.work}.permit`)) && ["Ja, ik ontvang graag een voorstel", "Ik wil eerst weten wat hiervoor nodig is"].includes(value(answers, `${result.work}.permitSupport`))) || value(answers, "contact.next") === "Ik wil een voorstel voor vergunningbegeleiding";
  const subject = needsSite ? "Opname op locatie" : needsPartner ? "Showroomafspraak" : needsPermit ? "Voorstel vergunningbegeleiding" : "Beoordeling online opname";
  const decimal = (amount: number) => amount.toLocaleString("nl-NL", { maximumFractionDigits: 2 });
  async function downloadPdf() {
    setDownloading(true); setError("");
    try {
      const { createIntakePdf } = await import("@/lib/intake-pdf");
      await createIntakePdf(exportIntake(selected, answers, files)).save("bouwaanhuis-online-opname.pdf", { returnPromise: true });
    } catch { setError("De pdf kon niet worden gemaakt. Probeer opnieuw of download het tekstbestand."); }
    finally { setDownloading(false); }
  }
  return <div className="intake-review">
    <div className="intake-review-status"><Icon name="file" size={19} /><div><strong>Uw plannen staan klaar om te controleren</strong><p>Alles klopt? Ga dan verder naar versturen. U kunt uw antwoorden hieronder nog aanpassen. Onbekende gegevens bespreken we samen.</p></div></div>
    <div className="intake-outcomes">{results.map((result) => <article className="intake-outcome" key={result.work}>
      <span className="intake-outcome-label">{result.title}</span><h4>{nextLabels[result.next]}</h4>
      {result.estimate && <><div className="intake-budget">{euro(result.estimate.low)} <span>–</span> {euro(result.estimate.high)}</div><p className="intake-hint">{result.estimateNote}</p></>}
      {!result.estimate && <p className="intake-hint">{result.work === "afwerking" ? "Bekijk hieronder de hoeveelheden en prijsbasis per werkzaamheid." : "Een prijs volgt na aanvulling en calculatie van uw gekozen werkzaamheden."}</p>}
      <ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <details><summary>Zo wordt uw prijs opgebouwd</summary><ul>{priceItems[result.work].map((item) => <li key={item}>{item}</li>)}</ul></details>
      {["uitbouw", "dakopbouw", "dakkapel"].includes(result.work) && <div className="intake-permit-followup"><button className="text-link" onClick={() => onPermit(result.work)}><Icon name="shield" size={16} />Vergunningcheck en aanvraag voorbereiden</button>{value(answers, `${result.work}.permitConclusion`) && <p>{value(answers, `${result.work}.permitConclusion`)}</p>}</div>}
    </article>)}</div>
    {areas && <div className="intake-quantities"><h4>Badkamer · berekende oppervlakken</h4><dl><div><dt>Vloeroppervlakte</dt><dd>{decimal(areas.floor)} m²</dd></div><div><dt>Bruto wandtegelwerk</dt><dd>{areas.wall === null ? "Nog niet te berekenen" : `${decimal(areas.wall)} m²`}</dd></div><div><dt>Na aftrek van deuren en ramen</dt><dd>{areas.netWall === null ? "Maten nog te controleren" : `${decimal(areas.netWall)} m²`}</dd></div></dl><p className="intake-hint">Controleer deze hoeveelheden. Snijverlies voor de materiaalbestelling wordt apart bepaald. Een afwijkende vorm, douche of nis kan een aanvullende berekening vragen.</p></div>}
    {!directSite && results.some((result) => result.work === "afwerking") && <div className="intake-quantities"><h4>Binnenafwerking · hoeveelheden en prijsbasis</h4>
      <p className="intake-hint">De tarieven per werkzaamheid moeten nog worden vastgesteld. Uw hoeveelheden en keuzes vormen alvast de werkomschrijving; ontbrekende hoeveelheden of tarieven worden niet als € 0 gerekend.</p>
      {roomNames(answers).map((room, index) => <div className="intake-room-summary" key={index}><strong>{room || `Ruimte ${index + 1}`}</strong><dl>{finishingServices.filter((service) => includes(answers, `afwerking.${index}.work`, service)).map((service) => {
        const scope = `afwerking.${index}.${service}`;
        const quantity = quantityFor(answers, scope);
        const mode = value(answers, `${scope}.quantityMode`);
        const rate = finishingRates[service];
        return <div key={service}><dt>{service}<small>{mode === quantityModes[2] ? "Geschatte hoeveelheid" : mode === quantityModes[1] ? "Berekend uit uw maten" : "Volgens uw opgave"}</small></dt><dd>{quantity === null ? "Hoeveelheid onbekend" : `${decimal(quantity)} ${rate.unit}`}<small>{rate.rate === null ? `Tarief per ${rate.unit} volgt` : `${euro(rate.rate)} / ${rate.unit}${quantity === null ? "" : ` · indicatie ${euro(quantity * rate.rate)}`}`}</small></dd></div>;
      })}</dl><p className="intake-hint">Ondergrond, voorbereiding, materiaalkeuzes en bereikbaarheid worden afzonderlijk beoordeeld. Dezelfde plafondbewerking wordt één keer gecalculeerd.</p></div>)}
    </div>}
    <div className="intake-answer-summary"><h4>Controleer uw antwoorden</h4>{sections.map((section) => <details key={section.id}><summary>{section.title}</summary><button className="text-link" onClick={() => onEdit(section.id)}>Antwoorden aanpassen <Icon name="arrow" size={16} /></button><dl>{section.questions.filter((question) => visible(question, answers)).map((question) => <div key={question.id}><dt>{question.label}</dt><dd className={answerText(question, answers, files).startsWith("Nog niet") ? "is-missing" : ""}>{answerText(question, answers, files)}</dd></div>)}</dl></details>)}</div>
    <div className="intake-review-action"><div><span className="intake-outcome-label">KLAAR VOOR DE VOLGENDE STAP?</span><h4>Maak van uw plannen een goed begin.</h4><p>Deel uw wensen met ons. We bekijken uw aanvraag en bespreken samen hoe we u kunnen helpen.</p></div><button className="button button-bordeaux" onClick={onContinue}>Verder naar versturen <Icon name="arrow" size={18} /></button><span><Icon name="lock" size={14} /> Vrijblijvend · u verstuurt pas in de volgende stap</span></div>
    <details className="intake-other-options"><summary>Liever eerst downloaden of zelf een afspraak plannen?</summary><div className="intake-next"><h4>{needsSite ? "Samen inmeten en uw wensen bespreken" : needsPartner ? "Uw keuken kiezen bij de partner" : needsPermit ? "Hulp bij uw vergunningaanvraag" : "Van opname naar werkomschrijving en offerte"}</h4>
      {needsSite && (bookingUrl ? <><p>Bekijk de beschikbare tijden. Controleer het werkgebied, het bezoekadres, de duur en eventuele opnamekosten voordat u boekt. Uw afspraak is pas definitief na bevestiging.</p><a className="button button-bordeaux" href={bookingUrl} target="_blank" rel="noopener noreferrer">Plan een opname op locatie <Icon name="arrow-up" size={16} /></a><p className="intake-hint">De agenda opent apart. Neem uw dossier mee; de antwoorden worden niet automatisch naar de agenda verstuurd.</p></> : <p>Online tijdsloten zijn nog niet beschikbaar. Download uw dossier voor het maken van een locatieafspraak. Er is nog geen afspraak geboekt.</p>)}
      {needsPartner && (showroomUrl ? <a className="button button-bordeaux" href={showroomUrl} target="_blank" rel="noopener noreferrer">Plan een showroomafspraak <Icon name="arrow-up" size={16} /></a> : <p>Bewaar uw showroomwens in dit dossier. De online agenda van de keukenpartner is nog niet beschikbaar; er is geen showroomafspraak geboekt.</p>)}
      {needsPermit && <p>Uw voorkeur voor vergunningbegeleiding staat in het dossier. Een voorstel benoemt de benodigde tekeningen, berekeningen en begeleiding, met gemeentelijke kosten apart. Dit is nog geen opdracht of ingediende vergunningaanvraag.</p>}
      {!needsSite && !needsPartner && !needsPermit && <p>Download uw dossier om uw plannen te laten beoordelen. Voor binnenafwerking en een duidelijke badkamer- of keukenopname kan dit op afstand.</p>}
      <div className="intake-downloads"><button className="button button-bordeaux" disabled={downloading} onClick={downloadPdf}><Icon name="download" size={17} />{downloading ? "Uw pdf wordt gemaakt…" : "Download mijn dossier (PDF)"}</button><button className="text-link" onClick={() => downloadText("bouwaanhuis-online-opname.txt", exportIntake(selected, answers, files))}>Als tekstbestand</button></div>
      {contactEmail && <a className="button button-outline" href={`mailto:${contactEmail}?subject=${encodeURIComponent(`${subject} — bouwaanhuis`)}&body=${encodeURIComponent(`Beste bouwaanhuis,\n\nGraag bespreek ik mijn online opname met u.\nGewenst vervolg: ${subject}\nProjectadres: ${value(answers, "home.postcode")} ${value(answers, "home.number")}\nNaam: ${value(answers, "contact.name")}\nTelefoon: ${value(answers, "contact.phone")}\n\nIk voeg mijn gedownloade dossier en oorspronkelijke bijlagen toe.\n`)}`}>Open aanvraag in uw e-mailprogramma <Icon name="arrow" size={16} /></a>}
      <p className="intake-hint">Uw pdf bevat uw antwoorden en de namen van uw bijlagen. Voeg de oorspronkelijke foto&apos;s en documenten apart toe wanneer u het dossier deelt. Er wordt vanuit dit scherm niets automatisch verzonden.</p>
      {error && <p className="error-notice" role="alert">{error}</p>}
    </div></details>
  </div>;
}
