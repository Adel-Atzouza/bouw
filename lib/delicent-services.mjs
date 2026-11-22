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
      "Afstemming van tekenwerk en eventuele aanvullende stukken",
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

export const packages = [
  {
    title: "Tekeningen & vergunningaanvraag",
    label: "Compleet pakket",
    text: "Wij maken de bouwkundige tekeningen en verzorgen daarna de vergunningaanvraag voor uw plan.",
    included: [
      "Bouwkundige tekeningen voor uw aanvraag",
      "Voorbereiding en indiening van de vergunningaanvraag",
      "Afstemming over aanvullende stukken",
    ],
    note: "De gemeentelijke leges en eventuele externe berekeningen worden vooraf apart benoemd.",
  },
  {
    title: "Alleen bouwtekeningen",
    label: "Tekenpakket",
    text: "U ontvangt alleen de bouwtekeningen. Wordt uw aanvraag daarna niet geaccepteerd en ontvangt u feedback van het Omgevingsloket? Dan verwerken wij die feedback binnen de afgesproken scope kosteloos.",
    included: [
      "Bouwkundige tekeningen van uw plan",
      "Duidelijke oplevering voor uw eigen aanvraag",
      "Eén kosteloze verwerkingsronde op feedback van het Omgevingsloket",
    ],
    note: "De kosteloze ronde geldt voor feedback op het geleverde tekenpakket; nieuwe wensen of wijzigingen vallen buiten de afgesproken scope.",
  },
  {
    title: "Vergunning met eigen bouwtekening",
    label: "Aanvraagservice",
    text: "U heeft al een eigen bouwtekening en wij verzorgen de vergunningaanvraag. Als de tekening niet geschikt is voor indiening, bespreken we eerst de benodigde aanpassingen en de extra kosten.",
    included: [
      "Controle van uw aangeleverde bouwtekening",
      "Voorbereiding en indiening van de vergunningaanvraag",
      "Afstemming over ontbrekende aanvraagstukken",
    ],
    note: "Aanpassingen aan een onvolledige of ongeschikte bouwtekening worden apart geoffreerd en alleen na uw akkoord uitgevoerd.",
  },
];

export const projectTypes = [
  ...services.map((service) => service.title),
  ...packages.map((item) => item.title),
  "Aanbouw of uitbouw",
  "Interne verbouwing",
  "Bijgebouw",
  "Anders / nog aan het oriënteren",
];
