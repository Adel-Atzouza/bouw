# bouwregieaanhuis

Nederlandstalige website voor een verbouwbedrijf, gebouwd met Next.js 16, React 19 en TypeScript. De huisstijl gebruikt donkerblauw, wit, lichtgrijs en bordeaux. De mobiele versie heeft grote aanraakvlakken, een inklapbaar menu, een productoverzicht en een compacte contactknop in de vaste header.

De site gebruikt subtiele scrollanimaties, horizontale overgangen tussen carrouselbeelden en schuivende stappen in de vergunninghulp. Alle effecten respecteren `prefers-reduced-motion`; inhoud blijft zonder JavaScript zichtbaar en formuliervelden behouden hun antwoorden bij het navigeren.

Op brede desktops groeien typografie, knoppen en inhoud via `rem`-maten geleidelijk tot 133% van de oorspronkelijke schaal; de mobiele maten blijven behouden.

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

## Productoverzicht en contact

De homepage zet complete renovaties en de begeleiding van het hele traject voorop. De zes aanvullende diensten zijn aan-/uitbouw, badkamer, keuken, dakopbouw, binnenafwerking en bouwtekeningen & vergunningen. De laatste dienst is ook los aan te vragen, met gerichte vragen over tekeningen en vergunningbegeleiding. Dakkapellen zijn verwijderd uit het aanbod, de opnameroutes en de suggesties voor de vergunningcheck.

`components/quote-request.tsx` biedt twee ingangen naar dezelfde aanvraag: een normaal contactformulier voor complete renovaties en een korte offertevragenlijst voor de overige werkzaamheden. De offertevragen behandelen project, wensen en planning; technische antwoorden zijn optioneel. Een blijvend zichtbare knop ‘Liever persoonlijk contact’ opent onmiddellijk het contactformulier, ook vanuit de vergunninghulp. Ingevoerde offerteantwoorden, contactgegevens en bestanden blijven tijdens het wisselen behouden. Niet-verzonden invoer blijft alleen tijdens dit bezoek beschikbaar. Na versturen staat de aanvraag met de bijlagen op de server.

Het formulier vraagt naam, e-mailadres en een omschrijving. Telefoonnummer, plaats en foto's/PDF zijn optioneel. Maximaal 10 bestanden, 20 MB per bestand en 100 MB samen. Beide routes gebruiken `/api/intake`. De API slaat de aanvraag en de oorspronkelijke bijlagen eerst privé op de server op en geeft daarna een ontvangstbewijs terug. Technische intakevragen en een e-mailkoppeling zijn daarvoor niet nodig. Het klantformulier heeft geen download- of bewaarknop. Een opslagfout toont een herstelbare fout en nooit een geslaagde ontvangst.

De contactgegevens staan centraal in `lib/contact.ts`. De tijdelijke voorbeeldgegevens zijn **020 000 0000** en **info@bouwregieaanhuis.example**; vervang deze vóór gebruik door `NEXT_PUBLIC_CONTACT_PHONE` en `NEXT_PUBLIC_CONTACT_EMAIL` in te stellen en opnieuw te bouwen. Het `.example`-adres ontvangt geen e-mail. De server ontvangt aanvragen zonder e-mailconfiguratie. Met `INTAKE_WEBHOOK_URL` en `INTAKE_WEBHOOK_TOKEN` kunt u ze aanvullend laten doorsturen; zie hieronder.

De oudere gedetailleerde opnamecomponenten blijven in de broncode beschikbaar maar worden niet door de homepage geladen. Onderstaande opnamedocumentatie beschrijft die implementatie.

## Eerdere online opname en prijsindicatie (niet op de homepage)

De calculator is een begeleide opname met meerdere werkzaamheden: aan-/uitbouw, dakopbouw, badkamer, keuken, binnenafwerking en totale renovatie. Woninggegevens worden één keer gevraagd. De vragen staan in `lib/intake.ts`; de weergave in `components/calculator.tsx`, `components/intake-question.tsx` en `components/intake-review.tsx`.

