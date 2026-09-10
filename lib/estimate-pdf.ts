import { jsPDF } from "jspdf";
import { calculateEstimate, euro, finishOptions, workTypes, type Finish, type PermitStatus, type WorkId } from "@/lib/pricing";

type EstimatePdfOptions = {
  workId: WorkId;
  size: number;
  finish: Finish;
  structural: boolean;
  permit: PermitStatus;
};

export function createEstimatePdf(options: EstimatePdfOptions) {
  const { workId, size, finish, structural, permit } = options;
  const estimate = calculateEstimate(workId, size, finish, structural);
  const work = workTypes.find((item) => item.id === workId)!;
  const finishOption = finishOptions.find((item) => item.id === finish)!;
  const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const navy = "#172c3c";
  const bordeaux = "#7c3045";
  const muted = "#626b70";
  const light = "#f4f5f3";
  const margin = 18;
  const contentWidth = 174;
  const date = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  document.setProperties({
    title: `Plan Bouw | Prijsindicatie ${work.name}`,
    subject: "Uw persoonlijke, vrijblijvende prijsindicatie voor uw verbouwing",
    author: "Plan Bouw",
    creator: "Plan Bouw",
    keywords: "verbouwing, prijsindicatie, Plan Bouw",
  });
  document.setLanguage("nl");
  document.setDisplayMode("fullwidth");
  document.setLineHeightFactor(1.45);

  function text(content: string, left: number, top: number, fontSize: number, color = navy, bold = false) {
    document.setFont("helvetica", bold ? "bold" : "normal");
    document.setFontSize(fontSize);
    document.setTextColor(color);
    document.text(content, left, top);
  }

  function paragraph(content: string, left: number, top: number, width: number, fontSize = 9, color = muted) {
    document.setFont("helvetica", "normal");
    document.setFontSize(fontSize);
    document.setTextColor(color);
    document.text(document.splitTextToSize(content, width), left, top);
  }

  document.setFillColor(navy);
  document.rect(0, 0, 210, 40, "F");
  document.setDrawColor("#ffffff");
  document.setLineWidth(0.6);
  document.lines([[0, -8], [6, -4], [6, 4], [0, 8], [-5, 0], [0, -5], [-3, 0], [0, 5], [-4, 0]], margin, 25);
  document.line(25, 20, 30, 20);
  text("plan", 35, 24, 25, "#ffffff", true);
  text("bouw", 53.7, 24, 25, "#ffffff");
  text(".", 74.4, 24, 25, "#d6a7b6", true);
  text("Een goed plan. Een beter thuis.", margin, 33, 8, "#d9e1e6");
  text("UW PERSOONLIJKE PRIJSINDICATIE", 130, 17, 7.5, "#d9e1e6");
  text(date, 130, 25, 10, "#ffffff");

  text("Uw verbouwplan.", margin, 56, 27, navy, true);
  paragraph("Van woonwens naar een helder begin. Dit zijn de mogelijkheden op basis van uw keuzes.", margin, 65, contentWidth, 10);

  document.setFillColor(bordeaux);
  document.roundedRect(margin, 76, contentWidth, 41, 2, 2, "F");
  text("DE GESCHATTE INVESTERING", 25, 86, 8, "#f0dfe5", true);
  const priceRange = `${euro(estimate.low)} – ${euro(estimate.high)}`.replace(/\u00a0/g, " ");
  let priceFontSize = 32;
  document.setFont("helvetica", "bold");
  document.setFontSize(priceFontSize);
  while (document.getTextWidth(priceRange) > contentWidth - 14) {
    document.setFontSize(--priceFontSize);
  }
  text(priceRange, 25, 103, priceFontSize, "#ffffff", true);
  text("Inclusief btw, materiaal en arbeid · Gratis en vrijblijvend", 25, 112, 9, "#f0dfe5");

  text("01", margin, 132, 9, bordeaux, true);
  text("Uw woonwensen", 27, 132, 13, navy, true);
  const rows = [
    ["Werkzaamheden", work.name],
    [workId === "dakkapel" ? "Breedte" : "Oppervlakte", `${new Intl.NumberFormat("nl-NL").format(size)} ${work.unit}`],
    ["Afwerkingsniveau", `${finishOption.name} · ${finishOption.description}`],
    ["Constructieve aanpassing", structural ? "Ja, een draagmuur aanpassen of verwijderen" : "Niet opgenomen in deze berekening"],
  ];
  rows.forEach(([label, value], index) => {
    const rowTop = 139 + index * 12;
    if (index % 2 === 0) {
      document.setFillColor(light);
      document.rect(margin, rowTop, contentWidth, 12, "F");
    }
    text(label, 22, rowTop + 7.5, 9, muted);
    text(value, 83, rowTop + 7.5, 9, navy, true);
  });

  text("In deze indicatie", margin, 200, 10, navy, true);
  paragraph("Materiaal, arbeid en btw voor de gekozen omvang en afwerking. Een constructietoeslag als u die heeft geselecteerd.", margin, 207, 78, 9);
  text("Niet inbegrepen", 110, 200, 10, navy, true);
  paragraph("Vergunningen en leges, tekeningen, constructieberekeningen, asbestsanering en onvoorziene gebreken of werkzaamheden.", 110, 207, 82, 9);

  document.setFillColor("#f5eff0");
  document.roundedRect(margin, 232, contentWidth, 33, 2, 2, "F");
  document.setFillColor(bordeaux);
  document.rect(margin, 234, 1, 29, "F");
  const permitTitle = permit === "obtained" ? "Vergunning aanwezig volgens uw opgave" : permit === "needed" ? "Nog geen vergunning? Dit is uw volgende stap." : "Vergunning nodig? Controleer uw plannen.";
  text(permitTitle, 25, 242, 11, bordeaux, true);
  paragraph(permit === "obtained"
    ? "Controleer of uw vergunning de gekozen werkzaamheden dekt. Er is via Plan Bouw geen aanvraag ingediend."
    : "De prijsberekening bepaalt niet of u een vergunning nodig heeft. Controleer uw locatie en werkzaamheden in het Omgevingsloket.", 25, 249, 159, 8.5);
  document.setFontSize(8.5);
  document.setTextColor(bordeaux);
  document.setFont("helvetica", "bold");
  document.textWithLink("Open de officiële Vergunningcheck", 25, 260, { url: "https://omgevingswet.overheid.nl/checken" });
  document.setDrawColor(bordeaux);
  document.setLineWidth(0.2);
  document.line(25, 261, 25 + document.getTextWidth("Open de officiële Vergunningcheck"), 261);

  paragraph("Vrijblijvende rekenindicatie op basis van voorlopige modeltarieven; geen offerte. De definitieve prijs volgt na een persoonlijke opname en uitwerking van uw materiaalkeuzes en werkzaamheden.", margin, 275, contentWidth, 7.5);
  document.setDrawColor("#e3e5e3");
  document.line(margin, 285, 192, 285);
  text("PLAN BOUW", margin, 291, 7, navy, true);
  text("Gebouwd rondom uw woonwensen.", 77, 291, 7, muted);
  text("01 / 01", 182, 291, 7, muted);

  return document;
}
