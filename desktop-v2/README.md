# Flydeck Desktop V2

## Absicht

`desktop-v2` ist ein neuer, vom mobilen Flydeck getrennter Prototyp fuer
Wartung, Strukturierung und Analyse eines Flydon-Datenbaums. Der groessere
Bildschirm sowie Maus und Tastatur sollen komplexe Arbeiten ermoeglichen, fuer
die das bewusst mobile Flydeck nicht optimiert werden muss.

Die Bezeichnung `V2` ordnet die Anwendung der aktuellen Flydeck-Generation zu.
Eine Desktop-V1 existiert nicht.

## Vorgesehener Technik-Stack

- Tauri 2 als Desktop-Shell
- Vue 3 mit TypeScript
- Vite fuer Entwicklung und Build
- Element Plus als Design System und Komponentenbibliothek
- Element Plus Table beziehungsweise Table V2 fuer hierarchische Tabellen
- Element Plus Tree beziehungsweise Virtualized Tree fuer reine Baumansichten

Der Stack wird zuerst in einem kleinen Prototyp validiert. Besonders zu pruefen
sind Tree-Darstellung, Auswahlverhalten, Tastaturbedienung und Leistung mit
realistisch grossen Flydon-Datenbestaenden.

## Gestaltungsregel fuer Masse

Vom Nutzer in Pixeln genannte Masse sind Designvorgaben, keine Aufforderung,
sie unveraendert als feste CSS-Pixelwerte einzubauen. Bei jeder Aenderung
werden sie in die fuer den Zweck geeignete responsive Einheit uebersetzt:

- `rem` fuer Schrift, Abstaende und normale Komponentenmasse
- `%`, `fr`, `minmax()` oder `clamp()` fuer flexible Flaechen und Spalten
- Viewport-Einheiten nur dort, wo die Fenstergroesse wirklich die Bezugsbasis ist
- `px` nur fuer technisch erforderliche Werte, beispielsweise scharfe
  einpixelige Trennlinien oder numerische Groessen-APIs einer UI-Komponente

Browser-Zoom, Betriebssystem-Skalierung und unterschiedliche Fenstergroessen
muessen ohne ueberlappende oder abgeschnittene Hauptbereiche funktionieren.

## Erste Produktidee

Die Hauptansicht soll als Desktop-Arbeitsplatz aufgebaut werden:

1. Navigation und gespeicherte Ansichten auf der linken Seite
2. ein zweidimensionaler Datenbaum als Tree-Tabelle in der Mitte
3. ein Inspector beziehungsweise Editor auf der rechten Seite
4. eine gemeinsame Leiste fuer Datenquelle, Pfad, Suche und Aktionen

Moegliche spaetere Werkzeuge sind Mehrfachauswahl, Massenbearbeitung,
Vergleiche, Auswertungen, Import und Export. Diese Funktionen sind noch keine
Festlegung fuer den ersten Prototyp.

## Verbindung zu Flydon

Desktop V2 soll einen Flydon-Server direkt ueber dessen private
WireGuard-Verbindung ansprechen. Flydeck-Nutzdaten sollen nicht ueber
`digi-control` oder einen anderen zentralen Dienst transportiert werden.

Die Tauri/Rust-Schicht kann spaeter lokale Verbindungsprofile, sichere
Schluesselablage und gegebenenfalls die Integration mit der WireGuard-App
uebernehmen. Das genaue Pairing- und Berechtigungsverfahren ist noch zu
entwerfen.

## Lokaler Entwicklungsmodus

Der erste Prototyp benoetigt weder `digi-control` noch WireGuard. Er arbeitet
gegen eine lokale PostgreSQL-Entwicklungsdatenbank, die mit einem aktuellen
Flydon-Backup befuellt werden kann.

Der Datenbankzugriff erfolgt ausschliesslich in der lokalen Tauri/Rust-Schicht.
Das Vue-Webview erhaelt weder PostgreSQL-Zugangsdaten noch einen direkten
Netzwerkzugriff auf die Datenbank. Zwischen Oberflaeche und Tauri-Backend wird
eine kleine typisierte Schnittstelle verwendet.

Damit der Prototyp nicht dauerhaft an direkten PostgreSQL-Zugriff gekoppelt
wird, soll die Datenquelle austauschbar bleiben:

- `LocalPostgres` fuer Entwicklung und Datenanalyse auf diesem Rechner
- `FlydonApi` fuer den spaeteren direkten Zugriff auf eine Flydon-Installation
  ueber WireGuard

Beide Varianten sollen der Oberflaeche dasselbe fachliche Datenmodell liefern.
Der Hub ist an keiner dieser Datenabfragen beteiligt.

Lokale Zugangsdaten bleiben in einer nicht versionierten `.env`-Datei. Echte
Backups und daraus wiederhergestellte Daten werden ebenfalls nicht in Git
aufgenommen.

## Abgrenzung

- Flydeck Mobile bleibt vorerst bei Tailscale.
- Der bestehende mobile TreeBrowser wird nicht durch Desktop V2 ersetzt.
- Bestehende Flydeck- und Flydon-Anwendungen werden fuer den Prototyp nicht
  technisch umgebaut.
- Desktop V2 ist kein zentraler Cloud-Client, der private Nutzdaten bei
  digi-craft.de speichert.

## Erster Validierungsschritt

Ein lokaler UI-Prototyp soll einen grossen simulierten Datenbaum sowohl in
Element Plus Table V2 als auch in einer normalen Tree-Tabelle darstellen. Erst
nach diesem Test werden API-Anbindung, WireGuard-Pairing und dauerhafte lokale
Konfiguration umgesetzt.
