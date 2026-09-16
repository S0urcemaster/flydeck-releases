# Riggs and Smith – Job on Mars: Konzeptausarbeitung

Dieses Dokument sammelt die derzeit offenen Designentscheidungen. Die Abschnitte **„Deine Stellungnahme“** sind für Antworten, Festlegungen, Varianten und neue Fragen vorgesehen. Aus den ausgefüllten Antworten soll im nächsten Schritt ein konkretes Build-Konzept mit Spielzuständen, Regeln, UI, Datenmodell und MVP-Umfang entstehen.

## A. Spielkern und Run-Struktur

### 1. Was ist das konkrete Ziel eines Runs?

Mögliche Richtungen:

- eine bestimmte Firmenquote erfüllen,
- eine vorgegebene Zahl von Sols überstehen,
- genug illegales Vermögen anhäufen und rechtzeitig aussteigen,
- weiterspielen, bis Riggs entlassen oder erwischt wird,
- eine Kombination aus Pflichtziel und freiwilligem Weiterspielen.

**Deine Stellungnahme:**



---

### 2. Was ist die zentrale Spielerentscheidung pro Runde?

Beispiele:

- möglichst viel in eine lange Kommandoliste packen,
- zwischen sicherem Firmenweg und riskantem Umweg wählen,
- entscheiden, wie viel Zeit in zusätzliche Informationen durch Scans investiert wird,
- den richtigen Zeitpunkt für Rückkehr und Abladen erkennen,
- zwischen Firmenfortschritt und persönlichem Gewinn abwägen.

**Deine Stellungnahme:**



---

### 3. Was bedeutet die Verzögerung zwischen Erde und Mars spielmechanisch?

Zu entscheiden ist:

- Wartet der Spieler tatsächlich in Echtzeit?
- Wird die Übertragung nur als kurze Animation beziehungsweise beschleunigte Spielzeit dargestellt?
- Laufen währenddessen andere Rover oder Vorgänge weiter?
- Welche sinnvollen Tätigkeiten gibt es auf der Erde während der Wartezeit?
- Kann oder soll der Spieler das Ergebnis überspringen beziehungsweise beschleunigen?

Für den Prototyp muss festgelegt werden, ob die Verzögerung bereits eine echte Mechanik oder zunächst hauptsächlich Teil der Inszenierung ist.

**Deine Stellungnahme:**



---

### 4. Wie wird eine Befehlsfolge bei unerwarteten Ereignissen ausgeführt?

Mögliche Regeln:

- Der Rover bricht beim ersten unmöglichen Befehl ab.
- Er überspringt einen unmöglichen Befehl und macht mit dem nächsten weiter.
- Ein Fehler kann alle folgenden Befehle entwerten.
- Der Spieler kann Abbruchregeln oder Bedingungen programmieren.
- Der Rover besitzt eine einfache automatische Notfalllogik.

Zusätzlich ist zu klären, wie verständlich das Spiel Ursache und Wirkung im Missionsprotokoll darstellt.

**Deine Stellungnahme:**



---

### 5. Wie viel weiß der Spieler vor dem Absenden einer Befehlsfolge?

Zu entscheiden ist:

- Welche Informationen sind ohne Scan sichtbar?
- Zeigt ein Scan nur „sicher/gefährlich“ oder konkrete Geländeeigenschaften?
- Erkennt ein Scan mögliche oder genaue Rohstoffvorkommen?
- Kann ein Scan ungenau, veraltet oder fehlerhaft sein?
- Scannt man ein Feld, eine Richtung, Nachbarfelder oder einen größeren Bereich?

**Deine Stellungnahme:**



---

### 6. Was ist das Risiko einer langen Kommandoliste?

Mögliche Kosten und Gefahren:

- höherer Energieverbrauch,
- größere Schadenswahrscheinlichkeit,
- weniger Möglichkeiten, auf neue Informationen zu reagieren,
- begrenzter Kommandospeicher,
- höhere Kommunikations- oder Zeitkosten,
- ein früher Fehler macht spätere Befehle unbrauchbar,
- steigender Verdacht bei ungewöhnlichen Routen oder langen Einsätzen.

Zu klären ist auch, ob kurze Listen immer sicherer sind oder andere Nachteile haben.

**Deine Stellungnahme:**



---

## B. Rover, Karte und Ressourcen

### 7. Welche begrenzten Werte besitzt ein Rover?

Naheliegende Werte sind:

- Zustand,
- Batterie,
- Frachtraum,
- Kommandospeicher beziehungsweise maximale Missionszeit,
- Scannerreichweite oder Sensorqualität,
- Geschwindigkeit.

Für den Prototyp sollte entschieden werden, welche Werte tatsächlich unterschiedliche Entscheidungen erzeugen und welche zunächst entfallen können.

**Deine Stellungnahme:**



---

