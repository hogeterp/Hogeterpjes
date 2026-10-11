# Wildenhorst Badhoevedorp v1.40

## Nieuw in v1.39
- WhatsApp Invaller gezocht: alleen vaste spelers met dagstatus Reserve; geen dubbele namen.
- Beheerderslijst in bericht beperkt tot Eric Rijkers, Carl ter Beek en Rinze Hogeterp.
- Nieuwe WhatsApp-knop **Invaller gezocht** bij Beheer → Indeling. Toont per gekozen zaterdag openstaande koppels, niet-ingedeelde reserves (inclusief vaste spelers met status Reserve), reeds ingezette reserves en actuele beheerders.
- Het bericht vraagt het betreffende koppel zelf een invaller te regelen en de beheerders om hulp te vragen als dit niet lukt. Reserves krijgen het verzoek hun status naar Afwezig te wijzigen als zij niet beschikbaar zijn.
- WhatsApp-voorbeeld blijft bewerkbaar en verstuurt niets automatisch; actuele gegevens worden opnieuw geladen bij openen.
- Bekende foutieve verkorting `Martijnb` wordt als `Martijn` weergegeven.
- Bestaande indeling, goedkeuringen, publicatie en Firestore-regels blijven ongewijzigd.

## Publiceren
Upload alle 19 bestanden naar GitHub Pages. De `firestore.rules` zijn in v1.39 niet gewijzigd ten opzichte van v1.35 en hoeven daarom niet opnieuw te worden gepubliceerd.

## Nieuw in v1.39
- Nederlandstalige, duidelijkere melding na aanvragen van een herstelmail.
- Nieuwe, vormgegeven herstelpagina `reset.html` met clublogo, twee wachtwoordvelden en Firebase-validatie.
- Let op: de standaard Firebase-herstelmail blijft ongewijzigd. Om de nieuwe pagina te gebruiken, moet in Firebase Authentication de **custom email action handler URL** worden ingesteld op `https://hogeterp.github.io/Wildenhorst/reset.html` (als die instelling voor dit project beschikbaar is). Zonder die instelling blijft Firebase zijn eigen herstelpagina gebruiken.
- Bestaande gebruikers, wachtwoorden, Firestore-regels en competitiefuncties blijven ongewijzigd.
- Publiceer alle bestanden inclusief het nieuwe `reset.html` op GitHub Pages.

## v1.40 – Veiligheid bij e-mailadres wijzigen
- Beheer → Spelers: wijzigingen van een e-mailadres worden geblokkeerd met een duidelijke melding. De huidige functie wijzigt alleen Firestore, niet het Firebase Authentication-inlogadres.
- Naam, telefoonnummer, enkelspel en speelsterkte blijven bewerkbaar.
- Voor Jens moet het bestaande Authentication-account met behoud van UID door een bevoegd beheerproces worden bijgewerkt, gevolgd door synchronisatie van Firestore. Dit gebeurt **niet** automatisch in deze versie.
- Versienummer en cache naar 1.40 bijgewerkt; bestaande data en Firestore-regels ongewijzigd.
