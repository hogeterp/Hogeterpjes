# Hogeterpjes v1.3.40

## Nieuw in v1.3.40
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
