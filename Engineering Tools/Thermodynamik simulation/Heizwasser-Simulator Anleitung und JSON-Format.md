# Heizwasser-Simulator: Anleitung und JSON-Format

Oct 4, 2026 · @manuel

## Überblick und Schnellstart

Der Simulator berechnet Volumenströme, Drücke und Temperaturen eines Heizwassernetzes über der Zeit. Du baust das Netz aus Bauteilen und verbindest sie auf der Zeichenfläche.

1. Im Tab **Bauteile** ein Beispielsystem laden oder ein Bauteil antippen. Neue Bauteile erscheinen in der Bildmitte.
2. Einen Ausgang (rechts) auf einen Eingang (links) ziehen. Alternativ beide Ports nacheinander antippen.
3. Das Bauteil antippen und im Tab **Details** die Parameter einstellen.
4. Den Kreis schließen: Der Rücklauf führt zurück zum Erzeuger. Mindestens eine Pumpe ist nötig, eine Druckhaltung wird empfohlen.
5. **▶ Start** drücken. Die Geschwindigkeit (×1 bis ×14400) wählst du oben.
6. Im Tab **System** Hinweise und Energiebilanz prüfen, im Tab **Diagramm** die Verläufe ansehen.

### Rechenannahmen

| Größe | Annahme |
| --- | --- |
| Wasser | Dichte 983 kg/m³, Wärmekapazität 4,18 kJ/(kg·K), Viskosität temperaturabhängig |
| Rohr, Thermik | 4 bis 20 Zellen (etwa eine je 2,5 m), Wärmeverlust nach Dämmstärke (λ 0,035 W/(m·K), Außenübergang 10 W/(m²·K)) |
| Rohr, Hydraulik | Stahlrohr mit Innendurchmesser nach Nennweite, Rauheit 0,045 mm, Druckverlust nach Darcy-Weisbach plus Einzelwiderstände Σζ |
| Zeitschritt | automatisch stabil gewählt, höchstens 5 s |
| Umgebung | eine globale Umgebungstemperatur für Rohre und Speicher |

## Bedienung

Alles passiert auf der Zeichenfläche und in den vier Tabs darunter (am Computer rechts daneben).

### Zeichenfläche

- **Verschieben:** Bauteil ziehen (Raster 10). Auf leerer Fläche ziehen verschiebt die Ansicht.
- **Zoomen:** zwei Finger, Mausrad oder die Tasten **+**, **−**. **⤢** zeigt alles.
- **Verbinden:** vom Ausgangsport auf einen Eingangsport ziehen oder beide Ports nacheinander antippen. Mögliche Ziele werden hervorgehoben.
- **Ein Port, eine Leitung:** Eine neue Verbindung ersetzt die alte am selben Port.
- **Entfernen:** Bauteil oder Leitung antippen, dann **Entfernen** in den Details (oder Taste Entf).
- **Spiegeln:** vertauscht die Anschlussseiten. Rücklaufleitungen zeichnest du so in Gegenrichtung.
- **Farben:** Portfarbe und Leitungsfarbe zeigen die Wassertemperatur (Blau bei 10 °C bis Rot ab 80 °C). Dicke und laufende Punkte zeigen den Volumenstrom.

### Kopfleiste

| Element | Funktion |
| --- | --- |
| ▶ Start / ⏸ Pause | startet oder pausiert die Simulation (Leertaste am Computer) |
| ⟲ | setzt alle Temperaturen auf die Starttemperatur zurück und leert das Diagramm |
| ↶ | macht die letzte Änderung rückgängig (bis zu 40 Schritte) |
| ×1 bis ×14400 | Simulationsgeschwindigkeit: ×60 bedeutet 1 Minute je Sekunde |
| Uhr | oben Wochentag und Uhrzeit der Simulation (zum Beispiel Mo 06:00), darunter die Laufzeit als h:mm:ss |

### Die vier Tabs

| Tab | Inhalt |
| --- | --- |
| Bauteile | Bauteile hinzufügen, Beispielsysteme laden |
| Details | Name, Spiegeln, Duplizieren, Entfernen, Parameter (Zahlenfeld und Schieber), Auswahl für das Diagramm, Messwerte live |
| Diagramm | Temperaturen oder Leistungen über der Zeit. Welche Temperaturen erscheinen, wählst du je Bauteil in den Details. |
| System | Umgebungstemperatur, Starttemperatur, Systemdruck, Sicherheitszuschlag, Startwochentag und Startuhrzeit, Druck und Verdampfung, Energiebilanz, Hinweise, Export und Import |

Parameter lassen sich auch während der Simulation ändern. Mit **▾** rechts in der Tableiste klappst du den Bereich auf dem Handy ein. Die Meldung **⚠** links unten öffnet die Hinweise.

## Bauteil-Referenz

Jedes Bauteil hat eine Typ-Kennung (`type` in der JSON-Datei), Anschlüsse mit fester Nummer und Parameter im Objekt `p`. Fehlende Parameter ergänzt der Import mit den Standardwerten. Die Portnummern brauchst du für die Verbindungen.

### Wärmeerzeuger (`source`)

Kessel oder Wärmepumpe. Regelt auf die Soll-Vorlauftemperatur, begrenzt durch die Maximalleistung. Ohne Durchfluss heizt er nicht. Wirkungsgrad, COP, Bedarfsbegrenzung und Kaskade erklärt der Abschnitt Hydraulik und Pumpen.

