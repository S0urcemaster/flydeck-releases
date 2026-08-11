# Flydeck Core V3 – Initialer Querschnitt

Stand: 11. August 2026

## Einordnung

Dieses Dokument ist der erste Querschnitt der Core-V3-Entwicklung. Es
beschreibt das aktuelle gemeinsame Verständnis und keine dauerhaft
verbindliche Spezifikation.

Der Programmierer wird im Verlauf der Entwicklung immer wieder solche
Querschnitte anfordern. Zusammen bilden sie eine Snapshot-Galerie des
Projekts. Mit fortschreitender Entwicklung verblassen und veralten ihre
Einträge. Bei Widersprüchen gelten neuere Querschnitte und später
ausdrücklich getroffene Entscheidungen.

## Ziel

`core-v3` ist nicht Flydeck V3 als Ganzes und nicht dessen Frontend. Es ist der
UI-unabhängige Client-Kern, den verschiedene Oberflächen verwenden können.

Der Core soll:

- den aktuellen Client-State als Single Source of Truth besitzen;
- den State fachlich modular gliedern;
- typisierte Actions gegen einen konsistenten Gesamtsnapshot auswerten;
- zusammengehörende Änderungen atomar veröffentlichen;
- selektive Abonnements ermöglichen;
- unabhängig von React, HTML und anderen UI-Systemen bleiben;
- unabhängig von HTTP, WebSockets und konkreter Persistenz bleiben;
- ohne Browser und UI vollständig testbar sein.

Der Core ist kein Eventlog und kein Event-Sourcing-System. Actions sind
flüchtige, typisierte Eingaben. Sie müssen weder als Text dargestellt noch als
vollständige Historie gespeichert werden.

## Systemgrenzen

```text
React oder andere UI
        |
        | Actions / Selektoren
        v
    Client Core
    - State
    - Regeln
    - Evaluation
    - atomare Veröffentlichung
        |
        | Sync-Anforderungen und Ergebnisse
        v
  Sync-Koordinator
        |
        v
      Cache
        |
        v
      Server
```

Cache und Sync-Koordinator liegen außerhalb des Cores und zwischen Core und
Server. Die UI spricht nicht direkt mit Cache oder Server. Der Core kennt
weder die verwendete Datenbank noch das Transportprotokoll.

## Autorität

Der Core ist die autoritative Quelle für den aktuell von der UI dargestellten
Client-State. Diese Aussage gilt nur innerhalb des Clients.

Der Server bleibt autoritativ für gemeinsam genutzte und serverseitig
verwaltete Daten. Der Cache ist eine lokale Replik und Arbeitsablage, aber
keine eigene fachliche Autorität.

```text
Core    = aktuelle Wahrheit der Client-Sitzung
Cache   = persistierte lokale Replik und Offline-Arbeitsstand
Server  = Wahrheit der gemeinsam genutzten Serverdaten
```

Serverprojektionen im Client benötigen Revisionen oder vergleichbare
Versionsinformationen, damit veraltete Antworten nicht neuere Zustände
überschreiben.

## Modularer Gesamtstate

Der State kann fachlich in Module gegliedert werden, wird aber als
konsistenter Gesamtsnapshot behandelt:

```ts
type ClientState = {
  agent: AgentState;
  chat: ChatState;
  connection: ConnectionState;
  navigation: NavigationState;
  settings: SettingsState;
  sync: SyncState;
};
```

State-Module kapseln ihre Regeln und Typen. Eine Action darf dennoch mehrere
Module innerhalb einer Transaktion verändern. Erst das vollständige Ergebnis
wird sichtbar.

```text
alter Gesamtsnapshot + Action
             |
             v
     vollständige Evaluation
             |
             +-- Erfolg --> neuer Gesamtsnapshot
             |
             `-- Fehler --> alter Gesamtsnapshot
```

Die Engine veröffentlicht pro erfolgreicher Transaktion genau eine
Benachrichtigung. Es gibt für Subscriber keinen sichtbaren Zwischenzustand.

## Typisierte Actions

Alle Quellen reichen typisierte Actions in den Core ein. Actions beschreiben
vorzugsweise eine fachliche Absicht oder ein eingetretenes fachliches
Ergebnis, nicht die konkrete UI-Technik.

```ts
type ClientAction =
  | {
      type: "chat/messageSendRequested";
      payload: { text: string };
    }
  | {
      type: "agent/replyReceived";
      payload: { requestId: string; text: string };
    }
  | {
      type: "sync/failed";
      payload: { operationId: string; reason: string };
    };
