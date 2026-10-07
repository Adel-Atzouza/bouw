# bouwaanhuis

Nederlandstalige website voor een verbouwbedrijf, gebouwd met Next.js 16, React 19 en TypeScript. De huisstijl gebruikt donkerblauw, wit, lichtgrijs en bordeaux. De mobiele versie heeft grote aanraakvlakken, een inklapbaar menu, twee kolommen met werkzaamheden en een vaste knop naar de prijsberekening.

De site gebruikt subtiele scrollanimaties, horizontale overgangen tussen carrouselbeelden en schuivende stappen in de prijsberekening en vergunninghulp. Alle effecten respecteren `prefers-reduced-motion`; inhoud blijft zonder JavaScript zichtbaar en formuliervelden behouden hun antwoorden bij het navigeren.

Op brede desktops groeien typografie, knoppen en inhoud via `rem`-maten geleidelijk tot 133% van de oorspronkelijke schaal; de mobiele maten blijven behouden. De vergunningknop bij de prijsindicatie is maximaal `18rem` breed.

De fotocarrousel wisselt elke zes seconden. Klik of tik op de linker- of rechterrand van de foto om terug of verder te bladeren, gebruik de pijltjestoetsen, swipe of sleep met de muis. Er zijn geen zichtbare navigatie- of pauzeknoppen; toetsenbordbediening krijgt wel een zichtbare focusmarkering. Automatisch afspelen pauzeert bij aanwijzen, een verborgen browsertab of een carrousel buiten beeld. Na handmatige bediening of toetsenbordfocus blijft de carrousel op handmatige bediening staan. Bij verminderde beweging staat automatisch afspelen uit. Lokale foto's worden statisch geïmporteerd, zodat gewijzigde bestanden een nieuwe afbeeldings-URL krijgen en oude cacheversies niet blijven hangen.

## Starten

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. Voor productie:

```bash
pnpm lint
pnpm build
pnpm start
```

## Online opname en prijsindicatie

De calculator is een begeleide opname met meerdere werkzaamheden: aan-/uitbouw, dakopbouw, dakkapel, badkamer, keuken, binnenafwerking en totale renovatie. Woninggegevens worden één keer gevraagd. De vragen staan in `lib/intake.ts`; de weergave in `components/calculator.tsx`, `components/intake-question.tsx` en `components/intake-review.tsx`.

Vervolgvragen volgen de gemaakte keuzes. Dakkapellen worden per stuk opgenomen; binnenafwerking wordt per benoemde ruimte en werkzaamheid uitgevraagd. Totale renovatie opent dezelfde deelroutes zonder duplicaten. Exclusieve antwoorden zoals ‘Weet ik niet’ kunnen niet met inhoudelijke antwoorden gecombineerd worden. Niet-relevante antwoorden blijven beschikbaar bij teruggaan, maar verschijnen niet in het actieve overzicht of de export.

Afmetingen zijn leeg totdat de bezoeker ze invult. Onbekende maten, productkeuzes en tarieven worden niet als nul of een standaardwaarde ingevuld. Badkameroppervlakken worden voor rechthoekige ruimtes uitgerekend, inclusief verschillende tegelhoogtes; aftrek van deuren/ramen blijft onbekend totdat die is opgegeven. Materiaalverlies wordt apart beoordeeld. Binnenafwerking onderscheidt m², strekkende meters en aantallen, berekent desgewenst uit ruimtematen en markeert geschatte hoeveelheden.

**De bestaande tarieven in `lib/pricing.ts` blijven voorlopige demonstratietarieven, geen geverifieerde marktprijzen of vaste offertes.** Een bandbreedte verschijnt alleen bij een geschikte bekende omvang en gekozen kwaliteitsniveau. De ingevulde details vormen de verdere calculatie; niet iedere productkeuze is al geprijsd. Voor dakopbouw en de afzonderlijke binnenafwerkingsdiensten zijn nog geen bedrijfstarieven aangeleverd. `finishingRates` in `lib/intake.ts` gebruikt daarom `null`; vul alleen vastgestelde tarieven inclusief btw in en werk bijbehorende voorbereiding, materiaal- en uitvoeringsregels uit voordat u vaste offertes aanbiedt. Keukenlevering volgt de partner, met bouwkundige voorbereiding en montage afzonderlijk. Bij totale renovatie worden deelindicaties niet bij de totale bandbreedte opgeteld.

