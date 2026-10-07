import { calculateEstimate, euro, workTypes, type WorkId } from "./pricing";

export type Answer = string | string[];
export type Answers = Record<string, Answer>;
export type IntakeFiles = Record<string, File[]>;
export type Condition = { id: string; values: string[]; not?: boolean };
export type Question = {
  id: string;
  label: string;
  type: "choice" | "multi" | "number" | "text" | "textarea" | "upload" | "rooms";
  options?: string[];
  exclusive?: string[];
  excludes?: Record<string, string[]>;
  when?: Condition[];
  unit?: string;
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  accept?: string;
  inputType?: "email" | "tel";
  pattern?: string;
  autoComplete?: string;
};
export type IntakeSection = { id: string; work?: WorkId; title: string; questions: Question[]; hint?: string };
export type IntakeDraft = { version: 1; selected: WorkId[]; answers: Answers; files: IntakeFiles; sectionId: string; savedAt: string };
export const unknown = "Weet ik niet";
const advice = "Ik ontvang graag advies";
const later = "Nog te bepalen";
const ownSizes = "Ik vul de maten in";
const planSizes = "Ik upload een tekening met maten";
const helpSizes = "Ik wil hulp bij het opnemen";
const q = (id: string, label: string, options: string[], extra: Partial<Question> = {}): Question => ({ id, label, type: "choice", options, ...extra });
const m = (id: string, label: string, options: string[], extra: Partial<Question> = {}): Question => q(id, label, options, { type: "multi", ...extra });
const n = (id: string, label: string, unit = "meter", extra: Partial<Question> = {}): Question => ({ id, label, type: "number", unit, min: 0.01, max: 1000, step: "any", ...extra });
const t = (id: string, label: string, extra: Partial<Question> = {}): Question => ({ id, label, type: "text", ...extra });
const u = (id: string, label: string, hint: string, extra: Partial<Question> = {}): Question => ({ id, label, type: "upload", hint, accept: "image/*,.pdf", ...extra });
const when = (question: Question, id: string, ...values: string[]): Question => ({ ...question, when: [...(question.when ?? []), { id, values }] });
const section = (scope: string, id: string, title: string, questions: Question[], work?: WorkId, hint?: string): IntakeSection => {
  // A child follows its parent's conditions too, including when an old answer is retained for later editing.
  function conditions(question: Question, visited = new Set<string>()): Condition[] {
    if (visited.has(question.id)) return [];
    const seen = new Set([...visited, question.id]);
    return (question.when ?? []).flatMap((condition) => {
      const parent = questions.find((candidate) => candidate.id === condition.id);
      return [condition, ...(parent ? conditions(parent, seen) : [])];
    });
  }
  return { id: `${scope}.${id}`, title, work, hint, questions: questions.map((question) => ({ ...question, id: `${scope}.${question.id}`, when: conditions(question).map((condition) => ({ ...condition, id: `${scope}.${condition.id}` })) })) };
};
export function value(answers: Answers, id: string): string { return typeof answers[id] === "string" ? answers[id] as string : ""; }
export function values(answers: Answers, id: string): string[] { return Array.isArray(answers[id]) ? answers[id] as string[] : []; }
export function includes(answers: Answers, id: string, option: string) { return value(answers, id) === option || values(answers, id).includes(option); }
export function visible(question: Question, answers: Answers) { return (question.when ?? []).every((condition) => condition.not ? !condition.values.some((v) => includes(answers, condition.id, v)) : condition.values.some((v) => includes(answers, condition.id, v))); }
export function isExclusive(question: Question, option: string) {
  return question.exclusive?.includes(option) || /^(Geen |Geen$|Weet ik niet$|Nog |Dat |Ik (ontvang|heb.*niet|heb hulp|kan geen)|Advies |De ruimte is al leeg)/.test(option);
}
export function toggleOption(question: Question, selected: string[], option: string): string[] {
  if (selected.includes(option)) return selected.filter((item) => item !== option);
  if (isExclusive(question, option)) return [option];
  return [...selected.filter((item) => !isExclusive(question, item) && !question.excludes?.[option]?.includes(item) && !question.excludes?.[item]?.includes(option)), option];
}
export function positive(answers: Answers, id: string): number | null {
  const raw = value(answers, id).trim();
  const number = Number(raw.replace(",", "."));
  return raw && Number.isFinite(number) && number > 0 ? number : null;
}

const permitQuestions = [
  q("permit", "Heeft u al een vergunningcheck gedaan voor deze verbouwing?", ["Nee, ik wil de vergunningcheck starten", "Ja, volgens de check is geen vergunning nodig", "Ja, volgens de check is mogelijk een vergunning nodig", "Ja, maar de uitkomst is mij niet duidelijk", "De vergunningaanvraag loopt al", "De vergunning is al verleend"]),
  when(q("permitDocuments", "Heeft u de uitkomst of documenten beschikbaar?", ["Ja, ik upload deze", "Nee, ik voeg deze later toe", "Nee, ik wil dat jullie dit met mij bekijken"]), "permit", "Ja, volgens de check is geen vergunning nodig", "Ja, volgens de check is mogelijk een vergunning nodig", "Ja, maar de uitkomst is mij niet duidelijk", "De vergunningaanvraag loopt al", "De vergunning is al verleend"),
  when(u("permitFiles", "Voeg uw vergunningstukken toe", "Een rapport, tekening, besluit of uitkomst van de check."), "permitDocuments", "Ja, ik upload deze"),
  when(q("permitSupport", "Wilt u dat bouwaanhuis de vergunningaanvraag voor u verzorgt?", ["Ja, ik ontvang graag een voorstel", "Ik wil eerst weten wat hiervoor nodig is", "Nee, ik regel dit zelf of via een andere partij"]), "permit", "Ja, volgens de check is mogelijk een vergunning nodig", "Ja, maar de uitkomst is mij niet duidelijk"),
];
const sizeQuestions = (depth = true, height = false): Question[] => [
  q("sizeMode", "Heeft u afmetingen of een plattegrond?", [ownSizes, planSizes, helpSizes]),
  when(n("width", depth ? "Breedte" : "Gewenste of bestaande breedte"), "sizeMode", ownSizes),
  ...(depth ? [when(n("depth", "Lengte / diepte"), "sizeMode", ownSizes)] : []),
  ...(height ? [when(n("height", "Hoogte"), "sizeMode", ownSizes)] : []),
  when(u("plan", "Tekening met maten", "Voeg een plattegrond of een duidelijke schets met maten toe."), "sizeMode", planSizes),
];
const finishQuestion = q("finish", "Hoe wilt u het laten opleveren?", ["Wind- en waterdicht, zonder binnenafwerking", "Met wanden en installaties, klaar voor verdere afwerking", "Volledig afgewerkt", advice]);
const priceFinish = q("quality", "Welk afwerkingsniveau past bij u?", ["Basis — mooi en praktisch", "Comfort — net dat beetje extra", "Luxe — hoogwaardig en op maat", advice]);

export const housingSection = section("home", "address", "Uw woning en planning", [
  t("postcode", "Postcode", { pattern: "[1-9][0-9]{3}\\s?[a-zA-Z]{2}", autoComplete: "postal-code", hint: "Bijvoorbeeld 1234 AB. U mag dit later aanvullen." }),
  t("number", "Huisnummer en toevoeging", { hint: "Bijvoorbeeld 12 A." }),
  q("type", "Wat voor woning heeft u?", ["Tussenwoning", "Hoekwoning", "Twee-onder-een-kapwoning", "Vrijstaande woning", "Appartement", "Anders", unknown]),
  when(t("otherType", "Wat voor woning is het?"), "type", "Anders"),
  t("goal", "Wat wilt u bereiken?", { type: "textarea", hint: "Vertel kort over uw plannen. Dit is optioneel." }),
  q("timing", "Wanneer wilt u de werkzaamheden laten uitvoeren?", ["Zo snel mogelijk", "Binnen 3 maanden", "Over 3 tot 6 maanden", "Over meer dan 6 maanden", "Ik ben mij nog aan het oriënteren"]),
  q("method", "Hoe wilt u uw plannen met ons delen?", ["Ik vul de online opname in", "Ik wil direct een opname op locatie plannen"], { required: true }),
]);

