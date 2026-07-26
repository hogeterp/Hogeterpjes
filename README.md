# Hogeterpjes v1.1.2

Deze versie bevat:
- Firebase-configuratie van project `hogeterpjes`
- Echte login met e-mailadres en wachtwoord
- Realtime synchronisatie tussen telefoons
- Gedeelde recepten, boodschappen, wensen en huishoudens
- Automatisch familieprofiel kiezen bij de eerste login
- Veilige Firestore-regels voor ingelogde familieleden
- Klein zichtbaar versienummer v1.1.2

## Belangrijk na uploaden

### 1. GitHub
Upload alle losse bestanden naar de bestaande repository en kies **Commit changes**.

### 2. Authorized domain
Ga in Firebase naar:
Authentication → Settings → Authorized domains

Voeg toe:
`hogeterp.github.io`

### 3. Firestore-regels
Ga naar:
Firestore → Rules

Vervang de regels door de inhoud van `firestore.rules` en druk op **Publish**.

### 4. Accounts aanmaken
Ga naar:
Authentication → Users → Add user

Maak voor ieder familielid een account met e-mailadres en tijdelijk wachtwoord.

Bij de eerste login vraagt de app welk familielid bij het account hoort.