```

Button, Tastatur oder eine andere Oberfläche können dieselbe fachliche Action
erzeugen. Eine Action wie `chat/messageSendRequested` koppelt den Core nicht
an einen bestimmten Send-Button.

Der Core akzeptiert nur bekannte und validierte Actions. Externe oder
serverseitige Daten werden vor dem Eintritt in den Core von einem Adapter
validiert.

## Evaluation und Veröffentlichung

Die Zustandsberechnung wird von ihrer Veröffentlichung getrennt:

```ts
type Evaluation = {
  nextState: ClientState;
  syncRequests: SyncRequest[];
};

function evaluate(
  state: ClientState,
  action: ClientAction,
): EvaluationResult;
```

Die Evaluation ist rein und deterministisch. Benötigte Zeitwerte, IDs und
externe Resultate werden mit der Action oder über kontrollierte Abhängigkeiten
bereitgestellt.

Ein erfolgreicher, rein lokaler Ablauf ist:

```text
Action
  -> evaluieren
  -> neuen State atomar übernehmen
  -> Subscriber einmal benachrichtigen
```

Eine fehlgeschlagene Evaluation veröffentlicht keinen teilweise veränderten
State, sondern ein definiertes Fehlerergebnis.

## Selektive Abonnements

Eine UI soll nicht den gesamten State abonnieren müssen. Sie liest gezielt den
benötigten Ausschnitt:

```ts
const canSend = useClientSelector(selectCanSend);
```

Der Core stellt dafür UI-neutrale Funktionen wie `getSnapshot`, `subscribe`
und Selektoren bereit. Ein React-Adapter kann darauf aufbauen, gehört aber
nicht zum Core.

Damit nur betroffene Subscriber reagieren, braucht der Store:

- unveränderliche Snapshots;
- stabile Referenzen für unveränderte State-Module;
- strukturelle Wiederverwendung;
- einen definierten Vergleich selektierter Werte;
- eine stabile Subscription-Schnittstelle.

Zentraler State allein macht die UI nicht schneller. Die gezielte Auswahl und
stabile Identität unveränderter Werte sind dafür entscheidend.

## Externer Cache

Der Cache ist kein Teil des Cores. Er kann später beispielsweise mit
IndexedDB implementiert werden und speichert nur serialisierbare Daten.

Seine Aufgaben sind:

- den letzten bestätigten oder dargestellten Client-Snapshot persistieren;
- zuletzt bekannte Serverprojektionen lokal verfügbar halten;
- Serverrevisionen und Synchronisationsmetadaten speichern;
- noch nicht bestätigte lokale Änderungen für den Offlinebetrieb sichern;
- den Start ohne Netzwerk ermöglichen;
- Daten für die Synchronisation nach Wiederverbindung bereitstellen.

Nicht in den Cache gehören DOM-Referenzen, React-Komponenten, Funktionen,
Promises oder laufende Verbindungen.

## Offlinefähigkeit ohne Eventlog

Offline ausgeführte Schreiboperationen müssen bis zu ihrer Bestätigung
persistiert werden. Dafür reicht eine kleine Liste ausstehender Mutationen:

```ts
type PendingMutation = {
  id: string;
  resource: string;
  operation: string;
  payload: unknown;
  basedOnRevision?: number;
  status: "pending" | "sending" | "conflict";
};
```

Diese Liste ist kein Eventlog. Sie ist eine temporäre Arbeitsliste und ein
technisches Mittel für Offline-Synchronisation. Nach erfolgreicher Bestätigung
kann ein Eintrag entfernt werden.

```text
Eventlog          = dauerhafte Geschichte aller Ereignisse
Pending Mutations = noch nicht abgeschlossene Synchronisationsarbeit
```

Ob eine Pending Mutation die fachliche Absicht oder einen gewünschten
Ressourcenzustand beschreibt, wird pro Serververtrag entschieden.

## Persistenter atomarer Commit

Für rein lokale, nicht persistenzpflichtige Actions genügt die atomare
Core-Transaktion im Speicher.

Soll eine Offline-Änderung einen Browserabsturz oder Reload sicher überstehen,
müssen Snapshot, Pending Mutation und zugehörige Metadaten gemeinsam im Cache
persistiert werden. Erst danach sollte der neue State als dauerhaft
erfolgreich gelten.

```text
1. Core evaluiert die Action ohne Veröffentlichung.
2. Koordinator erhält neuen Snapshot und Sync-Anforderungen.
3. Cache speichert Snapshot, Pending Mutations und Revision atomar.
4. Core veröffentlicht den vorbereiteten Snapshot.
5. UI-Subscriber werden einmal benachrichtigt.
6. Der Serverabgleich darf anschließend oder parallel beginnen.
```

Der Koordinator kontrolliert diesen Ablauf, ohne Persistenzlogik in den Core
zu verschieben. Schlägt die Cache-Transaktion fehl, muss eine definierte
Entscheidung gelten: Die Action wird abgelehnt oder ausdrücklich nur als
flüchtige Änderung markiert. Ein stiller Erfolg ist nicht zulässig.

## Synchronisation

Der Sync-Koordinator verbindet Core, Cache und Server. Er ist für folgende
Abläufe verantwortlich:

- Cache beim Start laden;
- den Core mit einem gültigen Snapshot initialisieren;
- Serverdaten abrufen und validieren;
- lokale Pending Mutations senden;
- Wiederholungen und Abbruch behandeln;
- Bestätigungen im Cache speichern;
- bestätigte Pending Mutations entfernen;
- Konflikte erkennen und als Action an den Core melden;
- nach Verbindungsrückkehr erneut synchronisieren.

```text
Start:
Cache -> Koordinator -> Core -> UI
                     |
                     `-> Serveraktualisierung im Hintergrund

Offline-Schreiben:
UI -> Core-Evaluation -> Cache-Transaktion -> Core-Publish
                                      |
                                      `-> späterer Serverabgleich

