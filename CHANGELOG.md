## v1.40
- Voorkomt onveilige wijziging van spelers-e-mail zonder bijbehorende Firebase Authentication-wijziging.
- Heldere foutmelding voor beheerders.
- Cache en versienummer vernieuwd.
- Jens’ inlogadres is nog niet gewijzigd; hiervoor is een aparte beveiligde administratieve stap nodig.

## v1.39
- Duidelijkere Nederlandse herstelmelding.
- Optionele eigen herstelpagina in clubstijl (Firebase-console-instelling vereist).
- Geen wijzigingen aan Firestore-regels of competitiegegevens.

## v1.38
- WhatsApp Invaller gezocht toont alleen vaste spelers die voor de gekozen zaterdag expliciet op Reserve staan en nog niet invallen; geen automatische opname van alle geregistreerde reserves.
- Dubbele namen in het reserveoverzicht voorkomen.
- Beheerders in dit WhatsApp-bericht: Eric Rijkers, Carl ter Beek en Rinze Hogeterp; Carel Jacobs wordt niet getoond.
- Firestore-regels ongewijzigd.

# Changelog

## v1.38
- WhatsApp-knop **Invaller gezocht** bij Beheer → Indeling, met actuele openstaande koppels, niet-ingedeelde reserves, al ingezette reserves en beheerders.
- Compacte instructies voor koppels (eerst zelf zoeken, daarna hulp vragen) en reserves (bij verhindering Afwezig kiezen).
- WhatsApp-voorbeeld blijft bewerkbaar en verandert geen competitiegegevens of publicatiestatus.
- Bekende naamafwijking `Martijnb` wordt als `Martijn` weergegeven.
- Firestore-regels ongewijzigd ten opzichte van v1.36.

## v1.36
- Home → Overzicht beheerder meldt nu ook dubbele inzet van dezelfde speler.
- Verwijderen van een goedgekeurde vervanger is afgeschermd tot uitsluitend de betreffende speeldag; keuzes op andere speeldata blijven onaangeroerd.
- Bij een vaste invaller wordt alleen het bron-koppel op diezelfde speeldag vrijgegeven, met een beperkte fallback voor oudere gegevens.
- Firestore-regels inhoudelijk ongewijzigd ten opzichte van v1.35.

## v1.35
- Beheerder kan per speeldag een koppel kiezen en de geldende status Speelt / Reserve / Afwezig aanpassen.
- Bij beide spelers afwezig kan vanuit dezelfde beheerkaart direct een vervanger worden vastgelegd.
- Mijn koppel meldt wanneer de spelerskeuze door een beheerder is aangepast.
- Teller “Invallen dit seizoen” herkent daadwerkelijk gespeelde invalbeurten robuuster via gepubliceerde baanindelingen.
- Firestore-regels inhoudelijk ongewijzigd ten opzichte van v1.34.

## v1.34
- Home → Koppels ingevuld toont per koppel: Speelt, Reserve/Afwezig en eventuele vervanger.
- Home → Laatste uitslag gebruikt verkorte spelersnamen.
- Beheer → Indeling heeft één knop “Indeling maken”; bij opnieuw indelen verschijnt eerst een waarschuwing.
- Beheerweergave, publicatiewerking, WhatsApp, uitslagenlogica en Firestore-regels zijn verder niet gewijzigd.

## v1.33
- Meer → Spelers & reserves toont het bestaande telefoonnummer onder iedere vaste speler en reserve, indien ingevuld.
- Mijn koppel kan een goedgekeurde vervanger vóór de sluitingstijd zelf verwijderen, met bevestiging; een vaste speler die inviel wordt daarbij weer vrijgegeven.
- Home → Koppels ingevuld gebruikt korte namen: voornaam, en alleen bij dubbele voornamen een onderscheidende achternaaminitiaal/-afkorting.
- Firestore-regels uitgebreid voor het gecontroleerd verwijderen/vrijgeven van een goedgekeurde vervanger.
- Versie- en cacheverwijzingen bijgewerkt naar v1.33.