Anschlüsse: **0** Eingang (Rücklauf), **1** Ausgang (Vorlauf).

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `tset` | Soll-Vorlauftemperatur | °C | 30 bis 130 | 70 |
| `pmax` | maximale Leistung (Bezug siehe pbase) | kW | 1 bis 500 | 50 |
| `eta` | Nennwirkungsgrad (nur Kessel) | – | 0,5 bis 6 | 0,95 |
| `vol` | Wasserinhalt | L | 2 bis 500 | 40 |
| `kv` | hydraulischer Widerstand | m³/h | 1 bis 200 | 12 |
| `on` | in Betrieb | true/false | – | true |
| kind | Art: boiler (Kessel) oder hp (Wärmepumpe) | – | – | boiler |
| pbase | Leistungsangabe: th (Wärmeleistung) oder in (Brennstoff- oder Stromleistung) | – | – | th |
| etap | Wirkungsgrad bei 30 % Last, 0 = wie eta (nur Kessel) | – | 0 bis 1,2 | 0 |
| gg | Gütegrad gegenüber Carnot (nur hp) | – | 0,2 bis 0,8 | 0,5 |
| tq | Quellentemperatur (nur hp) | °C | −20 bis 40 | 7 |
| cap | Leistungsbegrenzung: free (keine) oder demand (auf Bedarf) | – | – | free |
| reserve | Reserve über dem Bedarf (nur demand) | % | 0 bis 100 | 10 |
| prio | Priorität in der Kaskade, 1 = zuerst (nur demand) | – | 1 bis 5 | 1 |

### Pumpe (`pump`)

Anschlüsse: **0** Eingang, **1** Ausgang. Die Betriebsarten erklärt der Abschnitt Hydraulik.

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `mode` | Betriebsart: `flow`, `fixed`, `dpc`, `dpv` | – | – | `flow` |
| `flow` | Volumenstrom (nur `flow`) | m³/h | 0,1 bis 50 | 2 |
| `qn` | Nennvolumenstrom (alle außer `flow`) | m³/h | 0,5 bis 100 | 3 |
| `hn` | Nennförderhöhe (alle außer `flow`) | m | 0,5 bis 30 | 4 |
| `n` | Drehzahl (nur `fixed`) | % | 30 bis 100 | 100 |
| `hs` | Sollförderhöhe (nur `dpc`, `dpv`) | m | 0,2 bis 30 | 2 |
| `nmin` | minimale Drehzahl (nur `dpc`, `dpv`) | % | 10 bis 90 | 40 |
| `eta` | Pumpenwirkungsgrad | – | 0,1 bis 0,9 | 0,5 |
| `on` | in Betrieb | true/false | – | true |

### Rohr (`pipe`)

Anschlüsse: **0** Eingang, **1** Ausgang. Ein Rohr hat Laufzeit, Wärmeverlust und Druckverlust.

| Schlüssel | Bedeutung | Einheit | Erlaubte Werte | Standard |
| --- | --- | --- | --- | --- |
| `len` | Länge | m | 1 bis 500 | 20 |
| `dn` | Nennweite | – | 15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200 | 32 |
| `ins` | Dämmstärke | mm | 0, 20, 30, 50, 80, 100 | 30 |
| `zeta` | Einzelwiderstände Σζ (Bögen, Armaturen) | – | 0 bis 50 | 3 |

### Verbraucher (`consumer`)

Heizkörper, Lüftung oder Prozess. Modell `P` entnimmt eine feste Leistung, Modell `UA` eine Leistung nach Heizfläche und Raumtemperatur.

Anschlüsse: **0** Eingang (Vorlauf), **1** Ausgang (Rücklauf).

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `mode` | Modell: `P` oder `UA` | – | – | `P` |
| `pq` | Wärmebedarf (nur `P`) | kW | 0,5 bis 500 | 20 |
| `tmin` | minimale Rücklauftemperatur (nur `P`) | °C | 10 bis 60 | 30 |
| `ua` | Heizfläche UA (nur `UA`) | kW/K | 0,05 bis 20 | 0,5 |
| `troom` | Raumtemperatur (nur `UA`) | °C | 0 bis 40 | 20 |
| `last` | Lastfaktor | % | 0 bis 150 | 100 |
| `vol` | Wasserinhalt | L | 1 bis 500 | 20 |
| `kv` | hydraulischer Widerstand | m³/h | 0,5 bis 200 | 8 |

### Zeitplan der Verbraucher

Jeder Verbraucher kann einen Zeitplan nutzen. Er skaliert den Wärmebedarf nach Wochentag und Uhrzeit: Last = Zeitplanfaktor × Lastfaktor `last`. Das gilt für beide Modelle `P` und `UA`. Das 3-Wege-Ventil im Modus `auto` berücksichtigt den Plan ebenfalls.

- **Zeitfenster:** je Wochentag (Mo bis So) beliebig viele, jeweils mit Beginn, Ende und Last in Prozent (0 bis 150).
- **Grundlast:** Außerhalb aller Fenster gilt die Grundlast `off`, Standard 0 %. So bildest du Nachtabsenkung oder Betriebsruhe ab.
- **Überlappung:** Überlappen sich Fenster, gilt das höchste.
- **Mitternacht:** Ein Ende vor dem Beginn läuft in den Folgetag. Ein Ende von 00:00 bedeutet 24:00.
- **Kalender:** Der Plan läuft auf dem Kalender der Simulation. Wochentag und Uhrzeit des Starts stellst du im Tab **System** ein, Standard ist Montag 00:00. Die Kopfleiste zeigt Wochentag und Uhrzeit.
- **Bedienung:** In den Details des Verbrauchers unter **Zeitplan** aktivieren, eine Vorlage wählen oder Zeitfenster je Tag eintragen und den Tag auf Mo–Fr, Sa+So oder alle kopieren. Die Wochenübersicht zeigt die Last als Farbstärke und die aktuelle Zeit als Linie.
- **Vorlagen:** Büro (Mo–Fr 07:00–17:00), Zweischicht (Mo–Fr 06:00–22:00), Dreischicht (Mo–Fr rund um die Uhr), Wohnen (morgens und abends voll, mittags 40 %), Dauerbetrieb 24/7, Leer.
- **Tempo:** Mit ×14400 läuft die Simulation mit 4 Stunden je Sekunde, eine Woche dauert 42 Sekunden. Das Diagramm schaltet bei langen Läufen auf Tage um.

### Pufferspeicher (`tank`)

Geschichteter Wärmespeicher. Alle vier Anschlüsse liegen hydraulisch auf gleichem Druck, der Speicher wirkt also als hydraulische Weiche.