Serverantwort:
Server -> Koordinator -> Cache -> validierte Action -> Core
```

Der Core muss nicht wissen, ob ein Ergebnis gerade aus dem Netzwerk, dem
Cache oder einem Testadapter stammt.

## UI-State

In den Core gehört fachlich bedeutsamer oder wiederherstellbarer Client-State,
zum Beispiel:

- Nachrichten und Entwürfe;
- Auswahl und Navigation;
- Agenten- und Verbindungsstatus;
- laufende fachliche Operationen;
- Einstellungen;
- sichtbare Fehler- und Konfliktzustände.

Kurzlebige technische Details bleiben bei der UI oder im DOM, zum Beispiel:

- Hover;
- DOM-Fokus;
- Elementmessungen;
- interne Animationsphasen;
- Pointer-Zwischenwerte;
- IME-Kompositionszustand.

Das Ziel ist wenig eigener fachlicher Komponenten-State, nicht das Verbot
jedes lokalen Darstellungszustands.

## Teststrategie

Der Core wird ohne React, DOM, Netzwerk und echte Persistenz getestet:

- gleicher State plus gleiche Action ergibt dasselbe Ergebnis;
- eine gültige Action erzeugt den erwarteten State;
- eine ungültige Action verändert den State nicht;
- mehrere Moduländerungen werden atomar sichtbar;
- Subscriber sehen keine Zwischenzustände;
- unveränderte Module behalten ihre Referenz;
- Selektoren benachrichtigen nur bei relevanten Änderungen.

Cache und Sync-Koordinator werden separat über Ports und Testadapter geprüft:

- Start aus dem Cache ohne Netzwerk;
- atomare Persistenz von Snapshot und Pending Mutations;
- Wiederholung nach Verbindungsabbruch;
- keine doppelte Anwendung bestätigter Mutationen;
- Umgang mit veralteten Serverrevisionen;
- definierte Konflikt- und Cachefehlerzustände.

## Erster Implementierungsschritt

Der erste Prototyp soll nur die Kernverträge beweisen:

1. einen kleinen modularen `ClientState` definieren;
2. typisierte Actions und reine Evaluation implementieren;
3. atomare Veröffentlichung und Subscriptions implementieren;
4. Selektoren mit stabilen Referenzen testen;
5. Cache- und Sync-Ports definieren, aber zunächst mit In-Memory-Adaptern
   betreiben;
6. eine persistenzpflichtige Action vorbereiten, speichern und erst danach
   veröffentlichen;
7. Offline, Wiederanlauf und Serverbestätigung im Test simulieren;
8. erst danach einen getrennten React-Adapter anbinden.

## Offene Entscheidungen

- Welche State-Module gehören in den ersten Prototyp?
- Welche Actions sind rein lokal und welche persistenzpflichtig?
- Wird bei einem Cachefehler abgelehnt oder ein flüchtiger Modus angeboten?
- Welcher Snapshot ist beim Start maßgeblich, solange der Server noch nicht
  geantwortet hat?
- Welche Form besitzen Pending Mutations für die ersten Serverressourcen?
- Wie werden Konflikte fachlich aufgelöst?
- Welche Zustellgarantie und Idempotenz bietet der Server?
- Welche Daten werden pro Benutzer, Workspace und Gerät getrennt?