function extensionSections(): IntakeSection[] {
  const s = (id: string, title: string, questions: Question[]) => section("uitbouw", id, title, questions, "uitbouw");
  return [
    s("wish", "Aanbouw of uitbouw · uw wensen", [
      q("task", "Wat wilt u laten doen?", ["Een nieuwe aanbouw of uitbouw plaatsen", "Een bestaande aanbouw of uitbouw vergroten", "Een bestaande aanbouw of uitbouw vervangen", "Ik wil advies over de mogelijkheden"]),
      m("side", "Aan welke kant van de woning wilt u uitbreiden?", ["Achterzijde", "Zijkant", "Voorzijde", "Dat wil ik samen bepalen"]),
      m("use", "Waarvoor wilt u de nieuwe ruimte gebruiken?", ["Grotere woonkamer", "Grotere keuken", "Slaapkamer", "Badkamer", "Werkkamer", "Bijkeuken of berging", "Anders", "Nog niet bekend"]),
      when(t("otherUse", "Waarvoor wilt u de ruimte gebruiken?"), "use", "Anders"),
    ]),
    s("permit", "Aanbouw of uitbouw · vergunning", permitQuestions),
    s("sizes", "Aanbouw of uitbouw · afmetingen", sizeQuestions()),
    s("situation", "Aanbouw of uitbouw · bestaande situatie", [
      m("existing", "Wat staat er momenteel op deze plek?", ["Tuin of bestrating", "Een bestaande aanbouw", "Een overkapping of veranda", "Een schuur of berging", "Anders", unknown]),
      when(t("otherExisting", "Wat staat er op deze plek?"), "existing", "Anders"),
      q("opening", "Hoe wilt u de uitbreiding verbinden met de woning?", ["Via een bestaande deur of opening", "Door een bestaande opening te vergroten", "Door een groot deel van de gevel te openen", "Dat wil ik met jullie bespreken"]),
      q("access", "Hoe is de werkplek bereikbaar?", ["Via een achterom of zijpad", "Alleen via de woning", "Via een aangrenzend terrein, na overleg", unknown]),
    ]),
    s("finish", "Aanbouw of uitbouw · uitvoering", [finishQuestion, priceFinish,
      q("facade", "Welke buitenafwerking heeft uw voorkeur?", ["Metselwerk passend bij de woning", "Houten gevelbekleding", "Andere gevelbekleding", "Pleisterwerk", advice]),
      m("windows", "Welke gevelopeningen wilt u?", ["Ramen", "Enkele deur", "Openslaande deuren", "Schuifpui", later]),
      q("rooflight", "Wilt u extra daglicht via het dak?", ["Nee", "Een daklicht of lichtkoepel", "Een lichtstraat", later]),
      m("utilities", "Welke voorzieningen wilt u in de uitbreiding?", ["Stopcontacten en verlichting", "Radiator(en)", "Vloerverwarming", "Water en afvoer voor een keuken", "Water en afvoer voor een badkamer", "Advies over de benodigde voorzieningen"]),
    ]),
    s("photos", "Aanbouw of uitbouw · foto's en tekeningen", [
      u("facadePhotos", "Foto van de bestaande gevel", "Neem de hele gevel in beeld, vanaf de tuin of straat."),
      u("sitePhotos", "Foto van de tuin of bouwlocatie", "Laat ook de bereikbaarheid en wat er nu staat zien."),
      u("insidePhotos", "Foto van de binnenzijde bij de uitbreiding", "Laat de wand of gevel zien die u wilt openen."),
      u("documents", "Aanvullende tekeningen en constructiegegevens", "Bestaande plattegrond, gewenst ontwerp of constructieberekening, indien beschikbaar."),
      q("photoHelp", "Lukt het om deze informatie aan te leveren?", ["Ja", "Ik voeg later meer toe", "Ik heb deze informatie niet beschikbaar"]),
    ]),
  ];
}

function rooftopSections(): IntakeSection[] {
  const s = (id: string, title: string, questions: Question[]) => section("dakopbouw", id, title, questions, "dakopbouw");
  return [
    s("wish", "Dakopbouw · uw wensen", [
      q("task", "Wat wilt u realiseren?", ["Een volledige extra verdieping", "Een gedeeltelijke extra verdieping", "Een bestaande dakopbouw vergroten of vervangen", "Ik wil advies over wat mogelijk is"]),
      q("roof", "Wat voor dak heeft uw woning nu?", ["Plat dak", "Schuin dak", "Een combinatie", unknown]),
      m("rooms", "Welke ruimtes wilt u in de opbouw?", ["Slaapkamer(s)", "Badkamer", "Werkkamer", "Wasruimte", "Bergruimte", "Anders", later]),
      when(q("bedrooms", "Hoeveel slaapkamers wilt u?", ["1", "2", "3 of meer", later]), "rooms", "Slaapkamer(s)"),
      when(t("otherRooms", "Welke andere ruimtes wilt u?"), "rooms", "Anders"),
    ]),
    s("permit", "Dakopbouw · vergunning", permitQuestions),
    s("sizes", "Dakopbouw · afmetingen en toegang", [...sizeQuestions(), q("stairs", "Hoe wilt u de nieuwe verdieping bereiken?", ["Een bestaande vaste trap verlengen", "Een nieuwe vaste trap laten plaatsen", "Dat moet nog worden onderzocht"])]),
    s("finish", "Dakopbouw · uitvoering", [finishQuestion, priceFinish,
      q("facade", "Welke gevelafwerking spreekt u aan?", ["Hout", "Onderhoudsarme gevelpanelen", "Metaal, bijvoorbeeld zink", "Afwerking passend bij de bestaande woning", "Nog geen voorkeur"]),
      m("extras", "Welke aanvullende werkzaamheden verwacht u?", ["Badkamer aanleggen", "Verwarming aanleggen", "Elektra en verlichting", "Zonnepanelen verplaatsen", "Bestaande verdieping aanpassen rond de trap", "Nog niet bekend"]),
    ]),
    s("photos", "Dakopbouw · foto's en tekeningen", [
      u("outsidePhotos", "Foto's van de buitenkant", "Fotografeer vanaf de grond of een veilig bereikbare plek. Ga niet zelf het dak op."),
      u("insidePhotos", "Foto's van de bovenste verdieping", "Breng de ruimte en de trap in beeld."),
      u("documents", "Plattegronden, constructietekeningen of ontwerp", "Alle beschikbare stukken mogen mee. Onbekende gegevens kunt u later aanvullen."),
      q("photoHelp", "Heeft u hulp nodig bij de opname?", ["Nee, de informatie is beschikbaar", "Ja, ik heb niet alle maten of foto's", unknown]),
    ]),
  ];
}

