"use client";

import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

function ExplanationHeading({ children }: { children?: ReactNode }) {
  return <h3>{children}</h3>;
}

export default function QuestionExplanation({ text }: { text: string }) {
  return <div className="help-content"><Markdown
    skipHtml
    allowedElements={["p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "ul", "ol", "li", "br", "blockquote", "a", "code", "pre", "hr"]}
    unwrapDisallowed
    remarkPlugins={[remarkBreaks]}
    components={{
      h1: ExplanationHeading,
      h2: ExplanationHeading,
      h3: ExplanationHeading,
      h4: ExplanationHeading,
      h5: ExplanationHeading,
      h6: ExplanationHeading,
      a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    }}
  >{text}</Markdown></div>;
}
