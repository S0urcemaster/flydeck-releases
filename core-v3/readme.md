# Flydeck Core V3

Dieses Dokument ist der Index der Dokumentation von `core-v3`.

Core V3 ist der UI-unabhängige Client-Kern von Flydeck. Er besitzt einen
zentralen, modularen State, wertet typisierte Actions aus und veröffentlicht
Zustandsänderungen atomar. Cache, Serverkommunikation und React liegen
außerhalb des Cores.

## Aktueller Querschnitt

- [`protokoll-init.md`](./protokoll-init.md) – initiales Verständnis von Core,
  Transaktionen, Cache, Offlinebetrieb und Synchronisation

## Dokumentationsprozess

Im Verlauf der Entwicklung fordert der Programmierer immer wieder einen
**Querschnitt** an. Ein Querschnitt hält den zu diesem Zeitpunkt gemeinsam
verstandenen Stand, die Richtung und offene Fragen fest. So kann regelmäßig
geprüft werden, ob das Projekt noch auf dem richtigen Kurs ist.

Die Querschnitte bilden eine Snapshot-Galerie. Jeder Eintrag ist eine
historische Momentaufnahme und verblasst beziehungsweise veraltet mit der
Zeit. Er ist keine dauerhaft gültige Spezifikation. Neuere Querschnitte und
später ausdrücklich getroffene Entscheidungen haben Vorrang.

## Vorgesehene Dokumente

Bei Bedarf werden weitere Dokumente angelegt und hier verlinkt:

- `protokoll-<name>.md` – weitere angeforderte Querschnitte
- `readme-state.md` – State-Module, Invarianten und Selektoren
- `readme-actions.md` – typisierte Actions und Evaluation
- `readme-cache.md` – persistente Snapshots und Offline-Daten
- `readme-sync.md` – Serverabgleich, Revisionen und Konflikte
- `readme-testing.md` – Tests des Cores und seiner Ports

Diese Liste ist zunächst eine Navigationshilfe und keine Festlegung der
endgültigen Dokumentstruktur.
