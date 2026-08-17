# Hogeterpjes v1.3.39

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
