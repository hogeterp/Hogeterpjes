# Hogeterpjes v1.3.1

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


## Nieuw in v1.3.1
- De werkende Firebase-login van v1.2.1 is ongewijzigd gebleven.
- Rinze kan familieleden bewerken via de familiepagina.
- Naam, geboortedatum en e-mailadres kunnen worden aangepast.
- Een persoonlijke profielfoto kan op het eigen apparaat worden ingesteld.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Ieder familielid ziet standaard alleen het eigen verlanglijstje.
- Bij het toevoegen van een wens wordt automatisch de ingelogde persoon gekozen.
- Gewone gebruikers kunnen niet namens iemand anders wensen toevoegen.
- Een gebruiker kan eigen wensen verwijderen.
- Rinze kan als beheerder alle verlanglijstjes bekijken, toevoegen en verwijderen.
- De werkende Firebase-login van v1.2.1/v1.2.2 is niet gewijzigd.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Iedereen, ook Rinze, ziet alleen het eigen verlanglijstje.
- Beheerrechten geven geen toegang tot de privéwensen van anderen.
- Bij recepten kun je direct een foto maken met de camera.
- Je kunt ook een foto uit de galerij kiezen.
- Receptfoto's worden automatisch verkleind.
- De werkende Firebase-login is niet aangepast.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Ingrediëntenhoeveelheden veranderen nu mee als je het aantal personen verhoogt of verlaagt.
- Zowel `250 gram bloem` als `250 | gram | bloem` wordt herkend.
- Decimalen en eenvoudige breuken zoals `0,5` en `1/2` worden ondersteund.
- Oudere recepten die als één regel zijn opgeslagen worden bij het bekijken automatisch herkend.
- De werkende Firebase-login is niet aangepast.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Bij een wens kun je direct een foto maken.
- Je kunt een bestaande foto of screenshot uit de galerij kiezen.
- De afbeelding wordt automatisch verkleind.
- De foto verschijnt bij de wens.
- De werkende Firebase-login is niet aangepast.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Nieuwe agenda met privé-, familie- en huishoudafspraken.
- Privé-afspraken staan alleen op het eigen apparaat.
- Familieafspraken zijn zichtbaar voor alle ingelogde familieleden.
- Huishoudafspraken zijn alleen zichtbaar voor leden van het gekozen huishouden.
- Filteren op soort afspraak en huishouden.
- Locatie, begin- en eindtijd en opmerkingen toevoegen.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Weekmenu per huishouden.
- Alleen leden van een huishouden zien en wijzigen het betreffende weekmenu.
- Plannen van maandag tot en met zondag.
- Bestaand recept kiezen of zelf een gerecht typen.
- Vorige en volgende week bekijken.
- Een compleet weekmenu naar de volgende week kopiëren.
- Ingrediënten van recepten met één knop aan de boodschappenlijst toevoegen.
- Hoeveelheden worden aangepast aan het aantal leden van het huishouden.
- De bestaande Firebase-login is niet aangepast.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Nieuw gezinsdashboard met:
  - vandaag op het menu;
  - komende zichtbare afspraken;
  - openstaande boodschappen per huishouden;
  - eerstvolgende verjaardag;
  - actuele aantallen familieleden, huishoudens, recepten en eigen wensen.
- Rinze kan huishoudens toevoegen, bewerken en verwijderen.
- De naam en leden van een huishouden kunnen worden aangepast.
- Eén familielid kan bij meerdere huishoudens tegelijk horen.
- Standaard horen Jasmijn en Maaike nu ook bij het huishouden Rinze & Christa, naast hun eigen huishouden.
- Gewone gebruikers zien alleen huishoudens waar ze zelf lid van zijn.
- Het verwijderen van een huishouden ruimt gekoppelde weekmenu's, huishoudafspraken en boodschappen op.
- De bestaande Firebase-login is niet aangepast.
- Privéafspraken en privéwensen blijven afgeschermd.
- Geen nieuwe Firestore Rules nodig.


## Nieuw in v1.3.1
- Ingrediënten worden nu compact en overzichtelijk per kaartje ingevuld.
- Per ingrediënt zijn er aparte velden voor:
  - naam;
  - hoeveelheid;
  - eenheid.
- Eenheden worden gekozen via een keuzelijst, zoals g, kg, ml, liter, tl, el, blik en stuks.
- Met **+ Ingrediënt** kunnen onbeperkt nieuwe ingrediënten worden toegevoegd.
- Ieder ingrediënt kan met het prullenbakje worden verwijderd.
- Halve en andere decimale hoeveelheden zijn mogelijk, bijvoorbeeld `0,5 el`.
- Ook breuken zoals `1/2` blijven ondersteund.
- De invoer is extra compact gemaakt voor gebruik op een telefoon.
- De Firebase-login en bestaande privacyinstellingen zijn niet aangepast.


## Herstel in v1.3.1
- De opstartfout uit v1.3.0 is opgelost.
- Firebase en de login worden nu altijd gestart, ook wanneer een los schermonderdeel een fout geeft.
- De compacte ingrediënteninvoer blijft behouden.
- Een nieuwe cachecode zorgt dat v1.3.0 niet op de telefoon blijft hangen.
- Na het uploaden moet één keer de sitecache worden verwijderd als de oude versie nog zichtbaar is.
