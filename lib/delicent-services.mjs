// Shared service names keep the website, enquiry choices and validation aligned.
export const services = [
  {
    title: "Bouwkundige tekeningen",
    text: "Uw idee vertaald naar zorgvuldig tekenwerk. Van plattegrond en gevelaanzicht tot doorsnede en detail, voor een duidelijk uitgewerkt bouwplan.",
    tags: "Plattegronden · Gevels · Doorsneden",
    link: "Laat uw plan tekenen",
    deliverables: [
      "Plattegronden van de bestaande en nieuwe situatie",
      "Gevelaanzichten, doorsneden en maatvoering",
      "Details passend bij de afgesproken uitwerking",
    ],
  },
  {
    title: "Dakkapel",
    text: "Meer licht en ruimte op zolder. We verzorgen het tekenwerk voor uw dakkapel en begeleiden desgewenst de vergunningaanvraag.",
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
    text: "Extra woonruimte boven op uw woning. We werken uw dakopbouw bouwkundig uit en stemmen het tekenwerk, de berekeningen en de vergunningbegeleiding op elkaar af.",
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
    text: "Een constructieve onderbouwing voor uw bouwplan. We verzorgen de benodigde berekeningen en stemmen deze af op het ontwerp en de geplande ingrepen.",
    tags: "Draagconstructie · Berekeningen · Afstemming",
    link: "Vraag een constructieberekening aan",
    deliverables: [
      "De afgesproken onderdelen van de draagconstructie",
      "Uitgangspunten en resultaten in een berekeningsrapport",
      "Afstemming van de berekeningen met uw bouwtekeningen",
    ],
  },
  {
    title: "Daglicht- en ventilatieberekeningen",
    text: "Inzicht in daglicht en ventilatie voor uw ruimtes. We verzorgen de berekeningen als onderbouwing van uw bouwplan, afgestemd op de indeling en het gebruik.",
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
    text: "Overzicht in de regels en begeleiding bij uw omgevingsvergunning. We bereiden de aanvraag voor en stemmen de benodigde tekeningen en berekeningen met u af.",
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