### 8. Wie funktioniert die Bewegung?

Offene Punkte:

- Bewegung auf vier oder acht Nachbarfelder,
- Ausrichtung des Rovers und relative oder absolute Bewegungsbefehle,
- zusätzliche Zeitkosten für schwieriges Gelände,
- vollständige Planung des Rückwegs zum Lander,
- Möglichkeit zu stranden,
- Bergung durch einen anderen Rover,
- bekannte oder unbekannte Bewegungskosten eines Feldes.

**Deine Stellungnahme:**



---

### 9. Welche echten Gelände- und Feldinhalte gibt es?

Die bisherigen Begriffe beschreiben teilweise den Informationszustand eines Feldes. Davon getrennt sollten mögliche Feldinhalte definiert werden, zum Beispiel:

- Ebene,
- Geröll,
- Krater,
- Sand,
- Strahlungszone,
- Rohstoffvorkommen,
- technisches Wrack,
- wissenschaftliche Fundstelle,
- Lander,
- Piratenstation.

Zu entscheiden ist, welche Auswirkungen diese Inhalte auf Bewegung, Schaden, Energie und Belohnungen haben.

**Deine Stellungnahme:**



---

### 10. Was ist der genaue Unterschied zwischen „Probe nehmen“ und „Rohstoff abbauen“?

Offene Fragen:

- Darf erst nach einer Probe abgebaut werden?
- Muss die Probe zum Lander zurückgebracht und dort analysiert werden?
- Erfährt der Spieler danach Art, Wert und Menge des Vorkommens?
- Kostet die Probe Frachtraum?
- Bleibt das entdeckte Vorkommen für spätere Fahrten bestehen?
- Kann ein Spieler auf Verdacht ohne Analyse abbauen?

**Deine Stellungnahme:**



---

### 11. Wie wird das 8×8-Spielfeld erzeugt?

Mögliche Varianten:

- vollständig zufällige Erzeugung,
- vorgefertigte Szenarien,
- zufällige Erzeugung mit garantierter Lösbarkeit,
- feste Karten mit zufällig verteilten Inhalten,
- unterschiedliche Biome oder Schwierigkeitsstufen.

Außerdem ist zu klären, ob ein Quadrant einen vollständigen Run, einen einzelnen Auftrag oder nur einen Teil einer größeren Marsregion darstellt.

**Deine Stellungnahme:**



---

### 12. Was passiert, wenn ein Rover beschädigt wird?

Mögliche Folgen:

- ein abstrakter Zustandswert sinkt,
- Bewegung oder Aktionen werden teurer,
- einzelne Funktionen wie Scanner, Greifer oder Navigation fallen aus,
- Befehle werden unzuverlässig ausgeführt,
- der Rover bleibt liegen,
- der Rover geht vollständig verloren,
- ein anderer Rover kann ihn bergen oder reparieren.

Zu entscheiden ist auch, wann der Spieler einen drohenden Ausfall erkennen kann.

**Deine Stellungnahme:**



---

## C. Firma, Schmuggel und Verdacht

### 13. Wie funktioniert das Verhältnis zwischen Firmenquote und persönlicher Beute?

Offene Modelle:

- Riggs darf offiziell alles oberhalb einer Quote behalten oder erhält dafür Boni.
- Riggs muss Rohstoffe aktiv unterschlagen.
- Riggs kann Ladung falsch deklarieren oder Telemetrie manipulieren.
- Nur bestimmte seltene Materialien eignen sich für Nebengeschäfte.
- Firmen- und Schwarzmarktaufträge konkurrieren um Zeit und Frachtraum.

**Deine Stellungnahme:**



---

### 14. Welche Aktivitäten des Rovers kann die Firma beobachten?

Zu entscheiden ist, ob die Firma Folgendes sieht:

- jeden einzelnen Befehl,
- die vollständige Route,
- nur Zeit, Position und abgelieferte Menge,
- Schäden und Kommunikationsausfälle,
- Rohstofffunde vor ihrer Ablieferung,
- Besuche in der Nähe der Piratenstation.

Außerdem: Welche Daten kann Riggs manipulieren und zu welchem Preis oder Risiko?

**Deine Stellungnahme:**



---

### 15. Welche Handlungen erzeugen Verdacht?

Mögliche Auslöser:

- Nähe zur Piratenstation,
- fehlende oder falsch deklarierte Rohstoffe,
- ungewöhnliche Routen,
- lange Missionen ohne plausiblen Ertrag,
- wiederholte Kommunikationsausfälle,
- auffällig viele Defekte oder Roververluste,
- Verwendung illegaler Programme,
- Nichterfüllung der Firmenquote.

Zu bestimmen sind außerdem Abbau, Schwellenwerte und sichtbare Konsequenzen des Verdachts.

**Deine Stellungnahme:**



---