## v1.32
- Correctietermijn voor de oorspronkelijke invoerder van een uitslag vastgezet op 48 uur vanaf de eerste invoer; daarna alleen beheerder.
- `enteredAt` blijft bij correcties ongewijzigd en Firestore dwingt de 48-uursgrens af.
- Home → Koppels ingevuld toont beschikbare vaste spelers die Reserve kozen en nog niet als invaller zijn ingezet; als niemand beschikbaar is volgt advies om een reserve buiten de vaste groep te benaderen.
- Beheer → Indeling toont voornamen; dubbele voornamen blijven onderscheidend met initiaal/afkorting.
- Dubbele inzet van dezelfde persoon wordt gemarkeerd als fout, ook bij Beheer → Indeling; publiceren wordt geblokkeerd zolang de dubbeling bestaat.
- Beheerder krijgt een extra bevestiging voordat een zelf gekozen vervanger direct als goedgekeurd wordt vastgelegd.
- Versie- en cacheverwijzingen bijgewerkt naar v1.32.

## v1.31
- Bestaande uitslagen worden in Beheer → Uitslagen automatisch in het invoerformulier geladen bij selectie van de baan.
- De oorspronkelijke speler die een uitslag invoerde kan die uitslag zelf opnieuw openen en corrigeren.
- Andere spelers kunnen een reeds opgeslagen uitslag niet wijzigen; beheerders behouden volledige correctierechten.
- Rangschikking bij gelijke punten gebruikt nu gamesaldo (games voor min games tegen) in plaats van alleen gewonnen games.
- Stand toont Gamesaldo in plaats van Games.
- Firestore-regels en versie/cache bijgewerkt naar v1.31.

## v1.30
- Uitslaginvoer op **Zaterdag** beschikbaar gemaakt voor iedere actieve vaste speler en reservespeler zolang voor die baan nog geen uitslag is opgeslagen.
- Na opslaan blijft de uitslag voor spelers vergrendeld; alleen beheerders kunnen corrigeren of verwijderen.
- Firestore-regels gericht aangepast voor deze uitslaginvoer.
- Versie- en cacheverwijzingen bijgewerkt naar v1.30.

## v1.29
- Publiceren van een baanindeling is uitgesteld tot het moment waarop in het WhatsApp-voorbeeld op **Open WhatsApp** wordt gedrukt.
- **Annuleren** in het WhatsApp-voorbeeld publiceert niets en wijzigt de bestaande publicatiestatus niet.
- WhatsApp bepaalt dubbele voornamen alleen op basis van de spelerslijst en telt dezelfde speler niet nogmaals vanuit de baanindeling mee. Daardoor krijgt Rinze geen onterechte `H.` meer.
- De v1.28-servercontrole voor de actuele publicatiestatus op Home en Zaterdag blijft behouden.
- Firestore-regels inhoudelijk ongewijzigd.

## v1.28
- Na **Publicatie ongedaan maken** lezen Home en Zaterdag de actuele publicatiestatus rechtstreeks van de server, zodat een ingetrokken indeling niet uit cache zichtbaar blijft voor spelers.
- De opgeslagen baanindeling blijft voor de beheerder behouden voor herpublicatie.
- WhatsApp gebruikt voor echte dubbele voornamen dezelfde achternaaminitiaal als Home.
- Firestore-regels inhoudelijk ongewijzigd.

## v1.27
- Release opgebouwd uit de door de gebruiker aangeleverde actuele v1.26-bestanden.
- Versie- en cacheverwijzingen bijgewerkt naar v1.27.
- Geen inhoudelijke wijziging aan Firestore-regels.

## v1.26
- Na bewust publiceren opent direct het WhatsApp-voorbeeld met de baanindeling, klaar om naar de groep te sturen.
- Nieuwe knop **Publicatie ongedaan maken** verbergt een gepubliceerde baanindeling weer voor spelers.
- De laatst gemaakte baanindeling blijft voor de beheerder bewaard en wordt bij opnieuw openen hersteld.
- Opnieuw publiceren maakt de indeling weer zichtbaar voor iedereen.
- Firestore-regels inhoudelijk ongewijzigd ten opzichte van v1.25.
- Versie/cache bijgewerkt naar v1.26.

