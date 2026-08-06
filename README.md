# Hogeterpjes v1.3.25

## Belangrijkste verbetering: veilig opslaan
- Gedeelde agenda-afspraken worden voortaan als afzonderlijke Firebase-documenten opgeslagen.
- Weekmenu-gerechten worden eveneens afzonderlijk opgeslagen.
- Een telefoon met oudere gegevens kan daardoor niet meer het volledige weekmenu of de hele agenda overschrijven.
- Na opslaan verschijnt pas een bevestiging nadat Firebase het opslaan heeft bevestigd.
- Bij een fout verschijnt een duidelijke rode waarschuwing en wordt een mislukte verwijdering lokaal teruggezet.
- Wijzigingen aan agenda en weekmenu worden in een alleen door Rinze leesbaar wijzigingslog vastgelegd.
- Bij verborgen cadeau-ideeën kun je nu direct een camerafoto of een screenshot uit de galerij toevoegen.
- Bestaande agenda- en weekmenugegevens worden bij de eerste start automatisch naar de nieuwe opslag gemigreerd.

## Overige functies
Alle functies uit v1.3.24, waaronder persoonlijke verborgen cadeau-ideeën, blijven behouden.

## Firebase
De Firestore-regels zijn gewijzigd. Publiceer `firestore.rules` uit deze versie voordat je de nieuwe webbestanden gebruikt. Storage-regels zijn niet gewijzigd.

## Uploaden
Upload alle 13 losse bestanden naar GitHub Pages, vervang de bestaande bestanden, sluit de app volledig af en open hem opnieuw.
