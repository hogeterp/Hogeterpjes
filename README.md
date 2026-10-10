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

# Hogeterpjes v1.3.43

- Compact weekmenu met zeven dagen tegelijk in volgorde vrijdag t/m donderdag.
- Bij verplaatsen wordt hetzelfde Firestore-document eerst opgeslagen; bestaande maaltijden worden niet vooraf verwijderd.
- Overige functionaliteit en Firestore-/Storage-regels uit v1.3.41 behouden.

# Hogeterpjes v1.3.41

## Nieuw in v1.3.41
- Herstel voor persoonlijke to-do's: de eigenaar kan zijn/haar eigen to-do's laden en opslaan zonder afhankelijkheid van `appAdmin/settings`.
- To-do's en de privé camping-/boekenideeën gebruiken nu onafhankelijk van elkaar hun eigen realtime listener.
- De privé-pagina **Ideeën Rinze & Christa** uit v1.3.40 blijft behouden.
- Firestore-regels voor `privateCoupleIdeas/rinze-christa` blijven actief: alleen Rinze en Christa hebben toegang.

## Belangrijk na uploaden
Publiceer de meegeleverde **firestore.rules** in Firebase. Anders is de to-do-reparatie niet compleet.

## Vorige versie v1.3.40
- Nieuwe privé-pagina **Ideeën Rinze & Christa**.
- Campingideeën worden per land gegroepeerd en kunnen naam, plaats/streek, website, status en notitie bevatten.
- Nieuwe gezamenlijke boekenlijst voor Rinze en Christa. Een boek kan als **gelezen** worden aangevinkt en blijft daarna zichtbaar.
- Deze gegevens staan in een apart Firestore-document `privateCoupleIdeas/rinze-christa` en zijn via Firestore-regels alleen toegankelijk voor Rinze en Christa.
- Menu en pagina zijn voor andere gebruikers verborgen/geblokkeerd.

## Belangrijk na uploaden
Publiceer de meegeleverde **firestore.rules** in Firebase. Anders werkt de nieuwe privé-pagina niet.

## Vorige versie
Herstelversie voor Firebase-toegang.

## Belangrijkste reparaties
- Firestore-regels controleren de beheerder eerst.
- `isInvited()` is veilig als `allowedEmails` nog niet in `appAdmin/settings` staat.
- Bestaande wensen in `appData/hogeterpjes.wishes` blijven onaangetast en kunnen weer worden geladen.
- Persoonlijke to-do's hebben een extra lees-fallback zonder sortering.
- Service-worker en cacheversie staan volledig op v1.3.39.

## Na upload
Publiceer de meegeleverde `firestore.rules` in Firebase.
`storage.rules` is in deze versie niet gewijzigd.

## Correctie v1.3.43
De per ongeluk meegeleverde `firebase-messaging-sw.js` van het andere project andere app is verwijderd. Hogeterpjes gebruikt de bestaande `service-worker.js` voor PWA-caching; meldingen in de app blijven bestaan. De Firebase-regels zijn niet gewijzigd.

Controleer na publicatie het verplaatsen van een maaltijd in het weekmenu.