## v1.25
- Bij een al gepubliceerde baanindeling heet de publicatieknop nu **Wijzigingen zichtbaar maken voor iedereen**.
- Wijzigingen aan de indeling worden pas voor spelers zichtbaar nadat de beheerder opnieuw publiceert.
- De bevestiging na opnieuw publiceren meldt duidelijk dat de wijzigingen zichtbaar zijn.
- Firestore-regels inhoudelijk ongewijzigd ten opzichte van v1.24.
- Versie/cache bijgewerkt naar v1.25.

## v1.24
- Fout bij **+ Nieuwe reserve** opgelost voor de hoofdbeheerder.
- Synchronisatie van e-mailtoegang leest niet langer de volledige `accessEmails`-collectie uit; dat was volgens de bestaande Firestore-regels bewust niet toegestaan.
- Nieuwe toegestane e-mailhashes worden nu rechtstreeks toegevoegd, waarna reserve en publieke spelerslijst normaal kunnen worden opgeslagen/bijgewerkt.
- Firestore-regels inhoudelijk ongewijzigd ten opzichte van v1.23.
- Versie/cache bijgewerkt naar v1.24.

## v1.23
- Knop **+ Nieuwe reserve** toegevoegd bij Beheer → Spelers & koppels → Reserves.
- Nieuwe reserve kan direct met naam, e-mail, telefoon, enkelspelvoorkeur en speelsterkte worden toegevoegd.
- Publieke spelerslijst wordt na toevoegen automatisch bijgewerkt.
- Hoofdbeheerder synchroniseert daarbij ook de e-mailtoegang voor accountactivatie.
- Firestore-regels inhoudelijk ongewijzigd ten opzichte van v1.22.
- Versie/cache bijgewerkt naar v1.23.

## v1.22
- Voorkomt dat `substituteForCouple*`-informatie verdwijnt bij het wijzigen van de eigen spelerskeuze.
- Mijn koppel herkent bestaande goedgekeurde invallers ook via de doel-koppelplannen, zodat oudere verdwenen bronmarkeringen niet meer tot een ontbrekende melding leiden.
- Vaste invaller wordt waar veilig automatisch als Reserve in het eigen koppel gemarkeerd.
- Firestore-updatevalidatie aangepast: spelers mogen alleen de normale koppelkeuzevelden wijzigen; beheerder-invallergegevens blijven onaangeroerd.
- Versie/cache bijgewerkt naar v1.22.

## v1.21
- Toekomstige spelerskeuzes uitgebreid met een overzicht van goedgekeurde invallers onder de tabel.
- Het overzicht vermeldt datum, invaller en het koppel waarvoor die persoon invalt.
- De blauwe I-indicator in de tabel blijft behouden.
- Versie/cache bijgewerkt naar v1.21.

## v1.20
- Mijn koppel robuuster gemaakt tegen vastlopende Firebase-reads.
- Timeout toegevoegd aan noodzakelijke reads.
- Fouten op individuele koppelplannen blokkeren de pagina niet meer.
- Privé-opmerkingen en historische invalstatistieken laden los van het hoofdscherm.
- Duidelijke foutmelding en Opnieuw proberen als basisgegevens niet geladen kunnen worden.
- Firestore-regels ongewijzigd.

## v1.19
- `Mijn koppel` gerepareerd voor gewone spelers: de pagina leest geen afgeschermde `/players`-documenten meer tijdens het laden.
- Foutafhandeling toegevoegd zodat `Mijn koppel` niet eindeloos op `Laden…` blijft staan.
- Knop `Opnieuw proberen` toegevoegd bij een laadfout.
- Geen wijziging aan Firestore-regels nodig.

## v1.18
- Privé-opmerking uit de smalle spelersnaamkolom gehaald en over de beschikbare kaartbreedte geplaatst.
- Mobiele layout aangepast zodat label, invoerveld en opslagmelding leesbaar blijven.
- Automatisch opslaan en privacyregels blijven ongewijzigd.
- Cache- en bestandsversies gelijkgetrokken naar v1.18.

## v1.17
- Privé-opmerking gewijzigd van een meerregelig tekstvak naar een compact invoerveld van één regel.
- Automatisch opslaan en bestaande privacyregels blijven ongewijzigd.
- Cache- en bestandsversies gelijkgetrokken naar v1.17.

