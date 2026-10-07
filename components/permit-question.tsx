"use client";

import { useState, type Ref } from "react";
import dynamic from "next/dynamic";
import { selectedDsoOptions } from "@/lib/dso-flow";
import { requestDso } from "@/lib/dso-client";
import type { DsoQuestion } from "@/lib/dso";
const QuestionExplanation = dynamic(() => import("@/components/question-explanation"), { loading: () => <p role="status">Toelichting ophalen…</p> });

export function QuestionHelp({ ids, label = "Toelichting bij deze vraag" }: { ids: number[]; label?: string }) {
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

export function QuestionField({ question, value, onChange, disabled, focusRef }: { question: DsoQuestion; value: string; onChange: (value: string) => void; disabled?: boolean; focusRef?: Ref<HTMLFieldSetElement> }) {
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