Ontbrekende noodzakelijke dakkapelmaten of foto's leiden naar een locatieopname. Dakopbouw en totale renovatie vragen technische/integrale beoordeling. Binnenafwerking kan op afstand verder; badkamer en keuken worden afhankelijk van het dossier beoordeeld. ‘Concept’ is geen ontvangen aanvraag, geboekte afspraak of complete calculatie.

### Opslaan, bijlagen en downloaden

‘Bewaar mijn opname’ slaat het concept, de antwoorden en de echte `File`-objecten expliciet op in IndexedDB op hetzelfde apparaat. Een herladen pagina biedt hervatten of verwijderen aan. Bewaren deelt niets met de server en werkt niet tussen apparaten. De limieten zijn 20 MB per bestand en 100 MB per dossier. Foto's (ook HEIC/HEIF) en PDF zijn toegestaan; opslag- en uploadfouten worden zichtbaar gemeld. Browseropslag kan door de gebruiker of browser worden gewist; een download blijft daarom nuttig.

De PDF in de huisstijl wordt met jsPDF in de browser gemaakt, met paginering voor lange dossiers. Dezelfde actieve antwoorden en prijslogica worden voor de tekstexport gebruikt. Beide bevatten bijlagenamen, niet de bestanden zelf. Bij online versturen gaan de oorspronkelijke bestanden wel mee. Alleen bij zelf delen per e-mail moet de klant de bestanden apart toevoegen. Na bevestigde ontvangst bevat de download ook het aanvraagnummer en de ontvangstdatum; de PDF-voettekst vermeldt dan geen conceptstatus meer.

### Afspraken, contact en partners

Optionele publieke instellingen in `.env.local` (opnieuw bouwen na wijzigen):

- `NEXT_PUBLIC_BOOKING_URL`: HTTPS-link naar de echte agenda voor locatieopnames.
- `NEXT_PUBLIC_SHOWROOM_URL`: HTTPS-link naar de agenda van de keukenpartner.
- `NEXT_PUBLIC_CONTACT_EMAIL`: het echte e-mailadres; opent een concept in het e-mailprogramma van de klant.

Zonder deze gegevens toont de site een downloadbaar dossier en meldt dat online tijdsloten nog niet beschikbaar zijn. Er worden geen fictieve tijden, prijzen, producten of bevestigingen getoond. Een externe agenda moet werkgebied, duur, kosten, reservering en bevestiging afhandelen. Gegevens worden niet automatisch naar die agenda verzonden. Voor een productcatalogus en geïntegreerde reserveringen is nog een bijbehorende bedrijfsintegratie nodig. Online aanvragen gebruiken de ontvangstdienst hieronder.

### Aanvraag versturen en ontvangstbevestiging

Na het overzicht volgt een aparte stap met contactgegevens, expliciete toestemming en een samenvatting van wat wordt gedeeld. Naam en e-mailadres zijn verplicht voor versturen; downloaden blijft zonder deze gegevens mogelijk. Optionele vragen, duidelijke selectiekaarten, de onderdelenlijst en de volgende stap helpen klanten door de opname.

Stel server-side `INTAKE_WEBHOOK_URL` (HTTPS) en `INTAKE_WEBHOOK_TOKEN` in voor de echte ontvangstdienst. `GET /api/intake` geeft alleen de beschikbaarheid terug. Zonder configuratie toont de laatste stap downloaden en, als ingesteld, de e-mailoptie; er wordt geen ontvangst gesimuleerd.

`POST /api/intake` valideert de aanvraag en verstuurt multipart-formdata naar de ontvangstdienst, met `Authorization: Bearer <token>` en `Idempotency-Key: BAH-…`. De velden zijn `reference`, `intake` (JSON met `selected`, actieve `answers` en `consent`), `dossier` (leesbare concepttekst), en herhaalde `file:<vraag-id>` velden met de echte bijlagen. Antwoorden en bestanden uit verlaten routes gaan niet mee. Limieten: 100 bestanden, 20 MB per bestand, 100 MB samen; stem de uploadlimieten van de hosting en ontvangstdienst hierop af.

De ontvangstdienst moet de aanvraag **duurzaam bewaren of afleveren**, retries op dezelfde idempotentiesleutel dedupliceren en pas daarna antwoorden met een succesvolle HTTP-status en:

```json
{ "accepted": true, "reference": "BAH-<16 hoofdletter hextekens uit de aanvraag>", "receivedAt": "2026-10-07T12:00:00.000Z" }
```

