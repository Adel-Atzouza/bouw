"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { supportedIntakeFile } from "@/lib/intake-submission";
import { toggleOption, type Answer, type Question } from "@/lib/intake";

export function IntakeQuestion({ question, answer, files = [], onChange, onFiles, onRemoveRoom, number }: {
  number?: number; question: Question; answer?: Answer; files?: File[]; onChange: (value: Answer) => void; onFiles: (files: File[]) => void; onRemoveRoom?: (index: number) => void;
}) {
  const [fileError, setFileError] = useState("");
  const selected = Array.isArray(answer) ? answer : [];
  const text = typeof answer === "string" ? answer : "";
  const hintId = `${question.id}-hint`;
  return <fieldset className="intake-question" aria-describedby={question.hint ? hintId : undefined}>
    <legend>{number && <span className="intake-question-number" aria-hidden="true">{number.toString().padStart(2, "0")}</span>}{question.label}<span className="intake-optional">{question.required ? "Verplicht" : "Optioneel"}</span></legend>
    {question.hint && <p className="intake-hint" id={hintId}>{question.hint}</p>}
    {(question.type === "choice" || question.type === "multi") && <>
      <span className="intake-choice-hint">{question.type === "multi" ? "Meerdere antwoorden mogelijk" : "Kies één antwoord"}</span>
      <div className={`intake-options ${question.options?.every((option) => option.length < 48) ? "intake-options-compact" : ""}`}>{question.options?.map((option) => <label key={option} className={(question.type === "multi" ? selected.includes(option) : text === option) ? "is-selected" : ""}>
        <input type={question.type === "multi" ? "checkbox" : "radio"} name={question.id} value={option} checked={question.type === "multi" ? selected.includes(option) : text === option} required={question.required && question.type === "choice"} onChange={() => onChange(question.type === "multi" ? toggleOption(question, selected, option) : option)} /><span>{option}</span>
      </label>)}</div>
    </>}
    {(question.type === "number" || question.type === "text") && <div className="intake-input-wrap">
      <input id={question.id} aria-label={question.label} aria-describedby={question.hint ? hintId : undefined} type={question.type === "number" ? "number" : question.inputType ?? "text"} inputMode={question.type === "number" ? "decimal" : undefined} min={question.min} max={question.max} step={question.step} pattern={question.pattern} autoComplete={question.autoComplete} required={question.required} maxLength={500} value={text} onChange={(event) => onChange(event.target.value)} />{question.unit && <span>{question.unit}</span>}
    </div>}
    {question.type === "textarea" && <textarea id={question.id} aria-label={question.label} aria-describedby={question.hint ? hintId : undefined} rows={4} maxLength={4000} value={text} onChange={(event) => onChange(event.target.value)} />}
    {question.type === "rooms" && <div className="intake-rooms">
      {selected.map((room, index) => <div className="intake-room" key={index}><label>Ruimte {index + 1}<input aria-label={`Naam ruimte ${index + 1}`} value={room} maxLength={80} placeholder="Bijvoorbeeld woonkamer" onChange={(event) => onChange(selected.map((name, i) => i === index ? event.target.value : name))} /></label><button type="button" className="back-link" aria-label={`Verwijder ruimte ${index + 1}`} onClick={() => onRemoveRoom?.(index)}><Icon name="close" size={18} /></button></div>)}
      <div className="intake-room-suggestions">{["Woonkamer", "Keuken", "Slaapkamer", "Hal", "Zolder"].map((room) => <button className="button button-outline" type="button" key={room} disabled={selected.length >= 20} onClick={() => onChange([...selected, room])}><Icon name="plus" size={14} />{room}</button>)}</div>
      <button type="button" className="text-link" disabled={selected.length >= 20} onClick={() => onChange([...selected, ""])}><Icon name="plus" size={17} />Andere ruimte toevoegen</button>
    </div>}
    {question.type === "upload" && <div className="intake-upload">
      <label className="intake-upload-button"><Icon name="plus" size={20} /><span>Foto&apos;s of bestanden toevoegen<small>Maximaal 20 MB per bestand · foto&apos;s en PDF</small></span><input aria-label={question.label} type="file" accept={question.accept} multiple onChange={(event) => {
        const added = [...(event.target.files ?? [])];
        if (added.some((file) => file.size > 20 * 1024 * 1024)) { setFileError("Een bestand is groter dan 20 MB. Kies een kleiner bestand."); event.target.value = ""; return; }
        if (added.some((file) => !supportedIntakeFile(file))) { setFileError("Voeg een foto of PDF toe."); event.target.value = ""; return; }
        setFileError(""); onFiles([...files, ...added.filter((file) => !files.some((old) => old.name === file.name && old.size === file.size && old.lastModified === file.lastModified))]); event.target.value = "";
      }} /></label>
      {files.length > 0 && <ul className="intake-file-list">{files.map((file, index) => <li key={`${file.name}-${index}`}><Icon name="file" size={16} /><span>{file.name}<small>{(file.size / 1024 / 1024).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} MB</small></span><button type="button" className="back-link" aria-label={`Verwijder ${file.name}`} onClick={() => onFiles(files.filter((_, i) => i !== index))}><Icon name="close" size={16} /></button></li>)}</ul>}
      {fileError && <p className="error-notice" role="alert">{fileError}</p>}
    </div>}
  </fieldset>;
}

export function MeasureHelp() {
  return <details className="intake-measure"><summary><Icon name="ruler" size={17} />Hulp bij het meten</summary><div>
    <svg viewBox="0 0 270 145" role="img" aria-label="Rechthoekige ruimte met breedte horizontaal en lengte verticaal"><rect x="58" y="32" width="164" height="78" rx="2" fill="#f5eff0" stroke="#7c3045" strokeWidth="2" /><path d="M58 21h164M58 16v10m164-10v10M43 32v78m-5-78h10m-10 78h10" stroke="#7c3045" strokeWidth="1.5" /><text x="140" y="13" textAnchor="middle" fill="currentColor" fontSize="11">Breedte (A / C)</text><text x="27" y="75" textAnchor="middle" fill="currentColor" fontSize="11" transform="rotate(-90 27 75)">Lengte (B / D)</text><text x="140" y="78" textAnchor="middle" fill="currentColor" fontSize="12">lengte × breedte = m²</text></svg>
    <p>Meet op een veilig bereikbare plek, van wand tot wand. De hoogte is van vloer tot plafond. Weet u een maat niet? Laat het veld leeg of kies hulp bij de opname.</p></div></details>;
}
