"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon, Logo } from "@/components/icon";
import ProductOverview from "@/components/product-overview";
import QuoteRequest, { type QuoteRequestHandle } from "@/components/quote-request";
import PermitDialog from "@/components/permit-dialog";
import ScrollReveals from "@/components/scroll-reveals";
import HeroCarousel from "@/components/hero-carousel";
import livingRoomImage from "@/public/images/living-room.jpg";
import bathroomImage from "@/public/images/bathroom.jpg";
import kitchenImage from "@/public/images/kitchen.jpg";

const inspirations = [
  { title: "Meer ruimte. Meer thuis.", category: "UITBOUW & WOONKAMER", image: livingRoomImage, alt: "Lichte woonkamer met natuurlijke materialen en een comfortabele zithoek", description: "Een fijne plek om samen te komen. Denk aan grote glaspartijen, een open indeling en een rustige overgang tussen binnen en buiten.", details: ["Een indeling die past bij uw dagelijks leven", "Meer daglicht en verbinding met de tuin", "Natuurlijke materialen en een rustige afwerking"] },
  { title: "Elke dag een moment voor uzelf.", category: "BADKAMER", image: bathroomImage, alt: "Moderne badkamer met lichte tegels en warme details", description: "Een badkamer waarin de dag ontspannen begint. Met slimme opbergruimte, prettige verlichting en materialen die mooi blijven.", details: ["Een praktische indeling, ook in een kleine ruimte", "Een inloopdouche of een heerlijk ligbad", "Aandacht voor ventilatie en waterdichting"] },
  { title: "Hier komt alles samen.", category: "KEUKEN & INTERIEUR", image: kitchenImage, alt: "Warme moderne keuken met een ruim kookeiland", description: "Koken, bijpraten en lang tafelen. Maak van de keuken een plek waar iedereen zich thuis voelt, met een indeling die echt voor u werkt.", details: ["Slimme werkruimte en voldoende opbergruimte", "Materialen die aansluiten op uw woonstijl", "Verlichting voor koken én gezelligheid"] },
];

const faqs = [
  { question: "Hoe vraag ik een offerte aan?", answer: "Vul het korte contactformulier in en beschrijf uw plannen, eventueel met foto’s. Voor een specifiek onderdeel kunt u ook de offertevragen doorlopen. U kunt op ieder moment overstappen naar persoonlijk contact. We bespreken uw wensen, budget en gewenste planning. Waar nodig komen we langs om de situatie te bekijken. Daarna ontvangt u een offerte op maat. Het eerste gesprek en de offerte zijn vrijblijvend." },
  { question: "Regelen jullie ook de vakmensen en de planning?", answer: "Ja. Wij stellen het team van vakmensen samen, plannen de werkzaamheden en stemmen de verschillende disciplines op elkaar af. Van de voorbereiding tot de oplevering houdt u één aanspreekpunt. U hoeft zelf geen losse partijen te zoeken of achter de planning aan te bellen." },
  { question: "Moet ik zelf steeds op de bouw aanwezig zijn?", answer: "U hoeft niet telkens langs te gaan om de voortgang te controleren. Wij bezoeken de bouw regelmatig, bekijken of het werk volgens de afspraken verloopt en houden u op de hoogte. Zo bespaart u reistijd en blijft u betrokken bij de keuzes die ertoe doen. Toegang tot de woning en eventuele afspraken op locatie stemmen we vooraf met u af." },
  { question: "Voor welke projecten kan ik bij jullie terecht?", answer: "Onze specialiteit is het begeleiden en uitvoeren van complete renovaties en grotere verbouwingen. Vertel ons uw plannen en uw budget. Samen bekijken we welke aanpak en afwerking daarbij passen." },
  { question: "Wat gebeurt er als er tijdens de bouw iets verandert?", answer: "We bespreken afwijkingen en extra wensen met u, inclusief de gevolgen voor de kosten en planning. Meerwerk stemmen we eerst met u af. Zo houdt u zeggenschap over uw budget, terwijl wij de uitvoering coördineren." },
  { question: "Verzorgen jullie ook bouwtekeningen en vergunningen?", answer: "Ja. Wij verzorgen bouwtekeningen, zoals plattegronden, gevelaanzichten en doorsneden, en begeleiden het vergunningtraject. We bespreken welke stukken nodig zijn en stemmen af met de gemeente. U kunt deze dienst los aanvragen of meenemen in uw complete renovatie. Via het offerteformulier vertelt u wat u nodig heeft; de werkzaamheden en kosten spreken we vooraf af." },
];

