## v1.3.49 – Weekmenu veilig verplaatsen
- Een gerecht naar een andere dag verplaatsen gebeurt nu in één Firestore-transactie.
- Als de doeldag al een gerecht heeft: kies omwisselen, vervangen of annuleren.
- Bij mislukken blijven de oorspronkelijke gerechten ongewijzigd.
- Firestore- en Storage-regels zijn ongewijzigd; de overige appfuncties zijn behouden.

## v1.3.48 – Gezinskluis
- Eigen mappen en submappen aanmaken, hernoemen en veilig verwijderen.
- Verwijderen alleen als map geen documenten (ook archief/prullenbak) en submappen bevat; bevestigen en mapnaam intypen.
- Opmerkingenknop per map, alleen voor Rinze en Christa.
- a.s.r. met Algemeen, Overlijdensrisicoverzekering en Spaarhypotheekverzekering.
- Fotoalbums met meerdere foto's, later foto's toevoegen en afzonderlijk naar prullenbak verplaatsen.
- BELANGRIJK: publiceer nieuwe firestore.rules voor folders-collectie.

## v1.3.47 – Gezinskluis: tellers en tekstweergave
- Maptellers tellen actieve bestanden in alle onderliggende mappen mee.
- Lange mapnamen en bestandsnamen breken netjes af op mobiele schermen.
- Bij mappen met alleen submappen staat een passende toelichting in plaats van een lege-bestandenmelding.
- Bestaande functies, documenten en Firebase-regels blijven ongewijzigd.

## v1.3.47 – Reparatie Gezinskluis upload
- Knop + Bestand opent het uploadvenster weer (ontbrekend meldingsveld hersteld).
- Meerdere bestanden in één keer selecteren ingeschakeld.
- Nieuwe polisversie en automatisch archiveren uit v1.3.45 behouden.
- Bestaande gegevens en Firebase-regels blijven ongewijzigd.

## v1.3.45 – Gezinskluis: Univé en meerdere bestanden
- Verzekeringen → Univé → Algemeen, Reisverzekering, Aansprakelijkheidsverzekering, Woonverzekering.
- Meerdere bestanden tegelijk selecteren en uploaden; per bestand eigen naam.
- Via Nieuwe versie een vervangende polis uploaden; na succesvol opslaan wordt de oude automatisch gearchiveerd.
- Bestaande documenten blijven ongewijzigd en in hun bestaande mappen.
- Firestore- en Storage-regels ongewijzigd.

## v1.3.44 – Archief in Gezinskluis
- Oude documenten kunnen handmatig naar het archief worden verplaatst, zonder ze te verwijderen.
- Archief heeft een eigen tegel; gearchiveerde bestanden zijn uit de gewone mappen verborgen.
- Openen, downloaden, terugzetten en naar prullenbak verplaatsen blijven mogelijk.
- Bestaande bestanden en Firebase-regels blijven behouden; geen datamigratie nodig.

# v1.3.43
- Onjuiste Firebase Messaging-serviceworker van andere app verwijderd; Hogeterpjes gebruikt deze niet.
- andere app-roadmap en -changelog verwijderd uit deze app.
- Firebase-configuratie, Firestore- en Storage-regels ongewijzigd.
- Weekmenuverbeteringen van v1.3.42 behouden.
- Cache en versieverwijzingen bijgewerkt.

# v1.3.42
- Weekmenu: compacte weergave van alle zeven dagen, vrijdag t/m donderdag.
- Weekmenu: maaltijd verplaatsen slaat eerst de nieuwe dag op, zonder vooraf een gerecht te wissen.
- Firebase: voorkomt herimport bij een tijdelijk lege weekmenu-listener na eerste synchronisatie.

# v1.3.41
- Persoonlijke to-do Firestore-regels vereenvoudigd naar eigenaar-op-UID; niet meer afhankelijk van `allowedEmails`.
- `subscribePrivateTodos()` stopt niet langer de listener van de privé camping- en boekenideeën.
- Versie/cacheverwijzingen bijgewerkt naar v1.3.41.
- Privéregels voor Rinze & Christa uit v1.3.40 behouden.

# Changelog

## v1.3.40
- Privé campingideeën voor Rinze en Christa toegevoegd, gegroepeerd per land.
- Privé boekenlijst voor Rinze en Christa toegevoegd.
- Boeken kunnen als gelezen worden gemarkeerd zonder uit de lijst te verdwijnen.
- Firestore-beveiliging toegevoegd voor `privateCoupleIdeas/rinze-christa`.
- Service-worker/cache en zichtbare versie bijgewerkt naar v1.3.40.
