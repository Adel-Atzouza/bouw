import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/delicent";
import { business } from "@/lib/delicent";

export const metadata: Metadata = {
  title: "Privacy & cookies | Dèlicent",
  robots: { index: false, follow: true },
};

export default function Privacy() {
  const complete = business.email && business.address && business.kvk;
  return (
    <>
      <header className="legal-header">
        <div className="container">
          <Brand />
          <Link className="text-link" href="/">
            ← Terug naar Dèlicent
          </Link>
        </div>
      </header>
      <main className="container legal-page">
        <p className="eyebrow">Dèlicent / Privacy & cookies</p>
        <h1>
          Zorgvuldig met
          <br />
          <em>uw gegevens.</em>
        </h1>
        <p>
          Deze verklaring beschrijft hoe Dèlicent omgaat met persoonsgegevens
          via het aanvraagformulier op deze website.
        </p>
        {!complete && (
          <p className="draft-note">
            Deze website is in voorbereiding. De bedrijfs- en contactgegevens in
            deze verklaring moeten vóór publieke ingebruikname worden aangevuld.
          </p>
        )}
        <h2>Wie is verantwoordelijk?</h2>
        <p>
          Dèlicent is verantwoordelijk voor de behandeling van aanvragen via
          deze website.
        </p>
        <dl>
          <dt>Bedrijfsnaam</dt>
          <dd>Dèlicent</dd>
          {business.address && (
            <>
              <dt>Adres</dt>
              <dd>{business.address}</dd>
            </>
          )}
          {business.email && (
            <>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${business.email}`}>{business.email}</a>
              </dd>
            </>
          )}
          {business.phone && (
            <>
              <dt>Telefoon</dt>
              <dd>{business.phone}</dd>
            </>
          )}
          {business.kvk && (
            <>
              <dt>KvK</dt>
              <dd>{business.kvk}</dd>
            </>
          )}
          {business.vat && (
            <>
              <dt>Btw-id</dt>
              <dd>{business.vat}</dd>
            </>
          )}
        </dl>
        <h2>Welke gegevens gebruiken we en waarom?</h2>
        <p>
          Bij een aanvraag ontvangen we uw naam, e-mailadres, projecttype,
          projectplaats, omschrijving en eventueel telefoonnummer. We gebruiken
          deze gegevens om uw vraag te beantwoorden en op uw verzoek een offerte
          of opdracht voor te bereiden. De grondslag is het nemen van stappen op
          uw verzoek vóór het sluiten van een overeenkomst. Het formulier is
          geen bestelling en meldt u niet aan voor marketing.
        </p>
        <h2>Opslag en ontvangers</h2>
        <p>
          Aanvragen worden op de server opgeslagen, buiten de publiek
          toegankelijke website. Voor de behandeling kunnen de aanvraaggegevens
          ook per e-mail naar onze zakelijke mailbox worden gestuurd. Alleen
          personen die uw aanvraag behandelen en
          technische dienstverleners die daarvoor nodig zijn, mogen toegang
          krijgen. We verkopen uw gegevens niet. Voor een vergunningaanvraag
          maken we afzonderlijke afspraken over de stukken en gegevens die naar
          het bevoegd gezag gaan.
        </p>
        <h2>Hoe lang bewaren we uw aanvraag?</h2>
        <p>
          Een vrijblijvende aanvraag die niet tot een opdracht leidt, wordt
          uiterlijk drie maanden na het laatste inhoudelijke contact verwijderd.
          Bij een opdracht informeren we u over de bewaartermijnen voor het
          projectdossier en de administratie. Een wettelijke bewaarplicht kan
          een langere termijn vereisen.
        </p>
        <h2>Uw rechten</h2>
        <p>
          U kunt vragen om inzage, correctie, verwijdering of beperking van het
          gebruik van uw gegevens. Waar van toepassing kunt u bezwaar maken of
          uw gegevens laten overdragen. Neem contact op via{" "}
          {business.email ? (
            <a href={`mailto:${business.email}`}>{business.email}</a>
          ) : (
            <Link href="/#contact">het contactformulier</Link>
          )}{" "}
          en vermeld bij voorkeur uw aanvraagreferentie. We reageren in beginsel
          binnen een maand. U kunt ook een klacht indienen bij de{" "}
          <a href="https://www.autoriteitpersoonsgegevens.nl/een-tip-of-klacht-indienen-bij-de-ap">
            Autoriteit Persoonsgegevens
          </a>
          .
        </p>
        <h2>Cookies en externe websites</h2>
        <p>
          Deze website gebruikt geen trackingcookies, advertentiepixels of
          analytische scripts. Lettertypen en afbeeldingen worden vanaf de
          website zelf geladen. Het aanvraagformulier bewaart geen concept in uw
          browser. Links naar bijvoorbeeld het Omgevingsloket openen een externe
          website, waar het eigen privacybeleid geldt.
        </p>
        <h2>Vragen of wijzigingen</h2>
        <p>
          Deze verklaring wordt aangepast wanneer de verwerking van gegevens
          verandert. Deel via het formulier alleen informatie die nodig is voor
          uw bouwplan; stuur geen identiteitsbewijs, BSN of andere gevoelige
          gegevens.
        </p>
        <p style={{ marginTop: 32 }}>
          <Link href="/">← Terug naar de website</Link>
        </p>
      </main>
    </>
  );
}
