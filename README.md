# Hogeterpjes v1.3.14

## Opgelost
- Bestaande `accounts`-lijst wordt automatisch omgezet naar de `allowedEmails` die de Firebase-regels gebruiken.
- Account aanmaken controleert zowel `accounts` als `allowedEmails`.
- Kluisrechten herkennen Rinze en Christa ook via hun Firebase-profielnaam.
- Nieuwe Firestore- en Storage-regels meegeleverd.
- Versie- en cacheverwijzingen bijgewerkt naar 1.3.14.

## Na upload naar GitHub
Publiceer `firestore.rules` en `storage.rules` apart in Firebase. Volg daarvoor `FIREBASE-STAPPEN.txt`.


## Versie 1.3.14
- Foto-miniaturen in de Gezinskluis.
- Prullenbak: bestanden eerst veilig verwijderen, daarna herstellen of definitief wissen.
- Verwijderde bestanden blijven meetellen in de opslag totdat ze definitief worden verwijderd.
- Duidelijkere bestandskaarten en acties.
