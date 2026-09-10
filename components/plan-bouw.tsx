"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon, Logo } from "@/components/icon";
import Calculator from "@/components/calculator";
import PermitDialog from "@/components/permit-dialog";
import ScrollReveals from "@/components/scroll-reveals";

const inspirations = [
  { title: "Meer ruimte. Meer thuis.", category: "UITBOUW & WOONKAMER", image: "/images/living-room.jpg", alt: "Lichte woonkamer met natuurlijke materialen en een comfortabele zithoek", description: "Een fijne plek om samen te komen. Denk aan grote glaspartijen, een open indeling en een rustige overgang tussen binnen en buiten.", details: ["Een indeling die past bij uw dagelijks leven", "Meer daglicht en verbinding met de tuin", "Natuurlijke materialen en een rustige afwerking"] },
  { title: "Elke dag een moment voor uzelf.", category: "BADKAMER", image: "/images/bathroom.jpg", alt: "Moderne badkamer met lichte tegels en warme details", description: "Een badkamer waarin de dag ontspannen begint. Met slimme opbergruimte, prettige verlichting en materialen die mooi blijven.", details: ["Een praktische indeling, ook in een kleine ruimte", "Een inloopdouche of een heerlijk ligbad", "Aandacht voor ventilatie en waterdichting"] },
  { title: "Hier komt alles samen.", category: "KEUKEN & INTERIEUR", image: "/images/kitchen.jpg", alt: "Warme moderne keuken met een ruim kookeiland", description: "Koken, bijpraten en lang tafelen. Maak van de keuken een plek waar iedereen zich thuis voelt, met een indeling die echt voor u werkt.", details: ["Slimme werkruimte en voldoende opbergruimte", "Materialen die aansluiten op uw woonstijl", "Verlichting voor koken én gezelligheid"] },
];

const heroImages = [
  { image: "/images/hero-interior.jpg", alt: "Lichte verbouwde woning met een houten vloer, open keuken en grote glazen schuifpui", caption: "MEER RUIMTE VOOR HET LEVEN" },
  { image: "/images/kitchen.jpg", alt: "Lichte keuken met marmeren werkblad en warme houten accenten", caption: "HET HART VAN UW THUIS" },
  { image: "/images/living-room.jpg", alt: "Zonnige woonkamer met planten en natuurlijke materialen", caption: "EEN PLEK DIE BIJ U PAST" },
];

const faqs = [
  { question: "Is de online prijsindicatie echt vrijblijvend?", answer: "Ja. U krijgt direct een bandbreedte te zien en hoeft geen contactgegevens achter te laten. U kunt de indicatie downloaden en rustig bekijken. U zit nergens aan vast." },
  { question: "Wat is inbegrepen in de prijsindicatie?", answer: "De berekening telt materiaal, arbeid en btw mee. De gekozen omvang, afwerking en eventuele constructieve aanpassing bepalen de bandbreedte. Vergunningkosten, leges, tekeningen, constructieberekeningen, asbestsanering en onvoorziene gebreken zijn niet inbegrepen. We gebruiken voorlopige modeltarieven; de uitkomst is geen bindende offerte." },
  { question: "Wat als ik nog niet weet of ik een vergunning nodig heb?", answer: "Begin bij onze vergunninghulp. Zodra de verbinding met het Omgevingsloket beschikbaar is, kunt u op basis van uw locatie en werkzaamheden de officiële vragen doorlopen. U kunt ook direct naar de officiële Vergunningcheck. Een online prijsindicatie zegt niets over de vergunningplicht." },
  { question: "Kan ik ook een kleine verbouwing laten berekenen?", answer: "Zeker. Naast uitbouwen en totale renovaties kunt u ook een badkamer, keuken, dakkapel of binnenafwerking berekenen. Kies uw werkzaamheden en geef de omvang van uw plannen aan." },
  { question: "Hoe wordt mijn indicatie een definitieve offerte?", answer: "Voor een definitieve offerte zijn een persoonlijke opname, de materiaalkeuzes, een controle van de bestaande situatie en een duidelijke omschrijving van het werk nodig. Uw online indicatie is daarvoor een handig vertrekpunt." },
];

