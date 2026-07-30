# Hogeterpjes v1.3.18

## Aangepast
- Het persoonlijke dagboek is alleen zichtbaar en bruikbaar voor Rinze.
- Andere gebruikers zien de dagboekknop niet en kunnen de pagina niet openen.
- Firestore- en Storage-toegang tot het dagboek is beperkt tot het beheerdersaccount van Rinze (`rohogeterp@gmail.com`).
- Duidelijkere foutmelding wanneer de Firebase-regels nog niet zijn gepubliceerd.
- Dagboeknotities mogen nog steeds alleen een datum bevatten; titel, tekst en foto’s zijn optioneel.
- Versienummers en service-worker-cache zijn bijgewerkt naar v1.3.18.

## Belangrijk: Firebase-regels publiceren
Voor deze versie zijn de regels wél gewijzigd. Publiceer zowel `firestore.rules` als `storage.rules` in Firebase. Zie `FIREBASE-STAPPEN.txt`.

## Uploaden naar GitHub
Upload daarna alle losse webbestanden en vervang de bestaande bestanden. Sluit Hogeterpjes volledig af en open de app opnieuw.