function dormerSections(answers: Answers): IntakeSection[] {
  const result = [section("dakkapel", "start", "Dakkapel · uw plannen", [q("count", "Hoeveel dakkapellen wilt u laten aanpakken?", ["1", "2", "Meer dan 2"]), when(n("number", "Aantal dakkapellen", "stuks", { min: 3, max: 10, step: "1" }), "count", "Meer dan 2")], "dakkapel"), section("dakkapel", "permit", "Dakkapel · vergunning", permitQuestions, "dakkapel")];
  const count = value(answers, "dakkapel.count") === "Meer dan 2" ? positive(answers, "dakkapel.number") : positive(answers, "dakkapel.count");
  for (let i = 0; i < Math.min(10, count ?? 1); i++) {
    const prefix = `dakkapel.${i}`;
    const s = (id: string, title: string, questions: Question[]) => section(prefix, id, `Dakkapel ${i + 1} · ${title}`, questions, "dakkapel");
    result.push(
      s("wish", "werkzaamheden en plaatsing", [
        q("task", "Wat wilt u laten doen?", ["Een nieuwe dakkapel plaatsen", "Een bestaande dakkapel vervangen", "Een bestaande dakkapel renoveren", "Ik wil eerst advies"]),
        q("side", "Waar komt of staat de dakkapel?", ["Voorzijde", "Achterzijde", "Zijkant", later]),
        q("floor", "Op welke verdieping?", ["Eerste verdieping", "Tweede verdieping", "Derde verdieping of hoger", unknown]),
        when(m("renovate", "Welke onderdelen wilt u renoveren?", ["Dakbedekking", "Buitenbekleding", "Kozijnen of glas", "Isolatie", "Binnenafwerking", "Herstel van lekkage of schade", "Dat moet eerst worden beoordeeld"]), "task", "Een bestaande dakkapel renoveren"),
      ]),
      s("sizes", "afmetingen", sizeQuestions(false)),
      s("finish", "uitvoering", [
        q("material", "Welke buitenafwerking heeft uw voorkeur?", ["Kunststof", "Hout", "Andere afwerking", advice]),
        when(t("otherMaterial", "Welke andere afwerking?"), "material", "Andere afwerking"),
        q("color", "Welke kleur heeft uw voorkeur?", ["Wit of crème", "Antraciet of donkergrijs", "Passend bij de bestaande kozijnen", "Andere kleur", later]),
        when(t("otherColor", "Welke andere kleur?"), "color", "Andere kleur"),
        q("windows", "Heeft u een voorkeur voor de raamindeling?", ["Ja, ik voeg een voorbeeld of omschrijving toe", "Nee, ik ontvang graag een voorstel"]),
        when(t("windowDescription", "Omschrijf uw gewenste raamindeling", { type: "textarea" }), "windows", "Ja, ik voeg een voorbeeld of omschrijving toe"),
        when(u("windowExample", "Voorbeeld van de raamindeling", "Voeg eventueel een foto of schets toe."), "windows", "Ja, ik voeg een voorbeeld of omschrijving toe"),
        q("finish", "Hoe wilt u de binnenzijde laten afwerken?", ["Zonder binnenafwerking", "Betimmerd, klaar voor schilder- of stucwerk", "Volledig afgewerkt", later]),
        priceFinish,
        m("extras", "Welke extra's wilt u?", ["Zonwering of rolluik", "Insectenhorren", "Extra ventilatievoorzieningen", "Geen extra's", "Advies over de mogelijkheden"]),
      ]),
      s("photos", "foto's", [
        u("roofPhotos", "Het gehele dakvlak", "Maak vanaf de grond een foto waarop het hele dakvlak zichtbaar is. Ga niet het dak op en meet geen dakhelling."),
        u("insidePhotos", "De binnenzijde van de zolder", "Laat de plek waar de dakkapel komt van binnen zien."),
        when(u("existingPhotos", "De bestaande dakkapel", "Voeg bij vervanging of renovatie een overzicht en eventuele schade toe."), "task", "Een bestaande dakkapel vervangen", "Een bestaande dakkapel renoveren"),
        q("photoHelp", "Kunt u geschikte foto's aanleveren?", ["Ja, hierboven toegevoegd", "Ik voeg deze later toe", "Nee, ik kan geen geschikte foto's aanleveren"]),
      ]),
    );
  }
  return result;
}

