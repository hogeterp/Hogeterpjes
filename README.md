# Hogeterpjes v1.3.36

## Opgelost
- Wensen met foto's kunnen weer worden bewerkt, verwijderd en opgeslagen.
- Foto's van **wensen, recepten en producten** worden voortaan in Firebase Storage opgeslagen in plaats van als grote base64-tekst in het gedeelde Firestore-document `appData/hogeterpjes`.
- Bestaande ingebedde foto's worden na het openen van v1.3.36 automatisch naar Firebase Storage verplaatst en daarna uit het grote Firestore-document gehaald.
- Hierdoor blijft het gedeelde Firestore-document klein en wordt de Firestore-documentlimiet niet meer geraakt door foto's.
- De Firebase-opslagmeter en Dagjes uit uit v1.3.36 blijven behouden.

## Firebase
Voor v1.3.36 is **storage.rules gewijzigd**. Firestore-regels zijn niet gewijzigd.
Publiceer dus de meegeleverde `storage.rules` in Firebase Storage voordat je foto's toevoegt of bestaande foto's laat migreren.

## Uploaden
1. Publiceer eerst `storage.rules` via Firebase Console → Storage → Rules.
2. Upload daarna alle 13 bestanden naar GitHub Pages en vervang de bestaande bestanden.
3. Sluit Hogeterpjes volledig af en open opnieuw.
4. Controleer bovenaan dat **v1.3.36** staat.
5. Laat de app na de eerste start even open; bestaande wens-/recept-/productfoto's worden automatisch naar Storage verplaatst.
6. Test daarna een bestaande wens met foto: bewerken → opslaan en eventueel verwijderen.