## v1.16
- Privé-opmerkingenveld bij de eigen speler hersteld met extra koppeling op het ingelogde e-mailadres.
- Bestaande privé-opmerkingen blijven op dezelfde beveiligde Firestore-locatie staan.
- Versie- en cacheverwijzingen bijgewerkt naar v1.16.

## v1.15
- Privé-opmerking bij de eigen speler onder Mijn koppel hersteld.
- Eigen speler wordt weer robuust herkend via speler-ID met een veilige naamfallback binnen het gekoppelde koppel.
- Bestaande privé-opmerkingen blijven op dezelfde Firestore-locatie staan en worden opnieuw zichtbaar.
- README en cache-/bestandsversies bijgewerkt naar v1.15.

## v1.14
- Klikdetails op de drie Home-overzichtsvakken gerepareerd; handlers worden nu pas gekoppeld nadat Home volledig is gerenderd.
- Klikdetails op de vier vakken bij Beheer → Indeling robuuster gemaakt en voorzien van automatisch doorscrollen naar de geopende informatie.
- Het geselecteerde overzichtsvak krijgt een duidelijke actieve markering; opnieuw tikken sluit de details.
- Detailinformatie werkt ook wanneer een teller 0 is.
- Alle versiequery's in index.html en de service-worker zijn gelijkgetrokken naar v1.14 om oude gecachte assets te voorkomen.
- README en CHANGELOG bijgewerkt zodat ze overeenkomen met de werkelijke inhoud van v1.14.
- Geen nieuwe Firestore-regels nodig.

## v1.13
- De functie **Meerdere zaterdagen invullen** is volledig uit de code verwijderd.
- De drie overzichtsvakken op Home zijn weer aanklikbaar en tonen de bijbehorende spelers/koppels.
- De vier overzichtsvakken bij Beheer → Indeling zijn aanklikbaar en tonen detailinformatie, ook wanneer de teller 0 is.
- Een speelzaterdag aan- of uitvinken wijzigt niet meer direct Firestore. De wijziging wordt pas opgeslagen via **Algemene instellingen opslaan**.
- Bij het uitschakelen van één of meer actieve speeldagen volgt vóór opslaan een extra bevestiging.

## v1.12
- Toekomstige spelerskeuzes toegevoegd onder Meer voor alle ingelogde spelers.
- Publieke weergave is alleen-lezen en gebruikt het bestaande publieke rooster plus de toegankelijke spelerskeuzes.
- Beheerweergave blijft bestaan.
- Cache- en assetversies gelijkgetrokken naar v1.12.

## v1.11
- Meerdere open speelzaterdagen tegelijk invullen via Mijn koppel.
- Een individuele keuze Afwezig kan worden bewaard terwijl de partner nog niet heeft gekozen.
- Home toont bij Vervanger gezocht eerst het koppelnummer.
- Verkorte namen gebruiken alleen een achternaam-initiaal wanneer dezelfde voornaam bij vaste spelers/reserves meer dan één keer voorkomt.
- Firestore-regels aangepast voor de gedeeltelijke Afwezig-keuze.
- Cache- en appversie verhoogd naar v1.11.

## v1.10
- Home zoekt nu over alle toekomstige speeldagen naar koppels die beide afwezig zijn en nog geen goedgekeurde vervanger hebben.
- De melding “🔎 Vervanger gezocht” is daardoor niet langer beperkt tot alleen de eerstvolgende zaterdag.
- Een vervanger in afwachting van goedkeuring blijft als openstaande vervanger zichtbaar.
- Cache- en appversie verhoogd naar v1.10.

## v1.9
- Home toont nu voor alle ingelogde spelers een duidelijke melding wanneer een koppel beide spelers afwezig heeft en nog een vervanger zoekt.
- De melding noemt het betreffende koppel en de eerstvolgende speeldatum.
- Na goedkeuring van een vervanger verdwijnt de zoekmelding automatisch.