function bathroomSections(answers: Answers): IntakeSection[] {
  const s = (id: string, title: string, questions: Question[]) => section("badkamer", id, `Badkamer · ${title}`, questions, "badkamer");
  const sections = [
    s("wish", "omvang en indeling", [
      q("task", "Wat wilt u laten doen?", ["De hele badkamer vernieuwen", "Een deel van de badkamer vernieuwen", "Een nieuwe badkamer maken in een andere ruimte"]),
      when(m("parts", "Welke onderdelen wilt u aanpakken?", ["Douche", "Toilet", "Bad", "Badkamermeubel en wastafel", "Wandtegels", "Vloertegels", "Verwarming", "Ventilatie", "Plafond en verlichting"]), "task", "Een deel van de badkamer vernieuwen"),
      q("layout", "Blijven de voorzieningen op dezelfde plaats?", ["Ja, alles blijft op dezelfde plaats", "Nee, ik wil één of meer onderdelen verplaatsen", "Ik wil advies over de indeling"]),
      when(m("move", "Welke onderdelen wilt u verplaatsen?", ["Douche", "Toilet", "Bad", "Wastafel", "Radiator", "Wasmachineaansluiting"]), "layout", "Nee, ik wil één of meer onderdelen verplaatsen"),
    ]),
    s("sizes", "afmetingen", [...sizeQuestions(true, true),
      q("shape", "Heeft de badkamer een afwijkende vorm?", ["Nee, rechthoekig of vierkant", "Ja, met een nis, hoek of schuine wand", unknown]),
      when(u("shapePlan", "Schets of foto van de vorm", "Geef de nis, hoek of schuine wand aan."), "shape", "Ja, met een nis, hoek of schuine wand"),
      t("openings", "Waar zitten deuren en ramen?", { type: "textarea", hint: "Noem de breedte, hoogte en plaats indien bekend. U mag dit openlaten." }),
      n("openingArea", "Oppervlakte deuren en ramen in betegelde wanden", "m²", { min: 0, hint: "Optioneel. Alleen invullen als u dit weet; een leeg veld wordt niet als 0 gerekend." }),
    ]),
    s("demolition", "sloop en bestaande situatie", [
      m("remove", "Wat moet worden verwijderd?", ["Bestaande wandtegels", "Bestaande vloertegels", "Douche", "Toilet", "Bad", "Badkamermeubel", "Radiator", "Plafond", "De ruimte is al leeg en gestript", unknown]),
      m("damage", "Zijn er momenteel problemen zichtbaar?", ["Lekkage of vochtplekken", "Losse of gebarsten tegels", "Slecht weglopend water", "Schimmel of onvoldoende ventilatie", "Geen zichtbare problemen", unknown]),
      q("subfloor", "Weet u wat voor vloer onder de badkamer ligt?", ["Beton", "Hout", "Anders", unknown]),
      when(t("otherSubfloor", "Wat voor vloer ligt er?"), "subfloor", "Anders"),
    ]),
    s("tiles", "tegelwerk", [
      q("tileHeight", "Hoe hoog wilt u de wanden betegelen?", ["Tot aan het plafond", "Gedeeltelijk, met volledige betegeling bij de douche", "Per wand verschillend", advice]),
      when(n("partialHeight", "Gewenste tegelhoogte buiten de douche", "cm", { max: 500 }), "tileHeight", "Gedeeltelijk, met volledige betegeling bij de douche"),
      when(n("showerWidth", "Totale breedte van de douchewanden", "meter", { hint: "Deze wanden betegelen we tot het plafond. Onbekend? Laat het veld leeg." }), "tileHeight", "Gedeeltelijk, met volledige betegeling bij de douche"),
      ...["A", "B", "C", "D"].map((wall) => when(n(`wall${wall}`, `Tegelhoogte wand ${wall}`, "cm", { min: 0, max: 500, hint: wall === "A" ? "Wanden A en C volgen de breedte; B en D de lengte. 0 betekent geen tegels." : undefined }), "tileHeight", "Per wand verschillend")),
      q("wallTile", "Welk formaat wandtegels heeft uw voorkeur?", ["30 × 60 cm", "60 × 60 cm", "60 × 120 cm", "Kleine tegels, bijvoorbeeld 10 × 10 cm", "Mozaïek", "Ander formaat", later]),
      when(t("otherWallTile", "Welk ander wandtegelformaat?"), "wallTile", "Ander formaat"),
      q("floorTile", "Welk formaat vloertegels heeft uw voorkeur?", ["30 × 30 cm", "60 × 60 cm", "80 × 80 cm", "Ander formaat", later]),
      when(t("otherFloorTile", "Welk ander vloertegelformaat?"), "floorTile", "Ander formaat"),
      q("pattern", "Welk legpatroon wilt u?", ["Recht", "Verspringend", "Visgraat", "Ander patroon", "Advies gewenst"]),
      when(t("otherPattern", "Welk ander legpatroon?"), "pattern", "Ander patroon"),
    ]),
    s("products", "tegels en materiaalkeuzes", [
      q("tileSource", "Hoe wilt u de tegels kiezen?", ["Uit jullie assortiment", "Bij een aangesloten showroom", "Ik heb al tegels uitgezocht", "Ik wil voorlopig rekenen met een tegelbudget"]),
      when(t("tileProduct", "Product, formaat en productlink", { type: "textarea" }), "tileSource", "Ik heb al tegels uitgezocht"),
      when(n("tileQuantity", "Eventueel al gekozen hoeveelheid tegels", "m²"), "tileSource", "Ik heb al tegels uitgezocht"),
      when(n("tileBudget", "Gewenst budget voor levering van tegels", "€/m²", { hint: "Uw gewenste stelbedrag; geen bevestigde productprijs." }), "tileSource", "Ik wil voorlopig rekenen met een tegelbudget"),
      priceFinish,
    ]),
    s("sanitary", "sanitair en meubels", [
      q("shower", "Welke douche wilt u?", ["Inloopdouche met glazen wand", "Douche met afsluitbare deur of cabine", "Douche boven het bad", "Bestaande douche behouden", "Geen douche", later]),
      q("toilet", "Welk toilet wilt u?", ["Hangend toilet", "Staand toilet", "Bestaand toilet behouden", "Geen toilet", later]),
      q("bath", "Wilt u een bad?", ["Nee", "Inbouwbad", "Vrijstaand bad", "Bestaand bad behouden", later]),
      q("vanity", "Welk badkamermeubel wilt u?", ["Enkel meubel, ongeveer 60–80 cm breed", "Breder meubel, ongeveer 100–120 cm breed", "Dubbel meubel", "Bestaand meubel behouden", "Ik wil het assortiment bekijken", later]),
      t("sanitaryProducts", "Heeft u al producten uitgezocht?", { type: "textarea", hint: "Voeg namen, productlinks en maten toe. Anders nemen we uw voorkeuren mee voor een voorstel; er is nog geen product besteld." }),
      q("taps", "Welke kraanuitvoering heeft uw voorkeur?", ["Opbouwkranen", "Inbouwkranen", "Een combinatie", "Advies gewenst"]),
    ]),
    s("extras", "aanvullende voorzieningen", [m("extras", "Welke aanvullende voorzieningen wilt u?", ["Vloerverwarming", "Handdoekradiator", "Ventilatie aanpassen", "Nieuwe verlichting", "Extra stopcontacten", "Spiegel of spiegelkast", "Nis in de douchewand", "Aansluiting voor wasmachine", "Geen aanvullende voorzieningen"])]),
    s("photos", "foto's en tekeningen", [
      u("overviewPhotos", "Overzicht vanaf de deuropening", "Neem zo veel mogelijk van de badkamer in beeld."),
      u("wallPhotos", "Foto van iedere wand", "Voeg per wand een foto toe, met deuren, ramen en zichtbare aansluitingen."),
      u("floorPhotos", "Foto van de vloer en douche", "Laat de vloer, douche en afvoer zien."),
      u("damagePhotos", "Foto van eventuele schade", "Maak een overzicht en een detailfoto van vochtplekken of beschadigingen."),
      u("documents", "Aanvullende plattegrond of schets", "Een schets van de gewenste indeling is ook welkom."),
      q("photoHelp", "Lukt het om de beelden aan te leveren?", ["Ja", "Ik voeg later meer toe", "Ik heb hulp nodig om dit aan te leveren"]),
    ]),
  ];
  if (value(answers, "badkamer.task") !== "Een deel van de badkamer vernieuwen") return sections;
  const parts = values(answers, "badkamer.parts");
  const tiles = parts.includes("Wandtegels") || parts.includes("Vloertegels");
  const sanitary: Record<string, string> = { shower: "Douche", toilet: "Toilet", bath: "Bad", vanity: "Badkamermeubel en wastafel" };
  return sections.filter((s) => !["badkamer.tiles", "badkamer.products"].includes(s.id) || tiles).map((s) => ({ ...s, questions: s.questions.filter((question) => {
    const id = question.id.replace("badkamer.", "");
    if (sanitary[id]) return parts.includes(sanitary[id]);
    if (["tileHeight", "partialHeight", "showerWidth", "wallA", "wallB", "wallC", "wallD", "wallTile", "otherWallTile"].includes(id)) return parts.includes("Wandtegels");
    if (["floorTile", "otherFloorTile"].includes(id)) return parts.includes("Vloertegels");
    if (["sanitaryProducts", "taps"].includes(id)) return Object.values(sanitary).some((part) => parts.includes(part));
    return true;
  }) })).filter((s) => s.questions.length);
}

function kitchenSections(): IntakeSection[] {
  const s = (id: string, title: string, questions: Question[]) => section("keuken", id, `Keuken · ${title}`, questions, "keuken");
  return [
    s("wish", "uw plannen", [
      q("task", "Wat wilt u met uw keuken doen?", ["Mijn bestaande keuken opknappen", "Een nieuwe keuken plaatsen; ik moet deze nog uitzoeken", "Een nieuwe keuken plaatsen; ik heb deze al uitgezocht"]),
      when(q("partner", "Wilt u een afspraak bij onze keukenpartner?", ["Ja, ik wil een showroomafspraak plannen", "Ik wil eerst meer informatie", "Nee, ik kies mijn keuken zelf"]), "task", "Een nieuwe keuken plaatsen; ik moet deze nog uitzoeken"),
      when(q("arrangement", "Welke keukenopstelling heeft uw voorkeur?", ["Rechte keuken", "Hoekkeuken", "U-vormige keuken", "Keuken met eiland", "Nog te bepalen met de keukenadviseur"]), "task", "Een nieuwe keuken plaatsen; ik moet deze nog uitzoeken", "Een nieuwe keuken plaatsen; ik heb deze al uitgezocht"),
      when(m("refresh", "Wat wilt u vernieuwen?", ["Kastfronten", "Handgrepen", "Werkblad", "Spoelbak en kraan", "Apparatuur", "Achterwand", "Verlichting", "Anders"]), "task", "Mijn bestaande keuken opknappen"),
      when(t("otherRefresh", "Wat wilt u verder vernieuwen?"), "refresh", "Anders"),
    ]),
    s("sizes", "maatvoering en ontwerp", [
      q("sizeMode", "Heeft u maten of een keukenontwerp?", [planSizes, ownSizes, "Nee, de keukenpartner moet nog inmeten", "Nee, ik wil een opname plannen"]),
      when(n("width", "Breedte van de keukenruimte"), "sizeMode", ownSizes),
      when(n("depth", "Lengte van de keukenruimte"), "sizeMode", ownSizes),
      when(t("cabinetSizes", "Maten van kasten en werkblad", { type: "textarea", hint: "Geef bekende maten door; laat onbekende maten open." }), "sizeMode", ownSizes),
      when(u("plan", "Keukenontwerp met maten", "Voeg het ontwerp en de maatvoering van de leverancier toe."), "sizeMode", planSizes),
      q("layout", "Blijft de keuken op dezelfde plek?", ["Ja, met ongeveer dezelfde indeling", "Ja, maar de indeling verandert", "Nee, de keuken verhuist naar een andere plek", later]),
      q("cooking", "Welke kookvoorziening komt er?", ["Inductie", "Keramisch of elektrisch", "Gas", "Bestaande kookplaat behouden", later]),
    ]),
    s("work", "werkzaamheden voor bouwaanhuis", [
      m("work", "Welke werkzaamheden moet bouwaanhuis uitvoeren?", ["Oude keuken verwijderen en afvoeren", "Water en afvoer aanpassen", "Elektra aanpassen", "Ventilatie of afzuigaansluiting aanpassen", "Wanden herstellen of stucen", "Schilderwerk", "Vloer verwijderen of aanbrengen", "Nieuwe keuken monteren", "Alleen bouwkundige voorbereiding; montage regelt de keukenleverancier", "Ik wil advies over wat nodig is"], { exclusive: ["Ik wil advies over wat nodig is"], excludes: { "Nieuwe keuken monteren": ["Alleen bouwkundige voorbereiding; montage regelt de keukenleverancier"] }, hint: "Keukenlevering, voorbereiding en montage zijn afzonderlijke posten. Montage wordt één keer opgenomen." }),
      priceFinish,
    ]),
    s("documents", "foto's en documenten", [
      u("design", "Keukenontwerp en maatvoering", "Een ontwerp van de partner of uw eigen leverancier."),
      u("installation", "Installatietekening", "Laat de gewenste aansluitpunten voor water, afvoer en elektra zien."),
      u("appliances", "Apparatenlijst", "De types of specificaties van de apparatuur, indien bekend."),
      u("photos", "Foto's van de bestaande keuken", "Laat de opstelling, wanden en zichtbare aansluitingen zien."),
      u("meterPhotos", "Foto van de meterkast", "Maak een foto zonder de meterkast of elektrische afdekplaten te openen."),
      q("documentsReady", "Zijn de documenten compleet?", ["Ja", "Ik voeg later meer toe", "Nog geen documenten beschikbaar"]),
    ]),
  ];
}

