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
