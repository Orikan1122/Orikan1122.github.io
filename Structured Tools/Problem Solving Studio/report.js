/* Problem Solving Studio – Report: Aufbau aus allen Modulen und Exporte */
(function () {
    'use strict';
    var PS = window.PS;
    var esc = PS.esc;

    /* ---------------- Texte (Deutsch / Englisch) ---------------- */
    var TXT = {
        de: {
            report: 'Problemlösungsbericht', toc: 'Inhalt', author: 'Autor', org: 'Organisation', date: 'Datum', version: 'Version',
            summary: 'Zusammenfassung', problem: 'Problembeschreibung', process: 'Prozess', causes: 'Ursachenanalyse',
            swot: 'SWOT-Analyse', risk: 'Risikoanalyse', actions: 'Maßnahmenbewertung', conclusion: 'Fazit und nächste Schritte', appendix: 'Anhang',
            statement: 'Problem', context: 'Kontext / Ist-Zustand', impact: 'Auswirkung', goal: 'Zielzustand', scopeIn: 'Im Umfang', scopeOut: 'Nicht im Umfang', stakeholders: 'Betroffene und Stakeholder',
            team: 'Projektteam', name: 'Name', role: 'Rolle', kpis: 'Kennzahlen', kpi: 'Kennzahl', current: 'Aktuell', target: 'Ziel', unit: 'Einheit',
            steps: 'Prozessschritte', step: 'Schritt', description: 'Beschreibung', owner: 'Verantwortlich', no: 'Nr.', shape: 'Symbol', map: 'Prozesskarte',
            whys: '5-Why-Analyse', level: 'Ebene', answer: 'Antwort', fishbone: 'Ishikawa-Diagramm (6M)', category: 'Kategorie', influences: 'Einflüsse', rootCause: 'Wurzelursache',
            strengths: 'Stärken', weaknesses: 'Schwächen', opportunities: 'Chancen', threats: 'Risiken', internal: 'Intern', external: 'Extern',
            impactL: 'Wirkung', confirmed: 'bestätigt', speculative: 'vermutet', 'short-term': 'kurzfristig', 'medium-term': 'mittelfristig', 'long-term': 'langfristig',
            unassigned: 'Nicht zugeordnete Notizen', riskId: 'ID', riskStep: 'Schritt', riskChange: 'Änderung', riskCat: 'Kategorie', riskDesc: 'Risiko', likelihood: 'Wahrsch.', severity: 'Schwere', level2: 'Stufe',
            low: 'Niedrig', high: 'Hoch', mid: 'Mittel', crit: 'Sehr hoch', score: 'Score', lik: ['Selten', 'Unwahrscheinlich', 'Möglich', 'Wahrscheinlich', 'Fast sicher'], sev: ['Vernachlässigbar', 'Gering', 'Mäßig', 'Erheblich', 'Kritisch'], matrix: 'Risikomatrix', mitigations: 'Gegenmaßnahmen', plan: 'Maßnahme', mImpact: 'Wirkung', mEffort: 'Aufwand', rating: 'Einordnung',
            quick: 'Quick Win', major: 'Großprojekt', fill: 'Nebenbei', rethink: 'Überdenken',
            quality: 'Qualität', foodSafety: 'Lebensmittelsicherheit', environment: 'Umwelt', hs: 'Arbeitssicherheit',
            idea: 'Maßnahme', zone: 'Zone', status: 'Status', score: 'Score', location: 'Ort', matrixTitle: 'Aufwand-Wirksamkeits-Matrix',
            'Not Started': 'Nicht begonnen', 'In Progress': 'In Arbeit', Completed: 'Abgeschlossen', 'On Hold': 'Pausiert',
            recommendations: 'Empfehlungen', decision: 'Entscheidung', nextSteps: 'Nächste Schritte', action: 'Maßnahme', due: 'Fällig', lessons: 'Lessons Learned',
            assumptions: 'Annahmen', openQuestions: 'Offene Fragen', documents: 'Dokumente', page: 'Seite', generated: 'Erstellt mit dem Problem Solving Studio',
            arrow: 'Pfeil', circle: 'Kreis', rectangle: 'Rechteck', fig: 'Abbildung', riskSummary: function (n, s, c, h, m, l) { return n + ' Risiken in ' + s + ' Prozessschritten identifiziert: ' + c + ' sehr hoch, ' + h + ' hoch, ' + m + ' mittel, ' + l + ' niedrig.'; },
            ideaSummary: function (n, done) { return n + ' Maßnahmen bewertet, davon ' + done + ' abgeschlossen.'; }
        },
        en: {
            report: 'Problem-solving report', toc: 'Contents', author: 'Author', org: 'Organization', date: 'Date', version: 'Version',
            summary: 'Executive summary', problem: 'Problem description', process: 'Process', causes: 'Root cause analysis',
            swot: 'SWOT analysis', risk: 'Risk analysis', actions: 'Action assessment', conclusion: 'Conclusion and next steps', appendix: 'Appendix',
            statement: 'Problem', context: 'Context / current state', impact: 'Impact', goal: 'Target state', scopeIn: 'In scope', scopeOut: 'Out of scope', stakeholders: 'Affected parties and stakeholders',
            team: 'Project team', name: 'Name', role: 'Role', kpis: 'KPIs', kpi: 'KPI', current: 'Current', target: 'Target', unit: 'Unit',
            steps: 'Process steps', step: 'Step', description: 'Description', owner: 'Owner', no: 'No.', shape: 'Symbol', map: 'Process map',
            whys: '5-Why analysis', level: 'Level', answer: 'Answer', fishbone: 'Ishikawa diagram (6M)', category: 'Category', influences: 'Factors', rootCause: 'Root cause',
            strengths: 'Strengths', weaknesses: 'Weaknesses', opportunities: 'Opportunities', threats: 'Threats', internal: 'Internal', external: 'External',
            impactL: 'Impact', confirmed: 'confirmed', speculative: 'speculative', 'short-term': 'short-term', 'medium-term': 'medium-term', 'long-term': 'long-term',
            unassigned: 'Unassigned notes', riskId: 'ID', riskStep: 'Step', riskChange: 'Change', riskCat: 'Category', riskDesc: 'Risk', likelihood: 'Likelihood', severity: 'Severity', level2: 'Level',
            low: 'Low', high: 'High', mid: 'Medium', crit: 'Very high', score: 'Score', lik: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'], sev: ['Negligible', 'Minor', 'Moderate', 'Major', 'Critical'], matrix: 'Risk matrix', mitigations: 'Mitigation actions', plan: 'Action', mImpact: 'Impact', mEffort: 'Effort', rating: 'Rating',
            quick: 'Quick win', major: 'Major project', fill: 'Fill-in', rethink: 'Reconsider',
            quality: 'Quality', foodSafety: 'Food safety', environment: 'Environment', hs: 'Health & safety',
            idea: 'Action', zone: 'Zone', status: 'Status', score: 'Score', location: 'Location', matrixTitle: 'Effort-effectiveness matrix',
            'Not Started': 'Not started', 'In Progress': 'In progress', Completed: 'Completed', 'On Hold': 'On hold',
            recommendations: 'Recommendations', decision: 'Decision', nextSteps: 'Next steps', action: 'Action', due: 'Due', lessons: 'Lessons learned',
            assumptions: 'Assumptions', openQuestions: 'Open questions', documents: 'Documents', page: 'Page', generated: 'Created with Problem Solving Studio',
            arrow: 'Arrow', circle: 'Circle', rectangle: 'Rectangle', fig: 'Figure', riskSummary: function (n, s, c, h, m, l) { return n + ' risks identified across ' + s + ' process steps: ' + c + ' very high, ' + h + ' high, ' + m + ' medium, ' + l + ' low.'; },
            ideaSummary: function (n, done) { return n + ' actions assessed, ' + done + ' completed.'; }
        }
    };
    var FISH_EN = { people: 'People', machine: 'Machine', method: 'Method', material: 'Material', measurement: 'Measurement', environment: 'Environment' };

    /* ---------------- HTML-Bausteine ---------------- */
    function para(text) {
        var t = String(text || '').trim();
        if (!t) return '';
        return t.split(/\n{2,}/).map(function (b) { return '<p>' + esc(b).replace(/\n/g, '<br>') + '</p>'; }).join('');
    }
    function cell(c) { return c && c.html !== undefined ? c.html : esc(c == null ? '' : c); }
    function table(headers, rows, cls) {
        if (!rows.length) return '';
        return '<table class="' + (cls || '') + '"><thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
            rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td' + (c && c.cls ? ' class="' + c.cls + '"' : '') + '>' + cell(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    }
    function kv(pairs) {
        var rows = pairs.filter(function (p) { return p[1] && String(p[1]).trim(); }).map(function (p) {
            return '<tr><th class="kv">' + esc(p[0]) + '</th><td>' + esc(p[1]).replace(/\n/g, '<br>') + '</td></tr>';
        });
        return rows.length ? '<table class="kv-table"><tbody>' + rows.join('') + '</tbody></table>' : '';
    }
    function ul(items) {
        items = items.filter(function (i) { return i && String(i).trim(); });
        return items.length ? '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '';
    }
    function img(src, alt) {
        return src ? '<figure><img class="rp-img" width="640" src="' + src + '" alt="' + esc(alt) + '"><figcaption>' + esc(alt) + '</figcaption></figure>' : '';
    }
    function h3(t) { return '<h3>' + esc(t) + '</h3>'; }
    function fmtDate(v) {
        var m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return v || '';
        return PS.reportLang() === 'en' ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '.' + m[2] + '.' + m[1];
    }

    /* ---------------- Risiko-Auswertung ---------------- */
    var RISK_CATS = ['quality', 'foodSafety', 'environment', 'hs'];
    function collectRisks() {
        var s = PS.project.tools.risk, list = [], n = 0;
        if (!s || !Array.isArray(s.steps)) return list;
        s.steps.forEach(function (st, i) {
            RISK_CATS.forEach(function (c) {
                var r = (st.risks || {})[c];
                if (r && r.isChecked) {
                    n++;
                    var L = PS.num(r.likelihood, 1, 5, 1), S = PS.num(r.severity, 1, 5, 1);
                    list.push({ id: 'R' + n, stepNo: i + 1, step: st, cat: c, desc: r.description || '', L: L, S: S, score: L * S,
                        plan: r.mitigationPlan || '', mImpact: PS.num(r.mitigationImpact, 1, 2, 1), mEffort: PS.num(r.mitigationEffort, 1, 2, 1) });
                }
            });
        });
        return list;
    }
    // Stufen: 1-4 niedrig, 5-9 mittel, 10-16 hoch, 17-25 sehr hoch
    function levelOf(score, t) {
        return score >= 17 ? [t.crit, 'lv-crit'] : score >= 10 ? [t.high, 'lv-hi'] : score >= 5 ? [t.mid, 'lv-mid'] : [t.low, 'lv-lo'];
    }
    PS.collectRisks = collectRisks;

    /* ---------------- Abschnitte ---------------- */
    var SECTIONS = {};

    SECTIONS.summary = function (p, t) {
        var c = p.conclusion;
        if (!c.summary.trim()) return '';
        return para(c.summary) +
            (p.problem.statement.trim() ? '<div class="rp-callout"><b>' + esc(t.statement) + ':</b> ' + esc(p.problem.statement) + '</div>' : '') +
            (p.causes.rootCause.trim() ? '<div class="rp-callout"><b>' + esc(t.rootCause) + ':</b> ' + esc(p.causes.rootCause) + '</div>' : '') +
            (c.decision.trim() ? '<div class="rp-callout"><b>' + esc(t.decision) + ':</b> ' + esc(c.decision) + '</div>' : '');
    };

    SECTIONS.problem = function (p, t) {
        var q = p.problem;
        var out = kv([[t.statement, q.statement], [t.context, q.context], [t.impact, q.impact], [t.goal, q.goal],
            [t.scopeIn, q.scopeIn], [t.scopeOut, q.scopeOut], [t.stakeholders, q.stakeholders]]);
        var team = q.team.filter(function (m) { return m.name || m.role; });
        if (team.length) out += h3(t.team) + table([t.name, t.role], team.map(function (m) { return [m.name, m.role]; }));
        var kpis = q.kpis.filter(function (k) { return k.name; });
        if (kpis.length) out += h3(t.kpis) + table([t.kpi, t.current, t.target, t.unit], kpis.map(function (k) { return [k.name, k.current, k.target, k.unit]; }));
        return out;
    };

    var SHAPE = function (t, s) { return t[s] || s; };
    SECTIONS.process = function (p, t) {
        var out = '', snap = p.snapshots.flow;
        if (snap && snap.map) out += img(snap.map, t.map);
        var fl = p.tools.flow;
        if (fl && Array.isArray(fl.symbols) && fl.symbols.length) {
            var syms = fl.symbols.slice().sort(function (a, b) { return (a.number || 0) - (b.number || 0); });
            out += table([t.no, t.shape, t.description], syms.map(function (s) { return [s.number, SHAPE(t, s.shape), s.description]; }));
        }
        var steps = p.process.steps.filter(function (s) { return s.name || s.description; });
        if (steps.length) out += h3(t.steps) + table([t.no, t.step, t.description, t.owner], steps.map(function (s, i) { return [i + 1, s.name, s.description, s.owner]; }));
        return out;
    };

    SECTIONS.causes = function (p, t, lang) {
        var c = p.causes, out = '';
        var whys = c.whys.filter(function (w) { return w.trim(); });
        if (whys.length) {
            out += h3(t.whys) + table([t.level, t.answer],
                [['0', { html: '<b>' + esc(p.problem.statement || t.statement) + '</b>' }]].concat(whys.map(function (w, i) { return [t.level === 'Ebene' ? 'Warum ' + (i + 1) : 'Why ' + (i + 1), w]; })));
        }
        var any = PS.FISH_KEYS.some(function (k) { return c.fishbone[k].some(function (s) { return String(s).trim(); }); });
        if (any) {
            var labels = lang === 'en' ? FISH_EN : PS.FISH_LABELS;
            out += h3(t.fishbone) + '<figure>' + PS.fishboneSvg(c, p.problem.statement, labels) + '</figure>';
            out += table([t.category, t.influences], PS.FISH_KEYS.map(function (k) {
                return [labels[k], c.fishbone[k].filter(function (s) { return String(s).trim(); }).join('; ')];
            }).filter(function (r) { return r[1]; }));
        }
        if (c.rootCause.trim()) out += '<div class="rp-callout"><b>' + esc(t.rootCause) + ':</b> ' + esc(c.rootCause) + '</div>';
        return out;
    };

    SECTIONS.swot = function (p, t) {
        var notes = p.tools.swot;
        if (!Array.isArray(notes)) return '';
        var q = { strengths: [], weaknesses: [], opportunities: [], threats: [] }, un = 0;
        notes.forEach(function (n) { if (q[n.quadrantId]) q[n.quadrantId].push(n); else un++; });
        if (!notes.length || notes.length === un) return '';
        function box(key, cls) {
            var items = q[key].slice().sort(function (a, b) { return (Number(b.impact) || 0) - (Number(a.impact) || 0); });
            return '<td class="swot ' + cls + '"><div class="swot-h">' + esc(t[key]) + '</div>' + (items.length ? '<ul>' + items.map(function (n) {
                var tags = [t.impactL + ' ' + (n.impact || '3') + '/5', t[n.confidence] || '', t[n.timeframe] || '', n.stakeholders || ''].filter(Boolean).join(' · ');
                return '<li><b>' + esc(n.title) + '</b>' + (n.details ? ' – ' + esc(n.details) : '') + '<br><span class="tag">' + esc(tags) + '</span></li>';
            }).join('') + '</ul>' : '<p class="muted">–</p>') + '</td>';
        }
        return '<table class="swot-table"><tr><td class="axis"></td><th>' + esc(t.internal) + '</th><th>' + esc(t.external) + '</th></tr>' +
            '<tr><th class="side">+</th>' + box('strengths', 'sw-s') + box('opportunities', 'sw-o') + '</tr>' +
            '<tr><th class="side">−</th>' + box('weaknesses', 'sw-w') + box('threats', 'sw-t') + '</tr></table>' +
            (un ? '<p class="muted">' + esc(t.unassigned) + ': ' + un + '</p>' : '');
    };

    SECTIONS.risk = function (p, t) {
        var risks = collectRisks();
        if (!risks.length) return '';
        var steps = {}, cnt = { crit: 0, hi: 0, mid: 0, lo: 0 };
        risks.forEach(function (r) { steps[r.stepNo] = 1; cnt[r.score >= 17 ? 'crit' : r.score >= 10 ? 'hi' : r.score >= 5 ? 'mid' : 'lo']++; });
        var out = '<p>' + esc(t.riskSummary(risks.length, Object.keys(steps).length, cnt.crit, cnt.hi, cnt.mid, cnt.lo)) + '</p>';
        out += table([t.riskId, t.riskStep, t.riskCat, t.riskDesc, t.likelihood, t.severity, t.level2], risks.map(function (r) {
            var lv = levelOf(r.score, t);
            var stepTxt = '#' + r.stepNo + (r.step.change ? ': ' + r.step.change : (r.step.future ? ': ' + r.step.future : ''));
            return [r.id, stepTxt, t[r.cat], r.desc, r.L + ' – ' + t.lik[r.L - 1], r.S + ' – ' + t.sev[r.S - 1], { html: esc(lv[0]) + ' (' + r.score + ')', cls: lv[1] }];
        }));
        // 5x5-Matrix: Zeilen = Schwere (5 oben), Spalten = Wahrscheinlichkeit
        var head = '<tr><th class="side">' + esc(t.severity) + ' ↓ / ' + esc(t.likelihood) + ' →</th>' + t.lik.map(function (l, i) { return '<th>' + (i + 1) + '<br><span class="tag">' + esc(l) + '</span></th>'; }).join('') + '</tr>';
        var rows = '';
        for (var S = 5; S >= 1; S--) {
            rows += '<tr><th class="side">' + S + ' – ' + esc(t.sev[S - 1]) + '</th>';
            for (var L = 1; L <= 5; L++) {
                var ids = risks.filter(function (r) { return r.L === L && r.S === S; }).map(function (r) { return r.id; });
                rows += '<td class="mx ' + levelOf(L * S, t)[1] + '">' + (ids.length ? '<b>' + esc(ids.join(', ')) + '</b>' : '&nbsp;') + '</td>';
            }
            rows += '</tr>';
        }
        out += h3(t.matrix) + '<table class="risk-matrix">' + head + rows + '</table>';
        var mit = risks.filter(function (r) { return r.plan.trim(); }).sort(function (a, b) { return (b.mImpact - a.mImpact) || (a.mEffort - b.mEffort); });
        if (mit.length) {
            out += h3(t.mitigations) + table([t.riskId, t.plan, t.mImpact, t.mEffort, t.rating], mit.map(function (r) {
                var rating = r.mImpact === 2 ? (r.mEffort === 1 ? t.quick : t.major) : (r.mEffort === 1 ? t.fill : t.rethink);
                return [r.id, r.plan, r.mImpact === 2 ? t.high : t.low, r.mEffort === 2 ? t.high : t.low, rating];
            }));
        }
        var snap = p.snapshots.risk;
        if (snap && snap.impactEffort) out += img(snap.impactEffort, t.mitigations);
        return out;
    };

    function zoneOf(zones, x, y) {
        for (var i = 0; i < zones.length; i++) {
            var z = zones[i];
            if (x >= z.xMin && x <= z.xMax && y >= z.yMin && y <= z.yMax) return z.name;
        }
        return '';
    }
    function ideaScore(i) { return Math.max(0, Math.round(i.y * 5 + (10 - i.x))); }
    PS.ideaRows = function (lang) {
        var a = PS.project.tools.actions;
        if (!a || !Array.isArray(a.ideas)) return [];
        var cats = {};
        (a.categories || []).forEach(function (c) { cats[c.id] = c.name; });
        return a.ideas.map(function (i) {
            return { title: i.title || '', description: i.description || '', category: cats[i.categoryId] || '', location: i.location || '',
                x: Number(i.x), y: Number(i.y), zone: zoneOf(a.ratingZones || [], Number(i.x), Number(i.y)), status: i.status || 'Not Started', score: ideaScore(i) };
        }).sort(function (m, n) { return n.score - m.score; });
    };
    SECTIONS.actions = function (p, t) {
        var rows = PS.ideaRows();
        if (!rows.length) return '';
        var a = p.tools.actions, ax = a.axisLabels || { x: 'X', y: 'Y' };
        var done = rows.filter(function (r) { return r.status === 'Completed'; }).length;
        var out = '<p>' + esc(t.ideaSummary(rows.length, done)) + '</p>';
        var snap = p.snapshots.actions;
        if (snap && snap.matrix) out += img(snap.matrix, t.matrixTitle);
        out += table([t.no, t.idea, t.category, t.location, ax.x, ax.y, t.zone, t.status, t.score], rows.map(function (r, i) {
            return [i + 1, { html: '<b>' + esc(r.title) + '</b>' + (r.description ? '<br><span class="tag">' + esc(r.description) + '</span>' : '') }, r.category, r.location, r.x, r.y, r.zone, t[r.status] || r.status, r.score];
        }));
        return out;
    };

    SECTIONS.conclusion = function (p, t) {
        var c = p.conclusion, out = '';
        var recs = ul(c.recommendations);
        if (recs) out += h3(t.recommendations) + recs;
        if (c.decision.trim()) out += h3(t.decision) + para(c.decision);
        var ns = c.nextSteps.filter(function (s) { return s.action; });
        if (ns.length) out += h3(t.nextSteps) + table([t.no, t.action, t.owner, t.due, t.status], ns.map(function (s, i) { return [i + 1, s.action, s.owner, fmtDate(s.due), s.status]; }));
        if (c.lessons.trim()) out += h3(t.lessons) + para(c.lessons);
        var as = ul(c.assumptions), oq = ul(c.openQuestions);
        if (as) out += h3(t.assumptions) + as;
        if (oq) out += h3(t.openQuestions) + oq;
        return out;
    };

    SECTIONS.appendix = function (p, t) {
        var d = p.tools.pdf;
        if (!d || !d.data || !Array.isArray(d.data.pages) || !d.data.pages.length) return '';
        var out = h3(t.documents + (d.fileName ? ': ' + d.fileName : ''));
        d.data.pages.forEach(function (pg) {
            var txt = String(pg.text || '').trim();
            if (!txt && !(pg.tables && pg.tables.length)) return;
            out += '<h4>' + esc(t.page) + ' ' + pg.pageNumber + '</h4>';
            if (txt) out += '<p class="doc-text">' + esc(txt.length > 4000 ? txt.slice(0, 4000) + ' …' : txt).replace(/\n/g, '<br>') + '</p>';
            (pg.tables || []).forEach(function (tb) {
                if (tb && tb.length) out += table(tb[0].map(String), tb.slice(1).map(function (r) { return r.map(String); }));
            });
        });
        return out;
    };

    PS.REPORT_SECTIONS = ['summary', 'problem', 'process', 'causes', 'swot', 'risk', 'actions', 'conclusion', 'appendix'];

    function order() {
        var saved = PS.project.report.order, base = PS.REPORT_SECTIONS;
        if (!Array.isArray(saved)) return base.slice();
        var o = saved.filter(function (id) { return base.indexOf(id) >= 0; });
        base.forEach(function (id) { if (o.indexOf(id) < 0) o.push(id); });
        return o;
    }
    PS.reportOrder = order;
    function isOn(id) { return PS.project.report.off.indexOf(id) < 0; }
    PS.reportLang = function () { return PS.project.meta.language === 'en' ? 'en' : 'de'; };
    PS.sectionBody = function (id) {
        var lang = PS.reportLang();
        return SECTIONS[id](PS.project, TXT[lang], lang);
    };

    /* ---------------- Report zusammensetzen ---------------- */
    PS.buildReport = function () {
        var p = PS.project, lang = PS.reportLang(), t = TXT[lang];
        var sections = [], n = 0;
        order().forEach(function (id) {
            if (!isOn(id)) return;
            var body = SECTIONS[id](p, t, lang);
            if (!body) return;
            n++;
            sections.push({ id: id, n: n, title: t[id], body: body });
        });
        var title = p.meta.title || p.name;
        var cover = '';
        if (isOn('cover')) {
            cover = '<header class="rp-cover"><div class="rp-kicker">' + esc(t.report) + '</div><h1>' + esc(title) + '</h1>' +
                (p.meta.subtitle ? '<p class="rp-sub">' + esc(p.meta.subtitle) + '</p>' : '') +
                kv([[t.author, p.meta.author], [t.org, p.meta.organization], [t.date, fmtDate(p.meta.date)], [t.version, p.meta.version]]) +
                (sections.length ? '<nav class="rp-toc"><h2>' + esc(t.toc) + '</h2><ol>' + sections.map(function (s) {
                    return '<li><a href="#sec-' + s.id + '">' + esc(s.title) + '</a></li>';
                }).join('') + '</ol></nav>' : '') + '</header>';
        } else {
            cover = '<h1 class="rp-title">' + esc(title) + '</h1>';
        }
        var body = sections.map(function (s) {
            return '<section class="rp-sec" id="sec-' + s.id + '"><h2><span class="rp-n">' + s.n + '</span> ' + esc(s.title) + '</h2>' + s.body + '</section>';
        }).join('');
        return '<article class="rp" lang="' + lang + '">' + cover + body +
            '<footer class="rp-foot">' + esc(t.generated) + ' · ' + esc(fmtDate(p.meta.date)) + '</footer></article>';
    };

    PS.REPORT_CSS = [
        '.rp{font-family:"Segoe UI",Calibri,Arial,sans-serif;font-size:10.5pt;line-height:1.5;color:#1f2733;background:#fff}',
        '.rp *{box-sizing:border-box}',
        '.rp h1{font-size:26pt;line-height:1.15;margin:.2em 0 .3em;color:#14213d}',
        '.rp h2{font-size:15pt;margin:1.6em 0 .6em;padding-bottom:.25em;border-bottom:2px solid #2f5fd0;color:#14213d;page-break-after:avoid}',
        '.rp h3{font-size:11.5pt;margin:1.2em 0 .4em;color:#2f5fd0;page-break-after:avoid}',
        '.rp h4{font-size:10.5pt;margin:1em 0 .3em;color:#475569}',
        '.rp .rp-n{display:inline-block;min-width:1.6em;color:#2f5fd0}',
        '.rp p{margin:.4em 0}',
        '.rp .muted,.rp .tag{color:#64748b;font-size:9pt}',
        '.rp-cover{padding:1.2em 0 1.6em;border-bottom:1px solid #d5dbe5;margin-bottom:.5em}',
        '.rp-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:9pt;font-weight:700;color:#2f5fd0}',
        '.rp-sub{font-size:13pt;color:#475569;margin:0 0 1em}',
        '.rp-toc{margin-top:1.4em}.rp-toc h2{font-size:12pt;border:0;margin:0 0 .3em}.rp-toc ol{margin:0;padding-left:1.4em}.rp-toc a{color:#1f2733;text-decoration:none}',
        '.rp table{width:100%;border-collapse:collapse;margin:.6em 0;font-size:9.5pt}',
        '.rp th,.rp td{border:1px solid #cfd6e2;padding:5px 8px;text-align:left;vertical-align:top}',
        '.rp thead th{background:#eef2fb;color:#1f3a8a}',
        '.rp tr{page-break-inside:avoid}',
        '.rp .kv-table th.kv{width:26%;background:#f4f6fa;color:#334155;font-weight:600}',
        '.rp ul,.rp ol{margin:.3em 0 .6em;padding-left:1.4em}',
        '.rp .rp-callout{margin:.7em 0;padding:.6em .9em;background:#eef2fb;border-left:4px solid #2f5fd0;border-radius:3px}',
        '.rp figure{margin:.8em 0;text-align:center}.rp figure img,.rp figure svg{max-width:100%;height:auto}',
        '.rp figcaption{font-size:9pt;color:#64748b;margin-top:.2em}',
        '.rp .lv-crit{background:#f3b4b4;color:#6b0f0f;font-weight:700}.rp .lv-hi{background:#fbd5c0;color:#8a2c0c;font-weight:600}.rp .lv-mid{background:#fdf0cf;color:#7a5a00;font-weight:600}.rp .lv-lo{background:#dff3e6;color:#1d6b3f;font-weight:600}',
        '.rp .risk-matrix{width:100%}.rp .risk-matrix td.mx{text-align:center;height:34px;width:15%}.rp .risk-matrix th{text-align:center;font-size:8.5pt}.rp th.side{background:#f4f6fa;white-space:nowrap;text-align:left}',
        '.rp .swot-table td.axis{border:0}.rp .swot-table th{background:#f4f6fa;text-align:center}.rp .swot-table th.side{width:28px;text-align:center}',
        '.rp .swot-table td.swot{width:48%;font-size:9.5pt}.rp .swot-h{font-weight:700;margin-bottom:.2em}',
        '.rp .sw-s{background:#eaf6ee}.rp .sw-w{background:#fbeaea}.rp .sw-o{background:#e8effd}.rp .sw-t{background:#fdf5df}',
        '.rp .doc-text{font-size:9pt;color:#334155;background:#f8fafc;padding:.5em .7em;border:1px solid #e2e8f0}',
        '.rp-foot{margin-top:2.4em;padding-top:.6em;border-top:1px solid #d5dbe5;font-size:8.5pt;color:#64748b;text-align:center}',
        '@media print{.rp h1{font-size:24pt}.rp-cover{page-break-after:always}.rp .rp-sec{page-break-inside:auto}}'
    ].join('\n');

    function docHtml(inner, extraHead, htmlAttrs) {
        var title = esc(PS.project.meta.title || PS.project.name);
        return '<!DOCTYPE html><html lang="' + PS.reportLang() + '"' + (htmlAttrs || '') + '><head><meta charset="utf-8"><title>' + title + '</title>' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' + (extraHead || '') +
            '<style>@page{size:A4;margin:18mm 16mm}body{margin:0;padding:24px;background:#eef1f6}.rp{max-width:820px;margin:0 auto;padding:36px 44px}' +
            '@media print{body{background:#fff;padding:0}.rp{max-width:none;padding:0}}\n' + PS.REPORT_CSS + '</style></head><body>' + inner + '</body></html>';
    }

    /* ---------------- Exporte ---------------- */
    var baseName = function () { return PS.safeName(PS.project.meta.title || PS.project.name) + '_' + PS.today(); };

    PS.exportHtml = function () {
        PS.download(baseName() + '.html', docHtml(PS.buildReport()), 'text/html;charset=utf-8');
    };

    PS.printReport = function () {
        var f = document.createElement('iframe');
        f.setAttribute('aria-hidden', 'true');
        f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
        document.body.appendChild(f);
        f.onload = function () {
            try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { PS.toast('Drucken nicht möglich: ' + e.message, 'error'); }
            setTimeout(function () { f.remove(); }, 60000);
        };
        f.srcdoc = docHtml(PS.buildReport());
    };

    function svgToPng(svgText) {
        return new Promise(function (resolve) {
            var m = svgText.match(/viewBox="0 0 (\d+) (\d+)"/);
            var w = m ? +m[1] : 1040, h = m ? +m[2] : 470;
            var im = new Image();
            im.onload = function () {
                var c = document.createElement('canvas');
                c.width = w * 2; c.height = h * 2;
                var ctx = c.getContext('2d');
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(im, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/png'));
            };
            im.onerror = function () { resolve(null); };
            im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
        });
    }
    function rasterizeSvgs(html) {
        var re = /<svg[\s\S]*?<\/svg>/g, svgs = html.match(re) || [];
        return Promise.all(svgs.map(svgToPng)).then(function (pngs) {
            var i = 0;
            return html.replace(re, function (m) {
                var png = pngs[i++];
                return png ? '<img class="rp-img" width="640" src="' + png + '" alt="Ishikawa">' : '';
            });
        });
    }
    function b64FromText(text) {
        var bytes = new TextEncoder().encode(text), bin = '';
        for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(bin);
    }
    function wrap76(s) { return s.replace(/.{1,76}/g, '$&\r\n'); }

    // Word öffnet MHTML mit Bildern zuverlässig als .doc
    PS.exportWord = function () {
        return rasterizeSvgs(PS.buildReport()).then(function (inner) {
            var parts = [], n = 0;
            inner = inner.replace(/<img([^>]*?)src="data:([^;"]+);base64,([^"]+)"/g, function (m, pre, mime, b64) {
                n++;
                var ext = mime.split('/')[1].replace('jpeg', 'jpg');
                var loc = 'file:///C:/report_files/image' + n + '.' + ext;
                parts.push({ loc: loc, mime: mime, b64: b64 });
                return '<img' + pre + 'src="' + loc + '"';
            });
            var head = '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
                '<style>@page Section1{size:21cm 29.7cm;margin:2cm}div.Section1{page:Section1}</style>';
            var html = docHtml('<div class="Section1">' + inner + '</div>', head,
                ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"');
            var B = '----=_NextPart_ST_' + PS.uid();
            var mht = 'MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="' + B + '"; type="text/html"\r\n\r\n' +
                '--' + B + '\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/report.htm\r\n\r\n' +
                wrap76(b64FromText(html)) + '\r\n';
            parts.forEach(function (pt) {
                mht += '--' + B + '\r\nContent-Location: ' + pt.loc + '\r\nContent-Transfer-Encoding: base64\r\nContent-Type: ' + pt.mime + '\r\n\r\n' + wrap76(pt.b64) + '\r\n';
            });
            mht += '--' + B + '--\r\n';
            PS.download(baseName() + '.doc', mht, 'application/msword');
        });
    };

    // HTML -> Markdown (einfacher DOM-Durchlauf)
    function htmlToMd(root) {
        function inline(node) {
            var s = '';
            node.childNodes.forEach(function (c) {
                if (c.nodeType === 3) { s += c.nodeValue.replace(/\s+/g, ' '); return; }
                if (c.nodeType !== 1) return;
                var tag = c.tagName.toLowerCase();
                if (tag === 'br') s += '  \n';
                else if (tag === 'b' || tag === 'strong') s += '**' + inline(c).trim() + '**';
                else if (tag === 'i' || tag === 'em') s += '*' + inline(c).trim() + '*';
                else if (tag === 'a') s += inline(c);
                else if (tag === 'img' || tag === 'svg') s += '';
                else s += inline(c);
            });
            return s;
        }
        function cellText(c) { return inline(c).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim(); }
        function tbl(t) {
            var rows = [].slice.call(t.querySelectorAll('tr')).map(function (tr) { return [].slice.call(tr.children).map(cellText); });
            if (!rows.length) return '';
            var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
            rows = rows.map(function (r) { while (r.length < w) r.push(''); return r; });
            var head = rows[0], md = '| ' + head.join(' | ') + ' |\n| ' + head.map(function () { return '---'; }).join(' | ') + ' |\n';
            rows.slice(1).forEach(function (r) { md += '| ' + r.join(' | ') + ' |\n'; });
            return md + '\n';
        }
        function block(node, depth) {
            var out = '';
            node.childNodes.forEach(function (c) {
                if (c.nodeType === 3) { var tx = c.nodeValue.trim(); if (tx) out += tx + '\n\n'; return; }
                if (c.nodeType !== 1) return;
                var tag = c.tagName.toLowerCase();
                if (/^h[1-4]$/.test(tag)) out += '#'.repeat(+tag[1]) + ' ' + inline(c).trim() + '\n\n';
                else if (tag === 'p') { var pt = inline(c).trim(); if (pt) out += pt + '\n\n'; }
                else if (tag === 'ul' || tag === 'ol') {
                    var i = 0;
                    c.querySelectorAll(':scope > li').forEach(function (li) { i++; out += '  '.repeat(depth) + (tag === 'ol' ? i + '. ' : '- ') + inline(li).trim() + '\n'; });
                    out += '\n';
                } else if (tag === 'table') out += tbl(c);
                else if (tag === 'figure') { var cap = c.querySelector('figcaption'); out += '*[' + (cap ? cap.textContent : 'Abbildung') + ']*\n\n'; }
                else if (c.classList.contains('rp-callout')) out += '> ' + inline(c).trim() + '\n\n';
                else if (tag === 'nav') out += block(c, depth);
                else out += block(c, depth);
            });
            return out;
        }
        return block(root, 0).replace(/\n{3,}/g, '\n\n').trim() + '\n';
    }
    PS.reportMarkdown = function () {
        var doc = new DOMParser().parseFromString('<body>' + PS.buildReport() + '</body>', 'text/html');
        return htmlToMd(doc.body);
    };
    PS.exportMarkdown = function () { PS.download(baseName() + '.md', PS.reportMarkdown(), 'text/markdown;charset=utf-8'); };

    PS.exportProjectJson = function () {
        var data = PS.clone(PS.project);
        PS.download(PS.safeName(PS.project.name) + '_projekt_' + PS.today() + '.json', JSON.stringify({ app: 'problem-solving-studio', version: 1, project: data }, null, 2), 'application/json');
    };

    function csv(rows) {
        return '\ufeff' + rows.map(function (r) {
            return r.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';');
        }).join('\r\n');
    }
    PS.exportCsv = function (kind) {
        var t = TXT[PS.reportLang()];
        if (kind === 'risks') {
            var risks = collectRisks();
            if (!risks.length) return PS.toast('Keine Risiken vorhanden.', 'error');
            PS.download('risikoregister_' + PS.today() + '.csv', csv([['ID', 'Schritt', 'Kategorie', 'Risiko', 'Wahrscheinlichkeit (1-5)', 'Schwere (1-5)', 'Score', 'Stufe', 'Maßnahme', 'Wirkung', 'Aufwand']].concat(risks.map(function (r) {
                return [r.id, r.stepNo + (r.step.change ? ': ' + r.step.change : ''), t[r.cat], r.desc, r.L, r.S, r.score, levelOf(r.score, t)[0], r.plan, r.plan ? (r.mImpact === 2 ? t.high : t.low) : '', r.plan ? (r.mEffort === 2 ? t.high : t.low) : ''];
            }))), 'text/csv;charset=utf-8');
        } else {
            var rows = PS.ideaRows();
            if (!rows.length) return PS.toast('Keine Maßnahmen vorhanden.', 'error');
            PS.download('massnahmen_' + PS.today() + '.csv', csv([['Maßnahme', 'Beschreibung', 'Kategorie', 'Ort', 'Aufwand', 'Wirksamkeit', 'Zone', 'Status', 'Score']].concat(rows.map(function (r) {
                return [r.title, r.description, r.category, r.location, r.x, r.y, r.zone, t[r.status] || r.status, r.score];
            }))), 'text/csv;charset=utf-8');
        }
    };

    /* ---------------- Ansicht „Report“ ---------------- */
    var SEC_LABEL = function () { var t = TXT[PS.reportLang()]; return function (id) { return id === 'cover' ? (PS.reportLang() === 'en' ? 'Cover page & contents' : 'Titelseite & Inhaltsverzeichnis') : t[id]; }; };

    PS.views.report = function () {
        var label = SEC_LABEL();
        var rows = ['cover'].concat(order()).map(function (id, idx, arr) {
            var empty = id !== 'cover' && !PS.sectionBody(id);
            var sortable = id !== 'cover';
            return '<li class="sec-row' + (empty ? ' is-empty' : '') + '" data-sec="' + id + '"><label><input type="checkbox" data-sec-toggle="' + id + '"' + (isOn(id) ? ' checked' : '') + '><span>' + esc(label(id)) + '</span></label>' +
                (empty ? '<em class="badge">leer</em>' : '') +
                (sortable ? '<span class="mv"><button type="button" class="icon-btn" data-sec-move="-1" data-sec-id="' + id + '" aria-label="Nach oben"' + (idx <= 1 ? ' disabled' : '') + '>' + PS.icon('up', 14) + '</button>' +
                    '<button type="button" class="icon-btn" data-sec-move="1" data-sec-id="' + id + '" aria-label="Nach unten"' + (idx === arr.length - 1 ? ' disabled' : '') + '>' + PS.icon('down', 14) + '</button></span>' : '') + '</li>';
        }).join('');
        return '<div class="report-layout"><aside class="report-side">' +
            PS.ui.card('Abschnitte', '<ul class="sec-list">' + rows + '</ul><p class="muted sm">Leere Abschnitte werden automatisch weggelassen.</p>') +
            PS.ui.card('Exportieren',
                '<div class="export-grid">' +
                PS.ui.btn('PDF drucken / speichern', 'data-export="print"', 'primary', 'print') +
                PS.ui.btn('Word (.doc)', 'data-export="word"', '', 'download') +
                PS.ui.btn('HTML', 'data-export="html"', '', 'download') +
                PS.ui.btn('Markdown', 'data-export="md"', '', 'download') +
                PS.ui.btn('Projekt (JSON)', 'data-export="json"', '', 'download') +
                PS.ui.btn('Risiken (CSV)', 'data-export="csv-risks"', '', 'download') +
                PS.ui.btn('Maßnahmen (CSV)', 'data-export="csv-actions"', '', 'download') +
                PS.ui.btn('Markdown kopieren', 'data-export="md-copy"', 'ghost', 'copy') + '</div>' +
                '<p class="muted sm">PDF: Im Druckdialog „Als PDF speichern“ wählen.</p>') +
            '</aside><div class="report-main"><div class="paper-wrap"><div class="paper" id="paper"><p class="muted center">Vorschau wird erstellt …</p></div></div></div></div>';
    };

    var token = 0;
    PS.renderPaper = function (refreshSnaps) {
        var paper = PS.$('#paper');
        if (!paper) return Promise.resolve();
        var my = ++token;
        var go = refreshSnaps ? PS.refreshSnapshots() : Promise.resolve();
        return go.then(function () {
            if (my !== token) return;
            var host = PS.$('#paper');
            if (host) host.innerHTML = PS.buildReport();
        });
    };

    PS.handleExport = function (kind) {
        var run = PS.refreshSnapshots();
        PS.toast('Export wird vorbereitet …');
        run.then(function () {
            if (kind === 'print') PS.printReport();
            else if (kind === 'html') PS.exportHtml();
            else if (kind === 'md') PS.exportMarkdown();
            else if (kind === 'md-copy') PS.copy(PS.reportMarkdown()).then(function () { PS.toast('Markdown kopiert'); }, function () { PS.toast('Kopieren nicht möglich', 'error'); });
            else if (kind === 'json') PS.exportProjectJson();
            else if (kind === 'csv-risks') PS.exportCsv('risks');
            else if (kind === 'csv-actions') PS.exportCsv('actions');
            else if (kind === 'word') return PS.exportWord();
        }).catch(function (e) { console.error(e); PS.toast('Export fehlgeschlagen: ' + e.message, 'error'); });
    };
})();
