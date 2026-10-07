"use client";

import { Icon } from "@/components/icon";
import { QuestionHelp } from "@/components/permit-question";
import { applicationWorks, checkIsComplete, type DsoAnsweredQuestion } from "@/lib/dso-flow";
import type { DsoMode, DsoResult } from "@/lib/dso";

const labels: Record<string, { label: string; tone: string }> = {
  Vergunningplicht: { label: "Vergunning aanvragen", tone: "action" },
  Meldingsplicht: { label: "Melding doen", tone: "action" },
  Informatieplicht: { label: "Informatie aanleveren", tone: "action" },
  Toestemmingsvrij: { label: "Geen toestemming nodig", tone: "clear" },
  NietVanToepassing: { label: "Niet van toepassing", tone: "neutral" },
  Verbod: { label: "Niet toegestaan", tone: "blocked" },
  NeemContactOpMet: { label: "Neem contact op", tone: "action" },
};

export default function PermitResults({ mode, result, history, testEnvironment, busy, onPrepare, onDownload, onRecheck, onDependencies }: {
  mode: DsoMode; result: DsoResult; history: DsoAnsweredQuestion[]; testEnvironment: boolean; busy: boolean;
  onPrepare: () => void; onDownload: () => void; onRecheck: () => void; onDependencies?: () => void;
}) {
  const complete = checkIsComplete(result, history);
  const skipped = history.filter((entry) => !entry.value.trim()).length;
  const actionable = applicationWorks(result.conclusions);
  return <div className="permit-outcome">
    <div className="permit-outcome-heading"><span><Icon name={mode === "check" && complete ? "check" : "file"} size={24} /></span><div><h3>{mode === "check" ? complete ? "Uw check is afgerond" : "Uw check vraagt nog aandacht" : "Uw vragen zijn doorlopen"}</h3><p>{mode === "check" ? "Hieronder ziet u per activiteit wat de officiële regels aangeven." : "De vragenlijst is beoordeeld. Hieronder ziet u wat nog nodig is."}{testEnvironment ? " Dit is een testuitkomst." : ""}</p></div></div>
    {skipped > 0 && <p className="error-notice">{skipped} vraag/vragen overgeslagen. Vul deze aan via ‘Uw bevestigde antwoorden’. Onbekende antwoorden tellen niet als ‘nee’.</p>}
    {result.hasMissingData && <div className="permit-status-note"><Icon name="shield" size={22} /><div><strong>Nog geen volledige beoordeling</strong><p>Voor een deel van uw plan ontbreken officiële gegevens of antwoorden uit gerelateerde werkzaamheden. Dit betekent niet dat u zonder vergunning mag bouwen.</p>{result.dependencies.length > 0 && onDependencies && <button className="text-link" disabled={busy} onClick={onDependencies}>Aanvullende officiële vragen ophalen <Icon name="arrow" size={16} /></button>}</div></div>}
    {result.notices.map((notice) => <p className="error-notice" key={notice}>{notice}</p>)}
    {mode === "check" && <div className="permit-result-cards">{result.conclusions.map((item, index) => {
      const presentation = labels[item.code ?? ""] ?? { label: "Beoordeling nodig", tone: "neutral" };
      return <article key={`${item.title}-${index}`} className={`permit-result-card ${presentation.tone}`}><span className="permit-result-badge">{presentation.label}</span><h3>{item.title}</h3><p>{item.text}</p>{item.warning && <p className="permit-result-warning">{item.warning}</p>}{Boolean(item.helpIds?.length) && <QuestionHelp ids={item.helpIds!} label="Uitleg van het Omgevingsloket" />}</article>;
    })}</div>}
    {mode === "check" && !result.conclusions.length && <p className="error-notice">Er is geen conclusie ontvangen. Controleer uw plan bij het Omgevingsloket of het bevoegd gezag.</p>}
    {mode === "application" && <><dl className="permit-readiness"><div><dt>Indieningsvereisten volgens DSO</dt><dd>{result.ready && !result.hasMissingData ? "Voldaan" : "Nog niet voldaan"}</dd></div><div><dt>Alle gegevens, ook optionele</dt><dd>{result.complete && !result.hasMissingData ? "Compleet" : "Nog open punten"}</dd></div><div><dt>Aanvraag verzonden</dt><dd>Nee</dd></div></dl><p className="permit-form-note">Een beoordeling van de vragenlijst is geen ontvangstbevestiging van een vergunningaanvraag.</p></>}
    {result.attachmentDetails.length > 0 && <div className="permit-document-list"><h3>Benodigde documenten</h3><p>Verzamel deze stukken voor uw aanvraag.</p><ul>{result.attachmentDetails.map((attachment) => <li key={attachment.key}><Icon name="file" size={20} /><div><strong>{attachment.title}</strong><span>{attachment.required ? "Verplicht" : "Optioneel"} · Nog niet meegestuurd</span>{attachment.helpIds.length > 0 && <QuestionHelp ids={attachment.helpIds} />}</div></li>)}</ul></div>}
    {mode === "check" && actionable.length > 0 && <div className="permit-next-step"><h3>Uw volgende stap</h3><p>Voor {actionable.length === 1 ? "deze activiteit" : "deze activiteiten"} kunt u een aanvraag, melding of informatieaanlevering voorbereiden. Rechtstreeks indienen via bouwaanhuis is nog niet aangesloten. Uw check blijft bewaard in dit venster.</p><button className="button button-bordeaux" disabled={busy} onClick={onPrepare}>Bereid mijn aanvraag voor <Icon name="arrow" size={18} /></button></div>}
    <div className="permit-modal-actions"><button className="button button-outline" disabled={busy} onClick={onDownload}><Icon name="download" size={17} /> Download mijn dossier</button><button className="back-link" disabled={busy} onClick={onRecheck}>{busy ? "Opnieuw controleren…" : "Opnieuw controleren"}</button></div>
    <details className="permit-external"><summary>{mode === "check" ? "Verder op de officiële website" : "Hoe kan ik mijn aanvraag nu indienen?"}</summary><p>{mode === "application" ? "Open het Omgevingsloket en log daar in om uw aanvraag in te dienen. Gebruik uw gedownloade dossier om de antwoorden over te nemen. Dit opent een nieuwe sessie: antwoorden en bijlagen worden niet automatisch overgezet." : "U kunt uw volledige plan ook in het Omgevingsloket controleren. Dit opent een nieuwe sessie; uw antwoorden uit bouwaanhuis worden niet overgenomen."}</p><a className="button button-outline" href={`https://omgevingswet.overheid.nl/${mode === "check" ? "checken" : "aanvragen"}`} target="_blank" rel="noopener noreferrer">Open het Omgevingsloket <Icon name="arrow-up" size={17} /></a></details>
    <p className="permit-form-note">Deze uitkomst geldt voor de gekozen werkzaamheden en werklocatie. Neem ook andere werkzaamheden en eventuele voorbehouden mee in uw plan.</p>
  </div>;
}
