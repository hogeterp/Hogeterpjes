# Hogeterpjes v1.2.1

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