Een herhaalde aanvraag retourneert hetzelfde ontvangstbewijs. Zonder deze bevestiging blijven de gegevens in de browser beschikbaar en verschijnt een herstelbare fout. De website bewaart zelf geen serverdossier. Richt voor de publieke ontvangstdienst ook de gebruikelijke opslag, toegangsbeheer en spam-/verkeersbeperking op de hosting in.

De ontvangstpagina toont een aanvraagnummer, tijdstip, download en drie vervolgstappen: dossier beoordelen, persoonlijk contact, en een passende offerte of locatieafspraak bespreken. Er wordt geen automatische bevestigingsmail of niet-afgesproken reactietermijn beloofd. Voeg pas een termijn of e-mailbevestiging toe als de bedrijfsdienst die werkelijk afhandelt.

### Vergunningcheck vanuit de opname

De bestaande vergunningdialoog ontvangt de postcode en het huisnummer, waarna de klant het volledige adres bevestigt. Bij sluiten kan een beschikbare conclusie aan het betreffende onderdeel worden toegevoegd, inclusief onvolledigheids- en testomgevingswaarschuwingen. De conclusie wordt niet omgezet in een verzonnen vergunningstatus. Een voorstel voor begeleiding is nog geen opdracht of formele indiening.

### Controles

Gebruik Node.js 22.15 of hoger voor de testloader. `pnpm test` controleert vertakkingen, exclusieve opties, onbekende maten, herhaalde dakkapellen, ontdubbelde renovatieroutes, oppervlaktes en dossierexport. `tests/dso-api.test.mjs` controleert daarnaast dat bevestigde antwoorden met hun officiële vraag-ID naar het juiste DSO-endpoint gaan en dat gewijzigde antwoorden geen achterhaalde vervolgantwoorden meesturen. `pnpm lint` en `pnpm exec tsc --noEmit` controleren de broncode. De desktop- en mobiele browserroutes zijn ook gecontroleerd, inclusief lokaal bewaren/hervatten met bijlagen en downloaden.

## Omgevingswet-integratie

Vul in `.env.local` een eigen `DSO_API_KEY` in. De sleutel wordt alleen op de server gebruikt en komt niet in de browserbundel. Start de server opnieuw na het aanpassen van omgevingsvariabelen.

`DSO_ENVIRONMENT=production` gebruikt de productieomgeving. Met `DSO_ENVIRONMENT=preproduction` gebruikt de site de pre-productieomgeving en toont de vragenlijst expliciet dat de resultaten niet geschikt zijn voor een echte vergunningcheck.

Een development-/testsleutel hoort bij `preproduction`, niet bij `production`. De configuratie accepteert ook `development` als alias voor `preproduction`, ongeacht hoofdletters of omringende spaties. Andere waarden geven een configuratiefout in plaats van stilzwijgend productie te gebruiken. Bij een 401/403 controleert u of de sleutel bij de gekozen omgeving hoort. Uitvoeren services gebruikt v3; zoeken gebruikt v2. De sleutel hoeft hiervoor niet per API-versie te worden ingesteld.

De serverroute `app/api/omgevingswet/route.ts` biedt:

- `GET`: controleert de sleutel met een echte zoekaanroep naar DSO en meldt beschikbaarheid, gekozen omgeving en de afzonderlijke indienstatus, zonder de sleutel te tonen. Een ingevulde maar geweigerde sleutel wordt niet als werkende verbinding getoond.
- `POST`, actie `address`: postcode en huisnummer zoeken met de openbare PDOK Locatieserver; de bezoeker bevestigt het volledige adres, inclusief eventuele toevoeging. De RD-coördinaten worden gebruikt met `Content-Crs: EPSG:28992`.
- `POST`, actie `search`: officiële werkzaamheden of activiteiten zoeken met de Zoekinterface v2, met paginering. Voor aanvraagactiviteiten bepaalt Toepasbaar Opvragen v7 eerst de locatie-identificaties van het bevestigde punt of getekende werkgebied. De zoekopdracht filtert daarop én op de officiële indieningstoestemmingen; dit sluit onder meer niet-uitvoerbare conclusie-testobjecten uit. De interface onderscheidt vergunningen, meldingen en informatieplichten en ontdubbelt herhaalde resultaten.
- `POST`, actie `execute`: officiële vragen ophalen en antwoorden terugsturen via Uitvoeren services v3 (`conclusie/_bepaal` of `indieningsvereisten/_bepaal`).
- `POST`, actie `help`: Markdown-toelichtingen bij de officiële vragen en uitkomsten ophalen. Een mislukte toelichting kan opnieuw worden opgehaald.
- `POST`, actie `submit`: geeft expliciet `503 / DSO_SUBMISSION_NOT_CONNECTED` terug zolang de formele indienkoppeling ontbreekt. Er wordt geen verzoek bij DSO aangemaakt.

