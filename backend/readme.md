# flydeck backend

## Meine Vorstellungen so weit

Verwendung von ntfy
Verwendung von Codex mit API Token
Cron Timer Management

Ich verwende noch OpenClaw / will aber auf pur Codex umsteigen und selber Agenten lernen und schreiben

Dh wir machen einen .flydon Ordner im Zielworkspace / wahrscheinlich /home/flydon/.flydon und dort gibt es Systemdateien 
- cron.md fuer die angelegten und abgelaufenen Timer
- snip.md fuer Prompt Snippets
- /chat Verzeichnis fuer Chatlogs mit einer Datei pro session

Verwenden wir beim development meinen home ordner /home/sntr zum testen

Datenfunktionen

- Es koennen Datendateien per Frontend erstellt werden
- Die Dateien enthalten Zeilenweise Datensaetze (Format : # Ueberschrift und Metadaten / danach ein Marker und dann eine Zeile nach der anderen)
- Der User ist selbst dafuer verantwortlich im Blick zu behalten : wo seine Daten Synchron sind (zB wenn ich dem Agenten sage : er soll dateien veraendern : sollte ich wissen : dass ich den reload button drucken wenn ueber ntfy ein Ton kommt)


Antworten zur readme Analyse :

- Datenzeile hinzufuegen / aendern : Relevant ist die Zeilennummer
- Datendatei loeschen : landet im papierkorb . kann mit dem Agenten wiederhergestellt werden

- Snippets sind auch zeilenweise nach Startmarkierung (zB --data--)
- Die vier Prompt slots sind clientseitig . das Senden eines Prompts erzeugt beim Backend eine id / die den slots zugeordnet werden

- Chat senden : Klick auf senden schaltet den aktiven chat slot auf die Antwortseite (So wie der Button mit Sonnenbrille) . kommt ein Auftrag an : wird er analysiert und per ntfy eine direkte Antwort gesendet (In Bearbeitung /Fehler etc) . dann wird er bearbeitet und bei fertigstellung asynchron in den agenten textarea geschrieben . also ohne streaming auf dem client erst mal . das textarea zeigt bis zur Antwort ein waiting symbol/text
- Chatverlauf : die agent textarea stellt den Chatverlauf dar mit User Fragen . schicken wir bei einer antwort erst mal den gesamten chat der session vom backend
- Timer /CRON lassen wir erst mal weg


- Wird pro Browserstart eine Session erzeugt?
Erst mal bauen wir nur einen Chat Slot
- Kann man ältere Sessions auswählen?
Keine Sessions erst mal
- Antwortet Codex als normaler HTTP-Request oder als Stream?
erst mal get/put
- Welcher Workspace wird dem Agenten zugeordnet?
steht oben
- Kann ein Agentenlauf abgebrochen werden?
spaeter
- Was passiert bei Timeout oder Prozessfehler?
spaeter
- Werden Benutzertext und Agentenantwort gemeinsam protokolliert?
im chatlog : eine datei pro chat

"Besser:

  development: /home/sntr/flydeck-workspace
  production:  /home/flydon/workspace
  system:      <workspace>/.flydon
"
Nein :
  development: /home/sntr/.flydon
  production:  /home/flydon/.flydon (flydon heisst nur MEIN agent / wird aber standardmaessig ein eigener user mit linux home)
  system:      <workspace>/.flydon

Authentifizierung bleibt standardmaessig aus (`AUTH_MODE=off`) und verlaesst sich
weiter auf das private Tailscale-Netz. Fuer eine spaetere Single-User-Anmeldung ist
die Backend-Grenze bereits vorhanden:

- `AUTH_MODE=token`
- `AUTH_TOKEN=<mindestens 16 Zeichen>`
- optional lokal ohne HTTPS: `AUTH_SECURE_COOKIE=false`

Die Anmeldung erfolgt ueber `/flydeck/api/auth/login` und setzt ein HttpOnly-Cookie.
Alle anderen API-Routen ausser Health und Auth sind dann geschuetzt. Ein Login-Screen
im Frontend wird erst benoetigt, wenn der Modus tatsaechlich aktiviert wird.

- Port und Basis-URL
/flydeck:5000
- JSON-Fehlerformat
egal
- Größenlimits für Prompts und Dateien
Prompts vom Handy werden klein sein, Dateien kann man eine ntfy Warnung schicken
- Authentifizierung
kein
- Logging
incoming, errors
- atomisches Schreiben von Dateien
keine parallelitaet
- API-Versionierung
minimal
- Konfiguration über Umgebungsvariablen
gerne
- Verhalten bei beschädigten Markdown-Dateien
Error ntfy
