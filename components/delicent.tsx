"use client";

import Image from "next/image";
import delicentLogo from "@/public/images/delicent.png";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { packages, services } from "@/lib/delicent-services.mjs";
import ArchitecturalDrawing from "./architectural-drawing";
import { projectTypes, type Business } from "@/lib/delicent";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Mark() {
  return (
    <svg
      width="31"
      height="36"
      viewBox="0 0 36 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 35V14L18 3l15 11v21H3Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 35V18l8-6 8 6v17M3 26h30"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Dèlicent, naar de homepage">
      <Image
        src={delicentLogo}
        alt="Dèlicent — Bouwkundig tekenwerk & vergunningbegeleiding"
        className="brand-logo"
        sizes="(max-width: 900px) 157.5px, 195px"
        preload
      />
    </Link>
  );
}
function ServiceIcon({ kind }: { kind: number }) {
  const drawings = [
    <>
      <path d="M5 33V7h30v26H5Zm0-17h18V7M23 16v17M12 16v10h11M29 7v5M5 27h7" />
      <path d="M9 3h22M37 11v18" strokeDasharray="2 3" />
    </>,
    <>
      <path d="m3 29 17-23 17 23M7 29v6h26v-6M12 24V14h16v10M10 14h20M15 24v-7h10v7M20 17v7" />
    </>,
    <>
      <path d="M7 35V18h26v17H7ZM7 18V6h26v12M4 6h32M12 24h6v6h-6ZM23 24h5v6h-5ZM12 10h6v5h-6ZM23 10h5v5h-5Z" />
      <path d="M3 18h34" />
    </>,
    <>
      <path d="M7 5h26v30H7ZM12 10h16v7H12ZM12 23h4m-2-2v4M24 21v4M22 23h4M12 30h4M22 30h4" />
    </>,
    <>
      <circle cx="13" cy="13" r="5" />
      <path d="M13 3v2M13 21v2M3 13h2M21 13h2M6 6l2 2M18 18l2 2M6 20l2-2M18 8l2-2M8 29h22c6 0 6-8 1-8M13 35h11c6 0 6-4 3-4M24 14h7c5 0 5-6 1-6" />
    </>,
    <>
      <path d="M10 4h17l6 6v26H10V4Zm17 0v8h6M16 17h11M16 22h7M6 11v21" />
      <path d="m18 29 3 3 7-8" />
    </>,
  ];
  return (
    <svg
      width="37"
      height="37"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawings[kind]}
      </g>
    </svg>
  );
}
const examples = [
  {
    label: "Aanbouw & uitbouw",
    variant: "extension" as const,
    title: "Meer ruimte. Eén kloppend geheel.",
    description:
      "Een ruimere woonkeuken of een lichte plek aan de tuin. We brengen de bestaande en nieuwe situatie samen in een duidelijk bouwplan.",
    items: [
      "Bestaande en nieuwe plattegronden",
      "Gevelaanzichten en doorsneden",
      "Situatie en maatvoering",
    ],
    project: "Aanbouw of uitbouw",
    sheet: "Gevelaanzicht · nieuwe situatie",
  },
  {
    label: "Dakkapel",
    variant: "dormer" as const,
    title: "Nieuwe mogelijkheden onder uw dak.",
    description:
      "Maak ruimte voor een extra kamer of meer daglicht. We tekenen uw dakkapel en onderzoeken welke regels voor uw woning gelden.",
    items: [
      "Bestaande en nieuwe dakaanzichten",
      "Doorsneden en aansluitdetails",
      "Afstemming over constructieve stukken",
    ],
    project: "Dakkapel",
    sheet: "Gevelaanzicht · dakkapel",
  },
  {
    label: "Interne verbouwing",
    variant: "interior" as const,
    title: "Een indeling die voor u werkt.",
    description:
      "Van losse kamers naar een logisch geheel. Met een heldere plattegrond wordt zichtbaar wat uw woning kan worden en wat daarvoor nodig is.",
    items: [
      "Bestaande en nieuwe indeling",
      "Maatvoering en relevante doorsneden",
      "Inzicht in benodigde constructieve beoordeling",
    ],
    project: "Interne verbouwing",
    sheet: "Plattegrond · nieuwe indeling",
  },
];
const faqs = [
  [
    "Heb ik een omgevingsvergunning nodig?",
    "Dat hangt af van uw locatie, het bouwwerk en de werkzaamheden. Onder de Omgevingswet worden het ruimtelijke en het technische deel van bouwen afzonderlijk beoordeeld. Ook bij vergunningvrij bouwen kunnen bouwregels, een meldingsplicht of andere toestemmingen gelden. We brengen dit voor uw plan in kaart; de gemeente of een ander bevoegd gezag beslist over een aanvraag.",
  ],
  [
    "Welke tekeningen heb ik nodig?",
    "Vaak gaat het om een situatietekening, plattegronden, gevelaanzichten en doorsneden van de bestaande en nieuwe situatie. Welke details, berekeningen of onderzoeken nodig zijn, hangt af van uw plan en de indieningsvereisten. Een vergunningstekening is niet automatisch een volledige uitvoeringstekening; we spreken vooraf af wat u ontvangt.",
  ],
  [
    "Wat kosten de tekeningen en de vergunningaanvraag?",
    "U ontvangt een offerte op basis van uw plannen en de beschikbare gegevens. Daarin staan het tekenwerk, de begeleiding, de afgesproken aanpassingsrondes en de prijs inclusief btw voor particulieren. Gemeentelijke leges, aanvullende berekeningen en eventuele onderzoeken worden apart benoemd en zijn alleen inbegrepen als dat uitdrukkelijk is afgesproken.",
  ],
  [
    "Kunnen jullie ook alleen de tekeningen maken?",
    "Ja. U kunt bij ons terecht voor alleen tekeningen, daglicht- en ventilatieberekeningen of vergunningbegeleiding. Een combinatie is ook mogelijk. Heeft u al stukken? Dan bekijken we wat bruikbaar is en wat nog moet worden aangevuld.",
  ],
  [
    "Hoe lang duurt het traject?",
    "De planning hangt af van de omvang van uw plan, de beschikbare stukken en eventuele aanvullende onderzoeken. Voor het tekenwerk maken we vooraf een planning. De behandeling door het bevoegd gezag heeft een eigen termijn; aanvullende vragen of een andere procedure kunnen invloed hebben op de doorlooptijd.",
  ],
  [
    "Kan ik ook daglicht- en ventilatieberekeningen aanvragen?",
    "Ja. We verzorgen daglicht- en ventilatieberekeningen voor uw bouwplan. U kunt deze los aanvragen of combineren met het tekenwerk en de vergunningbegeleiding. We bespreken vooraf welke gegevens nodig zijn en welke berekeningen u ontvangt.",
  ],
];

