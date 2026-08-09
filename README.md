# Hogeterpjes v1.3.35

## Nieuw
- Op **Home** staat voor Rinze een kaart **☁️ Firebase-opslag** onder *Snel toevoegen*.
- De app berekent het actuele gebruik van de Firebase Storage-bucket automatisch en bewaart de uitkomst maximaal 6 uur in de lokale cache.
- Met **Vernieuwen** kun je de meting direct opnieuw uitvoeren.
- Bij meer dan **5,00 GB** verschijnt een rode waarschuwing.
- Nieuw onderdeel **🎡 Dagjes uit**: gezamenlijke ideeënlijst met categorie, plaats, website, notitie en status (Idee / Willen we heen / Geweest).
- *Dagjes uit* staat onder **Meer** en als snelle knop op Home.

## Firebase
Voor de opslagmeter is alleen **storage.rules** gewijzigd. Publiceer de meegeleverde Storage-regels. Firestore-regels zijn niet gewijzigd. Dagjes-uit-ideeën worden meegenomen in het bestaande gedeelde document `appData/hogeterpjes`.

## Uploaden
Upload alle 13 bestanden naar GitHub Pages en vervang de bestaande bestanden. Publiceer daarna `storage.rules` in Firebase Storage. Sluit Hogeterpjes volledig af en open opnieuw. Controleer bovenaan op **v1.3.35**.