export const finishingServices = ["Stucwerk", "Schilderwerk", "Vloerafwerking", "Plinten", "Behang", "Plafondafwerking"] as const;
export type FinishingService = typeof finishingServices[number];
// Enter business-approved, VAT-inclusive rates here. Null never means free.
export const finishingRates: Record<FinishingService, { unit: string; rate: number | null }> = {
  Stucwerk: { unit: "m²", rate: null }, Schilderwerk: { unit: "m²", rate: null }, Vloerafwerking: { unit: "m²", rate: null },
  Plinten: { unit: "m", rate: null }, Behang: { unit: "m²", rate: null }, Plafondafwerking: { unit: "m²", rate: null },
};
function finishingQuestions(service: FinishingService): Question[] {
  switch (service) {
    case "Stucwerk": return [m("surface", "Wat wilt u laten stucen?", ["Wanden", "Plafonds"]), q("substrate", "Wat is de bestaande ondergrond?", ["Bestaand stucwerk", "Beton", "Metselwerk of bouwblokken", "Gipsplaten", "Verschillende ondergronden", unknown]), q("condition", "Hoe ziet de ondergrond eruit?", ["Redelijk vlak en zonder zichtbare schade", "Kleine gaten of scheuren", "Sterk ongelijk of beschadigd", unknown]), q("finish", "Welke afwerking wilt u?", ["Glad, geschikt om te schilderen", "Geschikt om te behangen", "Sierpleister", "Advies gewenst"])];
    case "Schilderwerk": return [m("surface", "Wat wilt u laten schilderen?", ["Wanden", "Plafonds", "Deuren", "Kozijnen", "Plinten", "Trap"]), q("condition", "Wat is de huidige toestand?", ["Goede staat, alleen opnieuw schilderen", "Kleine beschadigingen", "Afbladderende verf of veel herstelwerk", "Vocht- of verkleuringsplekken", unknown]), q("color", "Welke kleurverandering wilt u?", ["Dezelfde of een vergelijkbare kleur", "Van licht naar donker", "Van donker naar licht", later])];
    case "Vloerafwerking": return [q("type", "Welke vloer wilt u?", ["Laminaat", "Klik-pvc", "Verlijmd pvc", "Tegels", "Anders", later]), when(t("otherType", "Welke andere vloer?"), "type", "Anders"), q("remove", "Moet de bestaande vloer worden verwijderd?", ["Nee, de ondervloer ligt al vrij", "Ja, laminaat of een andere losliggende vloer", "Ja, een verlijmde vloer", "Ja, tegels", unknown]), q("flat", "Is de ondervloer vlak en gereed voor de nieuwe vloer?", ["Ja", "Nee", unknown]), q("pattern", "Hoe wilt u de vloer laten leggen?", ["Recht", "Visgraat", "Ander patroon", later]), when(t("otherPattern", "Welk ander patroon?"), "pattern", "Ander patroon")];
    case "Plinten": return [q("type", "Welke plinten wilt u?", ["Lage plakplinten", "Hoge witte plinten", "Houten plinten", "Anders", later]), when(t("otherType", "Welke andere plinten?"), "type", "Anders"), n("plinthHeight", "Gewenste plinthoogte, indien bekend", "cm", { max: 100 }), m("work", "Welke werkzaamheden zijn nodig?", ["Bestaande plinten verwijderen", "Nieuwe plinten leveren", "Nieuwe plinten plaatsen", "Afkitten", "Schilderen"])];
    case "Behang": return [q("type", "Wat voor behang wilt u?", ["Renovlies", "Glad behang zonder patroon", "Behang met patroon", "Fotobehang", later]), q("remove", "Moet bestaand behang worden verwijderd?", ["Ja", "Nee", unknown]), q("condition", "Hoe ziet de wand eruit?", ["Redelijk vlak en zonder zichtbare schade", "Kleine gaten of scheuren", "Sterk ongelijk of beschadigd", unknown])];
    case "Plafondafwerking": return [q("type", "Wat wilt u met het plafond doen?", ["Bestaand plafond stucen", "Bestaand plafond schilderen", "Nieuw of verlaagd gipsplafond aanbrengen", "Anders"]), when(t("otherType", "Welke andere plafondafwerking?"), "type", "Anders"), when(m("extras", "Welke extra's wilt u?", ["Isolatie", "Inbouwspots", "Uitsparingen voor verlichting", "Geen extra's", "Advies gewenst"]), "type", "Nieuw of verlaagd gipsplafond aanbrengen")];
  }
}
export const quantityModes = ["Ik weet de hoeveelheid", "Ik vul afmetingen in en laat de website rekenen", "Ik geef een schatting voor een prijsindicatie", "Ik weet de hoeveelheid nog niet; toon mij de eenheidsprijs"];
export function roomNames(answers: Answers) { return values(answers, "afwerking.rooms").slice(0, 20); }
function interiorSections(answers: Answers): IntakeSection[] {
  const result = [section("afwerking", "rooms", "Binnenafwerking · uw ruimtes", [{ id: "rooms", label: "In welke ruimtes wilt u werken?", type: "rooms", hint: "Voeg iedere ruimte één keer toe, bijvoorbeeld Woonkamer, Slaapkamer 1, Hal of Zolder." }], "afwerking")];
  roomNames(answers).forEach((name, index) => {
    const prefix = `afwerking.${index}`;
    const s = (id: string, title: string, questions: Question[]) => section(prefix, id, `${name || `Ruimte ${index + 1}`} · ${title}`, questions, "afwerking");
    result.push(s("work", "werkzaamheden", [m("work", "Welke werkzaamheden wilt u laten uitvoeren?", [...finishingServices]) ]));
    for (const service of finishingServices.filter((item) => includes(answers, `${prefix}.work`, item))) {
      const scope = `${prefix}.${service}`;
      const measured = "Ik vul afmetingen in en laat de website rekenen";
      const quantity: Question[] = [q("quantityMode", "Hoe wilt u de hoeveelheid doorgeven?", quantityModes),
        when(n("quantity", "Hoeveelheid", service === "Plinten" ? "meter" : "m²"), "quantityMode", quantityModes[0], quantityModes[2]),
        when(q("measureSurface", "Welk oppervlak rekenen we uit?", service === "Plinten" ? ["Omtrek van de ruimte"] : ["Vloer of plafond", "Wanden", "Wanden en plafond"]), "quantityMode", measured),
        when(n("width", "Breedte van de ruimte"), "quantityMode", measured), when(n("depth", "Lengte van de ruimte"), "quantityMode", measured),
        { ...n("height", "Hoogte van de wanden"), when: [{ id: "quantityMode", values: [measured] }, { id: "measureSurface", values: ["Wanden", "Wanden en plafond"] }] },
        when(n("deduction", "Niet mee te rekenen hoeveelheid", service === "Plinten" ? "meter" : "m²", { min: 0, hint: "Optioneel: bijvoorbeeld deuropeningen. Zonder aftrek tonen we een bruto hoeveelheid." }), "quantityMode", measured),
        ...(service === "Schilderwerk" ? [n("doors", "Aantal deuren (apart van de m²)", "stuks", { min: 0, step: "1" }), n("frames", "Aantal kozijnen (apart van de m²)", "stuks", { min: 0, step: "1" }), n("skirting", "Te schilderen plinten (apart van de m²)", "meter", { min: 0 }), n("stairs", "Aantal trappen (apart van de m²)", "stuks", { min: 0, step: "1" })] : []),
      ];
      result.push(section(scope, "details", `${name || `Ruimte ${index + 1}`} · ${service}`, finishingQuestions(service), "afwerking"));
      result.push(section(scope, "quantity", `${name || `Ruimte ${index + 1}`} · hoeveelheid ${service.toLowerCase()}`, quantity, "afwerking", "Vul alleen bekende maten in. Een schatting blijft een indicatie; onbekende hoeveelheden tellen niet als nul."));
    }
    result.push(s("access", "uitvoering en bereikbaarheid", [
      q("empty", "Is deze ruimte leeg tijdens de werkzaamheden?", ["Ja", "Gedeeltelijk", "Nee"]),
      q("floor", "Op welke verdieping vindt het werk plaats?", ["Begane grond", "Eerste verdieping", "Tweede verdieping of hoger", "Kelder", unknown]),
      q("high", "Zijn er moeilijk bereikbare of hoge oppervlakken?", ["Nee", "Ja, hoger dan 3 meter", "Ja, in een trappenhuis", unknown]),
      q("supply", "Wie levert het afwerkingsmateriaal?", ["Bouwaanhuis", "Ikzelf", "Verschilt per onderdeel"]),
      t("supplyDetails", "Materialen of bijzonderheden", { type: "textarea", hint: "Bijvoorbeeld welk materiaal u zelf levert." }),
      u("photos", "Wilt u foto's toevoegen?", "Optioneel bij standaardwerk. Voeg bij schade of een onduidelijke ondergrond een overzicht en een detailfoto toe."),
    ]));
  });
  return result;
}

