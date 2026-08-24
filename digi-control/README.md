# Digi Control

## Absicht

`digi-control` ist der geplante zentrale Hub auf `https://digi-craft.de` fuer
die Vermittlung zwischen Flydon-Installationen und berechtigten Clients. Der
Dienst ist eine Control Plane, nicht der Speicherort und nicht der Datenkanal
fuer private Flydeck-Daten.

## Kernaufgaben

- Flydon-Installationen registrieren und eindeutig identifizieren
- Benutzer, Geraete und Berechtigungen zuordnen
- Einladungen beziehungsweise Pairing-Vorgaenge vermitteln
- erreichbare private Endpunkte und notwendige Verbindungsmetadaten ausgeben
- Schluesselwechsel, Sperrung und Widerruf organisatorisch unterstuetzen
- spaeter mehrere Benutzer und mehrere Flydon-Installationen abbilden

## Strikte Architekturgrenze

`digi-control` soll nur die Informationen verarbeiten, die zum Aufbau und zur
Verwaltung einer direkten Verbindung notwendig sind. Nach erfolgreichem
Pairing kommuniziert ein Client direkt mit Flydon ueber WireGuard.

Insbesondere soll der Hub im regulaeren Betrieb nicht:

- Inhalte des Flydon-Datenbaums empfangen oder speichern
- API-Anfragen an Flydon als Proxy weiterleiten
- Dateiuebertragungen oder Synchronisationen transportieren
- private Daten analysieren oder indexieren

Damit bleibt eine Flydon-Installation Teil ihres privaten Netzes. Der zentrale
Dienst kennt die Zuordnung und Verbindung, aber nicht den Inhalt.

## Vorlaeufiger Verbindungsablauf

1. Eine Flydon-Installation registriert ihre Identitaet bei `digi-control`.
2. Ein berechtigter Benutzer verbindet ein neues Desktop-Geraet per Einladung
   oder Pairing-Code.
3. Der Hub prueft Identitaet und Berechtigung und vermittelt die erforderlichen
   WireGuard-Verbindungsdaten.
4. Flydon und Desktop-Client bauen eine direkte private Verbindung auf.
5. Alle Flydeck-API- und Nutzdaten fliessen anschliessend direkt zwischen den
   beiden Teilnehmern.

Der genaue Umgang mit Public Keys, Endpoint-Aenderungen, NAT-Traversal und
Relay-Fallbacks muss vor einer Implementierung als eigenes Sicherheits- und
Netzwerkprotokoll spezifiziert werden.

## Datenschutzprinzip

Zentral gespeichert werden nur minimale Verwaltungsdaten, beispielsweise
Konten, Installations- und Geraete-IDs, Public Keys, Berechtigungen,
Widerrufsstatus und notwendige Endpunktinformationen. Private Keys und
Flydeck-Inhalte verbleiben auf den beteiligten Geraeten.

## Abgrenzung und offene Punkte

- Flydeck Mobile nutzt vorerst weiterhin Tailscale.
- WireGuard wird zuerst mit Desktop V2 erprobt.
- Ein Relay kann bei schwierigen NAT-Situationen spaeter optional werden. Es
  waere ein eigener, sichtbar aktivierter Betriebsmodus und nicht der normale
  Datenweg.
- Authentifizierung, Schluesselrotation, Missbrauchsschutz, Metadatenminimierung
  und Loeschfristen sind vor dem produktiven Betrieb zu definieren.

## Erster Validierungsschritt

Vor dem Bau des Hubs wird ein minimaler Verbindungsversuch mit einer
Flydon-Installation und einem Desktop-Client durchgefuehrt. Er soll klaeren,
welche Daten fuer Registrierung, Pairing und eine direkte WireGuard-Verbindung
tatsaechlich zentral vermittelt werden muessen.
