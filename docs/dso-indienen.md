# Rechtstreeks indienen vanuit bouwaanhuis

De vergunningcheck en aanvraagvragen werken via Uitvoeren services v3. Een formele aanvraag wordt daarmee niet ingediend. De huidige configuratie bevat een API-sleutel voor de vragenservices, maar geen DSO-loginregistratie of indienintegratie. Alleen een knop toevoegen of de bestaande sleutel naar een ander endpoint sturen lost dit niet op.

## Aansluiting aanvragen

Gebruik het officiële [aanmeldformulier voor Verzoek indienen](https://developer.omgevingswet.overheid.nl/formulieren/aanvragen-autorisatie-dso-api-verzoek-indienen/). De aanvraag voor aansluiting is nog niet verstuurd.

Voorstel voor de beschrijving van de toepassing:

> Bouwaanhuis begeleidt particuliere woningverbouwingen. Bezoekers bepalen hun werklocatie, selecteren werkzaamheden en beantwoorden de officiële vragen via Uitvoeren services. We willen vanuit dezelfde toepassing, na authenticatie van de initiatiefnemer of gemachtigde en expliciete controle door die gebruiker, complete vergunningaanvragen, meldingen en informatieverplichtingen met bijlagen indienen en het ontvangen verzoeknummer vastleggen.

Het formulier vraagt bedrijfs- en contactgegevens, applicatienaam, verwachte aantallen aanroepen, piekmomenten en een callback-URL per omgeving. Deze gegevens zijn nog niet vastgesteld. Voorstel voor het pad van de te implementeren callback: `/api/omgevingswet/auth/callback`; het uiteindelijke HTTPS-domein moet overeenkomen met de registratie bij DSO. Dit pad is nog geen werkende loginroute.

DSO stelt registratie op de identity server, aansluitcriteria en een geslaagde acceptatietest verplicht. De via het aansluittraject verstrekte OpenID Connect-instellingen, toegestane scopes en authenticatiemethode moeten worden gebruikt; er zijn geen endpoints of scopes geraden. Secrets horen in de serverconfiguratie, niet in chat, publieke omgevingsvariabelen of de browser.

## Nog te implementeren nadat de aansluitgegevens bekend zijn

1. De geregistreerde OpenID Connect authorization-code-login, met veilige sessies, verzoekbinding en tokenvalidatie. Het dossier moet bij terugkeer uit de login behouden blijven.
2. De werkgeometrie, juridische activiteiten, gebruiker/vertegenwoordiging en de bevoegde overheid vaststellen. Het indienbericht vereist het OIN van het bevoegd gezag; dat kan niet uit alleen een gemeentenaam worden afgeleid.
3. Algemene en activiteitgebonden vragen met hun officiële referenties samenstellen en vlak vóór indienen opnieuw laten beoordelen. In het aanvraagproces worden eventuele machtiging, vertrouwelijkheid en publiceerbaarheid verwerkt.
4. De gebruiker het volledige verzoek en de bijlagen laten controleren. Pas na de indienactie van die gebruiker wordt het proces gestart.
5. `POST /verzoeken` van Verzoek indienen v5 initiëren met het volledige indienbericht. Het antwoord levert een tijdelijke verzoekidentificatie en documentlinks.
6. Werkelijke bestanden naar de geretourneerde documentlinks uploaden en de uitkomsten van controles verwerken. Een documentnaam in een vragenlijst is geen geüpload bestand.
7. Het verzoek via `POST /verzoeken/{verzoekId}` afronden en het ontvangen verzoeknummer vastleggen. De initialisatie alleen is geen indiening. Volgens DSO wordt een niet-afgerond proces na 24 uur afgebroken.
8. Afgebroken authenticatie, verlopen sessies, dubbele klikken, foutieve bestanden en onzekere netwerkuitkomsten testen. Een timeout na een indienactie mag niet blind tot een nieuw verzoek leiden.

De productieomgeving kan pas echte aanvragen ontvangen nadat de technische integratie en het DSO-aansluittraject zijn afgerond. Tot die tijd blijft de website duidelijk over de status: voorbereiding, geen ingediende aanvraag.

## Geraadpleegde primaire bronnen

- [Verzoek indienen v5, proces en authenticatievoorwaarden](https://developer.omgevingswet.overheid.nl/api-register/api/verzoek-indienen/)
- [Officieel contract Verzoek indienen v5](https://service.pre.omgevingswet.overheid.nl/publiek/verzoeken/api/indienen/v5/openapi.json)
- [Uitvoeren services v3](https://developer.omgevingswet.overheid.nl/api-register/api/uitvoeren-services/)
- [Vergunningcheck en aanvraag ontwikkelen](https://developer.omgevingswet.overheid.nl/dso/virtuele-map/vergunningcheck/)