De vragenlijst ondersteunt ja/nee, getallen, tekst, datums, enkele/meerdere lijstkeuzes en geografische antwoorden. Datums worden verstuurd als `dd-MM-yyyy`, booleans als `true`/`false` en meerdere lijstwaarden als een door komma-spatie gescheiden string. Voorbehouden, ontbrekende regels, bijlagen en ontbrekende uitkomsten blijven zichtbaar. Documenten behouden hun officiële ID, verplichting en toelichting; de website doet geen alsof-upload. De server stuurt `no-store` en logt geen aanvraaginhoud.

De nieuwe vergunninghulp heeft vier stappen: locatie, werkzaamheden, vragen en uitkomst. Op de PDOK-kaart kiest de bezoeker een punt of tekent een gesloten werkgebied. De geometrie in RD-coördinaten gaat ongewijzigd naar de zoek- en uitvoer-API. De server weigert ongeldige coördinaten, open polygonen, kruisende lijnen en gebieden kleiner dan 1 m². De kaart ondersteunt ook toetsenbordbediening. Alleen het adrespunt gebruiken blijft mogelijk, met een uitleg over de beperkte dekking van die keuze.

‘Bewaar mijn dossier’ schrijft de bevestigde antwoorden van de check én aanvraagvoorbereiding expliciet naar localStorage op het apparaat. Zonder deze actie staat het dossier alleen in het geheugen. Bij hervatten wordt de versie en geometrie gevalideerd; oude uitkomsten worden weggegooid en de antwoorden opnieuw bij DSO gecontroleerd. Dossiers van de testomgeving kunnen niet als productiecheck worden hervat. De bezoeker kan het bewaarde dossier verwijderen en beide routes in één tekstbestand downloaden. Niet-bevestigde invoer wordt niet opgeslagen.

Het antwoordtype bepaalt het invoerveld: ook als DSO `invoertype=tekstveld` meegeeft, blijven datums datumvelden en getallen numerieke velden. Keuzeopties volgen de officiële `sequenceId`; de ongewijzigde API-waarde wordt teruggestuurd, los van de leesbare tekst. Uitkomsten bewaren hun toelichting en eventuele aanvraagreferentie, zodat ‘Aanvraag voorbereiden’ de door DSO aangewezen aanvraagactiviteiten kan klaarzetten. Er wordt geen aanvraagreferentie afgeleid door een checkreferentie te herschrijven.

De vergunninghulp toont één vraag tegelijk, met de officiële vraaggroep en activiteit als context. Na elk bevestigd antwoord haalt de site de actuele vragen opnieuw op bij DSO. Antwoorden op vervallen vragen verdwijnen uit de actieve route. Via ‘Uw bevestigde antwoorden’ kan de bezoeker een antwoord wijzigen. Als de waarde verandert, vervallen de daarna gegeven antwoorden en wordt de vervolgroute opnieuw bepaald. Optionele vragen kunnen worden overgeslagen; de uitkomst toont dan dat gegevens ontbreken. Gewijzigde regelbestand-ID's tijdens een lopende check leiden tot herbevestiging van antwoorden. Een verbroken verbinding bewaart de invoer voor een nieuwe poging; sluiten breekt lopende browserverzoeken af.

Check en aanvraagvoorbereiding hebben elk een eigen antwoordgeschiedenis. Alleen officiële conclusies voor vergunning-, meldings- en informatieplicht met een aanvraagreferentie worden voorgeselecteerd voor de aanvraag. Er worden geen nieuwe referenties uit checkreferenties geconstrueerd. De uitkomst toont ‘indienbaar’, ‘compleet’ en ‘aanvraag verzonden’ afzonderlijk: de eerste twee zijn DSO-beoordelingen, de laatste blijft ‘nee’ tot een echte indienkoppeling bestaat.

Vraagtoelichtingen worden als Markdown opgemaakt met kopjes, vet/cursief, lijsten, alinea's en regeleinden. De renderer wordt pas geladen wanneer een toelichting wordt geopend. Ruwe HTML en afbeeldingen worden niet weergegeven, onveilige links worden niet klikbaar en externe links openen zonder het formulier te verlaten.

