# Hogeterpjes v1.3.27

## Agenda gerepareerd
- De fout `renderDashboard is not defined` is opgelost.
- Na opslaan, verwijderen en synchroniseren wordt het beginscherm nu bijgewerkt met de bestaande functie `renderHome()`.
- Agenda-afspraken kunnen daardoor na bevestiging uit Firebase normaal worden verwijderd.
- De beveiliging tegen meerdere snelle tikken op Opslaan blijft behouden.
- De echte Firebase-foutmelding blijft zichtbaar als een bewerking toch mislukt.
- Dezelfde veilige Firebase-opslag voor agenda en weekmenu uit v1.3.26 blijft behouden.

## Firebase
De Firestore- en Storage-regels zijn niet gewijzigd ten opzichte van v1.3.25/v1.3.26. Wanneer die regels al zijn gepubliceerd, hoef je ze niet opnieuw te publiceren.

## Uploaden
Upload alle 13 bestanden naar GitHub Pages en vervang de bestaande bestanden. Sluit daarna Hogeterpjes volledig af en open de app opnieuw. Controleer bovenaan dat versie 1.3.27 zichtbaar is.
