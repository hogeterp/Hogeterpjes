# Ontwerp v1.3.52: veilige cadeauclaims

## Vastgelegde eisen
- Bij een wens kunnen andere familieleden direct **Reserveren** of **Gekocht** kiezen.
- Alleen de oorspronkelijke koper kan een reservering omzetten naar gekocht of annuleren, óók na gekocht.
- Alle anderen zien uitsluitend **Gereserveerd** of **Gekocht**, nooit wie de koper is.
- De eigenaar van de wens ziet geen reservering of aankoopstatus.
- Dubbele reserveringen en aankopen worden atomair verhinderd.

## Bestaande risico's in v1.3.51
- `appData/hogeterpjes` is leesbaar voor alle genodigden.
- `giftEvents[].claims` bevat momenteel `byUid` en `byName` in die gedeelde data.
- De huidige UI verbergt de koper niet voor andere familieleden.
- `profielen/{userId}.displayName` is door de gebruiker zelf te wijzigen; vertrouw hier niet op als identiteit voor beveiligingsregels.
- De bestaande `claimGiftWish`-functie is een gewone gedeelde-data-update, niet een transactionele reservering.

## Vereiste implementatie vóór publicatie
1. Maak een door beheerder beheerde, niet door gebruikers wijzigbare koppeling tussen auth-UID en familielid; laat de rules hieruit de eigenaar bepalen.
2. Verplaats nieuwe claims uit `giftEvents[].claims` naar gescheiden privé-eigenaarsgegevens en statusgegevens. Zorg dat de koperidentiteit nooit in een document staat dat andere familieleden kunnen lezen.
3. Firestore-rules moeten lezen door de wenseigenaar verbieden, schrijven alleen door de claimhouder toestaan, en alle mutaties tussen privéclaim en status atomair controleren.
4. Gebruik een Firestore-transactie voor reserveren, direct kopen, status wijzigen en vrijgeven. Bij concurrentie mag maar één koper slagen.
5. Toon op de wensenpagina aan anderen de anonieme status en acties; de eigenaar ziet uitsluitend zijn/haar wens.
6. Bestaande `giftEvents[].claims` zorgvuldig migreren of ontoegankelijk maken voordat de functie wordt vrijgegeven. Alleen de UI verbergen is onvoldoende.
7. Test met minimaal drie accounts: wens-eigenaar, koper, ander familielid; controleer ook gelijktijdige transacties en annuleren na gekocht.
8. Publiceer pas als de nieuwe Firebase-rules daadwerkelijk zijn uitgerold en gecontroleerd. Alleen GitHub Pages publiceren is niet genoeg.

**Status:** technische voorbereiding; nog geen veilige productie-implementatie.