export default function Delicent({ business }: { business: Business }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [example, setExample] = useState(0);
  const [project, setProject] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const requestId = useRef("");
  const successRef = useRef<HTMLDivElement>(null);
  const active = examples[example];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(data),
          requestId: requestId.current,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.reference)
        throw new Error(
          result.error || "Uw aanvraag is niet verstuurd. Probeer het opnieuw.",
        );
      setReference(result.reference);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Versturen is niet gelukt. Controleer uw verbinding en probeer opnieuw.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Ga naar de inhoud
      </a>
      <div className="topline">
        <div className="container">
          <span>Bouwkundige tekeningen & vergunningen</span>
          <span>
            <span className="status-dot" />
            Een goed plan begint met aandacht.
          </span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Brand />
          <button
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "Sluiten" : "Menu"}
            <span>{menuOpen ? "−" : "+"}</span>
          </button>
          <nav
            id="main-navigation"
            className={menuOpen ? "navigation is-open" : "navigation"}
            aria-label="Hoofdnavigatie"
          >
            <a href="#diensten" onClick={() => setMenuOpen(false)}>
              Diensten
            </a>
            <a href="#pakketten" onClick={() => setMenuOpen(false)}>
              Pakketten
            </a>
            <a href="#bouwplannen" onClick={() => setMenuOpen(false)}>
              Uw bouwplan
            </a>
            <a href="#werkwijze" onClick={() => setMenuOpen(false)}>
              Werkwijze
            </a>
            <a href="#over" onClick={() => setMenuOpen(false)}>
              Over Dèlicent
            </a>
            <a
              className="button button-small"
              href="#contact"
              onClick={() => setMenuOpen(false)}
            >
              Offerte aanvragen <Arrow diagonal />
            </a>
          </nav>
        </div>
      </header>
      <main id="main">
        <section className="hero container" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow">
              <span />
              Bouwkundig tekenbureau · Nederland
            </p>
            <h1 id="hero-heading">
              Van idee naar
              <br />
              <em>vergunning.</em>
            </h1>
            <p className="hero-description">
              Wij verzorgen tekenwerk, berekeningen en vergunningaanvragen voor
              particulieren en bedrijven. Duidelijk, snel en professioneel.
            </p>
            <div className="hero-actions">
              <a className="button" href="#contact">
                Vraag een offerte aan <Arrow diagonal />
              </a>
              <a className="text-link" href="#werkwijze">
                Zo werken wij <Arrow />
              </a>
            </div>
            <div className="hero-reassurance">
              <span>✓ &nbsp; Vrijblijvend kennismaken</span>
              <span>✓ &nbsp; Duidelijke afspraken vooraf</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <Image
                src="/images/hero-interior.jpg"
                alt="Lichte woning met een open leefruimte en grote glazen pui naar de tuin, ter inspiratie"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
                priority
              />
              <span className="photo-label">Ruimte voor uw ideeën.</span>
              <span className="photo-credit">Sfeerbeeld</span>
            </div>
            <div className="drawing-card">
              <div className="drawing-card-top">
                <span>VAN IDEE NAAR TEKENING</span>
                <span>01 / D</span>
              </div>
              <ArchitecturalDrawing compact />
              <div className="drawing-card-bottom">
                <span>Een helder plan, tot in de lijnen.</span>
                <span>Schematische illustratie</span>
              </div>
            </div>
            <span className="vertical-caption">
              DÈLICENT — BOUWKUNDIG TEKENBUREAU
            </span>
            <div className="hero-cross" aria-hidden="true">
              +
            </div>
          </div>
        </section>
        <div className="specialties">
          <div className="container">
            <span>Uw plannen. Onze expertise.</span>
            <span>Aanbouw & uitbouw</span>
            <i />
            <span>Dakkapel & dakopbouw</span>
            <i />
            <span>Verbouwing</span>
            <i />
            <span>Bijgebouw</span>
          </div>
        </div>

        <section id="diensten" className="section container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / Wat we doen</p>
              <h2>
                Alle expertise
                <br />
                voor uw <em>bouwplannen.</em>
              </h2>
            </div>
            <p>
              Tekenwerk, berekeningen of begeleiding bij uw vergunning: kies een
              losse dienst of combineer wat uw bouwplan nodig heeft.
            </p>
          </div>
          <div className="services">
            {services.map((service, i) => (
              <article className="service" key={service.title}>
                <div className="service-top">
                  <ServiceIcon kind={i} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <div className="service-tags">{service.tags}</div>
                <details className="service-deliverables">
                  <summary>
                    Bekijk de werkzaamheden <span aria-hidden="true">+</span>
                  </summary>
                  <ul>
                    {service.deliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p>
                    De precieze uitwerking en inbegrepen stukken spreken we
                    vooraf af in uw offerte.
                  </p>
                </details>
                <a
                  className="text-link"
                  href="#contact"
                  onClick={() => setProject(service.title)}
                >
                  {service.link}
                  <Arrow diagonal />
                </a>
              </article>
            ))}
          </div>
          <div className="services-note">
            <span>Al tekeningen of berekeningen in huis?</span>
            <p>
              We bekijken welke stukken bruikbaar zijn en welke aanvulling uw
              plan nodig heeft.
            </p>
            <a className="text-link" href="#contact">
              Bespreek uw situatie <Arrow />
            </a>
          </div>
        </section>

        <section id="pakketten" className="section packages-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 / Kies wat bij u past</p>
                <h2>
                  Drie heldere
                  <br />
                  <em>pakketten.</em>
                </h2>
              </div>
              <p>
                Kies de begeleiding die past bij uw situatie. In de offerte
                leggen we de exacte scope, eventuele leges en aanvullende kosten
                duidelijk vast.
              </p>
            </div>
            <div className="packages">
              {packages.map((item, i) => (
                <article className={`package-card${i === 0 ? " package-card-featured" : ""}`} key={item.title}>
                  <div className="package-card-top">
                    <span>{item.label}</span>
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <ul>
                    {item.included.map((point) => (
                      <li key={point}><span aria-hidden="true">↗</span>{point}</li>
                    ))}
                  </ul>
                  <p className="package-note">{item.note}</p>
                  <a className="text-link" href="#contact" onClick={() => setProject(item.title)}>
                    Vraag dit pakket aan <Arrow diagonal />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="bouwplannen" className="projects section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 / Ruimte voor mogelijkheden</p>
                <h2>
                  Wat heeft u <em>voor ogen?</em>
                </h2>
              </div>
              <p>
                Een extra kamer, meer licht of een nieuwe indeling.
                <br />
                Elk goed bouwplan begint bij hoe u wilt wonen.
              </p>
            </div>
            <div
              className="project-options"
              aria-label="Kies een voorbeeld van een bouwplan"
            >
              {examples.map((item, i) => (
                <button
                  key={item.label}
                  aria-pressed={example === i}
                  className={example === i ? "active" : ""}
                  onClick={() => setExample(i)}
                >
                  {item.label}
                  <Arrow diagonal />
                </button>
              ))}
            </div>
            <div className="project-detail" aria-live="polite">
              <div className="project-drawing">
                <div className="sheet-header">
                  <span>
                    DÈLICENT / STUDIE {String(example + 1).padStart(2, "0")}
                  </span>
                  <span>{active.sheet}</span>
                </div>
                <ArchitecturalDrawing variant={active.variant} />
                <div className="sheet-footer">
                  <span>
                    Schematische illustratie · geen uitvoeringsdocument
                  </span>
                  <span>NIET OP SCHAAL</span>
                </div>
              </div>
              <div className="project-copy">
                <span className="small-label">UW WONING, OPNIEUW BEKEKEN</span>
                <h3>{active.title}</h3>
                <p>{active.description}</p>
                <ul>
                  {active.items.map((item) => (
                    <li key={item}>
                      <span>↗</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  className="text-link"
                  href="#contact"
                  onClick={() => setProject(active.project)}
                >
                  Bespreek uw{" "}
                  {example === 0
                    ? "aanbouw"
                    : example === 1
                      ? "dakkapel"
                      : "verbouwing"}
                  <Arrow />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="werkwijze" className="section container">
          <div className="section-heading">
            <div>
                <p className="eyebrow">04 / Onze werkwijze</p>
              <h2>
                Van eerste gesprek
                <br />
                naar <em>de volgende stap.</em>
              </h2>
            </div>
            <p>
              U weet waar u aan toe bent. We maken het traject overzichtelijk,
              met duidelijke afspraken op ieder moment.
            </p>
          </div>
          <ol className="process">
            {[
              [
                "We luisteren",
                "U deelt uw wensen en de gegevens van uw woning. Samen maken we duidelijk wat u nodig heeft.",
              ],
              [
                "We brengen het in kaart",
                "We bekijken de mogelijkheden en de relevante regels. U ontvangt een offerte met een heldere scope en planning.",
              ],
              [
                "We werken uw plan uit",
                "We verzorgen de afgesproken tekeningen en berekeningen en bespreken deze met u. Uw feedback krijgt een plek in het plan.",
              ],
              [
                "We helpen u verder",
                "U ontvangt de afgesproken tekeningen en berekeningen. Heeft u aanvraagbegeleiding gekozen? Dan begeleiden we ook de afgesproken vergunningaanvraag.",
              ],
            ].map(([title, text], i) => (
              <li key={title}>
                <span className="step-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="permit-section">
          <div className="container permit-inner">
            <div>
              <p className="eyebrow">Bouwen in Nederland</p>
              <h2>
                Een mooi plan.
                <br />
                En de regels <em>in beeld.</em>
              </h2>
            </div>
            <div className="permit-copy">
              <p>
                Wat mag op uw locatie? En welke stukken zijn nodig? We kijken
                naar de regels van uw gemeente en het Besluit bouwwerken
                leefomgeving (Bbl).
              </p>
              <p>
                De ruimtelijke en technische kant van bouwen worden apart
                beoordeeld. Vergunningvrij betekent daarom niet regelvrij. Ook
                kunnen andere toestemmingen of onderzoeken nodig zijn.
              </p>
              <a
                href="https://omgevingswet.overheid.nl/checken"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Doe de officiële Vergunningcheck <Arrow diagonal />
              </a>
              <small>
                De check geeft een indicatie. Het bevoegd gezag beslist over uw
                aanvraag.{" "}
                <a
                  href="https://iplo.nl/thema/bouw/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lees meer bij IPLO ↗
                </a>
              </small>
            </div>
          </div>
        </section>

        <section id="over" className="section container about">
          <div className="about-visual">
            <Image
              src="/images/living-room.jpg"
              alt="Rustige, lichte woonruimte als inspiratie voor een verbouwing"
              fill
              sizes="(max-width: 760px) 100vw, 45vw"
            />
            <span className="photo-credit">Sfeerbeeld</span>
            <div className="about-stamp">
              <Mark />
              <span>
                Met aandacht
                <br />
                voor uw plan.
              </span>
            </div>
          </div>
          <div className="about-copy">
            <p className="eyebrow">05 / Aangenaam, Dèlicent</p>
            <h2>
              Aandacht voor de lijnen.
              <br />
              <em>En voor de mensen.</em>
            </h2>
            <p>
              Een verbouwing begint niet bij een tekening, maar bij een wens.
              Meer ruimte om samen te zijn. Een fijne werkplek. Een huis dat
              beter bij uw leven past.
            </p>
            <p>
              Als bouwkundig tekenbureau maken we die wens concreet. Met
              doordacht tekenwerk, begrijpelijke uitleg en begeleiding bij de
              vergunningaanvraag. Zodat u met een helder plan verder kunt.
            </p>
            <a href="#contact" className="text-link">
              Laten we kennismaken <Arrow diagonal />
            </a>
          </div>
        </section>

        <section id="vragen" className="faq-section section">
          <div className="container faq-inner">
            <div>
              <p className="eyebrow">05 / Goed om te weten</p>
              <h2>
                Alvast een paar
                <br />
                <em>heldere antwoorden.</em>
              </h2>
              <p>
                Staat uw vraag er niet tussen?
                <br />
                Vertel ons gerust waar u over twijfelt.
              </p>
              <a href="#contact" className="text-link">
                Stel uw vraag <Arrow />
              </a>
            </div>
            <div className="faq-list">
              {faqs.map(([question, answer]) => (
                <details name="faq" key={question}>
                  <summary>
                    {question}
                    <span aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="contact-section section">
          <div className="container contact-inner">
            <div className="contact-copy">
              <p className="eyebrow">06 / Uw plan begint hier</p>
              <h2>
                Een idee op papier?
                <br />
                <em>Laten we beginnen.</em>
              </h2>
              <p>
                Vertel ons wat u wilt veranderen. Ook als uw plannen nog niet
                helemaal vaststaan, denken we graag met u mee.
              </p>
              <div className="contact-points">
                <span>↗ &nbsp; Vrijblijvende aanvraag</span>
                <span>↗ &nbsp; Een voorstel dat past bij uw plannen</span>
                <span>↗ &nbsp; Persoonlijke afstemming</span>
              </div>
              {business.email && (
                <a className="contact-direct" href={`mailto:${business.email}`}>
                  {business.email}
                  <Arrow diagonal />
                </a>
              )}
              {business.phone && (
                <a
                  className="contact-direct"
                  href={`tel:${business.phone.replace(/[^+\d]/g, "")}`}
                >
                  {business.phone}
                  <Arrow diagonal />
                </a>
              )}
              <aside
                className="enquiry-preparation"
                aria-labelledby="preparation-title"
              >
                <h3 id="preparation-title">Handig bij uw aanvraag</h3>
                <ul>
                  <li>De plaats en een korte omschrijving van uw bouwplan.</li>
                  <li>Welke tekeningen of berekeningen u al heeft.</li>
                  <li>
                    Uw gewenste planning en eventuele vragen van de gemeente.
                  </li>
                </ul>
                <p>
                  Uw plan hoeft nog niet compleet te zijn. Ook met een eerste
                  idee kunt u bij ons terecht.
                </p>
              </aside>
            </div>
            {reference ? (
              <div
                className="success-panel"
                role="status"
                tabIndex={-1}
                ref={successRef}
              >
                <span className="success-check">✓</span>
                <p className="eyebrow">De eerste stap is gezet</p>
                <h3>Bedankt voor uw plannen.</h3>
                <p>
                  Uw aanvraag is opgeslagen. Bewaar uw referentie voor contact
                  over uw project.
                </p>
                <strong>{reference}</strong>
                <p>
                  Dit is een vrijblijvende aanvraag. Er is nog geen opdracht of
                  betalingsverplichting.
                </p>
                <button className="text-link" onClick={() => setReference("")}>
                  Nog een aanvraag doen <Arrow />
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={submit}>
                <div className="form-heading">
                  <h3>Vertel ons over uw project</h3>
                  <span>* Verplicht</span>
                </div>
                <label>
                  Wat zijn uw plannen? *
                  <select
                    name="project"
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Kies uw dienst of type project
                    </option>
                    {projectTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <div className="form-row">
                  <label>
                    Uw naam *
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={150}
                      placeholder="Voor- en achternaam"
                    />
                  </label>
                  <label>
                    E-mailadres *
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      placeholder="uw@email.nl"
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Plaats van het project *
                    <input
                      name="location"
                      autoComplete="address-level2"
                      required
                      maxLength={150}
                      placeholder="Bijvoorbeeld Utrecht"
                    />
                  </label>
                  <label>
                    Telefoonnummer <span className="optional">(optioneel)</span>
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={40}
                      placeholder="06 1234 5678"
                    />
                  </label>
                </div>
                <label>
                  Vertel iets over uw plannen *
                  <textarea
                    name="message"
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={4}
                    placeholder="Wat wilt u (ver)bouwen? Zijn er al tekeningen of heeft u een planning in gedachten?"
                  />
                </label>
                <div className="honeypot" aria-hidden="true">
                  <label>
                    Website
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <p className="form-privacy">
                  We gebruiken uw gegevens om uw aanvraag te behandelen. Lees
                  onze <Link href="/privacy">privacyverklaring</Link>. U gaat
                  hiermee nog geen opdracht aan.
                </p>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="button" type="submit" disabled={sending}>
                  {sending
                    ? "Uw aanvraag wordt verstuurd…"
                    : "Verstuur mijn plannen"}
                  <Arrow diagonal />
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Brand />
              <p>
                Bouwkundige tekeningen & vergunningen.
                <br />
                Een helder plan begint hier.
              </p>
            </div>
            <div className="footer-links">
              <a href="#diensten">Diensten</a>
              <a href="#werkwijze">Werkwijze</a>
              <a href="#vragen">Veelgestelde vragen</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="business-details">
              <span>Bouwkundig tekenbureau · Nederland</span>
              {business.address && <span>{business.address}</span>}
              {business.kvk && <span>KvK {business.kvk}</span>}
              {business.vat && <span>Btw-id {business.vat}</span>}
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Dèlicent</span>
            <span>Met aandacht getekend.</span>
            <Link href="/privacy">Privacy & cookies</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
