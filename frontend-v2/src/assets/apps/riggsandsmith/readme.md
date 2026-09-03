# Riggs & Smith : Wild Dice West

Erster Brainstorm Entwurf
Was nicht funktioniert : kommt weg

## Erster Prompt

ich habe eine spielidee : Riggs and Smith / bei der es um einen Hacker/Trickser geht der bei Casino games/ Automaten usw betrügt . dafür bedient er sich technik . ein szenario spielt in einer cyberpunk welt - aber das ist ein fortgeschrittenes game design und so weit bin ich noch nicht . stattdessen suche ich einen kleinen prototypen bei dem ich eine teilmenge der spielmechanik ausprobieren kann . das Setting ist im wilden westen - und bei riggs & smith dreht es sich irgendwie immer um Würfel - Würfel sind sein Hauptding . deswegen / so sagt die Legende : findet er irgendwann in seinem normalen Arbeiterleben einen Würfel auf der Strasse - und beginnt : an kleinen Strassentischen zu spielen - und so sein Gehalt aufzubessern . ein spielverlauf soll der level forschritt sein : man findet kauft oder stellt andere würfel her / verbessert seine persönlichen (gaukler) fähigkeiten und spielt mit dem Risiko : erwischt zu werden an immer grösseren Tischen .  ich suche etwas inspiration um geeignete spielmechaniken zu finden / einfache minigames / die zusammengesetzt eine spannende gameloop mit begrenztem spielerfortschritt liefern . man spielt um geld und "begrenzt mit technik sein Pech" / möglichst so : dass es nicht auffällt

## Mechaniken

### Geschick beim Würfeln

Ähnlich wie Sportspiele : Ein Zeiger schlägt aus / zB angefangen mit einem leichten Herzschlag / der bei grösseren Tischen stärker wird
Es gibt einen Bereich : den man vielleicht mit Mittelchen / Alkohol / Snake Oil usw beeinflussen kann - passt zur Zeit / bisschen Alchemie
Den Ruhewert könnte man weiter durch Training und Erfahrung steigern / Erfahrung könnte automatisch steigen / so dass man an grösseren Tischen mit der Zeit ruhiger wird
Und bei der Technik hilft einem - wie in jedem Teil der Serie : der Job
In "Wild Dice West" haben wir einen der ersten Uhrmacher

----

Aus dem KI -Chat :

> Idee für die Prototyp-Lore & Progression
> Das Fundstück: Riggs findet als einfacher Gehilfe auf der Straße einen Würfel mit einer winzigen, kaum sichtbaren Naht — gefertigt mit Uhrmacherwerkzeug.  Die Werkstatt als Hub: Zwischen den Spielrunden schaltet der Spieler in Riggs' Werkstatt frei:
> Bohrer & Feile: Erlaubt das Gewichtsverlagern (Präparieren von Augenzahlen).  
> Uhrmacher-Lupe: Erhöht die Fähigkeit, gegnerische Handbewegungen am Tisch zu lesen.
> Federzug-Mechanismus: Schaltet das Blitz-Austauschen (Dice Swap) frei.

Das sind erste Ideen für ein Inventar :

- Werkzeuge
  - Bohrer
  - Feile
  - Lupe
  - Klebstoff
  - Lötkolben (gibt es den schon ?)
  - Zangen / Pinzetten in verschiedenen Qualitäten
  - Mikroskop (vielleicht Eigenbau)
  - Waagen
  - Dritte Hand
- Materialien
  - Metalle
  - Magnete
  - Federn
  - Gewichte
  - Sprengstoff (für Mini-Explosionen)
- Tränke
  - Alkohol
  - Tabak
  - Opium
  - Beruhigungsmittel
  - Schlafmittel

Vielleicht manche Dinge nur mit Risiko unter der Ladentheke zu bekommen

## Game States

- Verdacht / Suspicion
  Bestimmte Würfel erregen mehr Verdacht und lassen einen auffliegen wenn man zu schlecht würfelt
- Würfelgeschick
  Der Wert des Spielers : der die Gesamtruhe der Würfel-Nadel bestimmt
- Geld/Dollar vom Einkommen und Spielgewinn
- Allgemeine Fähigkeit des Spielers : zu täuschen

## Würfeln
Man sieht eine bewegliche Nadel vor einem Spektrum

Das Spektrum hat einen roten und orangenen Bereich

Man drückt einen Button und hält ihn gedrückt - so dass die Nadel sich von einer Seite des Spektrums zur anderen bewegt . Dabei hat sie eine Eigenbewegung / die das Treffen erschwert

Landet man im roten Bereich : hat man volles Würfelglück / beim orangenen Bereich weniger - und in den anderen Fällen kein besonderes extra Glück

Die Nadelbewegung setzt sich aus verschiedenen Frequenzen zusammen :
- Herzschlag des Spielers
  Der Herzschlag /die Frequenz des Spielers hängt vom Risiko des Tisches ab entdeckt zu werden und dem globalen Suspicion-Wert
- Würfelerfahrung des Spielers
  Die Würfelerfahrung des Spielers vergrössert den roten Bereich
- Das Level des Würfelsets vergrössert den orangenen Bereich

Man hat es also am Anfang schwieriger : das volle Würfelglück zu haben - und später bleibt es spannend : weil man mehr mit der Nadel zu kämpfen hat / die immer komplexer schwingt

Der Rythmus der Nadel soll mit zunehmendem Spielfortschritt schwieriger vorherzusehen sein

Würfel verursachen zu ihrem Vorteil auf den gelben Bereich einen Malus auf die Nadelfrequenz / der sich bei besonders starken Würfeln / mit viel Bonus auf das Würfelglück stärker auswirkt

Man beginnt mit einem Würfel an Strassentischen und kann sich hocharbeiten
Wird man erwischt : verliert man seine Würfel und sein nicht investiertes Geld (natürlich guckt man da auch zu Hause bei so einem Typen) / bis auf den ersten / mit dem man immer an den kleinsten Tischen spielen - und sich so wieder hocharbeiten kann

Kleines Rogue-Like : Irgendwann wird man erwischt : verliert seine Würfel und Geld - aber die Werkstatt ist versteckt hinter einer falschen Wand - und die Werkzeuge die man erworben (oder vielleicht gewonnen) hat und die Materialien : bleiben erhalten

## Screens

- Zuhause
  - Werkstatt
  - Shop
  - Tischauswahl
- Spieltisch mit Wahl des Augenergebnisses und der Würfelnadel
- Tisch- /Nacht- Ergebnis
  - Erfolg
  - Erwischt

Zuhause kann man aus einer Liste von Spieltischen die nächste Night auswählen
Einen Shop gibt es der Einfachheit halber auch Zuhause

## Spieler Perks / Technologiebaum

Hier kann man vielleicht Sprüche verstecken

- "Camouflage" / äusserer Anschein / Auftreten hebt den gesamt- Täuschungswert
- "Übung macht den Meister" hebt das Würfelgeschick und dämpft die Nadel
  - "Würfel tauschen" sollte man behandeln / denn darauf käme es an / ergibt sonst eine kleine Logiklücke
- "Herr der Fliegen" - Beherrschung der Stoffe

## Client /APP

Der Cient ist eine APP im Flydeck V2 und in Englisch zu verfassen

Stil : Handheld Feeling mit Western-Sepia-Palette aus 4-8 Farben
Auflösung ähnlich Game Boy / mit grossen Pixeln