Zonder sleutel, of bij een fout, worden **geen vergunningvragen of conclusies verzonnen**. De bezoeker krijgt een duidelijke route naar de officiële Vergunningcheck of het aanvragenportaal.

### Afbakening: een aanvraag voorbereiden versus indienen

Uitvoeren services levert vragen, conclusies en de status van indieningsvereisten. Deze API dient zelf geen vergunningaanvraag in. De website bereidt de aanvraag voor en verwijst voor het daadwerkelijk indienen naar het Omgevingsloket. De bevestigde antwoorden worden bij iedere stap daadwerkelijk via onze server naar DSO gestuurd. Dat levert vervolgvragen, conclusies of een compleetheidsbeoordeling op. De website toont hoeveel antwoorden verwerkt zijn. Een los geopend tabblad van het Omgevingsloket neemt deze sessie niet automatisch over; dat staat los van de API-verwerking die al op onze website plaatsvindt. Er is daarmee nog geen formele vergunningaanvraag ingediend.

Voor rechtstreekse indiening vanuit bouwaanhuis is daarnaast de API **Verzoek indienen v5** nodig. Die vereist registratie en acceptatie van de applicatie bij DSO, OpenID Connect-authenticatie van de initiatiefnemer/gemachtigde, een bevoegde-gezagroute, een volledig indienbericht en de afhandeling van documenten en definitieve bevestiging. Hiervoor zijn nog geen aansluitgegevens of authenticatie-infrastructuur aangeleverd. Deze website simuleert deze procedure niet.

De check gebruikt het bevestigde punt of getekende werkgebied en de gekozen werkzaamheden. De zoekresultaten zijn geen complete inventaris van alle werkzaamheden. Ontbrekende herbruikbare beslissingen worden niet zelf ingevuld: als DSO verwijzingen naar gerelateerde werkzaamheden aanlevert, kan de bezoeker de bijbehorende officiële vragen ophalen. Zonder beschikbare gegevens blijft de uitkomst onvolledig. [Het aansluitdossier](docs/dso-indienen.md) beschrijft de nog ontbrekende stappen voor formeel indienen.

### Officiële documentatie

- [Uitvoeren services en OpenAPI v3](https://developer.omgevingswet.overheid.nl/api-register/api/uitvoeren-services/)
- [Toepasbare regels zoeken en OpenAPI v2](https://developer.omgevingswet.overheid.nl/api-register/api/toepasbare-regels-zoeken/)
- [Omgevingsdocument Toepasbaar Opvragen v7](https://developer.omgevingswet.overheid.nl/api-register/api/omgevingsdocument-toepasbaar-opvragen/)
- [Verzoek indienen en registratievoorwaarden](https://developer.omgevingswet.overheid.nl/api-register/api/verzoek-indienen/)
- [Vergunningcheck en aanvraag ontwikkelen](https://developer.omgevingswet.overheid.nl/dso/virtuele-map/vergunningcheck/)
- [PDOK Locatieserver](https://www.pdok.nl/pdok-locatieserver)
- [PDOK BRT Achtergrondkaart en WMTS](https://www.pdok.nl/ogc-webservices/-/article/basisregistratie-topografie-achtergrondkaarten-brt-a-)

## Inhoud en publicatie

bouwaanhuis is de bedrijfsnaam. Het bestaande logo wordt gebruikt. De inspiratiebeelden zijn sfeerbeelden, geen claims over uitgevoerde projecten. Er zijn geen verzonnen beoordelingen, projectaantallen, contactgegevens of keurmerken toegevoegd. De footer bevat uitleg over gegevensgebruik.

De foto's staan lokaal in `public/images/`, afkomstig van Unsplash: `photo-1600607687920-4e2a09cf159d`, `photo-1600210492486-724fe5c67fb0`, `photo-1620626011761-996317b8d101` en `photo-1556912172-45b7abe8b7e1`. Het lettertype Manrope wordt tijdens de build opgehaald en daarna lokaal geserveerd.

Stel vóór een publieke bedrijfsintroductie de definitieve tarieven, bedrijfsidentiteit en contactgegevens vast. Configureer de DSO-sleutel en controleer de koppeling met echte activiteiten in de juiste omgeving. Rechtstreeks indienen is pas mogelijk na het afzonderlijke DSO-aansluittraject. Beperk bij publieke hosting het aantal verzoeken op `/api/omgevingswet` via het hostingplatform om het externe API-quotum te beschermen.