Anschlüsse: **0** Eingang oben (links), **1** Ausgang unten (links), **2** Ausgang oben (rechts), **3** Eingang unten (rechts).

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `vol` | Volumen | L | 100 bis 10000 | 1000 |
| `h` | Höhe | m | 0,5 bis 4 | 1,8 |
| `n` | Anzahl Schichten | – | 2 bis 12 | 8 |
| `ua` | Wärmeverlust | W/K | 0 bis 20 | 2,5 |

### Verteiler (`splitter`)

Teilt einen Strom auf 2 bis 6 Abgänge A bis F.

Anschlüsse: **0** Eingang, **1** bis **np** Abgänge (A = 1, B = 2, …).

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `np` | Anzahl Abgänge | – | 2 bis 6 | 2 |
| `mode` | `ratio` (nach Anteilen) oder `free` (Hydraulik bestimmt) | – | – | `ratio` |
| `w1` bis `w6` | relativer Anteil Abgang A bis F (nur `ratio`, nur bis `np`) | % | 0 bis 100 | je 50 |

Die Anteile werden auf ihre Summe normiert: 20/15/10 ergibt 44/33/22 Prozent.

### Sammler (`mixer`)

Führt 2 bis 6 Ströme zusammen und mischt die Temperaturen.

Anschlüsse: **0** bis **np − 1** Zuläufe (A = 0, B = 1, …), **np** Ausgang. Der Ausgang wandert also mit der Anzahl der Zuläufe.

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `np` | Anzahl Zuläufe | – | 2 bis 6 | 2 |

### 3-Wege-Ventil (`valve3`)

Lenkt den Zulauf auf den Verbraucher (A) oder den Bypass (B). Den Bypass führst du mit einem Sammler wieder mit dem Verbraucher-Rücklauf zusammen.

Anschlüsse: **0** Zulauf, **1** Ausgang A (Verbraucher), **2** Ausgang B (Bypass).

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `ctl` | Stellung: `manual`, load oder `auto` | – | – | `manual` |
| `pos` | Öffnung zum Verbraucher (nur `manual`) | % | 0 bis 100 | 100 |
| `dts` | Soll-Spreizung am Verbraucher (nur `auto`) | K | 3 bis 40 | 15 |
| `kvs` | Kvs-Wert | m³/h | 0,5 bis 100 | 6 |
| pminv | Mindestöffnung (nur load) | % | 0 bis 100 | 10 |

### Regelventil (`valve2`)

Drosselt den Volumenstrom. Anschlüsse: **0** Eingang, **1** Ausgang.

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `pos` | Öffnung | % | 0 bis 100 | 100 |
| `kvs` | Kvs-Wert | m³/h | 0,5 bis 100 | 10 |

### Druckminderer (`prv`)

Hält den Druck hinter sich auf einen absoluten Sollwert. Anschlüsse: **0** Eingang (Hochdruck), **1** Ausgang (Niederdruck).

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `pset` | Hinterdruck-Sollwert (absolut) | bar | 0,2 bis 16 | 2,5 |
| `kv` | Kv-Wert im offenen Zustand | m³/h | 1 bis 200 | 20 |

### Druckhaltung (`hold`)

Legt den Systemdruck am Einbauort fest, wie ein Ausdehnungsgefäß. Anschlüsse: **0** Eingang, **1** Ausgang.

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `pstat` | Systemdruck | bar | 0,5 bis 16 | 2 |

### Wärmeübertrager (`hx`)

Trennt zwei Kreise und überträgt Wärme im Gegenstrom. Beide Seiten sind hydraulisch getrennt.

Anschlüsse: **0** Primär Eingang, **1** Primär Ausgang, **2** Sekundär Eingang, **3** Sekundär Ausgang. Primär und sekundär sind die Seiten, die du beim Verbinden wählst. Die Wärme geht von der wärmeren zur kälteren Seite.

| Schlüssel | Bedeutung | Einheit | Bereich | Standard |
| --- | --- | --- | --- | --- |
| `ua` | Übertragungsfähigkeit | kW/K | 0,5 bis 100 | 8 |
| `vol` | Wasserinhalt je Seite | L | 1 bis 200 | 10 |
| `kv` | hydraulischer Widerstand je Seite | m³/h | 0,5 bis 200 | 10 |

## Hydraulik und Pumpen

Der Simulator löst Volumenströme und Drücke gleichzeitig. Die Temperaturrechnung nutzt danach die berechneten Ströme.

### Pumpen-Betriebsarten

| `mode` | Verhalten | Typische Nutzung |
| --- | --- | --- |
| `flow` | Volumenstrom fest vorgegeben (ideal). Die Förderhöhe ergibt sich aus dem Netz. | Einstieg, Wärmebilanzen ohne Hydraulikeffekte |
| `fixed` | Konstantdrehzahl. Der Betriebspunkt ergibt sich aus Kennlinie und Netz. | Wirkung von Ventilen und Rohrweiten auf den Strom |
| `dpc` | Drehzahl geregelt, Förderhöhe konstant auf `hs`. | Heizkreise mit Thermostat- oder Regelventilen |
| `dpv` | Drehzahl geregelt, Sollförderhöhe steigt von 50 % bei Strom 0 auf 100 % bei Nennstrom. | Umwälzpumpen mit Proportionaldruck |

Die Kennlinie ist eine Parabel durch den Nennpunkt (`qn`, `hn`) mit 30 % höherer Förderhöhe bei Strom 0:

```latex
H_0 = 1{,}3\,H_n,\qquad a = \frac{H_0 - H_n}{Q_n^2},\qquad H(\dot V) = n^2 H_0 - a\,\dot V^2
```

Bei `dpc` und `dpv` wählt die Regelung die Drehzahl `n` zwischen `nmin` und 100 % so, dass die Förderhöhe dem Sollwert entspricht. An den Grenzen folgt die Pumpe der Kennlinie. Die elektrische Leistung ist die hydraulische Leistung geteilt durch `eta`. Die Details zeigen sie als Leistung und als Summe in kWh.

### Druckverluste

Für Kv-Werte gilt Δp in bar = (V̇ in m³/h ÷ Kv)².