Vervolgvragen volgen de gemaakte keuzes. Binnenafwerking wordt per benoemde ruimte en werkzaamheid uitgevraagd. Totale renovatie opent dezelfde deelroutes zonder duplicaten. Exclusieve antwoorden zoals ‘Weet ik niet’ kunnen niet met inhoudelijke antwoorden gecombineerd worden. Niet-relevante antwoorden blijven beschikbaar bij teruggaan, maar verschijnen niet in het actieve overzicht of de export.

Afmetingen zijn leeg totdat de bezoeker ze invult. Onbekende maten, productkeuzes en tarieven worden niet als nul of een standaardwaarde ingevuld. Badkameroppervlakken worden voor rechthoekige ruimtes uitgerekend, inclusief verschillende tegelhoogtes; aftrek van deuren/ramen blijft onbekend totdat die is opgegeven. Materiaalverlies wordt apart beoordeeld. Binnenafwerking onderscheidt m², strekkende meters en aantallen, berekent desgewenst uit ruimtematen en markeert geschatte hoeveelheden.

**De bestaande tarieven in `lib/pricing.ts` blijven voorlopige demonstratietarieven, geen geverifieerde marktprijzen of vaste offertes.** Een bandbreedte verschijnt alleen bij een geschikte bekende omvang en gekozen kwaliteitsniveau. De ingevulde details vormen de verdere calculatie; niet iedere productkeuze is al geprijsd. Voor dakopbouw en de afzonderlijke binnenafwerkingsdiensten zijn nog geen bedrijfstarieven aangeleverd. `finishingRates` in `lib/intake.ts` gebruikt daarom `null`; vul alleen vastgestelde tarieven inclusief btw in en werk bijbehorende voorbereiding, materiaal- en uitvoeringsregels uit voordat u vaste offertes aanbiedt. Keukenlevering volgt de partner, met bouwkundige voorbereiding en montage afzonderlijk. Bij totale renovatie worden deelindicaties niet bij de totale bandbreedte opgeteld.

Dakopbouw en totale renovatie vragen technische/integrale beoordeling. Binnenafwerking kan op afstand verder; badkamer en keuken worden afhankelijk van het dossier beoordeeld. ‘Concept’ is geen ontvangen aanvraag, geboekte afspraak of complete calculatie.

### Opslaan, bijlagen en downloaden

‘Bewaar mijn opname’ slaat het concept, de antwoorden en de echte `File`-objecten expliciet op in IndexedDB op hetzelfde apparaat. Een herladen pagina biedt hervatten of verwijderen aan. Bewaren deelt niets met de server en werkt niet tussen apparaten. De limieten zijn 20 MB per bestand en 100 MB per dossier. Foto's (ook HEIC/HEIF) en PDF zijn toegestaan; opslag- en uploadfouten worden zichtbaar gemeld. Browseropslag kan door de gebruiker of browser worden gewist; een download blijft daarom nuttig.

De PDF in de huisstijl wordt met jsPDF in de browser gemaakt, met paginering voor lange dossiers. Dezelfde actieve antwoorden en prijslogica worden voor de tekstexport gebruikt. Beide bevatten bijlagenamen, niet de bestanden zelf. Bij online versturen gaan de oorspronkelijke bestanden wel mee. Alleen bij zelf delen per e-mail moet de klant de bestanden apart toevoegen. Na bevestigde ontvangst bevat de download ook het aanvraagnummer en de ontvangstdatum; de PDF-voettekst vermeldt dan geen conceptstatus meer.

### Afspraken, contact en partners

Optionele publieke instellingen in `.env.local` (opnieuw bouwen na wijzigen):

- `NEXT_PUBLIC_BOOKING_URL`: HTTPS-link naar de echte agenda voor locatieopnames.
- `NEXT_PUBLIC_SHOWROOM_URL`: HTTPS-link naar de agenda van de keukenpartner.
- `NEXT_PUBLIC_CONTACT_EMAIL`: het echte e-mailadres; opent een concept in het e-mailprogramma van de klant.