### 16. Welche Funktionen erfüllt die Piratenstation?

Mögliche Angebote:

- Verkauf unterschlagener Rohstoffe,
- Kauf illegaler Rover-Upgrades,
- Erwerb oder Installation manipulierter Programme,
- Reparaturen ohne Firmenprotokoll,
- geheime Aufträge,
- Lagerung illegaler Güter,
- Informationshandel.

Zu klären ist, ob ein Besuch physisch mit dem Rover erfolgen muss oder auch über Kommunikation möglich ist.

**Deine Stellungnahme:**



---

### 17. Ist die Piratenstation von Anfang an sichtbar?

Mögliche Varianten:

- Sie ist von Beginn an bekannt.
- Sie muss auf der Karte entdeckt werden.
- Ihre Position wird durch einen Kontakt verraten.
- Sie sendet ein besonderes Signal, das erst mit passender Technik erkannt wird.
- Es gibt mehrere wechselnde oder mobile Schwarzmarktorte.

**Deine Stellungnahme:**



---

### 18. Kann Riggs einen Run freiwillig beenden?

Zu entscheiden ist:

- Kann Riggs kündigen beziehungsweise mit der Beute verschwinden?
- Welche Bedingungen müssen dafür erfüllt sein?
- Wird nur bereits gesichertes Vermögen übernommen?
- Gibt es einen Bonus für einen rechtzeitigen Ausstieg?
- Was unterscheidet freiwilligen Ausstieg, Entlassung und Festnahme?

Diese Entscheidung könnte den Push-your-luck-Kern des Spiels tragen.

**Deine Stellungnahme:**



---

## D. Fortschritt und Roguelite-Struktur

### 19. Was verliert Riggs bei einer Entlassung oder Festnahme?

Mögliche Verluste:

- Geld,
- Rover,
- Ausrüstung,
- nicht gesicherte Rohstoffe,
- Firmenrang,
- Ruf und Kontakte,
- Identität,
- alle Verbesserungen außer dauerhaft gelernten Programmen.

Zu klären ist, ob Entlassung und Festnahme unterschiedliche Konsequenzen haben.

**Deine Stellungnahme:**



---

### 20. Was bleibt dauerhaft über mehrere Runs erhalten?

Das Ausgangskonzept nennt selbst entwickelte Programme. Zu definieren ist, ob dies sind:

- neue Einzelbefehle,
- Makros aus mehreren Standardbefehlen,
- bedingte Logik,
- automatische Notfallroutinen,
- passive Firmware-Verbesserungen,
- vom Spieler konfigurierte Programme.

Außerdem: Werden Programme gefunden, gekauft, durch Erfahrung freigeschaltet oder tatsächlich aus Bausteinen erstellt?

**Deine Stellungnahme:**



---

### 21. Welche spielmechanische Bedeutung hat die neue falsche Identität?

Mögliche Bedeutungen:

- Jede Identität besitzt andere Startbedingungen oder Eigenschaften.
- Frühere Vergehen hinterlassen teilweise Spuren.
- Neue Arbeitgeber haben andere Regeln und Karten.
- Häufige Namenswechsel erhöhen langfristig den Verdacht.
- Der Namenswechsel ist ausschließlich humorvolle Roguelite-Rahmung.

**Deine Stellungnahme:**



---

### 22. Welche Entscheidungen entstehen durch Ausrüstung und Roverkauf?

Mögliche Designrichtungen:

- spezialisierte Rover statt rein linearer Verbesserungen,
- besserer Scanner gegen kleineren Frachtraum,
- schneller, aber störanfälliger Rover,
- robuster, aber langsamer Rover,
- offizielle Firmenhardware gegen illegale Umbauten,
- günstige gebrauchte Rover mit unbekannten Defekten.

Zu bestimmen ist, ob Rover gekauft, gemietet, von der Firma gestellt oder selbst modifiziert werden.

**Deine Stellungnahme:**



---

### 23. Sind mehrere Rover gleichzeitig aktive, parallele Einheiten?

Falls mehrere Rover vorgesehen sind, muss geklärt werden:

- Teilen sie Kommunikations- oder Zeitkapazität?
- Kann der Spieler Rover B planen, während Rover A Befehle ausführt?
- Können Rover sich gegenseitig bergen, reparieren oder Material übergeben?
- Befinden sie sich auf derselben Karte?
- Wie wird verhindert, dass die Verwaltung zur Routinearbeit wird?
- Gehört Mehrrover-Spiel bereits zum ersten Build oder zu einer späteren Ausbaustufe?

**Deine Stellungnahme:**



---

## E. Präsentation, Figuren und Ton

### 24. Wie stark ist das Spiel Simulation und wie stark schwarzhumorige Satire?

Zu bestimmen ist die gewünschte Mischung aus:

