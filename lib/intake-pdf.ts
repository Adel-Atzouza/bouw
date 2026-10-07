import { jsPDF } from "jspdf";

export function createIntakePdf(content: string, received = false) {
  const document = new jsPDF({ unit: "mm", format: "a4", compress: true });
  document.setProperties({ title: "bouwaanhuis | Online opname", author: "bouwaanhuis", creator: "bouwaanhuis", subject: "Uw woonwensen, keuzes en prijsbasis" });
  document.setLanguage("nl");
  let y = 43;
  function header() {
    document.setFillColor("#7c3045"); document.rect(0, 0, 210, 31, "F");
    document.setTextColor("#ffffff"); document.setFont("helvetica", "bold"); document.setFontSize(21); document.text("bouwaanhuis", 18, 17);
    document.setFontSize(8); document.setFont("helvetica", "normal"); document.text("Uw online opname · Een goed begin voor uw verbouwing", 18, 25);
  }
  header();
  for (const paragraph of content.split("\n")) {
    const isTitle = paragraph.length > 0 && paragraph === paragraph.toUpperCase();
    document.setFont("helvetica", isTitle ? "bold" : "normal"); document.setFontSize(isTitle ? 10 : 9); document.setTextColor(isTitle ? "#7c3045" : "#172c3c");
    const lines: string[] = document.splitTextToSize(paragraph.replace(/\u00a0/g, " ").replace(/\u202f/g, " "), 174);
    for (const line of lines) {
      if (y > 276) { document.addPage(); header(); y = 43; document.setFont("helvetica", isTitle ? "bold" : "normal"); document.setFontSize(isTitle ? 10 : 9); document.setTextColor(isTitle ? "#7c3045" : "#172c3c"); }
      document.text(line, 18, y); y += 4.7;
    }
    if (!lines.length) y += 3;
  }
  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    document.setPage(page); document.setDrawColor("#e3e5e3"); document.line(18, 283, 192, 283);
    document.setFontSize(8); document.setTextColor("#626b70"); document.text(received ? "Aanvraag ontvangen · Vrijblijvend · Geen definitieve offerte" : "Concept · Nog niet verzonden of geboekt · Geen definitieve offerte", 18, 290); document.text(`${page} / ${pages}`, 192, 290, { align: "right" });
  }
  return document;
}
