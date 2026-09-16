# Riggs and Smith - Job on Mars

Spieldesign für eine Flydeck App
Erster Entwurf

## Geschichte

Riggs bekommt einen Job, bei dem er Roboter auf dem Mars steuert. Mit dem Roboter muss man einen Quadranten auf dem Mars mit einem Rover von der Erde aus steuern

Man sieht als Spielfläche ein Bedienpult mit Raster als Hauptansicht, auf dem ein Rover auf einem Startquadranten zu sehen ist. Dort ist er gelandet und soll den Bereich nach Rohstoffen absuchen

Man gibt also dem Rover von der Erde aus eine Folge von Kommandos und schickt diese zum Mars. Der Rover führt diese aus und sendet eine Antwort. Quadrate mit Rohstoffen beutet man aus und transportiert diese zum Lander

So lange der Befehl unterwegs ist und ausgeführt wird, kann man sich um seine Ausstattung kümmern, weitere Rover verwalten, kaufen, verkaufen, weitere Rover zum Mars schicken oder wie in jeder Riggs & Smith Serie, seine eigenen Nebengeschäfte mit speziellen Materialien zu machen

Die Rechtfertigung für die Nebengeschäfte ist einfach: Ein ausbeuterisches Unternehmen mit einem habgierigen Boss legitimiert unseren Helden "für die Armen zu sammeln", wenn er auch "bloß" dasselbe tut wie sein Boss, nämlich, für sich selbst zu sammeln

Man ist angestellt bei dem Unternehmen und hat für eine bestimmte Menge Rohstoffe ein bestimmtes Kontingent. Daraus ergibt sich die Möglichkeit, mit dem jeweiligen Rover Umwege zu machen. Fällt der Rover jedoch in der Nähe der Piratenstation aus, fällt das auf und das Spiel ist aus

Fliegt man aus der Firma raus wegen krummer Geschäfte, ändert man einfach seinen Namen: Jack Smith, John Smith, Ron Smith, irgend so was. Man erwirbt im Laufe des Spiels zusätzliche Kommandos auf den Rover, die man selbst programmiert und zum Mars hochgeladen hat. Diese Programme behält man als Riggs und fängt rogue-like eine weitere Runde an

## Spielfeld

Es gibt ein Spielfeld mit 8x8 Feldern und einer Liste von Befehlen
Es gibt ein Roboter-Icon mit Charakteristiken (zB Zustand/Health) und Buttons zur Steuerung
Dann kann man sich das Spielfeld anschauen und entscheiden, welche Buttons man drückt. Man kann die Kommandoliste herumschieben wie man will, mit so viel Bewegungspunkten wie man hat, und schickt dann die ganze Befehlsliste zum Mars

Nach einer gewissen Zeit kommt eine Antwort mit dem aktualisierten Spielfeld, der neuen Position des Rover, aufgedeckten Feldern usw, einem neuen Status des Rover (Zustand, Batterie vielleicht, schauen wir noch), und man setzt erneut eine Befehlsliste

## Kommandos

Am Anfang hat man folgende Befehle

- Bereich scannen (ein Bereich wird oberflächlich auf Gefahren gescannt)
- Bewegen (auf ein umliegendes Feld, ungescannt kann ein Rover Schaden nehmen oder verloren gehen)
- Probe nehmen (auf dem derzeitigen Feld Gesteinsproben nehmen)
- Rohstoff abbauen (so viel Rohstoff mitnehmen wie auf Feld ist oder bis Staufläche voll)
- Abladen (An Landestelle Lander Rohstoffe übergeben)

## Felder

Es gibt diese Unterscheidung für Felder auf dem Mars

- Dunkel (unbesucht und ungescannt)
- Scan leer (kein Scan Ergebnis auf dem Feld)
- Besucht (Bewegt sich der Rover auf ein neues Feld, werden seine für den Rover bedeutende Eigenschaften auf seine Werte gerechnet, zB rauhes Gelände: -1% Zustand oder so)
- Untersucht (Probe wurde genommen)
- Rohstoff vorhanden (Probe wurde beim Lander abgeliefert und analysiert)
- Abgebaut (Rohstoffe wurden abgebaut)
- Lander (Feste Landeposition auf einem Quadranten/ Spielfeld)
- Piratenstation (Schwarzmarkt)
- maybe more

## Eingabe

Es gibt eine Kommandofläche mit Buttons mit Symolen. Klickt man Symbole, werden die Kommandos in die Befehlsliste eingereiht. Ausgewählte Kommandos kann man mit 2 Buttons hoch/runter in der Reihenfolge verschieben

Kommandos haben Zeitkosten. Welchen genau, muss man einstellen. Ist der vorgegebene Kommandospeicher voll (das Zeitkonto aufgebraucht), kann man keine weiteren Kommandos hinzufügen