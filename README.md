# Hogeterpjes v1.3.13

## Opgelost
- Bestaande `accounts`-lijst wordt automatisch omgezet naar de `allowedEmails` die de Firebase-regels gebruiken.
- Account aanmaken controleert zowel `accounts` als `allowedEmails`.
- Kluisrechten herkennen Rinze en Christa ook via hun Firebase-profielnaam.
- Nieuwe Firestore- en Storage-regels meegeleverd.
- Versie- en cacheverwijzingen bijgewerkt naar 1.3.13.

## Na upload naar GitHub
Publiceer `firestore.rules` en `storage.rules` apart in Firebase. Volg daarvoor `FIREBASE-STAPPEN.txt`.
