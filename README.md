# Hogeterpjes v1.2.5

Complete, gecontroleerde versie met:
- Hogeterpjes-logo en PWA-iconen;
- Firebase-inloggen;
- beheerpagina alleen voor Rinze;
- familieleden uitnodigen met hun e-mailadres;
- familieleden kiezen zelf hun wachtwoord;
- wachtwoord-vergetenfunctie;
- toegang blokkeren of uitnodigingen verwijderen;
- aangescherpte Firestore-regels.

## Eerst Firestore-regels publiceren
Lees `FIREBASE-STAPPEN.txt` en publiceer de inhoud van `firestore.rules` in:
Firebase Console → Firestore Database → Regels → Publiceren.

## Daarna GitHub bijwerken
Upload de losse webbestanden naar de bestaande GitHub-repository. Het bestand `firestore.rules` mag mee naar GitHub als reservekopie, maar wordt daardoor niet automatisch actief in Firebase.


## Nieuw in v1.2.5
- De werkende Firebase-login van v1.2.1 is ongewijzigd gebleven.
- Rinze kan familieleden bewerken via de familiepagina.
- Naam, geboortedatum en e-mailadres kunnen worden aangepast.
- Een persoonlijke profielfoto kan op het eigen apparaat worden ingesteld.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.2.5
- Ieder familielid ziet standaard alleen het eigen verlanglijstje.
- Bij het toevoegen van een wens wordt automatisch de ingelogde persoon gekozen.
- Gewone gebruikers kunnen niet namens iemand anders wensen toevoegen.
- Een gebruiker kan eigen wensen verwijderen.
- Rinze kan als beheerder alle verlanglijstjes bekijken, toevoegen en verwijderen.
- De werkende Firebase-login van v1.2.1/v1.2.2 is niet gewijzigd.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.2.5
- Iedereen, ook Rinze, ziet alleen het eigen verlanglijstje.
- Beheerrechten geven geen toegang tot de privéwensen van anderen.
- Bij recepten kun je direct een foto maken met de camera.
- Je kunt ook een foto uit de galerij kiezen.
- Receptfoto's worden automatisch verkleind.
- De werkende Firebase-login is niet aangepast.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.2.5
- Ingrediëntenhoeveelheden veranderen nu mee als je het aantal personen verhoogt of verlaagt.
- Zowel `250 gram bloem` als `250 | gram | bloem` wordt herkend.
- Decimalen en eenvoudige breuken zoals `0,5` en `1/2` worden ondersteund.
- Oudere recepten die als één regel zijn opgeslagen worden bij het bekijken automatisch herkend.
- De werkende Firebase-login is niet aangepast.
- Geen nieuwe Firestore Rules nodig.
