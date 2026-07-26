# Hogeterpjes v1.1.3

Verbeteringen:
- Specifieke Firebase-foutmeldingen bij het inloggen
- Geen dubbele profielcontrole meer na het inloggen
- Betere melding wanneer Firestore-regels nog niet zijn gepubliceerd
- Cache bijgewerkt naar v1.1.3
- Klein versienummer v1.1.3 zichtbaar in de app

## Na uploaden naar GitHub

### Authorized domain toevoegen
Ga in Firebase naar:

Authentication → Settings → Authorized domains → Add domain

Voeg exact toe:

hogeterp.github.io

Gebruik geen `https://` en geen `/Hogeterpjes/`.

### Firestore-regels publiceren
Ga naar:

Firestore → Rules

Vervang de regels door de inhoud van `firestore.rules` en druk op **Publish**.

### Daarna testen
Log in met het account dat je in Authentication → Users hebt aangemaakt.
De app toont nu een specifieke foutmelding wanneer iets nog niet goed staat.