const renovationWorkMap: Record<string, WorkId> = { "Badkamer vernieuwen": "badkamer", "Keuken vernieuwen": "keuken", "Wanden en plafonds afwerken": "afwerking", "Vloeren vernieuwen": "afwerking", "Aanbouw of uitbouw realiseren": "uitbouw", "Dakopbouw realiseren": "dakopbouw", "Dakkapel plaatsen of vernieuwen": "dakkapel" };
function renovationSections(): IntakeSection[] {
  const s = (id: string, title: string, questions: Question[]) => section("renovatie", id, `Totale renovatie · ${title}`, questions, "renovatie");
  return [
    s("wish", "onderdelen en ruimtes", [
      m("floors", "Welke delen van de woning wilt u renoveren?", ["Begane grond", "Eerste verdieping", "Tweede verdieping", "Zolder", "Kelder", "De hele woning"], { exclusive: ["De hele woning"] }),
      m("work", "Welke werkzaamheden wilt u uitvoeren?", ["Badkamer vernieuwen", "Keuken vernieuwen", "Wanden en plafonds afwerken", "Vloeren vernieuwen", "Binnenmuren verwijderen of verplaatsen", "Elektra vernieuwen", "Water- en afvoerleidingen aanpassen", "Verwarming aanpassen", "Isoleren", "Kozijnen vervangen", "Aanbouw of uitbouw realiseren", "Dakopbouw realiseren", "Dakkapel plaatsen of vernieuwen", "Anders"]),
      when(t("otherWork", "Welke andere werkzaamheden?"), "work", "Anders"),
      t("roomWork", "Welke werkzaamheden horen bij welke ruimte?", { type: "textarea", hint: "Bijvoorbeeld: badkamer op de eerste verdieping, keuken beneden. De gerichte routes volgen hierna één keer." }),
      q("layout", "Wilt u de indeling veranderen?", ["Nee", "Ja, binnenmuren verwijderen of verplaatsen", "Ja, ruimtes een andere functie geven", "Ik wil advies over de indeling"]),
    ]),
    s("sizes", "plattegrond en omvang", [
      q("planMode", "Heeft u een plattegrond van de woning?", ["Ja, met maten", "Ja, zonder maten", "Nee"]),
      when(u("plan", "Plattegrond van de woning", "Voeg de beschikbare tekeningen toe."), "planMode", "Ja, met maten", "Ja, zonder maten"),
      q("sizeMode", "Hoe groot is het te renoveren deel ongeveer?", ["Ik weet de oppervlakte", "Ik geef de maten per ruimte op", unknown]),
      when(n("area", "Te renoveren oppervlakte", "m²"), "sizeMode", "Ik weet de oppervlakte"),
      when(t("roomSizes", "Maten per ruimte", { type: "textarea", hint: "Noem per ruimte de naam, lengte en breedte. Wij controleren de gezamenlijke oppervlakte." }), "sizeMode", "Ik geef de maten per ruimte op"),
      u("photos", "Foto's van de te renoveren ruimtes", "Voeg per ruimte een overzicht toe, indien beschikbaar."),
    ]),
    s("planning", "planning en prioriteiten", [
      q("occupied", "Blijft de woning bewoond tijdens de werkzaamheden?", ["Nee, de woning is leeg", "Ja, de hele periode", "Gedeeltelijk", later]),
      m("priorities", "Wat vindt u het belangrijkst?", ["Binnen een bepaald budget blijven", "Zo snel mogelijk kunnen wonen", "Werkzaamheden in fases uitvoeren", "Energiezuiniger wonen", "Hoog afwerkingsniveau", "Zo veel mogelijk begeleiding"]),
      q("budgetMode", "Heeft u een budget voor de renovatie in gedachten?", ["Ja", "Ik wil eerst weten wat mijn wensen kosten", "Ik bespreek dit liever persoonlijk"]),
      when(n("budget", "Uw globale budget", "euro", { max: 10000000 }), "budgetMode", "Ja"), priceFinish,
    ]),
  ];
}

