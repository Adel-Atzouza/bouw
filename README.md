# Plan Bouw

Nederlandstalige website voor een verbouwbedrijf, gebouwd met Next.js 16, React 19 en TypeScript. De huisstijl gebruikt donkerblauw, wit, lichtgrijs en bordeaux. De mobiele versie heeft grote aanraakvlakken, een inklapbaar menu, twee kolommen met werkzaamheden en een vaste knop naar de prijsberekening.

De site gebruikt subtiele scrollanimaties, horizontale overgangen tussen carrouselbeelden en schuivende stappen in de prijsberekening en vergunninghulp. Alle effecten respecteren `prefers-reduced-motion`; inhoud blijft zonder JavaScript zichtbaar en formuliervelden behouden hun antwoorden bij het navigeren.

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

## Prijsberekening

De drie stappen vragen naar werkzaamheden, omvang, afwerking en een eventuele constructieve aanpassing. De berekening is direct beschikbaar zonder persoonsgegevens en de bezoeker kan de indicatie als verzorgde A4-pdf in de huisstijl downloaden. De pdf bevat de prijsbandbreedte, gemaakte keuzes, inbegrepen en uitgesloten kosten, vergunningstatus en een link naar de officiële Vergunningcheck. De prijs is inclusief de in het model meegerekende btw, materiaal en arbeid.

De pdf wordt met jsPDF volledig in de browser opgebouwd; de bibliotheek wordt pas geladen wanneer de bezoeker op downloaden klikt. De vormgeving staat in `lib/estimate-pdf.ts`. De download gebruikt dezelfde rekenfunctie als de website en verstuurt geen gegevens naar de server.

**De tarieven in `lib/pricing.ts` zijn voorlopige demonstratietarieven, geen geverifieerde marktprijzen of bindende offertes.** Laat Plan Bouw deze vóór commercieel gebruik vaststellen. Beide grensbedragen gebruiken `(omvang × eenheidstarief + vaste kosten) × afwerkingsfactor + constructietoeslag`, afgerond op € 500. De configuratie bevat aparte tarieven en grenzen voor elke werkzaamheid.

Vergunningen, leges, tekeningen, constructieberekeningen, asbestsanering en onvoorziene gebreken zijn uitgesloten. De site en het downloadbestand vermelden dat een definitieve offerte een opname en uitgewerkte specificatie vereist.

## Omgevingswet-integratie

Vul in `.env.local` een eigen `DSO_API_KEY` in. De sleutel wordt alleen op de server gebruikt en komt niet in de browserbundel. Start de server opnieuw na het aanpassen van omgevingsvariabelen.

`DSO_ENVIRONMENT=production` gebruikt de productieomgeving. Met `DSO_ENVIRONMENT=preproduction` gebruikt de site de pre-productieomgeving en toont de vragenlijst expliciet dat de resultaten niet geschikt zijn voor een echte vergunningcheck.

De serverroute `app/api/omgevingswet/route.ts` biedt:

- `GET`: beschikbaarheid en gekozen omgeving, zonder de sleutel te tonen.
- `POST`, actie `address`: postcode en huisnummer zoeken met de openbare PDOK Locatieserver; de bezoeker bevestigt het volledige adres, inclusief eventuele toevoeging. De RD-coördinaten worden gebruikt met `Content-Crs: EPSG:28992`.
- `POST`, actie `search`: officiële werkzaamheden of activiteiten zoeken met de Zoekinterface v2. De bezoeker kiest zelf de relevante resultaten.
- `POST`, actie `execute`: officiële vragen ophalen en antwoorden terugsturen via Uitvoeren services v3 (`conclusie/_bepaal` of `indieningsvereisten/_bepaal`).
- `POST`, actie `help`: toelichtingen bij de officiële vragen ophalen.