| Bauteil | Druckverlust |
| --- | --- |
| Rohr | Reibung nach Darcy-Weisbach plus Σζ · ρ · v² / 2 |
| Erzeuger, Verbraucher, Wärmeübertrager (je Seite) | Kv des Bauteils |
| Regelventil | Kvs · Öffnung |
| 3-Wege-Ventil | Zweig A: Kvs · Öffnung. Zweig B: Kvs · (1 − Öffnung). Mindestens 0,1 % Öffnung. |
| Druckminderer | Kv im offenen Zustand, solange er nicht regelt |
| Verteiler `free`, Sammler, Speicher | kein Verlust, alle Anschlüsse haben gleichen Druck |

### Verteiler-Modi

- **`ratio`:** ideale Aufteilung nach den Anteilen `w1` bis `w6`. Die Zweige sind hydraulisch entkoppelt. Die angezeigte Förderhöhe der Pumpe davor richtet sich nach dem kritischsten Zweig und ist eine Näherung.
- **`free`:** Die Aufteilung ergibt sich aus der Hydraulik. Das brauchst du bei parallelen Pumpen oder Erzeugern.

Parallele Erzeuger mit je eigener Pumpe verbindest du über einen Verteiler (`free`) im Rücklauf und einen Sammler im Vorlauf.

### Erzeuger: Wirkungsgrad, Wärmepumpe und Bedarfsbegrenzung

- **Kessel (`kind` = `boiler`):** Der Wirkungsgrad `eta` gilt bei Nennlast. Mit `etap` größer 0 ändert er sich linear zwischen 100 % Last (`eta`) und 30 % Last (`etap`). Darunter bleibt er bei `etap`.
- **Wärmepumpe (`kind` = `hp`):** COP = Gütegrad `gg` × T Vorlauf ÷ (T Vorlauf − T Quelle), Temperaturen in Kelvin, begrenzt auf 1 bis 9. Er sinkt bei höherem Vorlauf und tieferer Quelle `tq`. Bei 7 °C Quelle und Gütegrad 0,5 ergibt 55 °C Vorlauf einen COP von 3,4, 70 °C einen COP von 2,7.
- **Aufnahmeleistung:** Wärmeleistung ÷ Wirkungsgrad oder COP. Die Details zeigen Aufnahmeleistung, bezogene Energie in kWh und Wärme je Bezug. Das Diagramm **Leistungen** zeigt den Bezug als eigene Linie.
- **Leistungsangabe `pbase`:** `th` bedeutet, dass `pmax` die Wärmeleistung ist. `in` bedeutet, dass `pmax` die Brennstoff- oder Stromleistung ist. Die Wärmeleistung ist dann `pmax` × Wirkungsgrad, bei der Wärmepumpe × aktuellem COP.
- **Bedarfsbegrenzung (`cap` = `demand`):** Der Erzeuger regelt weiter auf seinen Soll-Vorlauf, liefert aber höchstens Bedarf × (1 + `reserve`). Der Bedarf ist die Last aller Verbraucher im Netz mit Lastfaktor und Zeitplan plus die Verluste von Rohren und Speichern. Hinter einem Wärmeübertrager zählt dessen Sekundärbedarf. Im Test sank die Spitze beim Aufheizen von 60 kW auf 22,7 kW bei 20,7 kW Bedarf.
- **Kaskade:** Mehrere begrenzte Erzeuger im selben Netz teilen den Bedarf nach `prio` (1 zuerst). Ein Erzeuger mit niedrigerer Priorität erhält nur, was nach den höheren übrig bleibt. Gleiche Priorität teilt nach Leistung. Nicht begrenzte Erzeuger zählen wie die erste Stufe.
- **Reserve:** Mit 0 % reicht die Leistung genau für den Bedarf, und die Temperatur steigt nicht bis zum Sollwert. Der Standard von 10 % lässt sie steigen. Ein Erzeuger niedriger Priorität, der nichts liefern soll, kühlt den Vorlauf, solange seine Pumpe läuft. Schalte die Pumpe dann aus.

### Druckhaltung und Druckminderer

- **Druckhaltung:** legt den Druck am Einbauort fest. Ohne sie ist das Netz nur schwach auf den Systemdruck aus dem Tab System verankert. Absolutdrücke sind dann Bezugswerte.
- **Druckminderer:** Hinter ihm gilt p aus = min(p ein − Verlust, `pset`). Der Sollwert ist absolut und muss über dem Druck am Rücklauf liegen. Bei 2,0 bar Systemdruck und `pset` 2,3 bar steht dem Zweig dahinter eine Differenz von 0,3 bar zur Verfügung. Reicht der Eingangsdruck nicht, bleibt der Druckminderer offen.

### Verdampfung und Mindestdruck

Vorlauftemperaturen bis 130 °C sind möglich (`tset` des Erzeugers). Oberhalb von 100 °C muss der Druck überall über dem Dampfdruck des Wassers liegen, sonst verdampft es.

| Temperatur | Dampfdruck (absolut) |
| --- | --- |
| 100 °C | 1,01 bar |
| 110 °C | 1,43 bar |
| 120 °C | 1,98 bar |
| 130 °C | 2,69 bar |

- **Mindestdruck:** Dampfdruck bei der höchsten Temperatur plus Sicherheitszuschlag `glob.psafe` (Standard 0,5 bar).
- **Prüfung:** an jeder Leitung mit dem berechneten Druck. Leitungen hinter einem Erzeuger gelten mit dessen Soll-Vorlauftemperatur, auch bevor das Wasser sie erreicht hat. Übrige Leitungen zählen mit ihrer aktuellen Temperatur.
- **Anzeige:** in den Details des Erzeugers (Dampfdruck, Mindestdruck, Druck und Reserve am Austritt), in den Details der Druckhaltung (Mindest-Systemdruck, Reserve) und im Tab **System** je Netz. Ein Netz ist ein hydraulisch verbundener Kreis. Der Wärmeübertrager trennt Netze, der Speicher verbindet sie.
- **Anpassen:** Du stellst den Systemdruck an der Druckhaltung (`pstat`) oder global im Tab System ein. **Systemdruck auf Mindestdruck setzen** übernimmt den Mindestdruck, aufgerundet auf 0,1 bar. Hinter einem Druckminderer zählt sein absoluter Sollwert `pset`. Hebe ihn bei Bedarf selbst an.
- **Folge bei zu wenig Druck:** Die Simulation rechnet weiter ohne Dampfbildung und meldet den Hinweis „Verdampfungsgefahr“.

