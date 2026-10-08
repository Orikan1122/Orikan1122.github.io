/* Problem Solving Studio – Module, Icons, native Ansichten (Übersicht, Problem, Prozess-Liste, Ursachen, Fazit) */
(function () {
    'use strict';
    var PS = window.PS;
    var esc = PS.esc;

    /* ---------------- Icons (Linien-SVG, 20px) ---------------- */
    var ICON_PATHS = {
        home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        problem: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
        process: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M8 5h3a5 5 0 0 1 5 5v0"/>',
        causes: '<circle cx="11" cy="11" r="6.5"/><path d="M20.5 20.5L16 16"/>',
        swot: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
        risk: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
        actions: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
        conclusion: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
        docs: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
        report: '<path d="M7 3h10v18H7z"/><path d="M10 8h4M10 12h4M10 16h2"/>',
        ai: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
        folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
        up: '<path d="M6 14l6-6 6 6"/>',
        down: '<path d="M6 10l6 6 6-6"/>',
        copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
        print: '<path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="7"/>',
        upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
        close: '<path d="M6 6l12 12M18 6L6 18"/>',
        back: '<path d="M10 6l-6 6 6 6M4 12h16"/>'
    };
    PS.icon = function (name, size) {
        size = size || 18;
        return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON_PATHS[name] || '') + '</svg>';
    };

    /* ---------------- Module ---------------- */
    PS.MODULES = [
        { id: 'home', label: 'Übersicht', icon: 'home', group: null, title: 'Projektübersicht',
          help: 'Hier siehst du den Fortschritt und legst die Eckdaten für den Report fest.' },
        { id: 'problem', label: 'Problem', icon: 'problem', group: 'Verstehen', title: 'Problem definieren',
          help: 'Beschreibe Ist-Zustand, Auswirkung und Ziel so konkret wie möglich – mit Zahlen, Orten und Zeiträumen. Diese Angaben bilden die Grundlage für alle weiteren Schritte.' },
        { id: 'process', label: 'Prozess', icon: 'process', group: 'Verstehen', title: 'Prozess verstehen',
          help: 'Halte den Ist-Prozess fest: als Symbolkarte auf einem Bild oder Layout, oder als einfache Schrittliste.',
          tabs: [{ id: 'map', label: 'Symbolkarte', frame: 'flow' }, { id: 'list', label: 'Schrittliste', render: 'processList' }] },
        { id: 'causes', label: 'Ursachen', icon: 'causes', group: 'Verstehen', title: 'Ursachen finden',
          help: 'Frage mehrfach „Warum?“, bis du bei der Wurzelursache bist (5-Why), und sammle mögliche Einflüsse nach Ishikawa (6M).' },
        { id: 'swot', label: 'SWOT', icon: 'swot', group: 'Analysieren', title: 'SWOT-Analyse', frame: 'swot',
          help: 'Sammle Stärken, Schwächen, Chancen und Risiken als Post-its und ziehe sie in das passende Feld. Mit Doppelklick auf den Titel bewertest du jede Notiz.' },
        { id: 'risk', label: 'Risiken', icon: 'risk', group: 'Analysieren', title: 'Risikoanalyse', frame: 'risk',
          help: 'Zerlege die Änderung in Schritte, bewerte Wahrscheinlichkeit und Schwere der Risiken, lege Gegenmaßnahmen fest und priorisiere sie.' },
        { id: 'actions', label: 'Maßnahmen', icon: 'actions', group: 'Lösen', title: 'Maßnahmen bewerten', frame: 'actions',
          help: 'Platziere Ideen nach Aufwand und Wirksamkeit auf der Matrix. Die Zonen zeigen dir Quick Wins und strategische Maßnahmen. Pflege den Status.' },
        { id: 'conclusion', label: 'Fazit', icon: 'conclusion', group: 'Lösen', title: 'Fazit & nächste Schritte',
          help: 'Fasse zusammen, was du herausgefunden hast, und lege Empfehlungen, Entscheidung und konkrete nächste Schritte fest.' },
        { id: 'docs', label: 'Dokumente', icon: 'docs', group: 'Material', title: 'Dokumente auswerten', frame: 'pdf',
          help: 'Wandle PDFs in Text und Tabellen um. Das Ergebnis wird im Projekt gespeichert und kann als Anhang in den Report.' },
        { id: 'report', label: 'Report', icon: 'report', group: 'Ergebnis', title: 'Report erstellen',
          help: 'Wähle die Abschnitte, prüfe die Vorschau und exportiere als PDF, Word, HTML, Markdown oder JSON.' },
        { id: 'ai', label: 'KI-Assistent', icon: 'ai', group: 'Ergebnis', title: 'KI-Assistent',
          help: 'Lass eine KI den Report vorbereiten: Anleitung kopieren, Ergebnis als JSON einfügen, importieren.' }
    ];
    PS.module = function (id) { return PS.MODULES.filter(function (m) { return m.id === id; })[0]; };

    /* ---------------- Fortschritt je Modul ---------------- */
    function filled(v) { return typeof v === 'string' ? v.trim().length > 0 : !!v; }
    function swotNotes() {
        var n = PS.project.tools.swot;
        return Array.isArray(n) ? n.filter(function (x) { return x.quadrantId && x.quadrantId !== 'new-note-area'; }) : [];
    }
    function riskCount() {
        var s = PS.project.tools.risk, c = 0;
        if (s && Array.isArray(s.steps)) s.steps.forEach(function (st) {
            Object.keys(st.risks || {}).forEach(function (k) { if (st.risks[k].isChecked) c++; });
        });
        return c;
    }
    function mitigationCount() {
        var s = PS.project.tools.risk, c = 0;
        if (s && Array.isArray(s.steps)) s.steps.forEach(function (st) {
            Object.keys(st.risks || {}).forEach(function (k) { if (st.risks[k].mitigationPlan) c++; });
        });
        return c;
    }
    function ideaCount() { var a = PS.project.tools.actions; return a && Array.isArray(a.ideas) ? a.ideas.length : 0; }
    function symbolCount() { var f = PS.project.tools.flow; return f && Array.isArray(f.symbols) ? f.symbols.length : 0; }
    function pdfPages() { var d = PS.project.tools.pdf; return d && d.data && Array.isArray(d.data.pages) ? d.data.pages.length : 0; }
    PS.counts = { swot: swotNotes, risk: riskCount, mitigations: mitigationCount, ideas: ideaCount, symbols: symbolCount, pdfPages: pdfPages };

    PS.status = function (id) {
        var p = PS.project, r = { pct: 0, detail: '' };
        switch (id) {
            case 'problem':
                var keys = [p.problem.statement, p.problem.context, p.problem.impact, p.problem.goal,
                    p.problem.scopeIn || p.problem.scopeOut, p.problem.stakeholders || p.problem.team.length];
                r.pct = keys.filter(filled).length / keys.length;
                r.detail = keys.filter(filled).length + ' von ' + keys.length + ' Feldern';
                break;
            case 'process':
                var st = p.process.steps.length, sy = symbolCount();
                r.pct = st || sy ? 1 : 0;
                r.detail = st + ' Schritte · ' + sy + ' Symbole';
                break;
            case 'causes':
                var wh = p.causes.whys.filter(filled).length;
                var fb = PS.FISH_KEYS.reduce(function (a, k) { return a + p.causes.fishbone[k].filter(filled).length; }, 0);
                r.pct = Math.min(1, wh / 4) * 0.5 + Math.min(1, fb / 4) * 0.25 + (filled(p.causes.rootCause) ? 0.25 : 0);
                r.detail = wh + ' Warum · ' + fb + ' Einflüsse';
                break;
            case 'swot':
                var notes = swotNotes();
                var quads = {};
                notes.forEach(function (n) { quads[n.quadrantId] = 1; });
                r.pct = Math.min(1, Object.keys(quads).length / 4) * 0.6 + Math.min(1, notes.length / 8) * 0.4;
                r.detail = notes.length + ' Notizen';
                break;
            case 'risk':
                var rc = riskCount(), mc = mitigationCount();
                r.pct = rc ? Math.min(1, 0.4 + rc / 10 + (mc ? 0.3 : 0)) : 0;
                r.detail = rc + ' Risiken · ' + mc + ' Maßnahmen';
                break;
            case 'actions':
                var ic = ideaCount();
                r.pct = Math.min(1, ic / 3);
                r.detail = ic + ' Ideen';
                break;
            case 'conclusion':
                var c = p.conclusion;
                var cs = [c.summary, c.recommendations.filter(filled).length, c.decision, c.nextSteps.length];
                r.pct = cs.filter(filled).length / cs.length;
                r.detail = c.nextSteps.length + ' nächste Schritte';
                break;
            case 'docs':
                var pg = pdfPages();
                r.pct = pg ? 1 : 0;
                r.detail = pg ? pg + ' Seiten extrahiert' : 'optional';
                break;
            default: break;
        }
        return r;
    };
    PS.FLOW_ORDER = ['problem', 'process', 'causes', 'swot', 'risk', 'actions', 'conclusion'];
    PS.overall = function () {
        var sum = 0;
        PS.FLOW_ORDER.forEach(function (id) { sum += PS.status(id).pct; });
        return sum / PS.FLOW_ORDER.length;
    };

    /* ---------------- Formular-Bausteine ---------------- */
    function field(label, path, o) {
        o = o || {};
        var v = PS.get(PS.project, path);
        var ctl;
        if (o.select) {
            ctl = '<select data-bind="' + path + '">' + o.select.map(function (opt) {
                return '<option value="' + esc(opt[0]) + '"' + (v === opt[0] ? ' selected' : '') + '>' + esc(opt[1]) + '</option>';
            }).join('') + '</select>';
        } else if (o.rows) {
            ctl = '<textarea data-bind="' + path + '" rows="' + o.rows + '" placeholder="' + esc(o.ph || '') + '">' + esc(v) + '</textarea>';
        } else {
            ctl = '<input type="' + (o.type || 'text') + '" data-bind="' + path + '" value="' + esc(v) + '" placeholder="' + esc(o.ph || '') + '">';
        }
        return '<label class="fld ' + (o.cls || '') + '"><span class="fld-l">' + esc(label) + '</span>' + ctl +
            (o.hint ? '<small class="fld-h">' + esc(o.hint) + '</small>' : '') + '</label>';
    }
    function card(title, body, o) {
        o = o || {};
        return '<section class="card ' + (o.cls || '') + '">' +
            (title ? '<header class="card-h"><h3>' + title + '</h3>' + (o.aside || '') + '</header>' : '') + body + '</section>';
    }
    function btn(label, attrs, cls, icon) {
        return '<button type="button" class="btn ' + (cls || '') + '" ' + (attrs || '') + '>' + (icon ? PS.icon(icon, 16) : '') + '<span>' + label + '</span></button>';
    }
    PS.ui = { field: field, card: card, btn: btn };

    /* ---------------- Listeneditor ---------------- */
    var STATUS_OPTS = ['Offen', 'In Arbeit', 'Erledigt', 'Pausiert'];
    PS.STATUS_OPTS = STATUS_OPTS;
    PS.LISTS = {
        'problem.team': { cols: [{ k: 'name', l: 'Name', w: '1.2fr' }, { k: 'role', l: 'Rolle', w: '1fr' }], add: 'Person hinzufügen', empty: { name: '', role: '' } },
        'problem.kpis': { cols: [{ k: 'name', l: 'Kennzahl', w: '1.6fr' }, { k: 'current', l: 'Aktuell', w: '.8fr' }, { k: 'target', l: 'Ziel', w: '.8fr' }, { k: 'unit', l: 'Einheit', w: '.6fr' }], add: 'Kennzahl hinzufügen', empty: { name: '', current: '', target: '', unit: '' } },
        'process.steps': { cols: [{ k: 'name', l: 'Schritt', w: '1.2fr' }, { k: 'description', l: 'Beschreibung', w: '2fr' }, { k: 'owner', l: 'Verantwortlich', w: '1fr' }], add: 'Schritt hinzufügen', empty: { name: '', description: '', owner: '' } },
        'conclusion.nextSteps': { cols: [{ k: 'action', l: 'Maßnahme', w: '2fr' }, { k: 'owner', l: 'Verantwortlich', w: '1fr' }, { k: 'due', l: 'Fällig', w: '.9fr', type: 'date' }, { k: 'status', l: 'Status', w: '.9fr', options: STATUS_OPTS }], add: 'Schritt hinzufügen', empty: { action: '', owner: '', due: '', status: 'Offen' } },
        'conclusion.recommendations': { strings: true, ph: 'Empfehlung …', add: 'Empfehlung hinzufügen' },
        'conclusion.assumptions': { strings: true, ph: 'Annahme …', add: 'Annahme hinzufügen' },
        'conclusion.openQuestions': { strings: true, ph: 'Offene Frage …', add: 'Frage hinzufügen' },
        'causes.whys': { strings: true, ph: 'Weil …', add: 'Weiteres „Warum?“', prefix: function (i) { return 'Warum? ' + (i + 1); }, max: 8 }
    };
    PS.FISH_LABELS = { people: 'Mensch', machine: 'Maschine', method: 'Methode', material: 'Material', measurement: 'Messung', environment: 'Umwelt' };
    PS.FISH_KEYS.forEach(function (k) {
        PS.LISTS['causes.fishbone.' + k] = { strings: true, ph: 'Einfluss …', add: 'Einfluss', compact: true };
    });

    function renderList(path) {
        var def = PS.LISTS[path];
        var rows = PS.get(PS.project, path) || [];
        var out = '';
        if (def.strings) {
            rows.forEach(function (v, i) {
                out += '<div class="le-row le-str">' +
                    (def.prefix ? '<span class="le-pre">' + def.prefix(i) + '</span>' : '') +
                    '<input type="text" data-li="' + path + '" data-row="' + i + '" value="' + esc(v) + '" placeholder="' + esc(def.ph || '') + '">' +
                    '<button type="button" class="icon-btn" data-del="' + path + '" data-row="' + i + '" title="Entfernen" aria-label="Entfernen">' + PS.icon('close', 14) + '</button></div>';
            });
        } else {
            var tpl = def.cols.map(function (c) { return c.w; }).join(' ') + ' 32px';
            out += '<div class="le-head" style="grid-template-columns:' + tpl + '">' + def.cols.map(function (c) { return '<span>' + c.l + '</span>'; }).join('') + '<span></span></div>';
            rows.forEach(function (row, i) {
                out += '<div class="le-row" style="grid-template-columns:' + tpl + '">' + def.cols.map(function (c) {
                    var val = row[c.k] == null ? '' : row[c.k];
                    if (c.options) {
                        return '<select data-li="' + path + '" data-row="' + i + '" data-col="' + c.k + '" aria-label="' + c.l + '">' + c.options.map(function (o) {
                            return '<option' + (o === val ? ' selected' : '') + '>' + o + '</option>';
                        }).join('') + '</select>';
                    }
                    return '<input type="' + (c.type || 'text') + '" data-li="' + path + '" data-row="' + i + '" data-col="' + c.k + '" value="' + esc(val) + '" aria-label="' + c.l + '">';
                }).join('') +
                    '<button type="button" class="icon-btn" data-del="' + path + '" data-row="' + i + '" title="Entfernen" aria-label="Zeile entfernen">' + PS.icon('close', 14) + '</button></div>';
            });
        }
        var canAdd = !def.max || rows.length < def.max;
        out += (canAdd ? '<button type="button" class="btn ghost sm" data-add="' + path + '">' + PS.icon('plus', 14) + '<span>' + def.add + '</span></button>' : '');
        return out;
    }
    PS.listEditor = function (path, cls) {
        return '<div class="le ' + (cls || '') + '" data-listwrap="' + path + '">' + renderList(path) + '</div>';
    };
    PS.refreshList = function (path) {
        var el = PS.$('[data-listwrap="' + path + '"]');
        if (el) el.innerHTML = renderList(path);
        return el;
    };

    /* ---------------- Fishbone (SVG, helle Farben für Report und Export) ---------------- */
    function wrap(text, n, maxLines) {
        var words = String(text || '').split(/\s+/).filter(Boolean), lines = [], cur = '';
        words.forEach(function (w) {
            if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
        });
        if (cur) lines.push(cur);
        if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…'); }
        return lines;
    }
    function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

    PS.fishboneSvg = function (causes, problem, labels) {
        labels = labels || PS.FISH_LABELS;
        var W = 1040, H = 470, spineY = 235, headX = 830;
        var joins = [290, 500, 710];
        var o = '<svg xmlns="http://www.w3.org/2000/svg" class="fishbone" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Segoe UI, Arial, sans-serif">';
        o += '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>';
        o += '<line x1="30" y1="' + spineY + '" x2="' + headX + '" y2="' + spineY + '" stroke="#475569" stroke-width="3" stroke-linecap="round"/>';
        // Kopf mit Problem
        var pl = wrap(problem || '(Problem noch nicht beschrieben)', 22, 5);
        o += '<rect x="' + headX + '" y="' + (spineY - 70) + '" width="190" height="140" rx="10" fill="#2f5fd0"/>';
        o += '<text x="' + (headX + 95) + '" y="' + (spineY - 48) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#cfdcff" letter-spacing="1">PROBLEM</text>';
        pl.forEach(function (ln, i) {
            o += '<text x="' + (headX + 95) + '" y="' + (spineY - 24 + i * 19) + '" text-anchor="middle" font-size="14" font-weight="600" fill="#ffffff">' + esc(ln) + '</text>';
        });
        PS.FISH_KEYS.forEach(function (key, idx) {
            var top = idx < 3, jx = joins[idx % 3];
            var ox = jx - 95, oy = top ? 62 : H - 62;
            o += '<line x1="' + ox + '" y1="' + oy + '" x2="' + jx + '" y2="' + spineY + '" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>';
            o += '<rect x="' + (ox - 62) + '" y="' + (top ? oy - 36 : oy + 6) + '" width="124" height="30" rx="6" fill="#e3ebff" stroke="#2f5fd0"/>';
            o += '<text x="' + ox + '" y="' + (top ? oy - 16 : oy + 26) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#1f3a8a">' + esc(labels[key]) + '</text>';
            var items = (causes.fishbone[key] || []).filter(function (s) { return String(s).trim(); });
            var shown = items.slice(0, 5);
            shown.forEach(function (it, j) {
                var f = (j + 1) / (shown.length + 1);
                var x = ox + (jx - ox) * f, y = oy + (spineY - oy) * f;
                o += '<line x1="' + (x - 14) + '" y1="' + y + '" x2="' + x + '" y2="' + y + '" stroke="#94a3b8" stroke-width="1.4"/>';
                o += '<text x="' + (x - 18) + '" y="' + (y + 4) + '" text-anchor="end" font-size="12" fill="#1e293b">' + esc(trunc(it, 28)) + '</text>';
            });
            if (items.length > shown.length) {
                var yy = top ? oy + 12 : oy - 12;
                o += '<text x="' + (ox + 8) + '" y="' + yy + '" font-size="11" fill="#64748b" font-style="italic">+ ' + (items.length - shown.length) + ' weitere</text>';
            }
        });
        return o + '</svg>';
    };

    /* ---------------- Ansichten ---------------- */
    PS.views = {};

    PS.views.home = function () {
        var p = PS.project, ov = Math.round(PS.overall() * 100);
        var next = null;
        PS.FLOW_ORDER.some(function (id) { if (PS.status(id).pct < 0.6) { next = id; return true; } return false; });
        var cards = PS.MODULES.filter(function (m) { return PS.FLOW_ORDER.indexOf(m.id) >= 0 || m.id === 'docs'; }).map(function (m, i) {
            var s = PS.status(m.id), pct = Math.round(s.pct * 100);
            var state = m.id === 'docs' ? (pct ? 'done' : 'opt') : (pct >= 80 ? 'done' : pct > 0 ? 'wip' : 'empty');
            return '<button type="button" class="mod-card ' + state + (next === m.id ? ' next' : '') + '" data-go="' + m.id + '">' +
                '<span class="mod-ic">' + PS.icon(m.icon, 22) + '</span>' +
                '<span class="mod-t">' + m.label + (next === m.id ? '<em>Nächster Schritt</em>' : '') + '</span>' +
                '<span class="mod-d">' + esc(s.detail) + '</span>' +
                (m.id === 'docs' ? '' : '<span class="bar"><i style="width:' + pct + '%"></i></span>') + '</button>';
        }).join('');
        var meta = card('Eckdaten für den Report',
            '<div class="grid2">' + field('Titel des Reports', 'meta.title', { ph: 'z. B. Ausschuss an Abfüllanlage 3 senken' }) +
            field('Untertitel', 'meta.subtitle', { ph: 'z. B. Problemlösungsbericht 2025' }) +
            field('Autor', 'meta.author') + field('Organisation / Abteilung', 'meta.organization') +
            field('Datum', 'meta.date', { type: 'date' }) + field('Version', 'meta.version') + '</div>' +
            field('Sprache des Reports', 'meta.language', { select: [['de', 'Deutsch'], ['en', 'English']], cls: 'w-sm' }));
        var hero = '<section class="hero"><div><h2>' + (esc(p.meta.title || p.name)) + '</h2>' +
            '<p class="muted">' + (next ? 'Als Nächstes: <b>' + PS.module(next).label + '</b> – ' + esc(PS.module(next).help.split('.')[0]) + '.' : 'Alle Schritte sind bearbeitet. Prüfe den Report und exportiere ihn.') + '</p>' +
            '<div class="hero-actions">' + (next ? btn('Weiter mit „' + PS.module(next).label + '“', 'data-go="' + next + '"', 'primary') : btn('Zum Report', 'data-go="report"', 'primary')) +
            btn('KI-Ergebnis importieren', 'data-go="ai"', '', 'ai') + btn('Beispiel laden', 'data-act="example"', 'ghost') + '</div></div>' +
            '<div class="ring" style="--p:' + ov + '"><b>' + ov + '%</b><span>Fortschritt</span></div></section>';
        return hero + '<div class="mod-grid">' + cards + '</div>' + meta;
    };

    PS.views.problem = function () {
        var p = PS.project.problem, hints = [];
        if (p.statement.trim().length < 40) hints.push('Beschreibe das Problem genauer: Was ist passiert, wo, seit wann und in welchem Umfang?');
        if (p.goal.trim() && !/\d/.test(p.goal)) hints.push('Mache das Ziel messbar – nenne eine Zahl oder ein Datum (z. B. „Ausschuss unter 2 % bis 30.06.“).');
        if (!p.team.length) hints.push('Trage mindestens die Verantwortlichen im Team ein.');
        var hintBox = '<div class="tip" id="problemHints"' + (hints.length ? '' : ' hidden') + '><b>Qualitäts-Check</b><ul>' + hints.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul></div>';
        return hintBox +
            card('Problembeschreibung',
                field('Problem in einem Satz', 'problem.statement', { rows: 3, ph: 'Was ist das Problem? Was weicht von der Erwartung ab?', hint: 'Faustregel 5W2H: Was, Wo, Wann, Wer, Warum – Wie viel, Wie oft?' }) +
                '<div class="grid2">' + field('Kontext / Ist-Zustand', 'problem.context', { rows: 5, ph: 'Hintergrund, bisherige Beobachtungen, Messwerte …' }) +
                field('Auswirkung', 'problem.impact', { rows: 5, ph: 'Kosten, Qualität, Sicherheit, Kundenbeschwerden, Termine …' }) + '</div>') +
            card('Ziel & Abgrenzung',
                field('Zielzustand', 'problem.goal', { rows: 3, ph: 'Messbar, terminiert, realistisch', hint: 'SMART: spezifisch, messbar, attraktiv, realistisch, terminiert.' }) +
                '<div class="grid2">' + field('Im Umfang (In Scope)', 'problem.scopeIn', { rows: 3 }) + field('Nicht im Umfang (Out of Scope)', 'problem.scopeOut', { rows: 3 }) + '</div>') +
            card('Beteiligte', field('Betroffene und Stakeholder', 'problem.stakeholders', { rows: 2, ph: 'Wer ist betroffen, wer entscheidet?' }) +
                '<h4 class="sub">Projektteam</h4>' + PS.listEditor('problem.team')) +
            card('Kennzahlen', '<p class="muted sm">Woran erkennst du, dass das Problem gelöst ist?</p>' + PS.listEditor('problem.kpis'));
    };

    PS.views.processList = function () {
        return '<div class="pane">' + card('Prozessschritte',
            '<p class="muted sm">Beschreibe den Ist-Prozess in der Reihenfolge, in der er abläuft.</p>' + PS.listEditor('process.steps') +
            '<div class="row-actions">' + btn('Aus Symbolkarte übernehmen', 'data-act="steps-from-map"', 'ghost', 'download') + '</div>') + '</div>';
    };

    PS.views.causes = function () {
        var c = PS.project.causes;
        var fish = PS.FISH_KEYS.map(function (k) {
            return '<div class="fish-cat"><h4>' + PS.FISH_LABELS[k] + '</h4>' + PS.listEditor('causes.fishbone.' + k, 'compact') + '</div>';
        }).join('');
        return card('Problem (Ausgangspunkt)', '<p class="quote" id="causeProblem">' + esc(PS.project.problem.statement || 'Noch kein Problem beschrieben – siehe „Problem“.') + '</p>') +
            card('5-Why – Warum-Kette', '<p class="muted sm">Beantworte jedes „Warum?“ mit der Antwort auf die vorherige Frage, bis du eine Ursache findest, die du beeinflussen kannst.</p>' +
                PS.listEditor('causes.whys', 'whys')) +
            card('Ishikawa – mögliche Einflüsse (6M)', '<div class="fish-grid">' + fish + '</div>' +
                '<div class="fish-preview" id="fishPreview">' + PS.fishboneSvg(c, PS.project.problem.statement) + '</div>') +
            card('Wurzelursache', field('Festgestellte Hauptursache', 'causes.rootCause', { rows: 3, ph: 'Welche Ursache ist belegt und erklärt das Problem?', hint: 'Prüfe: Verschwindet das Problem, wenn diese Ursache beseitigt wird?' }));
    };

    PS.views.conclusion = function () {
        return card('Zusammenfassung', field('Executive Summary', 'conclusion.summary', { rows: 6, ph: 'Problem, Ursache, Lösung und Nutzen in wenigen Sätzen – das liest die Führungsebene zuerst.' }) +
            field('Wurzelursache', 'causes.rootCause', { rows: 2, ph: 'Wird auch im Modul „Ursachen“ gepflegt.' })) +
            card('Empfehlungen', PS.listEditor('conclusion.recommendations')) +
            card('Entscheidung', field('Beschluss / Entscheidung', 'conclusion.decision', { rows: 3, ph: 'Was wurde entschieden, von wem, wann?' })) +
            card('Nächste Schritte', PS.listEditor('conclusion.nextSteps') +
                '<div class="row-actions">' + btn('Aus Maßnahmen-Tool übernehmen', 'data-act="steps-from-actions"', 'ghost', 'download') + '</div>') +
            card('Lessons Learned', field('Was nehmen wir mit?', 'conclusion.lessons', { rows: 4 })) +
            '<div class="grid2">' + card('Annahmen', PS.listEditor('conclusion.assumptions')) + card('Offene Fragen', PS.listEditor('conclusion.openQuestions')) + '</div>';
    };

    // Live-Aktualisierung kleiner Teile, ohne die Eingabefelder neu aufzubauen
    PS.liveUpdate = function (path) {
        if (path === 'problem.statement' || path.indexOf('causes.fishbone') === 0) {
            var fp = PS.$('#fishPreview');
            if (fp) fp.innerHTML = PS.fishboneSvg(PS.project.causes, PS.project.problem.statement);
        }
        if (path.indexOf('problem.') === 0) {
            var box = PS.$('#problemHints');
            if (box) {
                var p = PS.project.problem, hints = [];
                if (p.statement.trim().length < 40) hints.push('Beschreibe das Problem genauer: Was ist passiert, wo, seit wann und in welchem Umfang?');
                if (p.goal.trim() && !/\d/.test(p.goal)) hints.push('Mache das Ziel messbar – nenne eine Zahl oder ein Datum (z. B. „Ausschuss unter 2 % bis 30.06.“).');
                if (!p.team.length) hints.push('Trage mindestens die Verantwortlichen im Team ein.');
                box.hidden = !hints.length;
                box.innerHTML = '<b>Qualitäts-Check</b><ul>' + hints.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>';
            }
        }
    };
})();