- glaubwürdiger Marskommunikation und technischen Grenzen,
- abstrakter, schnell verständlicher Spielmechanik,
- bedrückender Konzernkontrolle,
- überzeichneten Figuren und absurden Firmenregeln,
- moralisch zweifelhaften, aber humorvoll dargestellten Nebengeschäften.

Diese Festlegung beeinflusst Texte, Grafik, Schwierigkeit und Realismus der Systeme.

**Deine Stellungnahme:**



---

### 25. Welche Figuren sprechen mit Riggs?

Mögliche Rollen:

- der habgierige Boss,
- eine passive-aggressive Firmen-KI,
- ein Kontakt bei den Piraten,
- Techniker und Händler,
- andere Rover-Operatoren,
- Smith als Kommentator, Partner oder Komplize.

Zu klären ist, welche Figuren nur Atmosphäre liefern und welche konkrete Systeme repräsentieren.

**Deine Stellungnahme:**



---

### 26. Welche Rolle spielt Smith?

Im bisherigen Entwurf handelt hauptsächlich Riggs. Denkbare Funktionen für Smith:

- Techniker und Entwickler der Roverprogramme,
- Schwarzmarktkontakt,
- Kollege innerhalb der Firma,
- Firmen-KI oder Stimme im Bedienpult,
- Berater, dessen Ratschläge nicht immer verlässlich sind,
- zweiter spielbarer Charakter,
- Erzähler oder Kommentator.

Zu entscheiden ist, ob Smith hauptsächlich narrativ oder auch mechanisch notwendig ist.

**Deine Stellungnahme:**



---

### 27. Wie wird das Ergebnis einer Übertragung präsentiert?

Mögliche Darstellungen:

- Befehle werden Schritt für Schritt auf dem Raster animiert.
- Ein technisches Missionsprotokoll erklärt jedes Ereignis.
- Der Spieler sieht zunächst nur den neuen Endzustand.
- Fehler erscheinen als überraschende Logmeldungen.
- Kritische Ereignisse erhalten besondere Animationen oder Dialoge.
- Der Spieler kann die Wiedergabe pausieren, beschleunigen oder schrittweise untersuchen.

Die Darstellung muss verständlich machen, warum eine Planung funktioniert oder scheitert.

**Deine Stellungnahme:**



---

## F. Fokus des ersten spielbaren Prototyps

Die folgenden Entscheidungen sollten vor dem Build-Konzept auf jeden Fall verbindlich beantwortet werden. Sie fassen die wichtigsten Punkte zusammen, dürfen aber auf die ausführlichen Antworten oben verweisen.

### 28. Wie gewinnt oder endet der erste Prototyp?

**Deine Stellungnahme:**



---

### 29. Was begrenzt eine Kommandoliste im ersten Prototyp?

**Deine Stellungnahme:**



---

### 30. Welche Information liefert ein Scan im ersten Prototyp?

**Deine Stellungnahme:**



---

### 31. Was geschieht bei einem ungültigen oder gefährlichen Befehl?

**Deine Stellungnahme:**



---

### 32. Wie funktionieren Probe, Analyse und Abbau als zusammenhängende Kette?

**Deine Stellungnahme:**



---

### 33. Wie entstehen Geld, Firmenquote und Verdacht?

**Deine Stellungnahme:**



---

### 34. Welche eine Fähigkeit oder Ressource bleibt nach dem Scheitern dauerhaft erhalten?

**Deine Stellungnahme:**



---

## G. Leitidee für programmierbare Befehle

Eine mögliche besondere Stärke des Konzepts ist, dass Fortschritt nicht nur Zahlen erhöht, sondern die Ausdrucksfähigkeit des Spielers erweitert. Riggs könnte mit starren Befehlsfolgen beginnen und später bedingte Programme erwerben oder entwickeln.

Beispiele:

- „Scanne; bewege dich nur bei sicherem Ergebnis.“
- „Baue ab, bis noch genug Energie für den Rückweg bleibt.“
- „Bei Schaden: Sequenz abbrechen und zum Lander zurückkehren.“
- „Verberge den nächsten Positionsbericht.“

### 35. Sollen programmierbare oder bedingte Befehle die zentrale langfristige Fortschrittsmechanik sein?

Zu beantworten ist auch, wie frei diese Programme konfigurierbar sein sollen und wie ihre Bedienung auf dem Flydeck aussehen könnte.

**Deine Stellungnahme:**



---

## H. Ergänzende Gesamtentscheidung

### 36. Wie lässt sich die gewünschte Spielerfahrung in zwei bis drei Sätzen beschreiben?

Hilfsfragen:

- Was soll der Spieler hauptsächlich fühlen?
- Welche Entscheidung soll er immer wieder gerne treffen?
- Was unterscheidet das Spiel von einem gewöhnlichen Raster- oder Ressourcenmanagementspiel?

**Deine Stellungnahme:**