### 3-Wege-Ventil

- **`manual`:** Die Öffnung `pos` bestimmt, wie viel Zulauf zum Verbraucher geht. Der Rest strömt durch den Bypass.
- **`auto`:** Das Ventil stellt sich so, dass der Verbraucher die Soll-Spreizung `dts` erhält. Sollstrom = Leistung ÷ (cp · `dts`), begrenzt auf den Zulauf. Die Leistung ist bei Modell `P` der Bedarf mal Lastfaktor, bei `UA` UA · (T − Raumtemperatur) · Lastfaktor. Die Stellzeit beträgt etwa 15 s.
- **Verbrauchersuche:** Das Ventil folgt Ausgang A über Rohr, Pumpe, Regelventil, Druckminderer, Druckhaltung und Erzeuger (bis 8 Schritte) bis zum Verbraucher. Findet es keinen, meldet die App einen Hinweis und die Regelung bleibt stehen.

* **`load`:** Die Öffnung ist direkt die Last des Verbrauchers hinter Ausgang A: Lastfaktor `last` × Zeitplan, mindestens `pminv` (Standard 10 %). Es gibt keine Regelträgheit. Bei 40 % Last öffnet das Ventil zu 40 %, bei Last 0 bleibt die Mindestöffnung. Die Verbrauchersuche läuft wie bei `auto`, der gefundene Verbraucher steht in den Messwerten des Ventils.

Der Gesamtstrom bleibt ungefähr konstant, weil der Bypass das Schließen des Verbraucherzweigs ausgleicht. Dadurch mischt sich warmes Bypasswasser in den Rücklauf und hebt die Rücklauftemperatur an.

## JSON-Format

Eine Modell-Datei ist ein einziges JSON-Objekt in UTF-8 mit drei Teilen: Randbedingungen (`glob`), Bauteile (`comps`) und Verbindungen (`edges`). Gespeichert wird das Modell, nicht der Simulationsstand.

### Gerüst

```json
{
  "app": "heizwasser-simulator",
  "v": 2,
  "glob": { "tamb": 15, "tinit": 20, "pstat": 2 },
  "nextId": 12,
  "comps": [ ],
  "edges": [ ]
}
```

### Oberste Ebene

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `app` | nein | Kennung der App, wird beim Import ignoriert |
| `v` | nein | Formatversion (aktuell 2), wird ignoriert |
| `glob.tamb` | nein | Umgebungstemperatur in °C, Standard 15 |
| `glob.tinit` | nein | Starttemperatur des Wassers in °C nach dem Zurücksetzen, Standard 20 |
| `glob.pstat` | nein | Systemdruck als Bezug in bar (0,5 bis 16) für Netze ohne Druckhaltung, Standard 2 |
| glob.psafe | nein | Sicherheitszuschlag gegen Verdampfung in bar (0 bis 3), Standard 0,5 |
| glob.t0day | nein | Wochentag beim Simulationsstart: 0 = Montag bis 6 = Sonntag, Standard 0 |
| glob.t0min | nein | Uhrzeit beim Simulationsstart in Minuten seit Mitternacht (0 bis 1439), Standard 0 |
| `nextId` | nein | wird beim Import auf die höchste vergebene ID plus 1 gesetzt, darf fehlen |
| `comps` | ja | Liste der Bauteile. Fehlt sie, meldet die App „Die Datei ist kein gültiges Modell.“ |
| `edges` | nein | Liste der Verbindungen |

### Bauteil (`comps`)

| Feld | Typ | Pflicht | Bedeutung |
| --- | --- | --- | --- |
| `id` | ganze Zahl | ja | eindeutige Nummer, auf die die Verbindungen verweisen. Vergib Zahlen im ganzen Modell nur einmal, auch nicht doppelt zu Verbindungs-IDs. |
| `type` | Text | ja | Typ-Kennung: `source`, `pump`, `pipe`, `consumer`, `tank`, `splitter`, `mixer`, `valve3`, `valve2`, `prv`, `hold`, `hx`. Unbekannte Typen werden übersprungen. |
| `x`, `y` | Zahl | ja | Position der linken oberen Ecke in Pixeln, y zeigt nach unten. Raster 10 ist üblich. |
| `name` | Text | nein | Anzeigename, höchstens 24 Zeichen. Standard ist der Typname. |
| `flip` | true/false | nein | vertauscht die Anschlussseiten links und rechts, Standard false |
| `p` | Objekt | nein | Parameter, siehe Bauteil-Referenz. Beim Verbraucher enthält p.sch zusätzlich den Zeitplan. Fehlende Schlüssel erhalten Standardwerte, unbekannte bleiben wirkungslos. |
| `chart` | Liste true/false | nein | je Portnummer, ob die Temperatur dieses Ausgangs im Diagramm erscheint. Fehlende Einträge zählen als false. |

### Zeitplan (`p.sch`, nur Verbraucher)

Das Objekt `sch` steht im Parameterobjekt `p` eines Verbrauchers. Fehlt es, ist der Verbraucher ohne Zeitplan im Dauerbetrieb.

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `on` | true/false | Zeitplan aktiv |
| `off` | Zahl 0 bis 150 | Grundlast in Prozent außerhalb aller Zeitfenster, Standard 0 |
| `days` | Liste mit bis zu 7 Listen | Tag 0 = Montag bis Tag 6 = Sonntag. Fehlende Tage haben keine Zeitfenster. |
| `days[i][j].from` | `"HH:MM"` | Beginn des Zeitfensters. Minuten seit Mitternacht als Zahl sind ebenfalls erlaubt. |
| `days[i][j].to` | `"HH:MM"` | Ende. `"24:00"` und `"00:00"` bedeuten Tagesende, ein Ende vor dem Beginn läuft über Mitternacht. |
| `days[i][j].level` | Zahl 0 bis 150 | Last in Prozent, Standard 100 |

