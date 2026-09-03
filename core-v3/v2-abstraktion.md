# V2 Flydeck Mobile Client Abstraktion zum Stand 026.09.01

Zum aktuellen Stand der Flydeck V2 Version lohnt sich eine Aufnahme funktionierender Designs. Es soll noch kein neuer Bereich erzeugt werden, deshalb die Ideen im core-v3

## Architektur

Es ist streng auf Komponentenhierarchie und Wiederverwendung zu achten: Nicht mehrmals das Rad neu erfinden!

## Layout

Es ist ein Zeilenlayout vorgesehen mit immer derselben Höhe und Ausnutzung der gesamten Breite

Kleinste Ränder und Spalten, grösstmögliche Schrift, möglichst gar keine Leerfläche

Etwa gleichrangige Elemente verwenden Tabs für horizontal angeordnete Views

## TreeBrowser

Die TreeBrowser Komponente beginnt mit einer Subkomponente ListControl

Die ListControl Komponente beginnt mit einem maximal breiten Button mit dem Namen des Wurzelelments und hat dann 4 Buttons zur Bedienung von Höhe des ausgewählten Elements und der Page des Paginators