## v1.8
- In **Toekomstige spelerskeuzes** verschijnt een blauwe **I** zodra beide vaste spelers afwezig zijn en een invaller is goedgekeurd.
- De **A** blijft zichtbaar: de I staat ernaast, zodat duidelijk blijft dat de vaste speler afwezig is.
- Per koppel wordt de I één keer getoond (op de eerste spelersregel), zodat één invaller niet dubbel wordt weergegeven.
- Geen wijziging aan Firestore-regels nodig voor deze versie.

# Changelog

## v1.7
- Een speler kan nu **Afwezig** opslaan als de partner voor die zaterdag nog niets heeft ingevuld.
- Zo'n gedeeltelijke keuze wordt bewaard, maar telt nog niet als volledig ingevuld koppel.
- Zodra de partner invult, wordt de normale combinatiecontrole weer gebruikt.
- Als beide spelers afwezig zijn, blijft de bestaande vervanger-flow werken.
- Firestore Rules aangepast om uitsluitend deze veilige gedeeltelijke situatie toe te staan.
- Cache- en bestandsversie verhoogd naar v1.7.

## v1.6
- E-mailadres wijzigen bij Beheer → Spelers & koppels geeft niet langer onterecht “Opslaan lukt niet”.
- E-mailtoegang wordt bij een wijziging gericht bijgewerkt: het oude e-mailadres wordt verwijderd en het nieuwe toegevoegd, zonder de afgeschermde `accessEmails`-lijst uit te lezen.
- De bestaande Firestore-privacyregel `allow list: if false` kan daardoor ongewijzigd blijven.
- De algemene knop “E-mailtoegang vernieuwen” schrijft alleen de actuele toegestane e-mailhashes en probeert de collectie niet meer te lezen.
- Cache- en bestandsversie verhoogd naar v1.6.

## v1.5
- Privé-opmerking bij Mijn koppel herkent de ingelogde speler nu robuuster: eerst via playerId/account-id en, voor bestaande accounts zonder playerId, veilig via de naam binnen het eigen koppel.
- Hierdoor verschijnt “📝 Mijn opmerking (alleen voor mij)” ook bij bestaande spelersaccounts zoals bedoeld.
- Privacy-opslag en Firestore-regels uit v1.4 blijven ongewijzigd: de notitie blijft uitsluitend gekoppeld aan het eigen ingelogde uid.
- Cache- en bestandsversie verhoogd naar v1.5.

## v1.4
- De gele melding voor openstaande accountaanvragen op Home opent nu rechtstreeks Beheer → Beheerders, zonder dat de Seizoen-inhoud eroverheen kan laden.
- Per speelzaterdag kan een speler bij zijn eigen naam een privé-opmerking van maximaal 300 tekens bewaren.
- Privé-opmerkingen staan in een aparte Firestore-subcollectie per speeldag en zijn uitsluitend via het eigen ingelogde uid-document leesbaar en wijzigbaar. Ook beheerders en de hoofdbeheerder hebben geen leesrecht.
- Privé-opmerkingen worden niet gebruikt in WhatsApp, baanindeling, uitslagen, standen of beheer-overzichten.
- Testweergave toont geen privé-opmerkingen.

## v1.3
- E-mailtoegang wordt nu direct opnieuw gesynchroniseerd wanneer de hoofdbeheerder een speler- of reserve-e-mailadres wijzigt.
- Bij Beheer → Spelers staat voor de hoofdbeheerder een knop “E-mailtoegang vernieuwen” om alle bekende e-mailadressen handmatig opnieuw te synchroniseren.
- Dit voorkomt dat een correct geregistreerd e-mailadres ten onrechte als onbekend wordt gemeld bij Account activeren.

# Changelog

## v1.2
- Op Home ziet de hoofdbeheerder nu duidelijk hoeveel accountaanvragen op goedkeuring wachten.
- De melding is aanklikbaar en opent direct Beheer → Beheerders.
- De teller wordt rechtstreeks uit de openstaande accountaanvragen geladen.