Beispiel: Büro von Montag bis Freitag 06:00 bis 17:00 mit 20 % Grundlast, am Wochenende nur Grundlast.

```json
{ "id": 4, "type": "consumer", "x": 670, "y": 60, "name": "Büro",
  "p": { "pq": 20, "tmin": 30,
         "sch": { "on": true, "off": 20,
                  "days": [
                    [ { "from": "06:00", "to": "17:00", "level": 100 } ],
                    [ { "from": "06:00", "to": "17:00", "level": 100 } ],
                    [ { "from": "06:00", "to": "17:00", "level": 100 } ],
                    [ { "from": "06:00", "to": "17:00", "level": 100 } ],
                    [ { "from": "06:00", "to": "17:00", "level": 100 } ],
                    [],
                    []
                  ] } } }
```

Der Import prüft die Zeiten beim Laden. Fenster mit ungültiger Uhrzeit werden übersprungen, Prozentwerte auf 0 bis 150 begrenzt. Beim Export schreibt die App die Uhrzeiten immer als `"HH:MM"`.

### Verbindung (`edges`)

| Feld | Typ | Pflicht | Bedeutung |
| --- | --- | --- | --- |
| `id` | ganze Zahl | empfohlen | eindeutige Nummer. Fehlt sie, vergibt die App eine. |
| `a` | Objekt | ja | Ausgangsport: `c` ist die `id` des Bauteils, `p` die Portnummer |
| `b` | Objekt | ja | Eingangsport, gleicher Aufbau |

Das Wasser fließt von `a` nach `b`:

```json
{ "id": 11, "a": { "c": 1, "p": 1 }, "b": { "c": 2, "p": 0 } }
```

### Portnummern auf einen Blick

| Typ | Eingänge | Ausgänge |
| --- | --- | --- |
| `source`, `pump`, `pipe`, `consumer`, `valve2`, `prv`, `hold` | 0 | 1 |
| `tank` | 0 (oben), 3 (unten) | 1 (unten), 2 (oben) |
| `splitter` | 0 | 1 bis `np` (A = 1, B = 2, …) |
| `mixer` | 0 bis `np` − 1 (A = 0, B = 1, …) | `np` |
| `valve3` | 0 | 1 (A, Verbraucher), 2 (B, Bypass) |
| `hx` | 0 (primär), 2 (sekundär) | 1 (primär), 3 (sekundär) |

### Regeln beim Import

1. `a` muss ein Ausgang sein und `b` ein Eingang. Verbindungen mit falscher Richtung, unbekannter Bauteil-ID oder nicht vorhandener Portnummer werden ohne Meldung verworfen.
2. Jeder Port hat höchstens eine Verbindung. Der Import prüft das nicht. Doppelt belegte Ports liefern falsche Ergebnisse.
3. Verbinde ein Bauteil nicht mit sich selbst.
4. Auswahlwerte (`dn`, `ins`, `mode`, `ctl`) müssen genau den Werten der Bauteil-Referenz entsprechen. Der Import prüft sie nicht und begrenzt nur `np` auf 2 bis 6. Ungültige Werte zeigen sich als „–“ oder unsinnige Ergebnisse.
5. Zahlen stehen als Zahlen im JSON, nicht als Text, mit Dezimalpunkt.
6. `np` legt die Portanzahl von Verteiler und Sammler fest. Verbindungen an Ports, die es dann nicht mehr gibt, entfallen.
7. Laden ersetzt das aktuelle Modell, **↶** holt es zurück. Alle Temperaturen starten bei `glob.tinit`.
8. Alte Dateien mit dem Verteiler-Schlüssel `ra` werden in `w1` und `w2` umgerechnet.

### Maße für die Positionierung

Mit Breite und Höhe lassen sich `x` und `y` so wählen, dass sich Bauteile nicht überlappen. Lass etwa 40 px Abstand horizontal und 30 px vertikal, damit die Leitungen lesbar bleiben.

| Typ | Breite | Höhe |
| --- | --- | --- |
| `hx` | 180 | 96 |
| `tank` | 150 | 128 |
| `valve3` | 150 | 80 |
| `pipe` | 150 | 76 |
| `splitter`, `mixer` | 150 | 24 + max(56, 24 · `np` + 8): 80 bei 2, 104 bei 3, 128 bei 4, 152 bei 5, 176 bei 6 |
| `source`, `pump`, `consumer`, `valve2`, `prv`, `hold` | 150 | 70 |

## Beispiel-Dateien

Das erste Beispiel ist der einfache Heizkreis aus der App in Minimalform. Es lässt sich unverändert einlesen und liefert dasselbe Ergebnis wie das Beispielsystem.

### Einfacher Heizkreis

```json
{
  "app": "heizwasser-simulator",
  "v": 2,
  "glob": { "tamb": 15, "tinit": 20, "pstat": 2 },
  "comps": [
    { "id": 1, "type": "source",   "x": 40,  "y": 60,  "name": "Erzeuger",    "p": { "tset": 70, "pmax": 40 }, "chart": [false, true] },
    { "id": 2, "type": "pump",     "x": 250, "y": 60,  "name": "Umwälzpumpe", "p": { "mode": "flow", "flow": 1.5 } },
    { "id": 3, "type": "pipe",     "x": 460, "y": 60,  "name": "Vorlauf",     "p": { "len": 30, "dn": 32, "ins": 30 } },
    { "id": 4, "type": "consumer", "x": 670, "y": 60,  "name": "Heizkörper",  "p": { "mode": "P", "pq": 20, "tmin": 30 }, "chart": [false, true] },
    { "id": 5, "type": "pipe",     "x": 460, "y": 230, "name": "Rücklauf",    "flip": true, "p": { "len": 30, "dn": 32, "ins": 30 } }
  ],
  "edges": [
    { "id": 11, "a": { "c": 1, "p": 1 }, "b": { "c": 2, "p": 0 } },
    { "id": 12, "a": { "c": 2, "p": 1 }, "b": { "c": 3, "p": 0 } },
    { "id": 13, "a": { "c": 3, "p": 1 }, "b": { "c": 4, "p": 0 } },
    { "id": 14, "a": { "c": 4, "p": 1 }, "b": { "c": 5, "p": 0 } },
    { "id": 15, "a": { "c": 5, "p": 1 }, "b": { "c": 1, "p": 0 } }
  ]
}
```

