// Shared service names keep the website, enquiry choices and validation aligned.
export const services = [
  {
    title: "Bouwkundige tekeningen",
    text: "Plattegronden, gevels, doorsneden en details voor uw bouwplan.",
    tags: "Plattegronden · Gevels · Doorsneden · Details",
    link: "Laat uw plan tekenen",
    deliverables: [
      "Plattegronden van de bestaande en nieuwe situatie",
      "Gevelaanzichten, doorsneden en maatvoering",
      "Details passend bij de afgesproken uitwerking",
    ],
  },
  {
    title: "Dakkapel",
    text: "Tekenwerk en vergunningaanvraag voor dakkapellen.",
    tags: "Dakindeling · Aanzichten · Details",
    link: "Bespreek uw dakkapel",
    deliverables: [
      "De positie en afmetingen van uw dakkapel",
      "Dak- en gevelaanzichten van bestaand en nieuw",
      "Doorsneden en relevante aansluitdetails",
    ],
  },
  {
    title: "Dakopbouw",
    text: "Tekenwerk en vergunningaanvraag voor dakopbouwen.",
    tags: "Extra woonruimte · Tekenwerk · Onderbouwing",
    link: "Bespreek uw dakopbouw",
    deliverables: [
      "De indeling en aanzichten van de extra verdieping",
      "Doorsneden en aansluiting op de bestaande woning",
      "Afstemming van tekenwerk en constructieberekeningen",
    ],
  },
  {
    title: "Constructieberekeningen",
    text: "Sterkte-, belasting- en stabiliteitsberekeningen volgens de geldende normen.",
    tags: "Sterkte · Belasting · Stabiliteit",
    link: "Vraag een constructieberekening aan",
    deliverables: [
      "Sterkte-, belasting- en stabiliteitsberekeningen van de afgesproken constructieonderdelen",
      "Uitgangspunten en resultaten in een berekeningsrapport",
      "Afstemming van de berekeningen met uw bouwtekeningen",
    ],
  },
  {
    title: "Daglicht- en ventilatieberekeningen",
    text: "Berekeningen voor een gezond en comfortabel gebouw, afgestemd op de geldende bouwregels.",
    tags: "Daglicht · Ventilatie · Bouwkundige onderbouwing",
    link: "Bespreek uw berekeningen",
    deliverables: [
      "Een daglichtberekening voor de afgesproken ruimtes",
      "Een ventilatieberekening afgestemd op het gebruik",
      "Een rapportage met de gehanteerde uitgangspunten",
    ],
  },
  {
    title: "Vergunningbegeleiding",
    text: "Volledige begeleiding bij uw omgevingsvergunning, van voorbereiding tot afstemming over de aanvraag.",
    tags: "Omgevingsloket · Aanvraag · Begeleiding",
    link: "Hulp bij uw vergunning",
    deliverables: [
      "Inventarisatie van de benodigde aanvraagstukken",
      "Voorbereiding en begeleiding van de aanvraag",
      "Afstemming over vragen en eventuele aanvullingen",
    ],
  },
];

export const projectTypes = [
  ...services.map((service) => service.title),
  "Aanbouw of uitbouw",
  "Interne verbouwing",
  "Bijgebouw",
  "Anders / nog aan het oriënteren",
];