## v1.1
- Accountaanvragen kunnen door de hoofdbeheerder worden goedgekeurd of geweigerd.
- Home toont een melding wanneer accounts op goedkeuring wachten.
- Account activeren controleert vooraf of het e-mailadres bij een actieve vaste speler of reserve bekend is.
- Onbekend e-mailadres krijgt de melding dat het e-mailadres niet bekend is bij de beheerder.
- Toegestane e-mailadressen worden privacyvriendelijk als SHA-256-hash gecontroleerd; e-mailadressen worden niet openbaar gemaakt.
- Firestore-regels uitgebreid voor gerichte e-mailcontrole en weigeren van accountaanvragen.
- Bij Account activeren staat duidelijk dat de aanvraag eerst door de beheerder moet worden goedgekeurd.
- Beheer → Spelers toont per vaste speler en reserve de accountstatus: geactiveerd, wacht op goedkeuring, geweigerd of nog niet geactiveerd.

## v1.0
- Eerste definitieve release. Functioneel gelijk aan v0.41; alleen versienummer/cache-referenties bijgewerkt.

## v0.40
- Reset testgegevens gerepareerd: geen invoerveld met WISSEN meer, maar twee duidelijke bevestigingen.
- Na het wissen controleert de app Firestore en meldt hij als er toch testdocumenten zijn blijven staan.
- Spelers, koppels, reserves, accounts, speeldata, speelsterktes, voorkeuren, seizoeninstellingen en spelregels blijven behouden.

## v0.39
- Hoofdbeheerder kan het huidige seizoen na de testfase veilig schoon terugzetten naar nul.
- Dubbele bevestiging: waarschuwing én exact `WISSEN` typen.
- Wist spelerskeuzes en vervangers, gepubliceerde baanindelingen, uitslagen, stand, gespeelde/invalbeurten, speelhistorie en betalingen.
- Behoudt spelers, koppels, reserves, accounts/beheerders, speeldata, speelsterktes, enkelspelvoorkeuren, seizoeninstellingen en spelregels.
- Geen nieuwe Firestore Rules nodig.

## v0.38
- Optionele finalezaterdag per seizoen; laatste actieve speeldag is de finale.
- Automatische finale-indeling: 1+4 tegen 2+3 en 5+8 tegen 6+7 op basis van de stand na de voorlaatste speeldag.
- Competitiepunten op de finale tellen dubbel; invallers blijven maximaal 2 punten krijgen; enkelspel blijft 0 punten.
- Finaleregels toegevoegd aan Uitleg / spelregels en het beheerderhandboek.

## v0.37
- Speelhistorie zichtbaar voor beheerders: per speler hoe vaak met en tegen anderen gespeeld.
- “Waarom deze indeling?” legt per baan uit hoeveel herhalingen de automatische indeling bevat.
- Automatische indeling gebruikt dezelfde spelerhistorie transparant in de score.
- Automatische indeling houdt rekening met eerdere gepubliceerde baanindelingen in hetzelfde seizoen.
- Herhaling van dezelfde teamgenoten wordt extra zwaar vermeden; ook herhaalde tegenstanders worden beperkt.
- Speelsterkte blijft meewegen voor evenwichtige partijen.
- Bij 6 spelers wordt de combinatie dubbel/enkel eveneens zo eerlijk mogelijk gekozen.
- Beheerder kan de voorgestelde indeling nog steeds handmatig aanpassen of opnieuw laten indelen.
- Geen nieuwe Firestore Rules nodig.

## v0.35
- Stand verduidelijkt: punten uit sets zijn leidend.
- Games alleen klein als aanvullende tiebreak-informatie; bij 0 games niet getoond.

## v0.34

- Home toont voor beheerders een compact overzicht van het aantal definitieve spelers en de status van invallers.
- Beheer → Indeling toont direct hoeveel spelers definitief zijn, hoeveel koppels nog moeten invullen en welke invallers ontbreken, wachten of geregeld zijn.
- Automatische indeling wordt niet meer stil automatisch uitgevoerd bij het openen van de pagina.
- Bij precies 3 spelers geeft Automatische indeling een duidelijke melding; alleen bij voldoende enkelspeltoestemming wordt een enkel voorgesteld en blijft de derde speler zichtbaar als niet ingedeeld.
- Geen nieuwe Firestore-regels nodig ten opzichte van v0.33.