const advantages = [
  { icon: "house" as const, title: "Eén team, één aanspreekpunt", description: "Wij selecteren de vakmensen en stemmen hun planning op elkaar af. U heeft één contact voor het geheel." },
  { icon: "shield" as const, title: "Controle op het werk", description: "We kijken regelmatig op de bouw naar voortgang en afwerking. Aandachtspunten pakken we direct met de vakmensen op." },
  { icon: "clock" as const, title: "Betrokken, ook op afstand", description: "U krijgt updates en beslist mee op de momenten die ertoe doen. Wij regelen de dagelijkse afstemming." },
  { icon: "ruler" as const, title: "Uw budget als uitgangspunt", description: "Praktisch of luxe: we kiezen samen wat bij u past. Extra werk en kosten bespreken we vooraf met u." },
];

const steps = [
  { number: "01", icon: "phone" as const, title: "We luisteren naar uw plannen", description: "Vul het korte formulier in. Vertel over uw woning, uw wensen en uw budget. Samen ontdekken we wat bij u past." },
  { number: "02", icon: "file" as const, title: "Een plan en offerte op maat", description: "We bekijken de situatie en maken de werkzaamheden, materialen en kosten duidelijk. U beslist voordat we starten." },
  { number: "03", icon: "renovation" as const, title: "Wij regelen de uitvoering", description: "Na uw akkoord plannen we de vakmensen in, stemmen we het werk af en controleren we regelmatig op locatie. U krijgt updates over de voortgang." },
  { number: "04", icon: "spark" as const, title: "Samen naar de oplevering", description: "We lopen het resultaat samen na, bespreken de laatste punten en stemmen de afronding af. Zodat u kunt genieten van uw vernieuwde thuis." },
];