export const closingSection = section("contact", "closing", "Uw opname afronden", [
  t("notes", "Heeft u nog iets dat wij moeten weten?", { type: "textarea" }),
  q("next", "Hoe wilt u verder?", ["Ik wil mijn verbouwplannen laten beoordelen", "Ik wil een opname op locatie plannen", "Ik wil een advies- of videogesprek", "Ik wil een showroomafspraak", "Ik wil een voorstel voor vergunningbegeleiding", "Ik wil later verder"]),
  when(m("topics", "Wat wilt u tijdens de afspraak bespreken?", ["Inmeten", "Mogelijkheden en indeling", "Materiaal- en afwerkingskeuzes", "Vergunning en tekeningen", "Kosten en planning"]), "next", "Ik wil een opname op locatie plannen", "Ik wil een advies- of videogesprek"),
  t("name", "Naam", { autoComplete: "name" }), t("email", "E-mailadres", { inputType: "email", autoComplete: "email" }), t("phone", "Telefoonnummer", { inputType: "tel", autoComplete: "tel" }),
]);
export function effectiveWorks(selected: WorkId[], answers: Answers): WorkId[] {
  return [...new Set([...selected, ...(selected.includes("renovatie") ? values(answers, "renovatie.work").flatMap((item) => renovationWorkMap[item] ? [renovationWorkMap[item]] : []) : [])])];
}
export function buildSections(selected: WorkId[], answers: Answers): IntakeSection[] {
  if (value(answers, "home.method") === "Ik wil direct een opname op locatie plannen") return [housingSection, closingSection];
  const works = effectiveWorks(selected, answers);
  return [housingSection, ...(works.includes("renovatie") ? renovationSections() : []), ...works.flatMap((work) => {
    switch (work) {
      case "uitbouw": return extensionSections(); case "dakopbouw": return rooftopSections(); case "dakkapel": return dormerSections(answers);
      case "badkamer": return bathroomSections(answers); case "keuken": return kitchenSections(); case "afwerking": return interiorSections(answers); default: return [];
    }
  }), closingSection];
}

export function quantityFor(answers: Answers, scope: string): number | null {
  const mode = value(answers, `${scope}.quantityMode`);
  if (mode === quantityModes[0] || mode === quantityModes[2]) return positive(answers, `${scope}.quantity`);
  if (mode !== quantityModes[1]) return null;
  const width = positive(answers, `${scope}.width`), depth = positive(answers, `${scope}.depth`), height = positive(answers, `${scope}.height`);
  if (!width || !depth) return null;
  const surface = value(answers, `${scope}.measureSurface`);
  let total: number;
  if (surface === "Omtrek van de ruimte") total = 2 * (width + depth);
  else if (surface === "Vloer of plafond") total = width * depth;
  else if ((surface === "Wanden" || surface === "Wanden en plafond") && height) total = 2 * (width + depth) * height + (surface === "Wanden en plafond" ? width * depth : 0);
  else return null;
  const deduction = Number(value(answers, `${scope}.deduction`) || 0);
  return Number.isFinite(deduction) && deduction >= 0 && total > deduction ? Math.round((total - deduction) * 100) / 100 : null;
}

export function bathroomAreas(answers: Answers) {
  if (value(answers, "badkamer.sizeMode") !== ownSizes || value(answers, "badkamer.shape") !== "Nee, rechthoekig of vierkant") return null;
  const width = positive(answers, "badkamer.width"), depth = positive(answers, "badkamer.depth"), height = positive(answers, "badkamer.height");
  if (!width || !depth) return null;
  const mode = value(answers, "badkamer.tileHeight");
  let wall: number | null = null;
  if (mode === "Tot aan het plafond" && height) wall = 2 * (width + depth) * height;
  if (mode === "Gedeeltelijk, met volledige betegeling bij de douche" && height) {
    const partial = positive(answers, "badkamer.partialHeight"), shower = positive(answers, "badkamer.showerWidth");
    if (partial && shower && partial / 100 <= height && shower <= 2 * (width + depth)) wall = 2 * (width + depth) * partial / 100 + shower * (height - partial / 100);
  }
  if (mode === "Per wand verschillend") {
    const heights = ["A", "B", "C", "D"].map((id) => value(answers, `badkamer.wall${id}`));
    if (heights.every((h) => h.trim() !== "" && Number.isFinite(Number(h)) && Number(h) >= 0 && (!height || Number(h) / 100 <= height))) wall = (width * (Number(heights[0]) + Number(heights[2])) + depth * (Number(heights[1]) + Number(heights[3]))) / 100;
  }
  if (value(answers, "badkamer.task") === "Een deel van de badkamer vernieuwen" && !includes(answers, "badkamer.parts", "Wandtegels")) wall = null;
  const rawOpening = value(answers, "badkamer.openingArea");
  const opening = rawOpening.trim() !== "" && Number.isFinite(Number(rawOpening)) && Number(rawOpening) >= 0 ? Number(rawOpening) : null;
  return { floor: width * depth, wall, netWall: wall !== null && opening !== null && opening <= wall ? wall - opening : null };
}