## v0.33
- Vaste middenkolom voor het streepje in baanindelingen.
- Enkelspelvoorkeur zichtbaar in spelersbeheer.
- WhatsApp-hub en Banen wijzigen lager geplaatst in Beheer → Indeling.
- Webapplink automatisch onder alle WhatsApp-berichten.
- Vaste spelers kunnen door een afwezig koppel als vervanger worden voorgesteld, met beheerdergoedkeuring.
- Firestore Rules uitgebreid voor vervangerstype `fixed`.

## v0.32
- Compacte namen toegevoegd aan Stand en Toekomstige spelerskeuzes.
- Seizoenmatrix op mobiel verticaal compacter gemaakt.
- Baanregels op Home rond één centrale dash-kolom uitgelijnd.
- WhatsApp-acties in Beheer → Indeling samengebracht.
- WhatsApp-baanindeling gebruikt compacte unieke namen.
- ‘Seizoen Seizoen’ in koppeloverzicht hersteld.

# v0.31
- Compacte unieke namen op Home, Zaterdag en seizoensoverzicht (Eric R., Eric v.d.G., Marcel K., Marcel S.).
- Mijn koppel WhatsApp-overzicht: hele seizoen voor beide spelers, inclusief gespeeld/ingevallen en totalen.
- Beheer WhatsApp-export: volledige naam, e-mail en telefoon; geen speelsterkte.
- Excel-export: inclusief speelsterkte.
- PDF-export bij Spelers & koppels verwijderd.

- Compacte unieke namen op Home, Zaterdag en seizoensoverzicht (o.a. Eric R., Eric v.d.G., Marcel K., Marcel S.).
- Mijn koppel WhatsApp-overzicht bevat het hele seizoen voor beide koppelspelers plus totalen gespeeld/ingevallen.
- Beheer WhatsApp-export bevat volledige namen, e-mail en telefoon; geen speelsterkte.
- Excel-export bevat alle gegevens inclusief speelsterkte.
- PDF-export bij Spelers & koppels verwijderd.

- Mijn koppel compacter gemaakt met alleen voornamen in speeldagkaarten.
- Veilige wijzigingsmodus toegevoegd: keuzes zijn standaard vergrendeld.
- Keuze invullen / wijzigen activeert pas de keuzeknoppen; daarna volgt bewust Keuze opslaan.
- Na opslaan is de spelerskeuze direct gepubliceerd.
- WhatsApp-spelersoverzicht toegevoegd aan Mijn koppel; geen uitslagen, wel wie daadwerkelijk heeft gespeeld.
- WhatsApp-export toegevoegd bij Beheer → Spelers & koppels, zonder speelsterktes.
- Geen Firestore-regelwijziging nodig ten opzichte van v0.29.

# v0.29
- Iedere vaste speler die die zaterdag daadwerkelijk meespeelt kan een nog ontbrekende uitslag van Baan 1 of Baan 2 invoeren.
- Na opslaan is de uitslag voor spelers vergrendeld; alleen beheerders kunnen wijzigen of verwijderen.
- Home toont automatisch de nieuwste zaterdag met opgeslagen uitslagen, per baan met spelers, score en punten.
- Zaterdag heeft nu een apart tabblad Uitslagen met het volledige uitslagenarchief, nieuwste eerst.
- Per speeldag staat hoeveel baanuitslagen zijn ingevoerd.
- Stand wordt live uit opgeslagen uitslagen opgebouwd, zodat spelersinvoer direct zichtbaar is.
- Gepubliceerde indelingen bewaren participantIds voor veilige spelersrechten in Firestore.

## v0.28
- Spelers die op een gepubliceerde baan staan krijgen bij Zaterdag een knop **Uitslag invoeren**.
- Na opslaan wordt de uitslag voor spelers vergrendeld; alleen een beheerder kan hem daarna wijzigen of verwijderen.
- Wedstrijdweergaven gebruiken overal een **–** in plaats van VS/TEGEN.
- Firestore-regels aangescherpt: spelers mogen een uitslag alleen aanmaken, niet later bijwerken.
- Versie/cache bijgewerkt naar v0.28.

