# Hogeterpjes v1.3.28

## Nieuw
- Agenda-afspraken kunnen nu zichtbaar worden gemaakt voor zelf gekozen familieleden, bijvoorbeeld alleen Rinze en Christa.
- Bij **Voor wie?** staat de nieuwe keuze **Zelf personen kiezen** met vinkjes per familielid.
- Nieuw onderdeel **Mijn to-do's**: iedere gebruiker heeft een eigen, volledig privé takenlijst.
- Taken kunnen worden toegevoegd, bewerkt, afgevinkt en verwijderd, met datum, tijd, omschrijving en prioriteit.

## Firebase
De Firestore-regels zijn gewijzigd voor de nieuwe privé to-do-collectie `privateTodos`. Publiceer daarom eerst `firestore.rules` uit deze versie. Storage-regels zijn niet gewijzigd.

## Uploaden
1. Publiceer eerst de nieuwe `firestore.rules` in Firebase.
2. Upload daarna alle 13 bestanden naar GitHub Pages en vervang de bestaande bestanden.
3. Sluit Hogeterpjes volledig af en open de app opnieuw.
4. Controleer bovenaan dat versie 1.3.28 zichtbaar is.
