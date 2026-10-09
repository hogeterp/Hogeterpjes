## v1.3.44 – Archief in Gezinskluis
- Oude documenten kunnen handmatig naar het archief worden verplaatst, zonder ze te verwijderen.
- Archief heeft een eigen tegel; gearchiveerde bestanden zijn uit de gewone mappen verborgen.
- Openen, downloaden, terugzetten en naar prullenbak verplaatsen blijven mogelijk.
- Bestaande bestanden en Firebase-regels blijven behouden; geen datamigratie nodig.

# v1.3.43
- Onjuiste Firebase Messaging-serviceworker van andere app verwijderd; Hogeterpjes gebruikt deze niet.
- andere app-roadmap en -changelog verwijderd uit deze app.
- Firebase-configuratie, Firestore- en Storage-regels ongewijzigd.
- Weekmenuverbeteringen van v1.3.42 behouden.
- Cache en versieverwijzingen bijgewerkt.

# v1.3.42
- Weekmenu: compacte weergave van alle zeven dagen, vrijdag t/m donderdag.
- Weekmenu: maaltijd verplaatsen slaat eerst de nieuwe dag op, zonder vooraf een gerecht te wissen.
- Firebase: voorkomt herimport bij een tijdelijk lege weekmenu-listener na eerste synchronisatie.

# v1.3.41
- Persoonlijke to-do Firestore-regels vereenvoudigd naar eigenaar-op-UID; niet meer afhankelijk van `allowedEmails`.
- `subscribePrivateTodos()` stopt niet langer de listener van de privé camping- en boekenideeën.
- Versie/cacheverwijzingen bijgewerkt naar v1.3.41.
- Privéregels voor Rinze & Christa uit v1.3.40 behouden.

# Changelog

## v1.3.40
- Privé campingideeën voor Rinze en Christa toegevoegd, gegroepeerd per land.
- Privé boekenlijst voor Rinze en Christa toegevoegd.
- Boeken kunnen als gelezen worden gemarkeerd zonder uit de lijst te verdwijnen.
- Firestore-beveiliging toegevoegd voor `privateCoupleIdeas/rinze-christa`.
- Service-worker/cache en zichtbare versie bijgewerkt naar v1.3.40.