Der Kreis läuft Erzeuger, Pumpe, Vorlaufrohr, Heizkörper, Rücklaufrohr und zurück zum Erzeuger. Das Rücklaufrohr ist mit `flip` gespiegelt, damit es von rechts nach links gezeichnet wird. In `p` stehen nur geänderte Werte, den Rest ergänzen die Standardwerte. Nach etwa 30 Minuten Simulationszeit liegen 70 °C im Vorlauf und 58,1 °C im Rücklauf an, bei 20 kW Abgabe.

### Verdrahtungsmuster

Schreibweise `Typ.Port`: Das Wasser fließt vom ersten zum zweiten Eintrag, jeweils als Verbindung `a` nach `b`.

| Muster | Verbindungen |
| --- | --- |
| Heizkreis | `source.1 → pump.0`, `pump.1 → pipe.0`, `pipe.1 → consumer.0`, `consumer.1 → Rücklaufrohr.0`, `Rücklaufrohr.1 → source.0` |
| Parallele Verbraucher | `splitter.1 → Verbraucher A.0`, `splitter.2 → Verbraucher B.0`, `Verbraucher A.1 → mixer.0`, `Verbraucher B.1 → mixer.1`, `mixer.2 → Rücklauf` (bei `np` = 2) |
| Parallele Erzeuger | `Rücklauf → splitter.0` (`mode` `free`), `splitter.1 → Pumpe A.0`, `splitter.2 → Pumpe B.0`, `Pumpe A.1 → Erzeuger A.0`, `Pumpe B.1 → Erzeuger B.0`, `Erzeuger A.1 → mixer.0`, `Erzeuger B.1 → mixer.1`, `mixer.2 → Vorlauf` |
| 3-Wege-Ventil am Verbraucher | `Vorlauf → valve3.0`, `valve3.1 → consumer.0`, `consumer.1 → mixer.0`, `valve3.2 → mixer.1`, `mixer.2 → Rücklauf` |
| Pufferspeicher als Weiche | Erzeugerkreis: `Pumpe.1 → tank.0`, `tank.1 → source.0`. Verbraucherkreis: `tank.2 → Pumpe.0`, `Rücklauf → tank.3` |
| Wärmeübertrager | Primär: `Pumpe.1 → hx.0`, `hx.1 → Rücklauf primär`. Sekundär: `Rücklauf sekundär → hx.2`, `hx.3 → Pumpe sekundär.0` |

### Bausteine zum Kopieren

Je ein Eintrag für die Liste `comps`, mit typischen Parametern. Passe `id`, `x`, `y` und `name` an.

```json
{ "id": 101, "type": "source",   "x": 40,  "y": 40,  "name": "Erzeuger",       "p": { "tset": 70, "pmax": 50, "eta": 0.95, "vol": 40, "kv": 12 }, "chart": [false, true] },
{ "id": 102, "type": "pump",     "x": 240, "y": 40,  "name": "Pumpe geregelt", "p": { "mode": "dpc", "qn": 3, "hn": 4, "hs": 2, "nmin": 40, "eta": 0.5 } },
{ "id": 103, "type": "pump",     "x": 240, "y": 140, "name": "Pumpe fest",     "p": { "mode": "flow", "flow": 2 } },
{ "id": 104, "type": "pipe",     "x": 440, "y": 40,  "name": "Rohr",           "p": { "len": 30, "dn": 32, "ins": 30, "zeta": 3 } },
{ "id": 105, "type": "consumer", "x": 640, "y": 40,  "name": "Verbraucher P",  "p": { "mode": "P", "pq": 20, "tmin": 30, "last": 100, "kv": 8 }, "chart": [false, true] },
{ "id": 106, "type": "consumer", "x": 640, "y": 140, "name": "Verbraucher UA", "p": { "mode": "UA", "ua": 0.5, "troom": 20, "last": 100 }, "chart": [false, true] },
{ "id": 107, "type": "tank",     "x": 840, "y": 40,  "name": "Speicher",       "p": { "vol": 1000, "h": 1.8, "n": 8, "ua": 2.5 }, "chart": [false, true, true, false] },
{ "id": 108, "type": "splitter", "x": 1040, "y": 40, "name": "Verteiler",      "p": { "np": 3, "mode": "ratio", "w1": 20, "w2": 15, "w3": 10 } },
{ "id": 109, "type": "splitter", "x": 1040, "y": 200, "name": "Weiche frei",   "p": { "np": 2, "mode": "free" } },
{ "id": 110, "type": "mixer",    "x": 1240, "y": 40, "name": "Sammler",        "p": { "np": 2 } },
{ "id": 111, "type": "valve3",   "x": 1240, "y": 200, "name": "3-Wege-Ventil", "p": { "ctl": "auto", "dts": 15, "kvs": 6 } },
{ "id": 112, "type": "valve2",   "x": 1440, "y": 40, "name": "Regelventil",    "p": { "pos": 100, "kvs": 10 } },
{ "id": 113, "type": "prv",      "x": 1440, "y": 140, "name": "Druckminderer", "p": { "pset": 2.5, "kv": 20 } },
{ "id": 114, "type": "hold",     "x": 1440, "y": 240, "name": "Druckhaltung",  "p": { "pstat": 2 } },
{ "id": 115, "type": "hx",       "x": 1640, "y": 40,  "name": "Wärmeübertrager", "p": { "ua": 8, "vol": 10, "kv": 10 }, "chart": [false, true, false, true] }
```

Die Listen unter `chart` haben einen Eintrag je Port in der Reihenfolge der Portnummern. Beim Speicher stehen die beiden Ausgänge 1 und 2 auf `true`, beim Wärmeübertrager die Ausgänge 1 und 3.

### Datei per Skript erzeugen

