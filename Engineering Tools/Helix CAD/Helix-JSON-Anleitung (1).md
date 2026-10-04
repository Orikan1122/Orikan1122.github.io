# Helix Web-CAD – Anleitung zum JSON-Format (für KI-Assistenten)

Diese Datei beschreibt vollständig, wie eine Zeichnung für **Helix Web-CAD** (2D-CAD im Browser) als `.json`-Datei aufgebaut ist.
Ein KI-Assistent, der diese Datei erhält, kann daraus eine komplette Zeichnung erzeugen, die der Nutzer direkt in Helix öffnet (Datei ▸ „Öffnen …“, oder per Drag & Drop, oder Datei ▸ „JSON einfügen“).

---

## 0. Auftrag an die KI (bitte zuerst lesen)

1. Erzeuge **genau ein JSON-Objekt** nach dieser Anleitung. Gib es als einen einzigen Codeblock (```` ```json ````) oder als reine Datei aus. Vor und nach dem Block höchstens ein kurzer Satz.
2. **Keine Kommentare** im JSON, **keine Kommas nach dem letzten Element**, nur doppelte Anführungszeichen, Dezimalpunkt (nicht Komma), Zahlen als Zahlen (nicht als Text).
3. **Winkel immer im Bogenmaß (Radiant)**, nie in Grad (siehe Abschnitt 1).
4. **Die y-Achse zeigt nach oben** (wie in der Mathematik, nicht wie in Bildschirm-Pixeln oder SVG).
5. Berechne alle Koordinaten selbst und lege sie vollständig ab. Es gibt **keine Verweise, Variablen, Ausdrücke oder Schleifen** im Format. Jedes Objekt (z. B. jede der vier Bohrungen) wird einzeln aufgeführt.
6. Halte dich an die erlaubten Werte (Ebenenfarben, Linienarten, Typen). Unbekannte Werte werden von Helix stillschweigend ersetzt oder das Objekt wird übersprungen.
7. Fehlen dir Maße oder Angaben (Einheit, Maßstab, Papierformat, Beschriftung), **frage nach** oder triff eine klar benannte Annahme und nenne sie kurz.
8. Prüfe das Ergebnis vor der Ausgabe mit der Checkliste in Abschnitt 9.

---

## 1. Grundlagen

| Thema | Regel |
|---|---|
| Koordinatensystem | kartesisch, Ursprung (0, 0), **x nach rechts, y nach oben** |
| Punkte | immer als Liste mit zwei Zahlen: `[x, y]` |
| Einheiten | **einheitenlos**. 1 Einheit ist, was du festlegst (empfohlen: 1 Einheit = 1 mm). Mit Zeichnungsrahmen (`frames`) wird die Einheit dort angegeben. |
| Winkel | **Bogenmaß (rad)**, 0 = Richtung +x, positiv = **gegen den Uhrzeigersinn**. Umrechnung: rad = Grad × π / 180 (90° = 1.570796, 180° = 3.141593, 270° = 4.712389, 45° = 0.785398) |
| Zahlen | endliche Zahlen (kein `NaN`, kein `Infinity`), Dezimalpunkt, höchstens ca. 4 Nachkommastellen nötig |
| Text | UTF-8. Umlaute, `Ø`, `°`, `±`, `×`, `²`, `³`, `µ`, `–` sind unproblematisch. Zeichen außerhalb von Windows-1252 (z. B. Emojis, griechische Buchstaben) erscheinen im PDF als `?` und sollten vermieden werden. |
| Zeichenreihenfolge | Reihenfolge in `ents`; Schraffuren werden immer **hinter** die übrigen Objekte gezeichnet |
| Größenordnung | tausende Objekte sind unproblematisch; Dateigröße max. 60 MB |

---

## 2. Aufbau der Datei

```json
{
 "format": "helix-web-cad",
 "version": 1,
 "doc": {
  "name": "Zeichnungsname",
  "cur": "Kontur",
  "grid": 5,
  "th": 3.5,
  "dec": 2,
  "layers": [ ... ],
  "ents": [ ... ],
  "frames": [ ... ]
 }
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `format` | empfohlen | immer `"helix-web-cad"` |
| `version` | empfohlen | immer `1` |
| `doc.name` | nein | Name der Zeichnung, max. 60 Zeichen (Standard: „Zeichnung 1“). Wird auch als Dateiname beim Speichern genutzt. |
| `doc.cur` | nein | Name der Ebene, auf der der Nutzer neue Objekte zeichnet. Muss in `layers` existieren, sonst `"0"`. |
| `doc.grid` | nein | Rastergröße (Zahl > 0, Standard 10) |
| `doc.th` | nein | Standard-Texthöhe für **Bemaßungen und Hinweislinien** (Zahl > 0, Standard 5). Siehe Abschnitt 8. |
| `doc.dec` | nein | Nachkommastellen in Maßtexten, ganze Zahl 0–6 (Standard 2; überflüssige Nullen werden entfernt) |
| `doc.layers` | nein | Liste der Ebenen (Abschnitt 3). Ebene `"0"` existiert immer. |
| `doc.ents` | **ja** | Liste der Zeichnungsobjekte (Abschnitt 4–5). Darf leer sein, muss aber ein Array sein. |
| `doc.frames` | nein | Eingabe für Zeichnungsrahmen mit Schriftfeld (Abschnitt 6). Wird beim Laden in normale Objekte umgewandelt. |

Nicht erzeugen (von Helix selbst verwaltet oder für die KI ungeeignet): `doc.nid`, `doc.bg` (Hintergrundbild), `saved`, Objekt-`id`s. Wenn sie doch vorkommen, werden `id`/`nid` neu vergeben und ein ungültiges `bg` wird ignoriert.

---

## 3. Ebenen (`layers`)

```json
{"name":"Kontur","color":"auto","vis":true,"lock":false,"lt":"solid","lw":0.5}
```

| Feld | Werte | Standard / Verhalten bei ungültigem Wert |
|---|---|---|
| `name` | Text, 1–40 Zeichen, eindeutig | Pflicht. Doppelte Namen und leere Namen werden übersprungen. |
| `color` | `auto`, `red`, `yellow`, `green`, `cyan`, `blue`, `magenta`, `orange`, `gray` | sonst `auto` (`auto` = hell auf dunklem, schwarz auf hellem Hintergrund und im PDF schwarz) |
| `vis` | `true` / `false` | sichtbar; Standard `true` |
| `lock` | `true` / `false` | gesperrt (nicht bearbeitbar); Standard `false` |
| `lt` | `solid`, `dashed`, `center`, `dotted`, `hidden` | sonst `solid` (durchgezogen, gestrichelt, Strich-Punkt-Mittellinie, gepunktet, verdeckt) |
| `lw` | Strichstärke in **mm**, Zahl 0 bis 5 | sonst `0.25`. Übliche Werte: 0.05, 0.09, 0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1, 1.4, 2 |

Regeln:

- Die Ebene `"0"` gibt es immer. Du kannst sie in `layers` aufführen, um ihre Eigenschaften zu ändern.
- Objekte verweisen über `layer` mit dem **exakten Namen** (Groß-/Kleinschreibung) auf eine Ebene. Unbekannter Name → Objekt landet auf `"0"`.
- Sinnvolle Aufteilung: z. B. `Kontur`, `Mittellinien`, `Masse`, `Text`, `Schraffur`, `Hilfslinien`.

---

## 4. Gemeinsame Felder aller Objekte

Jedes Element von `ents` ist ein Objekt mit:

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `type` | **ja** | Objekttyp (Abschnitt 5) |
| `layer` | empfohlen | Ebenenname; fehlt er oder ist unbekannt → `"0"` |
| `color` | nein | überschreibt die Ebenenfarbe (gleiche Werte wie bei Ebenen). Hex-Farben (`#ff0000`) sind **nicht** erlaubt und werden entfernt. |
| `lw` | nein | überschreibt die Ebenen-Strichstärke (mm, 0–5) |
| `id` | nein | wird ignoriert und neu vergeben |

Ein Objekt mit fehlenden oder ungültigen Pflichtfeldern wird beim Laden **übersprungen** (Helix meldet „n ungültige übersprungen“).

---

## 5. Objekttypen

Alle Beispiele sind gültig und können direkt in `ents` übernommen werden.

### 5.1 `line` – Linie
Pflicht: `a`, `b` (Punkte).
```json
{"type":"line","layer":"Kontur","a":[0,0],"b":[100,50]}
```

### 5.2 `pline` – Polylinie (auch Rechteck und Polygon)
Pflicht: `pts` (mindestens 2 Punkte). Optional: `closed` (`true` = letzter Punkt wird mit dem ersten verbunden).
**Rechteck, Polygon, Dreieck usw. gibt es nicht als eigenen Typ**: nimm eine geschlossene `pline`. Bögen innerhalb einer Polylinie sind nicht möglich (nimm `arc`-Objekte).
```json
{"type":"pline","layer":"Kontur","pts":[[0,0],[120,0],[120,70],[0,70]],"closed":true}
```

### 5.3 `circle` – Kreis
Pflicht: `c` (Mittelpunkt), `r` (Radius > 0).
```json
{"type":"circle","layer":"Kontur","c":[60,35],"r":15}
```

### 5.4 `arc` – Kreisbogen
Pflicht: `c`, `r` (> 0), `a0` (Startwinkel), `a1` (Endwinkel), beide in **Radiant**. Der Bogen läuft von `a0` **gegen den Uhrzeigersinn** nach `a1` (Spannweite = (a1 − a0) modulo 2π). Ein Viertelkreis oben rechts: a0 = 0, a1 = 1.570796. Für einen Vollkreis nimm `circle`.
```json
{"type":"arc","layer":"Kontur","c":[0,0],"r":20,"a0":0,"a1":1.570796}
```

### 5.5 `ellipse` – Ellipse
Pflicht: `c`, `rx`, `ry` (beide > 0), `rot` (Drehwinkel der rx-Achse, Radiant; 0 = rx liegt waagerecht).
```json
{"type":"ellipse","layer":"Kontur","c":[0,0],"rx":30,"ry":15,"rot":0}
```

### 5.6 `point` – Punkt
Pflicht: `p`. Wird als kleines Kreuz dargestellt.
```json
{"type":"point","layer":"Hilfslinien","p":[10,10]}
```

### 5.7 `text` – Text
Pflicht: `p`, `text` (Zeichenkette), `h` (Texthöhe > 0). Optional: `rot` (Radiant, Standard 0).

- `p` ist der **Startpunkt der Grundlinie** der ersten Zeile (linksbündig). Eine Ausrichtung (zentriert, rechtsbündig) gibt es nicht; verschiebe `p` entsprechend.
- Zeilenumbruch mit `\n` im Text. Weitere Zeilen stehen **unterhalb**, Zeilenabstand = 1.25 × `h`.
- Breite des Texts ≈ 0.6 × `h` × Anzahl der Zeichen (Faustformel zur Platzplanung; ob ein Text in ein Feld passt, vorher damit prüfen).
```json
{"type":"text","layer":"Text","p":[60,176],"text":"Lagerplatte Pos. 1\nWerkstoff S235JR","h":3.5,"rot":0}
```

### 5.8 `dim` – Maßlinie (Längenmaß)
Pflicht: `a`, `b` (die zwei **gemessenen** Punkte), `p` (ein Punkt, durch den die **Maßlinie** verläuft). Optional: `mode`: `"al"` (ausgerichtet, parallel zu a–b; Standard), `"h"` (waagerecht gemessen), `"v"` (senkrecht gemessen); `th` (Texthöhe, Standard `doc.th`).

- Der Maßtext wird **automatisch** aus der gemessenen Länge in Zeichnungseinheiten gebildet (`doc.dec` Nachkommastellen, ohne Einheit). Er lässt sich nicht von Hand setzen.
- `mode:"h"`: Maßlinie liegt auf der Höhe `p[1]`; `mode:"v"`: Maßlinie liegt bei `p[0]`; `"al"`: Maßlinie parallel zu a–b durch `p`.
- Maßhilfslinien und Pfeile entstehen automatisch. Pfeilgröße = 0.9 × `th`.
```json
{"type":"dim","layer":"Masse","mode":"h","a":[0,0],"b":[120,0],"p":[60,-14],"th":3.5}
```

### 5.9 `rdim` – Radius-/Durchmessermaß
Pflicht: `c` (Kreismittelpunkt), `r` (Radius), `p` (Endpunkt der Maßlinie, dort steht der Text). Optional: `kind`: `"R"` (Text „R15“, Standard) oder `"D"` (Text „Ø30“); `th`.
Die Maßlinie läuft vom Kreisrand in Richtung `p` (vom Mittelpunkt aus gesehen). Wähle `p` außerhalb (oder innerhalb) des Kreises auf der gewünschten Seite.
```json
{"type":"rdim","layer":"Masse","c":[60,35],"r":15,"p":[82,53],"kind":"D","th":3.5}
```

### 5.10 `adim` – Winkelmaß
Pflicht: `c` (Scheitelpunkt), `a` (ein Punkt auf dem ersten Schenkel), `b` (ein Punkt auf dem zweiten Schenkel), `p` (Punkt auf dem Maßbogen). Optional: `th`.
`dist(c, p)` ist der Radius des Maßbogens; die **Seite** des Winkels (spitz oder überstumpf) ergibt sich daraus, in welchem der beiden Winkelfelder die Richtung c→p liegt. Der Text („90°“) entsteht automatisch.
```json
{"type":"adim","layer":"Masse","c":[0,0],"a":[40,0],"b":[0,40],"p":[22,22],"th":3.5}
```

### 5.11 `leader` – Hinweislinie mit Text
Pflicht: `pts` (mindestens 2 Punkte), `text`, `h` (> 0).
`pts[0]` ist die **Pfeilspitze** (zeigt auf das Objekt), die weiteren Punkte sind Knickpunkte, der **letzte** Punkt ist das Ende der Linie. Dort schließt eine waagerechte Anschlusslinie (0.7 × `h` lang) an, danach folgt der Text; er steht rechts, wenn das letzte Segment nach rechts läuft (`x` des letzten Punkts ≥ `x` des vorletzten), sonst links. Mehrzeilig mit `\n`.
```json
{"type":"leader","layer":"Text","pts":[[171,151],[178,168],[186,168]],"text":"4× Bohrung Ø8","h":3.5}
```

### 5.12 `spline` – Spline (glatte Kurve durch Stützpunkte)
Pflicht: `pts` (mindestens 2 Stützpunkte; die Kurve verläuft **durch** alle). Optional: `closed` (`true` = geschlossene Kurve, braucht mindestens 3 Punkte).
```json
{"type":"spline","layer":"Kontur","pts":[[0,0],[20,15],[45,5],[70,25]],"closed":false}
```

### 5.13 `hatch` – Schraffur / Füllung
Pflicht: `pts` (mindestens 3 Punkte; das Polygon wird **automatisch geschlossen**). Optional: `pattern`: `"lines"` (Linien, Standard), `"cross"` (Kreuzschraffur), `"solid"` (Vollfläche, halbtransparent); `spacing` (Linienabstand in Zeichnungseinheiten, > 0, Standard 5); `angle` (Winkel der Linien, **Radiant**, Standard 0; 45° = 0.785398).

- Die Schraffur zeichnet **keinen Rand**. Zeichne die Kontur zusätzlich als geschlossene `pline`.
- Schraffuren mit Löchern/Inseln gibt es nicht: die Fläche ist ein einfaches Polygon.
```json
{"type":"hatch","layer":"Schraffur","pts":[[0,0],[20,0],[20,70],[0,70]],"pattern":"lines","spacing":3,"angle":0.785398}
```

### 5.14 `xline` – Konstruktionslinie (unendliche Hilfslinie)
Pflicht: `p` (ein Punkt auf der Linie), `ang` (Richtung, Radiant; 0 = waagerecht, 1.570796 = senkrecht).
Wird **nicht gedruckt und nicht exportiert** (weder PDF noch SVG, PNG, DXF). Nur auf Wunsch des Nutzers verwenden.
```json
{"type":"xline","layer":"Hilfslinien","p":[0,0],"ang":0}
```

### Nicht unterstützt
Blöcke/Einfügungen, Schraffuren mit Löchern, Bögen in Polylinien, Bemaßungsstile, Pfeilarten, Schriftarten und Textausrichtungen, Layouts/Ansichtsfenster, Hex-/RGB-Farben, Volltext-Formatierung. Bilder gibt es nur als Hintergrundbild, das die KI **nicht** erzeugen soll.

---

## 6. Zeichnungsrahmen mit Schriftfeld (`frames`)

Statt Rahmen und Schriftfeld selbst aus Linien und Texten zu bauen, beschreibst du sie in `doc.frames`. Helix erzeugt daraus beim Laden den fertigen Rahmen (auf der Ebene `Rahmen`, wird bei Bedarf angelegt) – inklusive Blattkante, Rahmenlinie und Schriftfeld, das der Nutzer später im Programm ausfüllen kann. Nach dem Laden sind es normale Objekte; gespeichert wird kein `frames`-Feld mehr.

```json
"frames": [
 {"size":"A3","orient":"landscape","scale":50,"unit":"mm","binding":true,"origin":[0,0],
  "fields":{"titel":"Neutralisationsanlage","nr":"DL-0815","projekt":"Werk Dietlikon","firma":"Muster AG","gez":"A. Muster","gepr":"","datum":"03.10.2026","blatt":"1/1","rev":"A"}}
]
```

| Feld | Werte | Standard |
|---|---|---|
| `size` | `A0`, `A1`, `A2`, `A3`, `A4`, `A5`, `Letter` | `A3` |
| `orient` | `landscape` (quer), `portrait` (hoch) | `landscape` |
| `scale` | Maßstabszahl N für 1 : N (Zahl > 0). Beispiel 50 = 1:50, 1 = 1:1, 0.5 = 2:1 | 50 |
| `unit` | Bedeutung **einer Zeichnungseinheit**: `"mm"`, `"cm"` oder `"m"` | `"mm"` |
| `binding` | `true` = Heftrand links 20 mm, `false` = überall 10 mm | `true` |
| `origin` | `[x, y]` der **unteren linken Blattecke** in Zeichnungseinheiten | `[0, 0]` |
| `fields` | Schriftfeld-Texte (alle optional, nur Text): `titel`, `nr` (Zeichnungs-Nr.), `projekt`, `firma`, `gez` (Gezeichnet), `gepr` (Geprüft), `datum`, `mass` (Maßstabstext; leer = automatisch „1:N“), `blatt`, `rev` (Revision) | leer |

Mehrere Einträge in `frames` ergeben mehrere Blätter. Wähle verschiedene `origin`-Werte, sodass sie sich nicht überlappen (Abstand größer als die Blattbreite).

### Geometrie des Blatts (damit der Inhalt hineinpasst)

Papiermaße in mm (Breite × Höhe bei **Querformat**; bei Hochformat vertauschen): A0 1189×841, A1 841×594, A2 594×420, A3 420×297, A4 297×210, A5 210×148, Letter 279.4×215.9.

- **Umrechnungsfaktor** `wu` = Zeichnungseinheiten pro Papier-Millimeter = `scale ÷ f`, mit f = 1 (mm), 10 (cm), 1000 (m).
  Beispiele: mm und 1:50 → wu = 50. m und 1:50 → wu = 0.05. mm und 1:1 → wu = 1.
- Blattgröße in Zeichnungseinheiten: Blattbreite_mm × wu und Blatthöhe_mm × wu (ab `origin`).
- Seitenrand `m` = min(10, Blattbreite_mm / 20) mm; linker Rand `mL` = max(20, m) mm bei `binding:true`, sonst `m`.
- **Innerer Rahmen** (Zeichenfläche): x von `origin.x + mL·wu` bis `origin.x + (Blattbreite − m)·wu`, y von `origin.y + m·wu` bis `origin.y + (Blatthöhe − m)·wu`.
- **Schriftfeld**: unten rechts im inneren Rahmen, **180 mm breit × 36 mm hoch** (bei sehr schmalem Blatt schmaler). Die Zeichnung darf diesen Bereich nicht überdecken: x ≥ `origin.x + (Blattbreite − m − 180)·wu` **und** y ≤ `origin.y + (m + 36)·wu` ist reserviert.
- Platziere den Zeichnungsinhalt innerhalb des inneren Rahmens, oberhalb des Schriftfelds, mit etwas Abstand (ca. 10 mm Papier).

Beispiel A4 quer, 1:1, mm, origin [0,0]: Blatt 297×210; innerer Rahmen x 20…287, y 10…200; Schriftfeld x 107…287, y 10…46; freie Fläche für die Zeichnung z. B. x 30…277, y 56…190.

### Auswahl des Maßstabs
Rechne die Zeichnungsgröße (Breite, Höhe in Zeichnungseinheiten) in Papier-mm um (`Größe ÷ wu`) und wähle den **größten** gebräuchlichen Maßstab (1:1, 1:2, 1:5, 1:10, 1:20, 1:25, 1:50, 1:100, 1:200, 1:500, 1:1000), bei dem alles in die freie Fläche passt. Nenne dem Nutzer Papierformat und Maßstab.

### PDF-Ausgabe
Im Programm: Datei ▸ „Export PDF“ ▸ **Bereich: Zeichnungsrahmen**. Dann gelten Blattgröße und Maßstab des Rahmens exakt, es wird kein zweites Schriftfeld gedruckt.

---

## 7. Schriftgrößen, Strichstärken und Ebenen sinnvoll wählen

**Texthöhen sind Zeichnungseinheiten, keine Papiermillimeter.** Die gewünschte Höhe auf Papier muss mit `wu` (Abschnitt 6) in Zeichnungseinheiten umgerechnet werden:

`h = Papierhöhe_mm × wu`

Übliche Papierhöhen: Beschriftung 3.5 mm (Titel 5 mm), Maßzahlen 2.5–3.5 mm. Beispiel mm und 1:50: 3.5 mm Papier → `h` = 175. Setze `doc.th` und alle `th`/`h`-Werte der Bemaßung entsprechend (Pfeile sind 0.9 × `th`, Maßhilfslinien-Abstand 0.3 × `th`).
Ohne Zeichnungsrahmen: wähle `th` ca. 1/50 bis 1/70 der größeren Zeichnungsausdehnung (Zeichnung 120 breit → `th` ≈ 2–3).

Empfohlene Strichstärken (mm): Konturen/sichtbare Kanten 0.5, Schnittlinien/Hauptlinien 0.7, Maße, Mittellinien, Hilfslinien 0.18, Schraffuren 0.13, Text 0.25. Mittellinien: `lt:"center"`, verdeckte Kanten: `lt:"hidden"`.

---

## 8. Hinweise zur Qualität

- Maße bei Maßlinien sind **gemessen**, nicht eingegeben: `a`/`b` müssen exakt auf den Kanten liegen, sonst stimmt die Zahl nicht.
- Schließe Konturen exakt (gleiche Koordinaten an Berührpunkten), lege keine Objekte doppelt übereinander.
- Rechne symmetrische Anordnungen (Lochkreise, Raster) mit den Formeln x = cx + r·cos θ, y = cy + r·sin θ **selbst aus** und trage die Zahlen ein.
- Beschriftungen nicht über Linien legen: Text oberhalb/neben dem Objekt platzieren, Breite mit der Faustformel (0.6 × `h` × Zeichenzahl) prüfen.
- Verwende pro Zweck eine eigene Ebene, damit der Nutzer Teile ein-/ausblenden kann.

---

## 9. Checkliste vor der Ausgabe

- [ ] Gültiges JSON (Klammern, Kommas, keine Kommentare, keine Kommas am Ende)
- [ ] `doc.ents` ist ein Array; jedes Objekt hat `type` und alle Pflichtfelder seines Typs
- [ ] Alle Winkel (`a0`, `a1`, `rot`, `ang`, `angle`) in Radiant
- [ ] `y` nach oben gedacht; Kreise/Radien > 0
- [ ] Jede verwendete `layer`-Angabe existiert in `layers` (Schreibweise identisch)
- [ ] Farben nur aus der Liste, Linienarten nur aus der Liste, keine Hex-Farben
- [ ] Texthöhen passend zum Maßstab (Abschnitt 7); nichts liegt im Schriftfeld-Bereich
- [ ] Bei `frames`: Größe, Maßstab, Einheit, `origin` gesetzt; Inhalt liegt im inneren Rahmen
- [ ] Alle Objekte einzeln ausgeschrieben (keine Platzhalter wie `...` im Endergebnis)

---

## 10. Vollständiges, geprüftes Beispiel

Lagerplatte 120 × 70 mm mit Bohrungen, Mittellinien, Maßen, Hinweislinie, Schnittdarstellung mit Schraffur, auf A4 quer im Maßstab 1:1 mit Schriftfeld (lädt ohne übersprungene Objekte):

```json
{
 "format": "helix-web-cad",
 "version": 1,
 "doc": {
  "name": "Lagerplatte",
  "cur": "Kontur",
  "grid": 5,
  "th": 3.5,
  "dec": 2,
  "layers": [
   {"name":"0","color":"auto","vis":true,"lock":false,"lt":"solid","lw":0.25},
   {"name":"Kontur","color":"auto","vis":true,"lock":false,"lt":"solid","lw":0.5},
   {"name":"Mittellinien","color":"red","vis":true,"lock":false,"lt":"center","lw":0.18},
   {"name":"Masse","color":"green","vis":true,"lock":false,"lt":"solid","lw":0.18},
   {"name":"Text","color":"auto","vis":true,"lock":false,"lt":"solid","lw":0.25},
   {"name":"Schraffur","color":"gray","vis":true,"lock":false,"lt":"solid","lw":0.13}
  ],
  "ents": [
   {"type":"pline","layer":"Kontur","pts":[[60,90],[180,90],[180,160],[60,160]],"closed":true},
   {"type":"circle","layer":"Kontur","c":[120,125],"r":15},
   {"type":"circle","layer":"Kontur","c":[72,102],"r":4},
   {"type":"circle","layer":"Kontur","c":[168,102],"r":4},
   {"type":"circle","layer":"Kontur","c":[72,148],"r":4},
   {"type":"circle","layer":"Kontur","c":[168,148],"r":4},
   {"type":"line","layer":"Mittellinien","a":[120,80],"b":[120,170]},
   {"type":"line","layer":"Mittellinien","a":[50,125],"b":[190,125]},
   {"type":"dim","layer":"Masse","mode":"h","a":[60,90],"b":[180,90],"p":[120,76],"th":3.5},
   {"type":"dim","layer":"Masse","mode":"v","a":[180,90],"b":[180,160],"p":[194,125],"th":3.5},
   {"type":"rdim","layer":"Masse","c":[120,125],"r":15,"p":[142,143],"kind":"D","th":3.5},
   {"type":"leader","layer":"Text","pts":[[171,151],[178,168],[186,168]],"text":"4× Bohrung Ø8","h":3.5},
   {"type":"text","layer":"Text","p":[60,176],"text":"Lagerplatte Pos. 1\nWerkstoff S235JR","h":3.5,"rot":0},
   {"type":"pline","layer":"Kontur","pts":[[232,90],[252,90],[252,160],[232,160]],"closed":true},
   {"type":"hatch","layer":"Schraffur","pts":[[232,90],[252,90],[252,160],[232,160]],"pattern":"lines","spacing":3,"angle":0.785398},
   {"type":"text","layer":"Text","p":[226,166],"text":"Schnitt A–A","h":3.5,"rot":0}
  ],
  "frames": [
   {"size":"A4","orient":"landscape","scale":1,"unit":"mm","binding":true,"origin":[0,0],"fields":{"titel":"Lagerplatte","nr":"LP-001","projekt":"Beispielprojekt","firma":"Muster AG","gez":"A. Muster","gepr":"","datum":"03.10.2026","blatt":"1/1","rev":"A"}}
  ]
 }
}
```

---

## 11. Beispiel-Prompt für den Nutzer

> Hier ist die Anleitung für das JSON-Format von Helix Web-CAD (Datei im Anhang). Erstelle damit eine vollständige Zeichnung als JSON: **[Beschreibung, z. B. „Fließschema einer Neutralisationsanlage mit Behälter, Pumpe und Rohrleitungen“]**. Papierformat A3 quer, Maßstab nach Bedarf, Zeichnungseinheit mm. Schriftfeld: Titel „…“, Projekt „…“, Firma „…“, Gezeichnet „…“. Gib nur das JSON aus.

Die Antwort als Datei mit der Endung `.json` speichern und in Helix öffnen (Datei ▸ „Öffnen …“) – oder den Text direkt über Datei ▸ „JSON einfügen“ laden. Hinweise zu Codeblöcken (```` ```json ````) oder einleitenden Sätzen im eingefügten Text sind unproblematisch: Helix sucht das JSON-Objekt darin selbst.

---

## 12. Was Helix beim Laden macht (Fehlerverhalten)

| Fall | Verhalten |
|---|---|
| Ungültiges JSON | Fehlermeldung mit Hinweis zur Stelle; nichts wird geladen |
| `doc.ents` fehlt oder kein Array | Fehlermeldung „Datei enthält keine Zeichnung“ |
| Objekt mit unbekanntem `type` oder fehlenden/ungültigen Pflichtfeldern | wird übersprungen; Meldung „n ungültige übersprungen“ |
| Unbekannte `layer` | Objekt kommt auf Ebene `"0"` |
| Ungültige `color` / `lw` am Objekt | Eigenschaft wird entfernt (Ebenenwerte gelten) |
| Ungültige Ebenen-Werte | `color` → `auto`, `lt` → `solid`, `lw` → 0.25 |
| `doc.cur` unbekannt | `"0"` |
| Ungültiger Eintrag in `frames` (z. B. Blatt zu klein) | wird übersprungen |
| Zusätzliche, unbekannte Felder | werden meist mitgeführt, haben aber keine Wirkung |

---

## 13. Kurzreferenz der Pflichtfelder

| `type` | Pflichtfelder | wichtige optionale Felder |
|---|---|---|
| `line` | `a`, `b` | |
| `pline` | `pts` (≥ 2) | `closed` |
| `circle` | `c`, `r` | |
| `arc` | `c`, `r`, `a0`, `a1` | |
| `ellipse` | `c`, `rx`, `ry`, `rot` | |
| `point` | `p` | |
| `text` | `p`, `text`, `h` | `rot` |
| `dim` | `a`, `b`, `p` | `mode` (`al`/`h`/`v`), `th` |
| `rdim` | `c`, `r`, `p` | `kind` (`R`/`D`), `th` |
| `adim` | `c`, `a`, `b`, `p` | `th` |
| `leader` | `pts` (≥ 2), `text`, `h` | |
| `spline` | `pts` (≥ 2) | `closed` |
| `hatch` | `pts` (≥ 3) | `pattern` (`lines`/`cross`/`solid`), `spacing`, `angle` |
| `xline` | `p`, `ang` | |

Alle Typen zusätzlich: `layer`, `color`, `lw`.

*Stand: Helix Web-CAD, Dateiformat `helix-web-cad` Version 1.*