export function answerText(question: Question, answers: Answers, files: IntakeFiles) {
  if (question.type === "upload") return files[question.id]?.map((file) => file.name).join(", ") || "Nog niet toegevoegd";
  const answer = answers[question.id];
  return Array.isArray(answer) ? answer.filter(Boolean).join(", ") || "Nog niet ingevuld" : answer?.trim() ? `${answer}${question.unit ? ` ${question.unit}` : ""}` : "Nog niet ingevuld";
}
export type WorkOutcome = { work: WorkId; title: string; next: "site" | "review" | "partner" | "online"; reasons: string[]; estimate?: { low: number; high: number }; estimateNote?: string };
export function outcomes(selected: WorkId[], answers: Answers, files: IntakeFiles): WorkOutcome[] {
  const works = effectiveWorks(selected, answers);
  const hasFiles = (id: string) => Boolean(files[id]?.length);
  const sizeReady = (scope: string, depth = true) => value(answers, `${scope}.sizeMode`) === ownSizes ? Boolean(positive(answers, `${scope}.width`) && (!depth || positive(answers, `${scope}.depth`))) : value(answers, `${scope}.sizeMode`) === planSizes && hasFiles(`${scope}.plan`);
  return works.map((work): WorkOutcome => {
    const title = workTypes.find((item) => item.id === work)!.name;
    const reasons: string[] = [];
    let next: WorkOutcome["next"] = "review";
    let size: number | null = null, scope: string = work;
    if (work === "uitbouw") {
      if (!sizeReady(work)) reasons.push("Afmetingen of een tekening met maten ontbreken.");
      if (!hasFiles("uitbouw.facadePhotos") || !hasFiles("uitbouw.sitePhotos")) reasons.push("Foto's van de gevel en bouwlocatie ontbreken.");
      next = reasons.length ? "site" : "review";
      if (value(answers, "uitbouw.sizeMode") === ownSizes) size = (positive(answers, "uitbouw.width") ?? 0) * (positive(answers, "uitbouw.depth") ?? 0) || null;
      reasons.push("Voor de definitieve uitvoeringsprijs controleren we de fundering, geveldoorbraak en constructie.");
    } else if (work === "dakopbouw" || work === "renovatie") {
      next = "site";
      reasons.push(work === "dakopbouw" ? "Een locatieopname en technische beoordeling van dak, constructie en trap zijn nodig." : "Een integrale opname is nodig voor samenhang, fasering en gezamenlijke kosten. Deelbegrotingen worden niet dubbel opgeteld.");
      if (work === "renovatie" && value(answers, "renovatie.sizeMode") === "Ik weet de oppervlakte") size = positive(answers, "renovatie.area");
    } else if (work === "dakkapel") {
      const rawCount = value(answers, "dakkapel.count") === "Meer dan 2" ? positive(answers, "dakkapel.number") : positive(answers, "dakkapel.count");
      if (!rawCount) reasons.push("Het aantal dakkapellen is nog niet bekend.");
      for (let i = 0; i < Math.min(rawCount ?? 1, 10); i++) {
        const key = `dakkapel.${i}`;
        if (!sizeReady(key, false)) reasons.push(`Dakkapel ${i + 1}: breedte of tekening met maten ontbreekt.`);
        if (!hasFiles(`${key}.roofPhotos`) || !hasFiles(`${key}.insidePhotos`) || (/vervangen|renoveren/.test(value(answers, `${key}.task`)) && !hasFiles(`${key}.existingPhotos`))) reasons.push(`Dakkapel ${i + 1}: noodzakelijke foto's ontbreken.`);
      }
      next = reasons.length ? "site" : "review";
      scope = "dakkapel.0";
      if (rawCount === 1 && value(answers, `${scope}.sizeMode`) === ownSizes && value(answers, `${scope}.task`) === "Een nieuwe dakkapel plaatsen") size = positive(answers, `${scope}.width`);
      reasons.push("Productiematen worden vóór bestelling afzonderlijk gecontroleerd.");
    } else if (work === "badkamer") {
      if (!sizeReady(work)) reasons.push("Afmetingen of een tekening met maten ontbreken.");
      if (!hasFiles("badkamer.overviewPhotos") || !hasFiles("badkamer.wallPhotos") || !hasFiles("badkamer.floorPhotos")) reasons.push("Voeg een overzicht, iedere wand en de vloer/douche toe voor beoordeling op afstand.");
      if (value(answers, "badkamer.layout") !== "Ja, alles blijft op dezelfde plaats") reasons.push("De gewenste indeling en leidingverplaatsingen moeten worden beoordeeld.");
      if (!values(answers, "badkamer.damage").includes("Geen zichtbare problemen") || value(answers, "badkamer.subfloor") !== "Beton") reasons.push("Ondergrond en eventuele schade vragen aanvullende beoordeling.");
      next = reasons.length ? "review" : "online";
      if (value(answers, "badkamer.sizeMode") === ownSizes && value(answers, "badkamer.task") === "De hele badkamer vernieuwen") size = (positive(answers, "badkamer.width") ?? 0) * (positive(answers, "badkamer.depth") ?? 0) || null;
      reasons.push("Een werkomschrijving en offerte kunnen op afstand worden beoordeeld; een bezoek is niet standaard verplicht.");
    } else if (work === "keuken") {
      const needsPartner = value(answers, "keuken.task") === "Een nieuwe keuken plaatsen; ik moet deze nog uitzoeken" && value(answers, "keuken.partner") !== "Nee, ik kies mijn keuken zelf";
      next = needsPartner ? "partner" : "review";
      if (!hasFiles("keuken.installation")) reasons.push("Zonder definitief ontwerp en installatietekening leggen we aansluitwerk nog niet vast.");
      reasons.push("Keukenlevering volgens het partneraanbod; bouwkundige voorbereiding en montage als afzonderlijke posten.");
    } else if (work === "afwerking") {
      next = "online";
      if (!roomNames(answers).length) reasons.push("Voeg ruimtes en werkzaamheden toe om hoeveelheden te bepalen.");
      reasons.push("Standaard binnenafwerking kan op afstand worden uitgewerkt. Een locatiebezoek is niet standaard nodig.");
    }
    if (value(answers, "home.method") === "Ik wil direct een opname op locatie plannen" || value(answers, "contact.next") === "Ik wil een opname op locatie plannen") { next = "site"; size = null; }
    const quality = value(answers, `${scope}.quality`);
    const finish = quality.startsWith("Basis") ? "basis" : quality.startsWith("Comfort") ? "comfort" : quality.startsWith("Luxe") ? "luxe" : null;
    let estimate: WorkOutcome["estimate"];
    // Never guess a quality, quantity or structural allowance. These are preliminary model budgets only.
    const structuralKnown = work !== "uitbouw" || ["Via een bestaande deur of opening", "Door een bestaande opening te vergroten", "Door een groot deel van de gevel te openen"].includes(value(answers, "uitbouw.opening"));
    if (size && finish && structuralKnown && !(works.includes("renovatie") && work !== "renovatie")) {
      try { estimate = calculateEstimate(work, size, finish, work === "uitbouw" && value(answers, "uitbouw.opening") !== "Via een bestaande deur of opening"); } catch { /* No approved model or size outside supported limits: manual calculation. */ }
    }
    return { work, title, next, reasons, estimate, estimateNote: estimate ? "Voorlopige bandbreedte uit het bestaande rekenmodel voor omvang en kwaliteitsniveau, inclusief de daarin gerekende btw, arbeid en materiaal. Uw afzonderlijke productkeuzes, sloop, bereikbaarheid en extra's moeten nog worden gecalculeerd. Vergunningen, leges, tekeningen, berekeningen en onvoorziene werkzaamheden zijn uitgesloten. Geen vaste prijs of offerte." : undefined };
  });
}

export function exportIntake(selected: WorkId[], answers: Answers, files: IntakeFiles, receipt?: { reference: string; receivedAt: string }) {
  const result = outcomes(selected, answers, files);
  const directSite = value(answers, "home.method") === "Ik wil direct een opname op locatie plannen";
  const area = !directSite && result.some((item) => item.work === "badkamer") ? bathroomAreas(answers) : null;
  const measurements = !directSite && result.some((item) => item.work === "afwerking") ? roomNames(answers).flatMap((room, index) => finishingServices.filter((service) => includes(answers, `afwerking.${index}.work`, service)).map((service) => {
    const scope = `afwerking.${index}.${service}`;
    const quantity = quantityFor(answers, scope);
    const rate = finishingRates[service];
    return `${room || `Ruimte ${index + 1}`} — ${service}: ${quantity === null ? "hoeveelheid onbekend" : `${quantity.toLocaleString("nl-NL")} ${rate.unit}`}. ${value(answers, `${scope}.quantityMode`)}. ${rate.rate === null ? `Tarief per ${rate.unit} volgt.` : `${euro(rate.rate)} per ${rate.unit}; voorbereiding en uitvoering nog beoordelen.`}`;
  })) : [];
  return ["bouwaanhuis — Online opname", `Datum: ${new Date().toLocaleDateString("nl-NL")}`, `Werkzaamheden: ${result.map((item) => item.title).join(", ")}`, receipt ? `Status: ontvangen door bouwaanhuis.\nAanvraagnummer: ${receipt.reference}\nOntvangen op: ${new Date(receipt.receivedAt).toLocaleString("nl-NL")}\nVrijblijvende aanvraag; geen geboekte afspraak of definitieve offerte.` : "Status: concept op uw apparaat; nog niet verzonden of geboekt.", "", ...buildSections(selected, answers).flatMap((s) => [s.title.toUpperCase(), ...s.questions.filter((question) => visible(question, answers)).map((question) => `${question.label}\n${answerText(question, answers, files)}`), ""]), "HOEVEELHEDEN", ...measurements, ...(area ? [`Badkamer: vloer ${area.floor.toFixed(2)} m²; bruto wandtegelwerk ${area.wall === null ? "onbekend" : `${area.wall.toFixed(2)} m²`}; netto wandtegelwerk ${area.netWall === null ? "nog te controleren" : `${area.netWall.toFixed(2)} m²`}. Materiaalverlies wordt apart bepaald.`] : []), "VERVOLGSTAPPEN", ...result.flatMap((item) => [item.title, ...(item.estimate ? [`${euro(item.estimate.low)} – ${euro(item.estimate.high)}`, item.estimateNote!] : ["Nog te calculeren; onbekende posten zijn niet als nul opgenomen."]), ...item.reasons, ...(!directSite && value(answers, `${item.work}.permitConclusion`) ? [value(answers, `${item.work}.permitConclusion`)] : []), ""]), receipt ? "Uw oorspronkelijke bijlagen zijn meegestuurd met uw aanvraag. Deze kopie bevat alleen de bestandsnamen, niet de bestanden zelf." : "Bijlagen worden lokaal bewaard en staan niet in deze tekst of pdf. Verstuur de oorspronkelijke bestanden afzonderlijk bij uw aanvraag."].join("\n\n");
}