De vragenlijst ondersteunt ja/nee, getallen, tekst, datums, enkele/meerdere lijstkeuzes en geografische antwoorden. Datums worden verstuurd als `dd-MM-yyyy`, booleans als `true`/`false` en meerdere lijstwaarden als een door komma-spatie gescheiden string. Voorbehouden, ontbrekende regels, bijlagen en ontbrekende uitkomsten blijven zichtbaar. De gebruiker kan zijn voorbereiding downloaden. Antwoorden worden alleen in het geheugen van de browser bewaard, niet in een database of localStorage. De server stuurt `no-store` en logt geen aanvraaginhoud.

Zonder sleutel, of bij een fout, worden **geen vergunningvragen of conclusies verzonnen**. De bezoeker krijgt een duidelijke route naar de officiële Vergunningcheck of het aanvragenportaal.

### Afbakening: een aanvraag voorbereiden versus indienen

Uitvoeren services levert vragen, conclusies en de status van indieningsvereisten. Deze API dient zelf geen vergunningaanvraag in. De website bereidt de aanvraag voor en verwijst voor het daadwerkelijk indienen naar het Omgevingsloket. De bezoeker krijgt expliciet te zien dat antwoorden niet automatisch worden overgezet en dat niets is ingediend.

Voor rechtstreekse indiening vanuit Plan Bouw is daarnaast de API **Verzoek indienen v5** nodig. Die vereist registratie en acceptatie van de applicatie bij DSO, OpenID Connect-authenticatie van de initiatiefnemer/gemachtigde, een bevoegde-gezagroute, een volledig indienbericht en de afhandeling van documenten en definitieve bevestiging. Hiervoor zijn nog geen aansluitgegevens of authenticatie-infrastructuur aangeleverd. Deze website simuleert deze procedure niet.

De huidige check gebruikt het adrespunt en de door de bezoeker geselecteerde werkzaamheden. Voor een volledige beoordeling van bijvoorbeeld een uitbouw achter op een perceel moeten de exacte werkgeometrie en alle activiteiten worden gecontroleerd in het Omgevingsloket. Er is daarom altijd een route naar de officiële kaart en de volledige check. Aanvraagactiviteiten worden op zoekterm aangeboden; de site beweert niet dat de zoekresultaten een complete, lokaal gefilterde activiteiteninventaris zijn.

### Officiële documentatie

- [Uitvoeren services en OpenAPI v3](https://developer.omgevingswet.overheid.nl/api-register/api/uitvoeren-services/)
- [Toepasbare regels zoeken en OpenAPI v2](https://developer.omgevingswet.overheid.nl/api-register/api/toepasbare-regels-zoeken/)
- [Verzoek indienen en registratievoorwaarden](https://developer.omgevingswet.overheid.nl/api-register/api/verzoek-indienen/)
- [Vergunningcheck en aanvraag ontwikkelen](https://developer.omgevingswet.overheid.nl/dso/virtuele-map/vergunningcheck/)
- [PDOK Locatieserver](https://www.pdok.nl/pdok-locatieserver)

## Inhoud en publicatie

Plan Bouw is de opgegeven tijdelijke bedrijfsnaam. De inspiratiebeelden zijn sfeerbeelden, geen claims over uitgevoerde projecten. Er zijn geen verzonnen beoordelingen, projectaantallen, contactgegevens of keurmerken toegevoegd. De footer bevat uitleg over gegevensgebruik.

De foto's staan lokaal in `public/images/`, afkomstig van Unsplash: `photo-1600607687920-4e2a09cf159d`, `photo-1600210492486-724fe5c67fb0`, `photo-1620626011761-996317b8d101` en `photo-1556912172-45b7abe8b7e1`. Het lettertype Manrope wordt tijdens de build opgehaald en daarna lokaal geserveerd.

Stel vóór een publieke bedrijfsintroductie de definitieve tarieven, bedrijfsidentiteit en contactgegevens vast. Configureer de DSO-sleutel en controleer de koppeling met echte activiteiten in de juiste omgeving. Rechtstreeks indienen is pas mogelijk na het afzonderlijke DSO-aansluittraject. Beperk bij publieke hosting het aantal verzoeken op `/api/omgevingswet` via het hostingplatform om het externe API-quotum te beschermen.
