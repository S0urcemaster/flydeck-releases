# Flydeck

Projekt Startup - Keine Dokumentation 

Meta : Die folgende Beschreibung ist eine erste Darlegung meiner Vorstellungen . Diese koennen sich aendern und neue Erkenntnisse koennen den Weg veraendern . Der Agent bekommt diese Beschreibung initial und wird dann aufgefordert : den ersten Schritt zu machen (Dh zu dem Zeitpunkt kennt der Agent den Umfang des ersten Schritts / der erst nach Fertigstellung dieser Beschreibung final klar ist)

Kurzdefinition : Flydeck ist ein Agenten- und Workspace- Webinterface fuer den Betrieb auf einem Homeserver mit Talescale

Technische Vorgabe : TypeScript / React / Mobile only / ExpressJS

Projektlayout : Projekt-Home ist in /frontend /backend eingeteilt

## Ergaenzungen zur initialen Vorversion

(Zugunsten des Entwicklers am Anfang gehalten)

Diktier-Button : Wir versuchen Verwendung von Browser speech api und ein paar bessere Editierfunktionen zur Textbearbeitung - zuerst Cursor links / rechts

Ich bin oft draussen mit dem Handy und da ist helles Design besser

Links neben den Diktierbutton einen Reload Button fuer den Fall : man hat etwas mit dem Agenten geaendert

Die Prompt-Bausteine koennen noch etwas schmaler sein und zweispaltig . ich werde mich an kurze titel halten / der rest wird abgeschnitten

Die Titel "Prompt-Bausteine" und "Data" koennen weg - ich kenne mich aus

-

dann der "Data" Teil unten gehoert auf den DATA Tab / den man schon mal aktivieren kann . Dort wird der Inhalt der ausgewaehlten Datei in klickbaren Div-Zeilen angezeigt / die sich bei Klick in ein Eingabefeld verwandeln / das man bearbeiten kann . dort gibt es auch 2 cursor buttons . der diktierbutton fokussiert entsprechend aktiviertem tab . daten kann man auch per diktat eingeben . ebenso ein button fuer neu und senden

Die Dateien ohne .md und klick auf "loeschen entsperren" faerbt die dateien rot und ein klick sendet einen loeschbefehl . auf dem server wird es zusaetzlich einen papierkorb geben



## Uebersicht

Flydeck soll einen Agenten visuell auf dem Smartphone repraesentieren / ihm ein Terminal-Gesicht geben
Zusaetzlich zu ueblichen Chat-Interfaces soll es Spar-Funktionen geben : die haeufige kleine Aufgaben / zB Dateneingabe / ueber uebliche Wege ermoeglicht

## Vorhandene Infrastruktur

Der Agent hat einen eigenen User und Workspace auf einem Debian Home Server und eine Verbindung zum Smartphone wird ueber Tailscale ermoeglicht
Dort werde ich meinen eigenen "Life-Context" verwalten : Ideen / Projekte / Termine / Erinnerungen usw
Das Projekt soll normal lesbar bleiben / deswegen keine Datenbank / sondern alle Dateien werden in Markdown gehalten

## Plan

Bisher habe ich OpenClaw alles eingesprochen . Aber kleine Dateiaenderungen sind zu teuer . Das will ich ueber normale Web-Api-Funktionen auf dem Flydeck steuern - und zusaetzlich habe ich ein Textarea mit Diktierfunktion fuer die Kommunikation mit Codex oder Claude

## Use Cases

1. Ich will Daten in Dateien auf meinem Workspace einfuegen / anzeigen und zeilenweise aendern . Zeilenweise Aenderung soll ueber Auswahl eine Zeile und laden des Datensatzes in das Bearbeitungstextarea funktionieren . Erstellen eines Eintrages geht ueber die Auswahl einer der vorhandenen Dateien und Speichern des Inhalts des Textareas ans Ender der Liste
2. Ich will Datendateien erstellen und loeschen koennen (programmatisch Dateiname aendern gibt es nicht weil der Agent diese Aenderung kennen muss)
3. 

## Vorlaeufige Funktions-Wunschliste

- Codex und Claude Verwendung ueber API
- Modelleinstellung
- Es soll eine Art Prompt-Baukasten geben / Prompt-Snippets / bei dem ich Prompts abspeichern und in einer Liste schnell auswaehlen und in das Chatfeld kopieren kann
- 
- 

## UI Vorstellungen

### Grundsaetzliches

Keine Leerflaechen ! Sondern : Grosse Buttons und Eingabefelder und grosse Schrift mit wenig Rand . Kleine / winzige Raender und Margins verwenden : es darf dicht sein - Prioritaet ist : der vollstaendige Raum wird genutzt

Mehrere Hauptabs oben : "CHAT" (mit Prompt Baukasten), "DATA" (fuer Datenverwaltung, Eingabe usw), "CRON" (fuer Erinnerungen)
Darunter weitere Sub-Tabs moeglich

### Chat

Tabs :
- "PROM" (fuer Prompt) mit Snippets Liste / ein paar Textbearbeitungsfunktionen und Chat-Textarea
- "SNIP" (fuer Snippets)
- Darunter 
Oben der Prompt Baukasten
Funktionen
- 
Darunter die Texteingabe

### Data

Datenhaltung geschieht grundsaetzlich zeilenweise pro Eintrag in lesbaren Markdown-Dateien

### Komponenten

Loeschen-Button : Der Loeschen Button soll so gebaut werden : dass erst ein anderer / ihn verdeckender Button gedrueckt werden muss / wie im Cockpit des Piloten ein gefaehrlicher Knopf