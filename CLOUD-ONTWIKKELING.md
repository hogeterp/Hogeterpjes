# Cloudontwikkeling Hogeterpjes

## Veilig werken

- Werk op `codex/cloud-project-inrichting` of een andere aparte ontwikkelbranch.
- Push pas nadat GitHub Pages, Actions en eventuele externe automatische deployments zijn gecontroleerd. Op 21 oktober 2026 bevestigde de Pages-instelling: deploy from a branch, main, /(root). De enige aangetroffen Actions-workflow is de ingebouwde Pages-workflow. Externe webhooks zijn niet ingezien.
- Niet publiceren, mergen naar een publicerende branch of Firebase Rules deployen zonder expliciete toestemming van de gebruiker.
- Bestaande gegevens en functies behouden. Geen productiegegevens gebruiken voor tests die schrijven.
- De oorspronkelijke `firebase.json` en beide rules-bestanden zijn behouden. `firebase.cloud.json` voegt een aparte configuratie toe voor beide rules-bestanden en lokale emulators.

## Projectidentiteit

De appconfiguratie verwijst naar project `hogeterpjes`, projectnummer `225365940920` en bucket `hogeterpjes.firebasestorage.app`. Dit is nog niet via een aangemeld Firebase-account bevestigd. Gebruik geen ander project als vervanging.

## Gereedschap en controles

Deze cloudwerkkopie is op 21 oktober 2026 gemaakt vanaf `main`, commit `0ac08ed6e1d09a398212bf3f800c1ed6a5d4a8ba`.

Firebase CLI 15.34.0 is buiten de repository geïnstalleerd. Bij een nieuwe omgeving moet deze zo nodig opnieuw worden geïnstalleerd. Bewaar geen login-tokens of serviceaccounts in de repository of chat.

```sh
for f in *.js; do node --check "$f" || exit; done
firebase login:list
firebase projects:list
```

Controleer na aanmelden dat project-ID en projectnummer overeenkomen voordat verdere projectacties worden uitgevoerd.

Voor geïsoleerde tests, met Java 21 of hoger en beschikbare emulator-downloads:

```sh
firebase emulators:start --config firebase.cloud.json --project demo-hogeterpjes --only firestore,storage
```

Het `demo-` project is uitsluitend voor emulators. De bestaande webapp maakt standaard verbinding met productie; open deze niet voor schrijftests zonder eerst een afzonderlijke emulatorgerichte testopstelling te maken.

## Stand van verificatie

- Alle bestaande JavaScript-bestanden slagen voor `node --check`.
- Er is geen bestaande test runner of package.json in de repository.
- Functionele browsertests en compilatie van de Rules in de emulators zijn nog niet uitgevoerd.
- Firebase-login en projectrechten moeten nog worden bevestigd.
- Deze voorbereiding is bedoeld voor de remote ontwikkelbranch; main en Firebase blijven ongewijzigd.
- De cloudwerkkopie en geïnstalleerde tools zijn tijdelijk. Haal bij een nieuwe sessie de remote ontwikkelbranch op en controleer gereedschap en authenticatie opnieuw.
