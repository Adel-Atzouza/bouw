import { Icon, type IconName } from "@/components/icon";
import type { WorkId } from "@/lib/pricing";

const products: { id: WorkId; title: string; icon: IconName; description: string; details: string[] }[] = [
  { id: "uitbouw", title: "Aan- & uitbouw", icon: "extension", description: "Meer ruimte voor het leven. Een grotere woonkamer, een fijne woonkeuken of een extra plek voor het gezin.", details: ["Indeling, casco en afwerking", "Een geheel met uw bestaande woning"] },
  { id: "badkamer", title: "Badkamer", icon: "bath", description: "Van een slimme, praktische badkamer tot uw eigen plek om helemaal tot rust te komen.", details: ["Leidingwerk, tegelwerk en sanitair", "Van comfortabel tot luxe afgewerkt"] },
  { id: "keuken", title: "Keuken", icon: "kitchen", description: "Het hart van uw huis, afgestemd op hoe u kookt en leeft. Wij stemmen de werkzaamheden op elkaar af.", details: ["Bouwkundige voorbereiding en aansluitingen", "Montage en afwerking"] },
  { id: "dakopbouw", title: "Dakopbouw", icon: "house", description: "Een extra verdieping voor uw woonwensen. Met aandacht voor de bestaande woning en de technische mogelijkheden.", details: ["Voorbereiding en uitvoering gecoördineerd", "Afwerking passend bij uw plannen"] },
  { id: "afwerking", title: "Binnenafwerking", icon: "paint", description: "De details die uw huis als thuis laten voelen. Eén ruimte opfrissen of de hele woning een nieuwe uitstraling geven.", details: ["Stucwerk, schilderwerk en vloeren", "Materialen en kleuren naar uw smaak"] },
  { id: "bouwtekeningen", title: "Bouwtekeningen & vergunningen", icon: "file", description: "Van uw eerste idee naar een uitgewerkt bouwplan. Wij verzorgen de tekeningen en begeleiden het vergunningtraject, los of als onderdeel van uw renovatie.", details: ["Plattegronden, gevelaanzichten en doorsneden", "Vergunningbegeleiding en afstemming met de gemeente"] },
];

export default function ProductOverview({ onQuote, onContact }: { onQuote: (work: WorkId) => void; onContact: () => void }) {
  return <section className="products-section section" id="producten" aria-labelledby="products-title">
    <div className="container">
      <div className="section-heading products-heading">
        <div>
          <p className="eyebrow"><span /> ONZE PRODUCTEN & DIENSTEN</p>
          <h2 id="products-title">Uw hele renovatie, in goede handen.</h2>
          <p>Een grote verbouwing vraagt om één samenhangend plan. Wij verzorgen het complete renovatietraject en stemmen alle werkzaamheden op elkaar af.</p>
        </div>
        <a href="#contact" className="text-link">Bespreek uw woonwensen <Icon name="arrow" size={18} /></a>
      </div>
      <article className="renovation-feature renovation-primary">
        <div className="renovation-primary-copy"><span className="product-icon"><Icon name="renovation" size={32} /></span><p className="eyebrow">ONZE SPECIALITEIT · COMPLETE RENOVATIES</p><h3>Een nieuw thuis.<br />Zonder zelf alles te regelen.</h3><p>Uw hele woning of meerdere ruimtes aanpakken? Wij nemen de organisatie van uw renovatie op ons. Eén aanspreekpunt voor het ontwerptraject, de vakmensen, de planning, de bouwbegeleiding en de oplevering.</p><a href="#contact" onClick={onContact} className="button button-white">Bespreek uw complete renovatie <Icon name="arrow" size={18} /></a><span className="renovation-form-note">Een kort formulier is genoeg. De rest bespreken we samen.</span></div>
        <ol className="renovation-delivery"><li><span>01</span><div><strong>Uw wensen & een helder plan</strong><p>Samen bepalen we de omvang, het budget en de aanpak.</p></div></li><li><span>02</span><div><strong>Voorbereiding & planning</strong><p>De juiste vakmensen, materialen en afspraken op elkaar afgestemd.</p></div></li><li><span>03</span><div><strong>Uitvoering & bouwbegeleiding</strong><p>Wij houden overzicht op locatie en houden u op de hoogte.</p></div></li><li><span>04</span><div><strong>Afwerking & oplevering</strong><p>We lopen het resultaat samen na en verzorgen de afronding.</p></div></li></ol>
      </article>
      <div className="products-subheading"><h3>Onderdelen van uw verbouwing</h3><p>Ook gericht plannen maken? Vertel ons uw wensen in een paar eenvoudige stappen.</p></div>
      <div className="products-grid">
        {products.map((product) => <article className="product-card" key={product.title}>
          <span className="product-icon"><Icon name={product.icon} size={30} /></span>
          <h3>{product.title}</h3>
          <p>{product.description}</p>
          <ul>{product.details.map((detail) => <li key={detail}><Icon name="check" size={16} />{detail}</li>)}</ul>
          <a href="#offerte" onClick={() => onQuote(product.id)} className="text-link" aria-label={`Vraag een offerte aan voor ${product.title.toLowerCase()}`}>Offerte opvragen <Icon name="arrow" size={17} /></a>
        </article>)}
      </div>

    </div>
  </section>;
}
