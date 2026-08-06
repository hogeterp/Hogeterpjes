# Hogeterpjes v1.3.26

## Agenda gerepareerd
- Na één tik op Opslaan wordt de knop direct uitgeschakeld en toont hij “Bezig met opslaan…”.
- Meerdere snelle tikken kunnen niet langer dubbele afspraken maken.
- Het venster sluit pas nadat Firebase het opslaan heeft bevestigd.
- Verwijderen gebeurt nu eerst rechtstreeks in `sharedAgendaEvents`; het wijzigingslog wordt daarna apart geschreven.
- Bij een fout verschijnt de echte foutmelding en blijft de afspraak zichtbaar.
- Dezelfde verbetering is toegepast op het verwijderen van weekmenu-items.

## Firebase
De Firestore- en Storage-regels zijn niet gewijzigd ten opzichte van v1.3.25. Wanneer de regels van v1.3.25 al zijn gepubliceerd, hoef je ze niet opnieuw te publiceren.

## Uploaden
Upload alle 13 bestanden naar GitHub Pages en vervang de bestaande bestanden. Sluit daarna Hogeterpjes volledig af en open de app opnieuw.