export default function PlanBouw() {
  const quoteRef = useRef<QuoteRequestHandle>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [permitOpen, setPermitOpen] = useState(false);
  const [activeInspiration, setActiveInspiration] = useState<number | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const inspirationRef = useRef<HTMLDialogElement>(null);
  const privacyRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeInspiration !== null) inspirationRef.current?.showModal();
    else inspirationRef.current?.close();
  }, [activeInspiration]);

  useEffect(() => {
    if (privacyOpen) privacyRef.current?.showModal();
    else privacyRef.current?.close();
  }, [privacyOpen]);

  function openPermit() {
    setPermitOpen(true);
    setMenuOpen(false);
  }

  return <>
    <ScrollReveals />
    <a className="skip-link" href="#main">Direct naar de inhoud</a>
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className={menuOpen ? "navigation is-open" : "navigation"} id="main-navigation" aria-label="Hoofdnavigatie" onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); menuButtonRef.current?.focus(); } }}>
          <a href="#over-ons" onClick={() => setMenuOpen(false)}>Waarom bouwregieaanhuis</a>
          <a href="#producten" onClick={() => setMenuOpen(false)}>Ons aanbod</a>
          <a href="#werkwijze" onClick={() => setMenuOpen(false)}>Zo werkt het</a>
          <a href="#inspiratie" onClick={() => setMenuOpen(false)}>Inspiratie</a>
          <a className="button button-bordeaux nav-mobile-cta" href="#offerte" onClick={() => { setMenuOpen(false); quoteRef.current?.open("guided"); }}>Offerte opvragen <Icon name="arrow" size={17} /></a>
        </nav>
        <a className="button button-outline header-cta" href="#offerte" onClick={() => quoteRef.current?.open("guided")}>Offerte opvragen <Icon name="arrow" size={16} /></a>
        <button className="menu-toggle" ref={menuButtonRef} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}><Icon name={menuOpen ? "close" : "menu"} /></button>
      </div>
    </header>
    <main id="main" onClick={(event) => { if ((event.target as HTMLElement).closest('a[href="#contact"]')) quoteRef.current?.open("contact"); }}>
      <section className="hero hero-value-first" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span /> UW VERBOUWING, VAN BEGIN TOT EIND</p>
          <h1 id="hero-title">Uw verbouwing.<br /><span>Zonder het regelwerk.</span></h1>
          <p className="hero-description">Uw complete renovatie, van eerste plan tot oplevering. Wij regelen de vakmensen, de planning en de uitvoering. U houdt tijd over voor uw leven.</p>
          <ul className="hero-values" aria-label="Dit nemen wij u uit handen">
            <li><span><Icon name="house" size={22} /></span><div><strong>Wij regelen de vakmensen</strong><p>Eén aanspreekpunt voor de hele bouw.</p></div></li>
            <li><span><Icon name="shield" size={22} /></span><div><strong>Wij controleren op locatie</strong><p>Regelmatige checks op voortgang en afwerking.</p></div></li>
            <li><span><Icon name="clock" size={22} /></span><div><strong>U blijft op de hoogte, ook op afstand</strong><p>Minder zorgen en minder ritten naar de bouw.</p></div></li>
          </ul>
          <div className="hero-actions">
            <a className="button button-bordeaux" href="#contact" onClick={() => quoteRef.current?.open("contact", "renovatie")}>Bespreek uw renovatie <Icon name="arrow" size={18} /></a>
            <a className="text-link hero-contact-link" href="#offerte" onClick={() => quoteRef.current?.open("guided")}>Offerte opvragen <Icon name="arrow" size={17} /></a>
          </div>
        </div>
        <HeroCarousel />
      </section>
      <section className="care-section section" id="over-ons" aria-labelledby="care-title">
        <div className="container">
          <div className="care-intro">
            <div><p className="eyebrow"><span /> DE BOUW GAAT DOOR. UW LEVEN OOK.</p><h2 id="care-title">U maakt de keuzes.<br /><span>Wij nemen het werk uit handen.</span></h2></div>
            <p>Uw tijd is kostbaar. Daarom organiseren wij de bouw rondom uw leven, van de eerste afspraak tot de laatste afwerking.</p>
          </div>
          <div className="care-grid">{advantages.map((item) => <article className="care-card" key={item.title}><Icon name={item.icon} size={27} /><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
          <div className="care-bottom"><p>U houdt de regie over uw wensen. Wij nemen de organisatie op ons.</p><a href="#contact" className="text-link">Maak kennis met ons <Icon name="arrow" size={18} /></a></div>
        </div>
      </section>
      <ProductOverview onQuote={(work) => quoteRef.current?.open("guided", work)} onContact={() => quoteRef.current?.open("contact", "renovatie")} />
      <QuoteRequest ref={quoteRef} />
      <section className="process-section section" id="werkwijze"><div className="container">
        <div className="section-heading centered"><p className="eyebrow"><span /> OVERZICHTELIJK VAN BEGIN TOT EIND</p><h2>Van eerste gesprek tot fijn thuiskomen.</h2><p>Een helder plan, de juiste mensen en aandacht tijdens de hele bouw.</p></div>
        <div className="process-grid">{steps.map((item) => <article className="process-card" key={item.number}><div className="process-top"><span className="process-icon"><Icon name={item.icon} size={27} /></span><span>{item.number}</span></div><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
      </div></section>
      <section className="permit-section" id="vergunning"><div className="container"><div className="permit-banner"><div className="permit-illustration" aria-hidden="true"><div className="blueprint-grid" /><div className="permit-paper"><div className="paper-top"><span /><span /><span /></div><Icon name="house" size={74} /><div className="paper-lines"><span /><span /><span /></div><span className="paper-seal"><Icon name="check" size={27} /></span></div><span className="blueprint-measure measure-top">UW WOONPLAN</span><span className="blueprint-measure measure-bottom">EEN GOEDE START</span></div><div className="permit-copy"><p className="eyebrow"><span /> BOUWTEKENINGEN & VERGUNNINGEN</p><h2>Uw plannen op papier.<br />Het vergunningtraject begeleid.</h2><p>Wij verzorgen uw bouwtekeningen en begeleiden u bij de vergunningaanvraag. Van plattegronden en gevelaanzichten tot afstemming met de gemeente: we helpen u uw plannen uit te werken.</p><div className="permit-actions"><a className="button button-navy" href="#offerte" onClick={() => quoteRef.current?.open("guided", "bouwtekeningen")}>Offerte opvragen <Icon name="arrow" size={18} /></a><button className="text-link" onClick={() => openPermit()}>Zelf de vergunningcheck doen <Icon name="arrow" size={17} /></button></div></div></div></div></section>
      <section className="inspiration-section section" id="inspiratie"><div className="container"><div className="section-heading inspiration-heading"><div><p className="eyebrow"><span /> KIJK VOORUIT. DROOM GERUST.</p><h2>Ruimte voor mooie plannen.</h2><p>Een beetje inspiratie voor uw volgende hoofdstuk.</p></div><a href="#contact" className="text-link">Wat zijn uw plannen? <Icon name="arrow" size={18} /></a></div><div className="inspiration-grid">{inspirations.map((item, index) => <button className="inspiration-card" key={item.title} onClick={() => setActiveInspiration(index)}><div className="inspiration-image"><Image src={item.image} alt={item.alt} fill sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 30vw" /><span className="inspiration-open"><Icon name="arrow-up" size={21} /></span></div><span className="inspiration-category">{item.category}</span><h3>{item.title}</h3><span className="inspiration-link">Ontdek de mogelijkheden <Icon name="arrow" size={15} /></span></button>)}</div><p className="inspiration-note">Sfeerbeelden ter inspiratie voor uw eigen verbouwing.</p></div></section>
      <section className="faq-section section"><div className="container faq-grid"><div><p className="eyebrow"><span /> HANDIG OM TE WETEN</p><h2>Goeie vragen.<br />Heldere antwoorden.</h2><p>Verbouwen doet u niet elke dag.<br />We helpen u graag op weg.</p></div><div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<span><Icon name="plus" size={19} /></span></summary><p>{faq.answer}</p></details>)}</div></div></section>
    </main>
    <footer className="site-footer"><div className="container"><div className="footer-top"><div><Logo /><p>Uw woonwensen. Onze zorg.</p></div><nav aria-label="Footernavigatie"><a href="#producten">Ons aanbod</a><a href="#werkwijze">Onze aanpak</a><a href="#vergunning">Tekeningen & vergunningen</a><a href="#over-ons">Waarom wij</a><a href="#contact" onClick={() => quoteRef.current?.open("contact")}>Contact & offerte</a></nav><a className="footer-top-link" href="#">Terug naar boven <Icon name="arrow-up" size={17} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} bouwregieaanhuis. Met aandacht gebouwd.</span><button onClick={() => setPrivacyOpen(true)}>Privacy & gegevens</button><span>Voor een thuis dat bij u past.</span></div></div></footer>
    <PermitDialog open={permitOpen} onClose={() => setPermitOpen(false)} onContact={() => quoteRef.current?.open("contact")} initialWork="uitbouw" />
    <dialog ref={inspirationRef} className="modal inspiration-modal" onClose={() => setActiveInspiration(null)} onClick={(event) => { if (event.target === event.currentTarget) setActiveInspiration(null); }} aria-labelledby="inspiration-dialog-title">{activeInspiration !== null && <><button className="modal-close" aria-label="Inspiratie sluiten" onClick={() => setActiveInspiration(null)}><Icon name="close" size={21} /></button><div className="modal-photo"><Image src={inspirations[activeInspiration].image} alt={inspirations[activeInspiration].alt} fill sizes="700px" /></div><div className="modal-body"><p className="eyebrow">{inspirations[activeInspiration].category}</p><h2 id="inspiration-dialog-title">{inspirations[activeInspiration].title}</h2><p>{inspirations[activeInspiration].description}</p><ul className="modal-checks">{inspirations[activeInspiration].details.map((detail) => <li key={detail}><Icon name="check" size={17} />{detail}</li>)}</ul><a href="#contact" className="button button-bordeaux" onClick={() => { setActiveInspiration(null); quoteRef.current?.open("contact"); }}>Vraag een offerte aan <Icon name="arrow" size={17} /></a><p className="fine-print">Sfeerimpressie; dit beeld toont geen uitgevoerd project van bouwregieaanhuis.</p></div></>}</dialog>
    <dialog ref={privacyRef} className="modal privacy-modal" onClose={() => setPrivacyOpen(false)} aria-labelledby="privacy-title"><button className="modal-close" aria-label="Privacy sluiten" onClick={() => setPrivacyOpen(false)}><Icon name="close" size={21} /></button><div className="modal-body"><p className="eyebrow">UW GEGEVENS</p><h2 id="privacy-title">Helder over privacy.</h2><p>U kunt ons bellen, mailen of het contact- of offerteformulier invullen om uw verbouwing te bespreken. Na uw toestemming sturen we uw ingevulde gegevens en eventuele foto’s of tekeningen naar onze ontvangstdienst om uw aanvraag te behandelen. Zonder bevestigde ontvangst toont het formulier geen verzendbevestiging. Uw invoer blijft tijdens dit bezoek in het geheugen van uw browser en wordt niet automatisch op uw apparaat opgeslagen. De gegevens die u daarbij deelt, gebruiken we om uw vraag te beantwoorden, een offerte op te stellen en afspraken over uw project te maken. Stuur alleen gegevens mee die daarvoor nodig zijn. Onze e-mailknoppen openen uw eigen e-mailprogramma; er wordt niets automatisch verstuurd.</p><p>Als u de vergunninghulp gebruikt, worden uw adresgegevens voor het vinden van de locatie gedeeld met PDOK. De kaartbeelden worden ook bij PDOK opgehaald. Uw gekozen locatie, werkzaamheden en bevestigde antwoorden worden via onze server doorgestuurd naar het Digitaal Stelsel Omgevingswet voor de beoordeling. Onze server bewaart geen vergunningdossier.</p><p>Met ‘Bewaar mijn dossier’ slaat u de bevestigde vergunningantwoorden op dit apparaat op. Een volgende gebruiker van dit apparaat kan deze openen. U kunt het dossier verwijderen op het beginscherm van de vergunningcheck. Zonder bewaren blijven de antwoorden alleen in het geopende venster. Een formele vergunningaanvraag wordt hiermee niet ingediend.</p><p>Er worden geen advertentie- of analysecookies geplaatst. De sfeerbeelden en lettertypen worden vanaf deze website geladen. De hostingprovider kan technische toegangslogboeken bijhouden.</p><p>Bij het openen van het Omgevingsloket of uw e-mailprogramma gelden de privacyvoorwaarden van die dienst. Uw vergunningdossier wordt niet automatisch naar een nieuw tabblad van het Omgevingsloket verstuurd.</p></div></dialog>
  </>;
}