export default function PlanBouw() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [previousHeroIndex, setPreviousHeroIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [permitOpen, setPermitOpen] = useState(false);
  const [permitWork, setPermitWork] = useState("Uitbouw");
  const [activeInspiration, setActiveInspiration] = useState<number | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const inspirationRef = useRef<HTMLDialogElement>(null);
  const privacyRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const calculator = document.getElementById("prijsindicatie");
    if (!calculator) return;
    const observer = new IntersectionObserver(([entry]) => setCalculatorVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(calculator);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeInspiration !== null) inspirationRef.current?.showModal();
    else inspirationRef.current?.close();
  }, [activeInspiration]);

  useEffect(() => {
    if (privacyOpen) privacyRef.current?.showModal();
    else privacyRef.current?.close();
  }, [privacyOpen]);

  function openPermit(work = "Uitbouw") {
    setPermitWork(work);
    setPermitOpen(true);
    setMenuOpen(false);
  }

  function nextHeroImage() {
    setPreviousHeroIndex(heroIndex);
    setHeroIndex((current) => (current + 1) % heroImages.length);
  }

  return <>
    <ScrollReveals />
    <a className="skip-link" href="#main">Direct naar de inhoud</a>
    <div className="topbar"><div className="container"><span>Een goed plan. Een beter thuis.</span><span><Icon name="check" size={13} /> Duidelijk vanaf de eerste stap <span className="topbar-divider" /> Voor uw woning in Nederland</span></div></div>
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className={menuOpen ? "navigation is-open" : "navigation"} id="main-navigation" aria-label="Hoofdnavigatie" onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); menuButtonRef.current?.focus(); } }}>
          <a href="#prijsindicatie" onClick={() => setMenuOpen(false)}>Verbouwen <Icon name="chevron" size={14} /></a>
          <a href="#werkwijze" onClick={() => setMenuOpen(false)}>Zo werkt het</a>
          <a href="#inspiratie" onClick={() => setMenuOpen(false)}>Inspiratie</a>
          <button className="nav-permit-button" onClick={() => openPermit()}><Icon name="shield" size={16} /> Vergunningcheck</button>
          <a href="#over-ons" onClick={() => setMenuOpen(false)}>Over Plan Bouw</a>
          <a className="button button-bordeaux nav-mobile-cta" href="#prijsindicatie" onClick={() => setMenuOpen(false)}>Bereken uw prijs <Icon name="arrow" size={17} /></a>
        </nav>
        <a className="button button-bordeaux header-cta" href="#prijsindicatie">Bereken uw prijs <Icon name="arrow" size={17} /></a>
        <button className="menu-toggle" ref={menuButtonRef} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}><Icon name={menuOpen ? "close" : "menu"} /></button>
      </div>
    </header>
    <main id="main">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> UW VERBOUWING BEGINT MET EEN PLAN</p>
          <h1>Grootse plannen.<br /><span>Heldere prijzen.</span></h1>
          <p className="hero-description">Een uitbouw, een nieuwe badkamer of een compleet nieuw thuisgevoel. Vertel ons uw wensen en ontdek direct wat uw verbouwing ongeveer kost.</p>
          <div className="hero-actions">
            <a className="button button-bordeaux" href="#prijsindicatie">Bereken mijn verbouwing <Icon name="arrow" size={20} /></a>
            <button className="button button-permit" onClick={() => openPermit()}><Icon name="shield" size={18} /> Vergunning nodig?</button>
          </div>
          <p className="hero-reassurance"><Icon name="check" size={15} /> Binnen 2 minuten <span /> Gratis en vrijblijvend</p>
          <div className="hero-bottom">
            <span className="hero-bottom-icon"><Icon name="house" size={22} /></span>
            <p>Van het eerste idee tot de laatste afwerking.<br /><strong>Gebouwd rondom uw woonwensen.</strong></p>
          </div>
        </div>
        <div className="hero-visual" role="region" aria-roledescription="fotogalerij" aria-label="Inspiratie voor uw woning">
          {heroImages.map((item, index) => {
            const state = index === heroIndex ? "current" : index === previousHeroIndex ? "previous" : "hidden";
            const animation = state === "current" ? previousHeroIndex === null ? "" : "hero-image-enter" : state === "previous" ? "hero-image-exit" : "hero-image-hidden";
            return <div key={`${index}-${state}`} className={`hero-image-layer ${animation}`} aria-hidden={state !== "current"}>
              <Image src={item.image} alt={state === "current" ? item.alt : ""} fill sizes="(max-width: 760px) 100vw, 52vw" preload={index === 0} loading={index === 0 ? undefined : "eager"} className="hero-image" />
            </div>;
          })}
          <div className="hero-image-shade" />
          <span className="image-caption" aria-live="polite"><span /> {heroImages[heroIndex].caption}</span>
          <div className="hero-float">
            <span className="float-icon"><Icon name="calculator" size={25} /></span>
            <div><strong>Uw woonwens, direct berekend.</strong><span>Wel de mogelijkheden. Geen verrassingen.</span></div>
            <span className="float-check"><Icon name="check" size={17} /></span>
          </div>
          <button className="image-counter" onClick={nextHeroImage} aria-label={`Volgende inspiratiefoto, foto ${heroIndex + 1} van ${heroImages.length}`}>0{heroIndex + 1} <span>/</span> 03 <Icon name="arrow" size={16} /></button>
        </div>
      </section>
      <div className="benefits-strip"><div className="container"><div><Icon name="calculator" size={22} /><span>Direct een <strong>prijsindicatie</strong></span></div><div><Icon name="shield" size={23} /><span>Hulp bij uw <strong>vergunning</strong></span></div><div><Icon name="ruler" size={23} /><span>Vakwerk <strong>op maat</strong></span></div><div><Icon name="house" size={23} /><span>Van eerste idee <strong>tot thuis</strong></span></div></div></div>
      <Calculator onPermit={openPermit} />
      <section className="process-section section" id="werkwijze"><div className="container"><div className="section-heading centered"><p className="eyebrow"><span /> OVERZICHTELIJK VAN BEGIN TOT EIND</p><h2>Uw nieuwe thuis, in vier stappen.</h2><p>U heeft de ideeën. Wij helpen u verder.</p></div><div className="process-grid">{[{ number: "01", icon: "house" as const, title: "Vertel over uw plannen", description: "Kies uw verbouwing en geef aan wat voor u belangrijk is. Gewoon, op uw eigen moment." }, { number: "02", icon: "calculator" as const, title: "Krijg direct inzicht", description: "Bekijk uw persoonlijke prijsindicatie. Zo weet u meteen waar u ongeveer aan toe bent." }, { number: "03", icon: "file" as const, title: "Maak het plan compleet", description: "Van vergunningcheck tot de details: samen werken we toe naar een heldere offerte." }, { number: "04", icon: "spark" as const, title: "Maak ruimte voor thuis", description: "Met duidelijke afspraken en aandacht voor de afwerking wordt uw woonwens werkelijkheid." }].map((item) => <article className="process-card" key={item.number}><div className="process-top"><span className="process-icon"><Icon name={item.icon} size={27} /></span><span>{item.number}</span></div><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section>
      <section className="permit-section" id="vergunning"><div className="container"><div className="permit-banner"><div className="permit-illustration" aria-hidden="true"><div className="blueprint-grid" /><div className="permit-paper"><div className="paper-top"><span /><span /><span /></div><Icon name="house" size={74} /><div className="paper-lines"><span /><span /><span /></div><span className="paper-seal"><Icon name="check" size={27} /></span></div><span className="blueprint-measure measure-top">UW WOONPLAN</span><span className="blueprint-measure measure-bottom">EEN GOEDE START</span></div><div className="permit-copy"><p className="eyebrow"><span /> OOK DE REGELS HELDER</p><h2>Grote plannen.<br />Maar hoe zit het met de vergunning?</h2><p>Geen vergunning? Of weet u nog niet of u er één nodig heeft? We wijzen u de weg met de vragen van het Omgevingsloket.</p><div className="permit-actions"><button className="button button-navy" onClick={() => openPermit()}>Start de vergunninghulp <Icon name="arrow" size={18} /></button><span><Icon name="shield" size={17} /> Op basis van officiële regels</span></div></div></div></div></section>
      <section className="inspiration-section section" id="inspiratie"><div className="container"><div className="section-heading inspiration-heading"><div><p className="eyebrow"><span /> KIJK VOORUIT. DROOM GERUST.</p><h2>Ruimte voor mooie plannen.</h2><p>Een beetje inspiratie voor uw volgende hoofdstuk.</p></div><a href="#prijsindicatie" className="text-link">Wat zijn uw plannen? <Icon name="arrow" size={18} /></a></div><div className="inspiration-grid">{inspirations.map((item, index) => <button className="inspiration-card" key={item.title} onClick={() => setActiveInspiration(index)}><div className="inspiration-image"><Image src={item.image} alt={item.alt} fill sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 30vw" /><span className="inspiration-open"><Icon name="arrow-up" size={21} /></span></div><span className="inspiration-category">{item.category}</span><h3>{item.title}</h3><span className="inspiration-link">Ontdek de mogelijkheden <Icon name="arrow" size={15} /></span></button>)}</div><p className="inspiration-note">Sfeerbeelden ter inspiratie voor uw eigen verbouwing.</p></div></section>
      <section className="about-section" id="over-ons"><div className="container about-inner"><div><p className="eyebrow"><span /> AANGENAAM, PLAN BOUW</p><h2>Goed bouwen begint<br />met goed luisteren.</h2></div><div><p>Een huis verbouwen is persoonlijk. Het gaat over die extra plek aan tafel, een rustige ochtend in de badkamer of eindelijk ruimte voor het hele gezin.</p><p>Daarom begint het bij ons met uw verhaal. We combineren vakmanschap met een heldere aanpak, zodat u met vertrouwen de volgende stap zet.</p><a href="#werkwijze" className="text-link">Maak kennis met onze aanpak <Icon name="arrow" size={17} /></a></div></div></section>
      <section className="faq-section section"><div className="container faq-grid"><div><p className="eyebrow"><span /> HANDIG OM TE WETEN</p><h2>Goeie vragen.<br />Heldere antwoorden.</h2><p>Verbouwen doet u niet elke dag.<br />We helpen u graag op weg.</p></div><div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<span><Icon name="plus" size={19} /></span></summary><p>{faq.answer}</p></details>)}</div></div></section>
      <section className="contact-section" id="contact"><div className="container contact-inner"><div><p className="eyebrow"><span /> HET BEGINT MET UW IDEE</p><h2>Klaar voor de volgende stap?</h2><p>Ontdek vandaag nog wat uw woonwensen kunnen kosten.</p></div><a className="button button-white" href="#prijsindicatie">Bereken mijn verbouwing <Icon name="arrow" size={19} /></a></div></section>
    </main>
    <footer className="site-footer"><div className="container"><div className="footer-top"><div><Logo /><p>Een goed plan. Een beter thuis.</p></div><nav aria-label="Footernavigatie"><a href="#prijsindicatie">Uw verbouwing</a><a href="#werkwijze">Onze aanpak</a><a href="#vergunning">Vergunninghulp</a><a href="#over-ons">Over Plan Bouw</a></nav><a className="footer-top-link" href="#">Terug naar boven <Icon name="arrow-up" size={17} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Plan Bouw. Met aandacht gebouwd.</span><button onClick={() => setPrivacyOpen(true)}>Privacy & gegevens</button><span>Voor een thuis dat bij u past.</span></div></div></footer>
    <div className={`mobile-bottom-cta ${calculatorVisible ? "is-hidden" : ""}`}><a href="#prijsindicatie" className="button button-bordeaux">Bereken uw verbouwing <Icon name="arrow" size={18} /></a><span>Gratis · Vrijblijvend · Direct inzicht</span></div>
    <PermitDialog key={permitWork} open={permitOpen} onClose={() => setPermitOpen(false)} initialWork={permitWork} />
    <dialog ref={inspirationRef} className="modal inspiration-modal" onClose={() => setActiveInspiration(null)} onClick={(event) => { if (event.target === event.currentTarget) setActiveInspiration(null); }} aria-labelledby="inspiration-dialog-title">{activeInspiration !== null && <><button className="modal-close" aria-label="Inspiratie sluiten" onClick={() => setActiveInspiration(null)}><Icon name="close" size={21} /></button><div className="modal-photo"><Image src={inspirations[activeInspiration].image} alt={inspirations[activeInspiration].alt} fill sizes="700px" /></div><div className="modal-body"><p className="eyebrow">{inspirations[activeInspiration].category}</p><h2 id="inspiration-dialog-title">{inspirations[activeInspiration].title}</h2><p>{inspirations[activeInspiration].description}</p><ul className="modal-checks">{inspirations[activeInspiration].details.map((detail) => <li key={detail}><Icon name="check" size={17} />{detail}</li>)}</ul><a href="#prijsindicatie" className="button button-bordeaux" onClick={() => setActiveInspiration(null)}>Bereken uw mogelijkheden <Icon name="arrow" size={17} /></a><p className="fine-print">Sfeerimpressie; dit beeld toont geen uitgevoerd project van Plan Bouw.</p></div></>}</dialog>
    <dialog ref={privacyRef} className="modal privacy-modal" onClose={() => setPrivacyOpen(false)} aria-labelledby="privacy-title"><button className="modal-close" aria-label="Privacy sluiten" onClick={() => setPrivacyOpen(false)}><Icon name="close" size={21} /></button><div className="modal-body"><p className="eyebrow">UW GEGEVENS</p><h2 id="privacy-title">Helder over privacy.</h2><p>De prijsberekening vindt plaats in uw browser. Uw keuzes worden niet opgeslagen op onze server. Een gedownloade prijsindicatie staat alleen op uw eigen apparaat.</p><p>Als u de vergunninghulp gebruikt, worden uw adresgegevens voor het vinden van de locatie gedeeld met PDOK. Uw gekozen locatie, werkzaamheden en antwoorden worden via onze server doorgestuurd naar het Digitaal Stelsel Omgevingswet. Deze gegevens worden door deze website niet blijvend opgeslagen.</p><p>Er worden geen advertentie- of analysecookies geplaatst. Beeldmateriaal en lettertypen worden vanaf deze website geladen. De hostingprovider kan technische toegangslogboeken bijhouden.</p><p>Bij het openen van het Omgevingsloket gelden de privacyvoorwaarden van die website.</p></div></dialog>
  </>;
}