Das Python-Skript baut einen Heizkreis mit drei parallelen Verbrauchern. Es schreibt `modell.json`, die du im Tab System mit **Datei laden** einliest. `N` ändert die Anzahl der Verbraucher. Der Sammler-Ausgang hat die Portnummer `N`, wie in den Portnummern beschrieben.

```python
import json

comps, edges = [], []
_id = [0]

def new_id():
    _id[0] += 1
    return _id[0]

def comp(type_, x, y, name, p=None, flip=False):
    c = {"id": new_id(), "type": type_, "x": x, "y": y, "name": name, "p": p or {}}
    if flip:
        c["flip"] = True
    comps.append(c)
    return c["id"]

def link(a, a_port, b, b_port):
    edges.append({"id": new_id(), "a": {"c": a, "p": a_port}, "b": {"c": b, "p": b_port}})

# Heizkreis mit N parallelen Verbrauchern
N = 3
src  = comp("source", 40, 100, "Erzeuger", {"tset": 70, "pmax": 80})
pump = comp("pump", 240, 100, "Pumpe", {"flow": 5})
spl  = comp("splitter", 440, 100, "Verteiler", {"np": N, "mode": "ratio", "w1": 10, "w2": 15, "w3": 20})
mix  = comp("mixer", 900, 300, "Sammler", {"np": N}, flip=True)
link(src, 1, pump, 0)
link(pump, 1, spl, 0)
for i in range(N):
    c = comp("consumer", 650, 20 + i * 100, f"Verbraucher {i+1}", {"pq": 10 + 5 * i})
    link(spl, 1 + i, c, 0)     # Verteiler-Abgang i -> Verbraucher
    link(c, 1, mix, i)         # Verbraucher -> Sammler-Zulauf i
ret = comp("pipe", 440, 330, "Rücklauf", {"len": 20, "dn": 40}, flip=True)
link(mix, N, ret, 0)           # Sammler-Ausgang hat die Portnummer N
link(ret, 1, src, 0)

json.dump({"app": "heizwasser-simulator", "v": 2, "comps": comps, "edges": edges},
          open("modell.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
```

## Tipps, Fehlersuche und Grenzen

### Checkliste für manuell erzeugte Dateien

1. Das JSON ist gültig: doppelte Anführungszeichen, keine Kommentare, kein Komma nach dem letzten Eintrag.
2. Alle `id` sind ganze Zahlen und im ganzen Modell nur einmal vergeben.
3. Jede Verbindung führt von einem Ausgang (`a`) zu einem Eingang (`b`). Jeder Port ist höchstens einmal belegt.
4. Der Kreis ist geschlossen und enthält mindestens eine Pumpe.
5. Auswahlwerte stehen genau wie in der Referenz, Zahlen liegen im erlaubten Bereich.
6. Nach dem Laden den Tab **System** öffnen und die Hinweise lesen.

### Typische Hinweise der App

| Hinweis | Ursache | Abhilfe |
| --- | --- | --- |
| Hydraulik widersprüchlich oder nicht gelöst | offener Kreis, zwei Pumpen mit festem Volumenstrom hintereinander, Anteile eines Verteilers passen nicht zu den Pumpen | Kreis schließen, je Strang nur eine Pumpe mit `flow`, bei parallelen Pumpen den Verteiler auf `free` stellen |
| Rückströmung berechnet | `pset` des Druckminderers liegt unter dem Rücklaufdruck, oder die Pumpe ist gegen den Gegendruck zu schwach | `pset` über den Systemdruck setzen, Pumpe stärker wählen |
| Druckminderer ohne Druckhaltung | keine `hold` im Netz | Druckhaltung in den Rücklauf einfügen |
| Hinter Ausgang A wurde kein Verbraucher gefunden | zwischen 3-Wege-Ventil und Verbraucher liegt ein Bauteil, das die Suche nicht durchläuft, etwa Verteiler oder Speicher | Verbraucher direkt dahinter anordnen oder `ctl` auf `manual` stellen |
| Leistungsgrenze erreicht | Der Erzeuger kann den Soll-Vorlauf nicht halten. | `pmax` erhöhen, Volumenstrom oder Last senken |
| Wärmebedarf wird nicht gedeckt | Der Rücklauf liegt an der Mindesttemperatur `tmin`. | Volumenstrom erhöhen |
| Rohr: zu schnell | über 1,0 m/s Warnung, über 1,5 m/s kritisch, über 300 Pa/m Druckgefälle Warnung | größere Nennweite `dn` |
| Port nicht angeschlossen | Hinweis ohne Folgen, der Port bleibt ohne Strom | Port verbinden, wenn er gebraucht wird |
| Verdampfungsgefahr in Netz … | Der Druck an einer Leitung liegt unter Dampfdruck plus Sicherheitszuschlag, typisch bei Vorlauf über 100 °C. | Systemdruck erhöhen, am einfachsten im Tab System mit „Systemdruck auf Mindestdruck setzen“ |

### Grenzen des Modells

- Wasser hat eine feste Dichte von 983 kg/m³. Bei 130 °C ist die reale Dichte etwa 5 % niedriger, Volumenströme weichen dort entsprechend leicht ab.
- Die Rohrwand speichert keine Wärme. Es gibt eine globale Umgebungstemperatur.
- Die Pumpenkennlinie ist eine Parabel mit 1,3 · Hn bei Strom 0. Der Wirkungsgrad ist konstant.
- Geregelt wird nur im 3-Wege-Ventil (Spreizung). Der Erzeuger regelt immer auf seine Soll-Vorlauftemperatur. Fühler und eigene Regler gibt es nicht. Zeitpläne gibt es nur für Verbraucher.
- Für den Wärmetransport zählt nur die Strömung in Pfeilrichtung. Rückströmung wird gemeldet, aber nicht simuliert.
- Ein Verteiler im Modus `ratio` entkoppelt die Hydraulik. Die Pumpenförderhöhe davor ist dann eine Näherung.
- Der Simulationsstand ist nicht Teil der JSON-Datei. Nach dem Laden beginnt die Simulation bei der Starttemperatur.