Zonder deze gegevens toont de site een downloadbaar dossier en meldt dat online tijdsloten nog niet beschikbaar zijn. Er worden geen fictieve tijden, prijzen, producten of bevestigingen getoond. Een externe agenda moet werkgebied, duur, kosten, reservering en bevestiging afhandelen. Gegevens worden niet automatisch naar die agenda verzonden. Voor een productcatalogus en geïntegreerde reserveringen is nog een bijbehorende bedrijfsintegratie nodig. Online aanvragen gebruiken de ontvangstdienst hieronder.

### Aanvraag ontvangen, bewaren en terugvinden

`POST /api/intake` valideert contactgegevens, toestemming, werkzaamheden en bijlagen. Alleen actieve antwoorden en bestanden worden opgeslagen. De limieten zijn 100 bestanden, 20 MB per bestand en 100 MB samen (het korte klantformulier beperkt de selectie tot 10 bestanden). Stem de uploadlimiet van de hosting hierop af.

De standaard opslaglocatie is `.data/intakes/` buiten `public/`, uitgesloten van Git. Stel `INTAKE_STORAGE_DIR` op de productieserver in op een **blijvend beschikbare, geback-upte schijf**, bijvoorbeeld `/var/lib/bouwregieaanhuis/intakes`. De Node-server moet daar kunnen schrijven. Deze filesystemopslag is bedoeld voor een server met blijvende schijfruimte; een tijdelijke/serverless schijf of een map die bij elke deployment vervangen wordt is daarvoor niet geschikt. Gebruik bij meerdere serverinstanties dezelfde opslag. Er is geen openbaar endpoint om aanvragen of foto's terug te lezen.

Elke aanvraag krijgt een map `BAH-…` met:

- `intake.json`: contactgegevens, antwoorden, ontvangsttijd, toestemming en bijlagenlijst.
- `dossier.txt`: een leesbare samenvatting voor het bedrijf.
- `attachment-001.jpg` enzovoort: de oorspronkelijke bijlagen; de oorspronkelijke bestandsnamen staan in `intake.json`.
- `delivery.json`: status van de optionele doorsturing (`pending` of `delivered`) en pogingen.

Bestanden worden met beperkte rechten geschreven en gesynchroniseerd. Een tijdelijke map wordt pas na volledige opslag atomair gepubliceerd; daarna volgt de ontvangstbevestiging. Herhaalde of gelijktijdige identieke verzoeken krijgen hetzelfde kenmerk en ontvangsttijdstip. Een opslagfout geeft HTTP 503 en behoudt de invoer in het geopende formulier voor opnieuw proberen.

Bekijk aanvragen op de server vanuit deze checkout met Node.js 22.15 of hoger:

```bash
npm run intakes -- list
npm run intakes -- show BAH-0123456789ABCDEF
```

Deze beheercommando's laden `.env` en `.env.local`. Ze vereisen toegang tot de server; er komt geen onbeveiligde beheerpagina bij. Foto's staan in de aanvraagmap. Back-ups, bewaartermijnen en opruimen worden door de beheerder van de server geregeld.

### Optionele doorsturing en later opnieuw proberen

Na opslag probeert de server aanvullend door te sturen als `INTAKE_WEBHOOK_URL` (HTTPS) en `INTAKE_WEBHOOK_TOKEN` zijn ingesteld. Een ontbrekende verbinding of e-mailstoring verandert niets aan de opgeslagen aanvraag of de ontvangstbevestiging voor de klant. Zonder koppeling blijft de doorstuurstatus `pending`.

De ontvangstdienst krijgt multipart-formdata met `Authorization: Bearer <token>` en `Idempotency-Key: BAH-…`: `reference`, `intake` (JSON), `dossier` en herhaalde `file:<vraag-id>`-velden. De dienst moet retries ontdubbelen en na succesvolle verwerking antwoorden met:

```json
{ "accepted": true, "reference": "BAH-<16 hoofdletter hextekens uit de aanvraag>", "receivedAt": "2026-11-05T12:00:00.000Z" }
```

Zonder geldige bevestiging blijft de status `pending`. Na het aansluiten of herstellen van de ontvangstdienst kunt u eerdere aanvragen alsnog doorsturen:

```bash
npm run intakes -- retry-pending
```

Dit commando kan ook door de serverbeheerder periodiek worden ingepland. Er is nog geen automatische e-maildienst of scheduler geconfigureerd. De klant ziet na echte opslag een aanvraagnummer en de normale vervolgstappen; er wordt geen verzonden e-mail of vaste reactietermijn beloofd.

### Vergunningcheck vanuit de opname

De bestaande vergunningdialoog ontvangt de postcode en het huisnummer, waarna de klant het volledige adres bevestigt. Bij sluiten kan een beschikbare conclusie aan het betreffende onderdeel worden toegevoegd, inclusief onvolledigheids- en testomgevingswaarschuwingen. De conclusie wordt niet omgezet in een verzonnen vergunningstatus. Een voorstel voor begeleiding is nog geen opdracht of formele indiening.

### Controles

Gebruik Node.js 22.15 of hoger voor de testloader. `pnpm test` controleert vertakkingen, exclusieve opties, onbekende maten, ontdubbelde renovatieroutes, oppervlaktes en dossierexport. `tests/dso-api.test.mjs` controleert daarnaast dat bevestigde antwoorden met hun officiële vraag-ID naar het juiste DSO-endpoint gaan en dat gewijzigde antwoorden geen achterhaalde vervolgantwoorden meesturen. `pnpm lint` en `pnpm exec tsc --noEmit` controleren de broncode. De desktop- en mobiele browserroutes zijn ook gecontroleerd, inclusief lokaal bewaren/hervatten met bijlagen en downloaden.

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

Voor rechtstreekse indiening vanuit bouwregieaanhuis is daarnaast de API **Verzoek indienen v5** nodig. Die vereist registratie en acceptatie van de applicatie bij DSO, OpenID Connect-authenticatie van de initiatiefnemer/gemachtigde, een bevoegde-gezagroute, een volledig indienbericht en de afhandeling van documenten en definitieve bevestiging. Hiervoor zijn nog geen aansluitgegevens of authenticatie-infrastructuur aangeleverd. Deze website simuleert deze procedure niet.

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

bouwregieaanhuis is de bedrijfsnaam. Het woordmerk toont de nieuwe naam bij het huisicoon. Bestaande browseropslag houdt zijn oorspronkelijke sleutel zodat bewaarde dossiers beschikbaar blijven. De inspiratiebeelden zijn sfeerbeelden, geen claims over uitgevoerde projecten. Er zijn geen verzonnen beoordelingen, projectaantallen of keurmerken toegevoegd. De contactgegevens zijn tijdelijk als voorbeeld ingevuld op verzoek; zie de contactinstellingen hierboven. De footer bevat uitleg over gegevensgebruik.

De foto's staan lokaal in `public/images/`, afkomstig van Unsplash: `photo-1600607687920-4e2a09cf159d`, `photo-1600210492486-724fe5c67fb0`, `photo-1620626011761-996317b8d101` en `photo-1556912172-45b7abe8b7e1`. Het lettertype Manrope wordt tijdens de build opgehaald en daarna lokaal geserveerd.

Stel vóór een publieke bedrijfsintroductie de definitieve tarieven, bedrijfsidentiteit en contactgegevens vast. Configureer de DSO-sleutel en controleer de koppeling met echte activiteiten in de juiste omgeving. Rechtstreeks indienen is pas mogelijk na het afzonderlijke DSO-aansluittraject. Beperk bij publieke hosting het aantal verzoeken op `/api/omgevingswet` via het hostingplatform om het externe API-quotum te beschermen.