## v0.27
- Gamepunten staan nu compact direct achter alleen de laatste set; bij een extra set verhuist het veld automatisch mee.
- De grote aparte kaart “Punten in lopende game” is verwijderd.
- Het veld Opmerking is uit de uitslaginvoer verwijderd.
- Beheer → Uitslagen bevat nu een 🧪 Testdag die niets in Firestore of in de stand opslaat.
- Bestaande uitslagen blijven bewerkbaar en handmatige puntencorrectie blijft beschikbaar voor beheerders.
- Versie/cache bijgewerkt naar v0.27.

## v0.25
- Lopende gamepunten toegevoegd aan uitslagberekening, los van de reden waarom een wedstrijd stopte.
- Gelijke games en gelijke gamepunten geven ieder 0,25 punt; voorsprong in de lopende game geeft de leider 0,5 punt.
- Opgeslagen uitslagen kunnen door beheerders worden bewerkt; handmatige puntencorrectie is mogelijk.

## v0.24
- Hotfix: leeg scherm in v0.23 opgelost door foutieve functiedeclaratie te herstellen.
- Extra controle toegevoegd zodat appfouten zichtbaar kunnen worden gemaakt in plaats van een leeg scherm.


## v0.24
- Toekomstige spelerskeuzes compacter: koppelnummer en speler in één vaste kolom zodat meer zaterdagen tegelijk zichtbaar zijn.
- Speler bewerken opent nu direct in een dialoog; compacte bewerkknoppen.
- NAW-export samengevoegd onder één knop Exporteren met keuze PDF/Excel.
- Gepubliceerde baanindeling voor de eerstvolgende zaterdag staat nu ook op Home.
- Nieuw-seizoenwizard laat in stap 1 zaterdagen uitsluiten vóór definitief aanmaken.
- Beheer-indeling toont speelsterkte alleen als cijfer en nettere Team A / VS / Team B-weergave.
- Uitslag invoeren volgt automatisch de gepubliceerde baanindeling en toont de werkelijk gespeelde spelers.
- Meer dan drie sets mogelijk via Set toevoegen.
- Punten worden automatisch aan de vertegenwoordigde vaste koppels gekoppeld en de stand wordt na opslaan/verwijderen opnieuw opgebouwd.


## v0.22
- Nieuwe veilige seizoenwizard toegevoegd.
- Vooraf waarschuwing: pas bij de laatste bevestiging wordt het huidige seizoen gearchiveerd.
- Stap 1: nieuwe speeldata, tijden, banen en sluitingsmoment instellen.
- Stap 2: per deelnemer kiezen: vaste speler, reserve of niet meenemen; nieuwe deelnemer toevoegen.
- Stap 3: nieuwe koppels samenstellen; ieder koppel moet exact twee vaste spelers hebben.
- Stap 4: samenvatting en laatste bevestiging.
- Huidig seizoen blijft volledig bewaard als archief; er wordt niets verwijderd.
- Nieuw seizoen start zonder oude uitslagen/punten/spelerskeuzes.
- Vorige seizoenen zichtbaar onder Beheer → Seizoen.
- Toekomstige spelerskeuzes: koppel- en spelerskolom blijven vast staan tijdens horizontaal schuiven.
- Baanindeling: speelsterkte alleen als cijfer achter de naam, alleen in beheer.
- Handmatige spelersselectie/testen naar onderaan de indelingspagina verplaatst.
- Start nieuw seizoen naar onderaan Beheer → Seizoen verplaatst.
- Firestore-regels uitgebreid zodat alleen de hoofdbeheerder bij de seizoenwissel `participantType` en `coupleId` van gebruikers kan bijwerken.

## v0.21
- Baanindeling wijzigen verduidelijkt.
- Spelers wisselen door twee namen na elkaar aan te tikken.
- Spelvorm Dubbel / Enkel / Niet gebruiken apart instelbaar.
- Speelsterkte zichtbaar voor beheerder bij indelen.
- Toekomstige spelerskeuzes per koppel gegroepeerd.

## v0.20
- Seizoensoverzicht gespeeld/ingevallen toegevoegd.
- Toekomstige spelerskeuzes toegevoegd.
- Compacte baanindeling.
- NAW- en betalingsexport naar PDF/Excel.

## v0.19
- Mijn koppel toont aantal keren ingevallen per speler.
