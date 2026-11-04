// Temporary contact details for the preview. Replace through the public settings.
export const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "020 000 0000";
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "info@bouwregieaanhuis.example";
export const phoneHref = `tel:${contactPhone.replace(/[^+\d]/g, "")}`;

export function quoteEmailHref(project?: string) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(project ? `Offerte voor ${project.toLowerCase()} — bouwregieaanhuis` : "Mijn verbouwplannen — vrijblijvende offerte")}`;
}
