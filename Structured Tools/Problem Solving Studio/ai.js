/* Problem Solving Studio – KI-Assistent: Anleitung/Prompt, Import von KI-Ergebnissen, Export im KI-Format */
(function () {
    'use strict';
    var PS = window.PS;
    var esc = PS.esc;
    var SCHEMA = 'structured-problem-solving/v1';
    var RISK_CATS = ['quality', 'foodSafety', 'environment', 'hs'];
    var STATUS_ACTION = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
    var CAT_COLORS = ['#3498db', '#e67e22', '#2ecc71', '#9b59b6', '#e74c3c', '#1abc9c', '#f1c40f', '#34495e'];

    PS.ACTION_DEFAULTS = function () {
        return {
            axisLabels: { x: 'Cost', y: 'Effectiveness' },
            categories: [{ id: Date.now(), name: 'General', color: '#cccccc' }],
            ideas: [],
            ratingZones: [
                { name: 'Low Priority', xMin: 1, xMax: 5, yMin: 1, yMax: 5, color: 'rgba(255, 204, 204, 0.2)' },
                { name: 'Re-evaluate', xMin: 6, xMax: 10, yMin: 1, yMax: 5, color: 'rgba(255, 230, 204, 0.2)' },
                { name: 'Quick Wins', xMin: 1, xMax: 5, yMin: 6, yMax: 10, color: 'rgba(204, 255, 204, 0.25)' },
                { name: 'Strategic', xMin: 6, xMax: 10, yMin: 6, yMax: 10, color: 'rgba(204, 230, 255, 0.2)' }
            ]
        };
    };

    /* ---------------- JSON aus Chat-Antwort lesen ---------------- */
    PS.parseAiText = function (text) {
        text = String(text || '').trim();
        if (!text) return { error: 'Das Eingabefeld ist leer.' };
        var cands = [], re = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/g, m;
        while ((m = re.exec(text))) cands.push(m[1].trim());
        var pick = cands.filter(function (c) { return c.indexOf('structured-problem-solving') >= 0; })[0] || cands[0];
        var body = pick || text;
        var a = body.indexOf('{'), b = body.lastIndexOf('}');
        if (a < 0 || b <= a) return { error: 'Kein JSON gefunden. Kopiere die komplette Antwort der KI oder den json-Codeblock.' };
        body = body.slice(a, b + 1);
        var attempts = [body,
            body.replace(/^\s*\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1'),
            body.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')];
        var lastErr = null;
        for (var i = 0; i < attempts.length; i++) {
            try { return { obj: JSON.parse(attempts[i]) }; } catch (e) { lastErr = e; }
        }
        return { error: 'Das JSON ist ungültig: ' + lastErr.message };
    };

    /* ---------------- Prüfen und vereinheitlichen ---------------- */
    function str(v) { return v == null ? '' : String(v).trim(); }
    function strList(v) { return Array.isArray(v) ? v.map(str).filter(Boolean) : (str(v) ? [str(v)] : []); }
    function two(v, w, label) {
        // 1/2-Skala; Wörter und größere Zahlen werden abgebildet
        var s = String(v).toLowerCase();
        if (/^(2|high|hoch|h)$/.test(s)) return 2;
        if (/^(1|low|niedrig|gering|l)$/.test(s)) return 1;
        var n = Number(v);
        if (isFinite(n)) { if (n > 2) w.push(label + ' ' + n + ' wurde auf 2 (hoch) gesetzt.'); return n >= 2 ? 2 : 1; }
        w.push(label + ' „' + v + '“ nicht erkannt, 1 (niedrig) verwendet.');
        return 1;
    }
    var CONF = { confirmed: 'confirmed', belegt: 'confirmed', bestätigt: 'confirmed', speculative: 'speculative', vermutet: 'speculative', spekulativ: 'speculative' };
    var TIME = { 'short-term': 'short-term', kurzfristig: 'short-term', 'medium-term': 'medium-term', mittelfristig: 'medium-term', 'long-term': 'long-term', langfristig: 'long-term' };
    var ACT_STATUS = { 'not started': 'Not Started', 'nicht begonnen': 'Not Started', offen: 'Not Started', 'in progress': 'In Progress', 'in arbeit': 'In Progress', completed: 'Completed', erledigt: 'Completed', abgeschlossen: 'Completed', 'on hold': 'On Hold', pausiert: 'On Hold' };
    var STEP_STATUS = { 'not started': 'Offen', offen: 'Offen', 'in progress': 'In Arbeit', 'in arbeit': 'In Arbeit', completed: 'Erledigt', erledigt: 'Erledigt', 'on hold': 'Pausiert', pausiert: 'Pausiert' };
    var CAT_ALIAS = { quality: 'quality', qualität: 'quality', qualitaet: 'quality', foodsafety: 'foodSafety', 'food safety': 'foodSafety', lebensmittelsicherheit: 'foodSafety', environment: 'environment', umwelt: 'environment', hs: 'hs', 'health & safety': 'hs', arbeitssicherheit: 'hs', sicherheit: 'hs', 'health and safety': 'hs' };

    PS.analyzeAi = function (obj) {
        var err = [], warn = [], N = {};
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { errors: ['Die Antwort ist kein JSON-Objekt.'], warnings: [], data: null, counts: {} };
        if (!obj.schema) warn.push('Feld „schema“ fehlt – das Ergebnis wird trotzdem nach Schema v1 gelesen.');
        else if (String(obj.schema).indexOf('structured-problem-solving/') !== 0) err.push('Unbekanntes Schema „' + obj.schema + '“. Erwartet: ' + SCHEMA + '.');
        else if (obj.schema !== SCHEMA) warn.push('Schema-Version „' + obj.schema + '“ weicht von ' + SCHEMA + ' ab.');
        var known = ['schema', 'language', 'meta', 'problem', 'process', 'causes', 'swot', 'risks', 'actions', 'conclusion', 'assumptions', 'openQuestions'];
        Object.keys(obj).forEach(function (k) { if (known.indexOf(k) < 0) warn.push('Unbekanntes Feld „' + k + '“ wird ignoriert.'); });

        if (obj.language) N.language = String(obj.language).toLowerCase().indexOf('en') === 0 ? 'en' : 'de';
        if (obj.meta && typeof obj.meta === 'object') {
            N.meta = {};
            ['title', 'subtitle', 'author', 'organization', 'date', 'version'].forEach(function (k) { if (str(obj.meta[k])) N.meta[k] = str(obj.meta[k]); });
        }
        if (obj.problem && typeof obj.problem === 'object') {
            var pr = obj.problem;
            N.problem = {};
            ['statement', 'context', 'impact', 'goal', 'scopeIn', 'scopeOut', 'stakeholders'].forEach(function (k) {
                if (Array.isArray(pr[k])) pr[k] = pr[k].join('\n');
                if (str(pr[k])) N.problem[k] = str(pr[k]);
            });
            N.problem.team = (Array.isArray(pr.team) ? pr.team : []).map(function (m) { return typeof m === 'string' ? { name: m, role: '' } : { name: str(m.name), role: str(m.role) }; }).filter(function (m) { return m.name; });
            N.problem.kpis = (Array.isArray(pr.kpis) ? pr.kpis : []).map(function (k) { return { name: str(k.name), current: str(k.current), target: str(k.target), unit: str(k.unit) }; }).filter(function (k) { return k.name; });
            if (!N.problem.statement) warn.push('problem.statement fehlt.');
        }
        if (Array.isArray(obj.process)) {
            N.process = obj.process.map(function (s) { return typeof s === 'string' ? { name: s, description: '', owner: '' } : { name: str(s.name), description: str(s.description), owner: str(s.owner) }; }).filter(function (s) { return s.name || s.description; });
        }
        if (obj.causes && typeof obj.causes === 'object') {
            N.causes = { whys: strList(obj.causes.whys), fishbone: {}, rootCause: str(obj.causes.rootCause) };
            var fb = obj.causes.fishbone || {};
            PS.FISH_KEYS.forEach(function (k) { N.causes.fishbone[k] = strList(fb[k]); });
            Object.keys(fb).forEach(function (k) { if (PS.FISH_KEYS.indexOf(k) < 0) warn.push('Unbekannte Fishbone-Kategorie „' + k + '“ ignoriert (erlaubt: ' + PS.FISH_KEYS.join(', ') + ').'); });
        }
        if (obj.swot && typeof obj.swot === 'object') {
            N.swot = {};
            ['strengths', 'weaknesses', 'opportunities', 'threats'].forEach(function (q) {
                N.swot[q] = (Array.isArray(obj.swot[q]) ? obj.swot[q] : []).map(function (n) {
                    if (typeof n === 'string') n = { title: n };
                    var impact = PS.num(n.impact, 1, 5, 3);
                    if (n.impact !== undefined && Number(n.impact) !== impact) warn.push('SWOT „' + str(n.title) + '“: impact auf ' + impact + ' korrigiert (1–5).');
                    var conf = CONF[str(n.confidence).toLowerCase()] || 'confirmed';
                    var time = TIME[str(n.timeframe).toLowerCase()] || 'medium-term';
                    return { title: str(n.title) || 'Ohne Titel', details: str(n.details), impact: impact, confidence: conf, timeframe: time, stakeholders: str(n.stakeholders) };
                });
            });
        }
        if (Array.isArray(obj.risks)) {
            N.risks = obj.risks.map(function (s, i) {
                var step = { current: str(s.current), future: str(s.future), change: str(s.change), risks: [] };
                (Array.isArray(s.risks) ? s.risks : []).forEach(function (r) {
                    var cat = CAT_ALIAS[str(r.category).toLowerCase()];
                    if (!cat) { warn.push('Risiko in Schritt ' + (i + 1) + ': Kategorie „' + str(r.category) + '“ unbekannt, Eintrag übersprungen (erlaubt: ' + RISK_CATS.join(', ') + ').'); return; }
                    var L = two(r.likelihood == null ? 1 : r.likelihood, warn, 'likelihood'), S = two(r.severity == null ? 1 : r.severity, warn, 'severity');
                    var rk = { category: cat, description: str(r.description), likelihood: L, severity: S };
                    if (r.mitigation && str(r.mitigation.plan)) {
                        if (L > 1 || S > 1) rk.mitigation = { plan: str(r.mitigation.plan), impact: two(r.mitigation.impact == null ? 2 : r.mitigation.impact, warn, 'impact'), effort: two(r.mitigation.effort == null ? 1 : r.mitigation.effort, warn, 'effort') };
                        else warn.push('Maßnahme „' + str(r.mitigation.plan) + '“ übersprungen: Das Risiko hat Wahrscheinlichkeit und Schwere 1 (Maßnahmen gibt es nur ab 2).');
                    }
                    step.risks.push(rk);
                });
                return step;
            });
        }
        if (Array.isArray(obj.actions)) {
            N.actions = obj.actions.map(function (a) {
                if (typeof a === 'string') a = { title: a };
                var x = PS.num(a.x, 1, 10, 5), y = PS.num(a.y, 1, 10, 5);
                if ((a.x !== undefined && Number(a.x) !== x) || (a.y !== undefined && Number(a.y) !== y)) warn.push('Maßnahme „' + str(a.title) + '“: x/y auf 1–10 korrigiert.');
                var status = ACT_STATUS[str(a.status).toLowerCase()];
                if (a.status && !status) warn.push('Maßnahme „' + str(a.title) + '“: Status „' + a.status + '“ unbekannt, „Not Started“ verwendet.');
                return { title: str(a.title), description: str(a.description), category: str(a.category), location: str(a.location), x: x, y: y, status: status || 'Not Started', owner: str(a.owner), due: str(a.due) };
            }).filter(function (a) { return a.title; });
        }
        if (obj.conclusion && typeof obj.conclusion === 'object') {
            var c = obj.conclusion;
            N.conclusion = { summary: str(c.summary), decision: str(c.decision), lessons: str(c.lessons), recommendations: strList(c.recommendations),
                nextSteps: (Array.isArray(c.nextSteps) ? c.nextSteps : []).map(function (s) {
                    if (typeof s === 'string') s = { action: s };
                    return { action: str(s.action), owner: str(s.owner), due: str(s.due), status: STEP_STATUS[str(s.status).toLowerCase()] || 'Offen' };
                }).filter(function (s) { return s.action; }) };
        }
        if (obj.assumptions) N.assumptions = strList(obj.assumptions);
        if (obj.openQuestions) N.openQuestions = strList(obj.openQuestions);

        var counts = {
            'Problem': N.problem ? 1 : 0, 'Prozessschritte': (N.process || []).length,
            'Warum-Ebenen': N.causes ? N.causes.whys.length : 0,
            'Einflüsse (Ishikawa)': N.causes ? PS.FISH_KEYS.reduce(function (a, k) { return a + N.causes.fishbone[k].length; }, 0) : 0,
            'SWOT-Notizen': N.swot ? ['strengths', 'weaknesses', 'opportunities', 'threats'].reduce(function (a, q) { return a + N.swot[q].length; }, 0) : 0,
            'Risiken': N.risks ? N.risks.reduce(function (a, s) { return a + s.risks.length; }, 0) : 0,
            'Maßnahmen (Matrix)': (N.actions || []).length,
            'Empfehlungen': N.conclusion ? N.conclusion.recommendations.length : 0,
            'Nächste Schritte': N.conclusion ? N.conclusion.nextSteps.length : 0
        };
        var total = Object.keys(counts).reduce(function (a, k) { return a + counts[k]; }, 0);
        if (!err.length && !total && !(N.meta || N.conclusion)) err.push('Das JSON enthält keine importierbaren Inhalte.');
        return { errors: err, warnings: warn, data: N, counts: counts };
    };

    /* ---------------- In das Projekt übernehmen ---------------- */
    function uniqAppend(target, items, keyFn) {
        var seen = {};
        target.forEach(function (t) { seen[keyFn(t)] = 1; });
        items.forEach(function (i) { if (!seen[keyFn(i)]) { target.push(i); seen[keyFn(i)] = 1; } });
    }
    function riskStepState(s, id) {
        var risks = {}, notes = [];
        RISK_CATS.forEach(function (c) { risks[c] = { isChecked: false, description: '', likelihood: 1, severity: 1 }; });
        s.risks.forEach(function (r) {
            var t = risks[r.category];
            if (t.isChecked) {
                t.description = [t.description, r.description].filter(Boolean).join('; ');
                t.likelihood = Math.max(t.likelihood, r.likelihood);
                t.severity = Math.max(t.severity, r.severity);
            } else {
                t.isChecked = true; t.description = r.description; t.likelihood = r.likelihood; t.severity = r.severity;
            }
            if (r.mitigation) {
                t.mitigationPlan = [t.mitigationPlan, r.mitigation.plan].filter(Boolean).join('; ');
                t.mitigationImpact = Math.max(t.mitigationImpact || 1, r.mitigation.impact);
                t.mitigationEffort = Math.max(t.mitigationEffort || 1, r.mitigation.effort);
            }
        });
        return { id: String(id), current: s.current, future: s.future, change: s.change, risks: risks };
    }

    PS.applyAi = function (N, mode) {
        var p = PS.project, replace = mode === 'replace', applied = [];
        function setStr(obj, key, val) { if (val === undefined || val === '') return; if (replace || !String(obj[key] || '').trim()) obj[key] = val; }
        function setList(arr, items, keyFn) {
            if (replace) { arr.length = 0; items.forEach(function (i) { arr.push(i); }); } else uniqAppend(arr, items, keyFn);
        }

        if (N.language) p.meta.language = N.language;
        if (N.meta) Object.keys(N.meta).forEach(function (k) { setStr(p.meta, k, N.meta[k]); });
        if (N.problem) {
            ['statement', 'context', 'impact', 'goal', 'scopeIn', 'scopeOut', 'stakeholders'].forEach(function (k) { setStr(p.problem, k, N.problem[k]); });
            setList(p.problem.team, N.problem.team, function (m) { return m.name.toLowerCase(); });
            setList(p.problem.kpis, N.problem.kpis, function (k) { return k.name.toLowerCase(); });
            applied.push('Problem');
        }
        if (N.process && N.process.length) { setList(p.process.steps, N.process, function (s) { return (s.name + s.description).toLowerCase(); }); applied.push('Prozess'); }
        if (N.causes) {
            var whys = p.causes.whys.filter(function (w) { return w.trim(); });
            if (N.causes.whys.length) {
                if (replace || !whys.length) p.causes.whys = N.causes.whys.slice(); else { uniqAppend(whys, N.causes.whys, function (w) { return w.toLowerCase(); }); p.causes.whys = whys; }
            }
            PS.FISH_KEYS.forEach(function (k) { setList(p.causes.fishbone[k], N.causes.fishbone[k], function (s) { return s.toLowerCase(); }); });
            setStr(p.causes, 'rootCause', N.causes.rootCause);
            if (!p.causes.whys.length) p.causes.whys = [''];
            applied.push('Ursachen');
        }
        if (N.swot) {
            var notes = [], stamp = Date.now();
            Object.keys(N.swot).forEach(function (q) {
                N.swot[q].forEach(function (n, i) {
                    notes.push({ id: 'note-' + (stamp + notes.length) + '-' + Math.random().toString(16).slice(2, 8), title: n.title, details: n.details, impact: String(n.impact),
                        confidence: n.confidence, timeframe: n.timeframe, stakeholders: n.stakeholders, quadrantId: q });
                });
            });
            if (notes.length) {
                var old = Array.isArray(p.tools.swot) && !replace ? p.tools.swot : [];
                var have = {};
                old.forEach(function (n) { have[n.quadrantId + '|' + String(n.title).toLowerCase()] = 1; });
                p.tools.swot = old.concat(notes.filter(function (n) { return !have[n.quadrantId + '|' + n.title.toLowerCase()]; }));
                applied.push('SWOT');
            }
        }
        if (N.risks && N.risks.length) {
            var oldSteps = p.tools.risk && Array.isArray(p.tools.risk.steps) && !replace ? p.tools.risk.steps : [];
            var steps = oldSteps.slice();
            N.risks.forEach(function (s) { steps.push(riskStepState(s, steps.length + 1)); });
            steps.forEach(function (s, i) { s.id = String(i + 1); });
            p.tools.risk = { steps: steps };
            applied.push('Risiken');
        }
        if (N.actions && N.actions.length) {
            var base = p.tools.actions && p.tools.actions.ideas && !replace ? PS.clone(p.tools.actions) : PS.ACTION_DEFAULTS();
            if (replace && p.tools.actions) { var keep = PS.clone(p.tools.actions); base.axisLabels = keep.axisLabels || base.axisLabels; base.ratingZones = keep.ratingZones || base.ratingZones; base.categories = keep.categories && keep.categories.length ? keep.categories : base.categories; }
            var idBase = Date.now();
            N.actions.forEach(function (a, i) {
                var cat = null, name = a.category.toLowerCase();
                if (a.category) {
                    base.categories.forEach(function (c) { if (String(c.name).toLowerCase() === name) cat = c; });
                    if (!cat) { cat = { id: idBase + 1000 + base.categories.length, name: a.category, color: CAT_COLORS[base.categories.length % CAT_COLORS.length] }; base.categories.push(cat); }
                } else cat = base.categories[0];
                var desc = [a.description, a.owner ? 'Verantwortlich: ' + a.owner : '', a.due ? 'Fällig: ' + a.due : ''].filter(Boolean).join(' · ');
                var dup = base.ideas.some(function (x) { return String(x.title).toLowerCase() === a.title.toLowerCase(); });
                if (!dup) base.ideas.push({ id: idBase + i, title: a.title, location: a.location, description: desc, categoryId: cat.id, x: a.x, y: a.y, status: a.status });
            });
            p.tools.actions = base;
            applied.push('Maßnahmen');
        }
        if (N.conclusion) {
            var c = N.conclusion;
            ['summary', 'decision', 'lessons'].forEach(function (k) { setStr(p.conclusion, k, c[k]); });
            setList(p.conclusion.recommendations, c.recommendations, function (s) { return s.toLowerCase(); });
            setList(p.conclusion.nextSteps, c.nextSteps, function (s) { return s.action.toLowerCase(); });
            applied.push('Fazit');
        }
        if (N.assumptions) setList(p.conclusion.assumptions, N.assumptions, function (s) { return s.toLowerCase(); });
        if (N.openQuestions) setList(p.conclusion.openQuestions, N.openQuestions, function (s) { return s.toLowerCase(); });
        PS.pushAll();
        PS.touch();
        return applied;
    };

    /* ---------------- Projekt -> KI-Format (Rückrichtung) ---------------- */
    PS.toAiJson = function () {
        var p = PS.project, out = { schema: SCHEMA, language: p.meta.language };
        var m = {}; ['title', 'subtitle', 'author', 'organization', 'date', 'version'].forEach(function (k) { if (p.meta[k]) m[k] = p.meta[k]; });
        out.meta = m;
        out.problem = PS.clone(p.problem);
        if (p.process.steps.length) out.process = PS.clone(p.process.steps);
        out.causes = { whys: p.causes.whys.filter(Boolean), fishbone: PS.clone(p.causes.fishbone), rootCause: p.causes.rootCause };
        if (Array.isArray(p.tools.swot) && p.tools.swot.length) {
            out.swot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
            p.tools.swot.forEach(function (n) {
                if (out.swot[n.quadrantId]) out.swot[n.quadrantId].push({ title: n.title, details: n.details, impact: Number(n.impact) || 3, confidence: n.confidence, timeframe: n.timeframe, stakeholders: n.stakeholders });
            });
        }
        var rs = p.tools.risk;
        if (rs && Array.isArray(rs.steps) && rs.steps.length) {
            out.risks = rs.steps.map(function (s) {
                var list = [];
                RISK_CATS.forEach(function (c) {
                    var r = (s.risks || {})[c];
                    if (r && r.isChecked) {
                        var o = { category: c, description: r.description, likelihood: r.likelihood, severity: r.severity };
                        if (r.mitigationPlan) o.mitigation = { plan: r.mitigationPlan, impact: r.mitigationImpact || 1, effort: r.mitigationEffort || 1 };
                        list.push(o);
                    }
                });
                return { current: s.current, future: s.future, change: s.change, risks: list };
            });
        }
        var rows = PS.ideaRows();
        if (rows.length) out.actions = rows.map(function (r) { return { title: r.title, description: r.description, category: r.category, location: r.location, x: r.x, y: r.y, status: r.status }; });
        out.conclusion = { summary: p.conclusion.summary, recommendations: p.conclusion.recommendations.filter(Boolean), decision: p.conclusion.decision, lessons: p.conclusion.lessons, nextSteps: PS.clone(p.conclusion.nextSteps) };
        out.assumptions = p.conclusion.assumptions.filter(Boolean);
        out.openQuestions = p.conclusion.openQuestions.filter(Boolean);
        return out;
    };

    /* ---------------- Beispiel ---------------- */
    PS.EXAMPLE_AI = {
        schema: SCHEMA, language: 'de',
        meta: { title: 'Ausschuss an Abfüllanlage 3 senken', subtitle: 'Problemlösungsbericht – Beispielprojekt', author: 'Team Produktion', organization: 'Werk Süd', date: PS.today(), version: '1.0' },
        problem: {
            statement: 'Seit Januar liegt die Ausschussquote an Abfüllanlage 3 bei 6,5 % (Soll: 2 %). Betroffen ist vor allem die Spätschicht.',
            context: 'Anlage 3 füllt 0,5-l-Flaschen mit 24.000 Stück je Schicht. Die Quote lag 2024 stabil bei 1,8 %. Seit dem Formatwechsel im Dezember steigt sie.',
            impact: 'Rund 1.560 Flaschen Ausschuss je Schicht, ca. 38.000 € Mehrkosten pro Monat, verspätete Auslieferungen an zwei Kunden.',
            goal: 'Ausschussquote an Anlage 3 bis 30.06. dauerhaft unter 2 % senken.',
            scopeIn: 'Anlage 3, Früh-, Spät- und Nachtschicht, Wartungs- und Einstellprozesse',
            scopeOut: 'Anlagen 1 und 2, Verpackungslinie',
            stakeholders: 'Produktionsleitung, Qualitätssicherung, Instandhaltung, Einkauf',
            team: [{ name: 'A. Muster', role: 'Projektleitung' }, { name: 'B. Beispiel', role: 'Instandhaltung' }, { name: 'C. Test', role: 'Qualitätssicherung' }],
            kpis: [{ name: 'Ausschussquote', current: '6,5', target: '2,0', unit: '%' }, { name: 'Stillstandszeit', current: '95', target: '45', unit: 'min/Schicht' }]
        },
        process: [
            { name: 'Flaschen zuführen', description: 'Zuführband und Vereinzelung', owner: 'Produktion' },
            { name: 'Flaschen führen', description: 'Führungsschiene richtet Flaschen aus', owner: 'Produktion' },
            { name: 'Füllen', description: 'Füllventile dosieren 0,5 l', owner: 'Produktion' },
            { name: 'Verschließen', description: 'Kronkorken setzen', owner: 'Produktion' },
            { name: 'Kontrollieren', description: 'Kamera prüft Füllstand und Verschluss', owner: 'Qualitätssicherung' }
        ],
        causes: {
            whys: ['Weil viele Flaschen beim Füllen schräg stehen', 'Weil die Führungsschiene Spiel hat', 'Weil die Schiene verschlissen ist', 'Weil es keine Verschleißgrenze im Wartungsplan gibt'],
            fishbone: {
                people: ['Einstellungen unterscheiden sich je Schicht', 'Neue Mitarbeitende ohne Einweisung'],
                machine: ['Verschleiß Führungsschiene', 'Füllventil 4 tropft'],
                method: ['Keine Verschleißgrenze im Wartungsplan', 'Formatwechsel ohne Checkliste'],
                material: ['Neue Flaschencharge mit größerer Toleranz'],
                measurement: ['Kamera-Schwellwert zu streng eingestellt'],
                environment: ['Hohe Hallentemperatur im Sommer']
            },
            rootCause: 'Die Führungsschiene wird nicht nach einer definierten Verschleißgrenze getauscht, daher stehen die Flaschen schräg und werden beim Füllen verworfen.'
        },
        swot: {
            strengths: [{ title: 'Erfahrenes Instandhaltungsteam', details: 'Kurze Reaktionszeiten', impact: 4, confidence: 'confirmed', timeframe: 'short-term', stakeholders: 'Instandhaltung' },
                { title: 'Gute Datenlage aus der Schichtstatistik', details: '', impact: 3, confidence: 'confirmed', timeframe: 'short-term', stakeholders: 'Produktion' }],
            weaknesses: [{ title: 'Kein vorbeugender Wartungsplan für Verschleißteile', details: '', impact: 5, confidence: 'confirmed', timeframe: 'short-term', stakeholders: 'Instandhaltung' },
                { title: 'Uneinheitliche Einstellung je Schicht', details: '', impact: 3, confidence: 'speculative', timeframe: 'medium-term', stakeholders: 'Produktion' }],
            opportunities: [{ title: 'Zustandsüberwachung nachrüsten', details: 'Sensoren für Spiel und Vibration', impact: 4, confidence: 'speculative', timeframe: 'long-term', stakeholders: 'Instandhaltung' }],
            threats: [{ title: 'Lieferzeit Ersatzschiene', details: 'Derzeit 6 Wochen', impact: 4, confidence: 'confirmed', timeframe: 'medium-term', stakeholders: 'Einkauf' }]
        },
        risks: [
            { current: 'Schiene wird bei Ausfall getauscht', future: 'Schiene wird nach Verschleißgrenze getauscht', change: 'Vorbeugende Instandhaltung',
              risks: [{ category: 'quality', description: 'Stillstand beim Austausch', likelihood: 2, severity: 1, mitigation: { plan: 'Austausch in geplanter Reinigungspause', impact: 2, effort: 1 } },
                  { category: 'hs', description: 'Verletzungsgefahr beim Ausbau', likelihood: 1, severity: 2, mitigation: { plan: 'Sperren und Sichern nach Verfahrensanweisung', impact: 2, effort: 1 } }] },
            { current: 'Einstellungen nach Erfahrung', future: 'Einstellung nach Checkliste', change: 'Standardisierung',
              risks: [{ category: 'quality', description: 'Falsche Checkliste führt zu Fehleinstellung', likelihood: 2, severity: 2, mitigation: { plan: 'Checkliste in Pilotschicht prüfen und freigeben', impact: 2, effort: 2 } }] }
        ],
        actions: [
            { title: 'Verschleißgrenze in Wartungsplan aufnehmen', description: 'Grenzwert festlegen, Prüfintervall wöchentlich', category: 'Instandhaltung', location: 'Anlage 3', x: 2, y: 9, status: 'In Progress', owner: 'Instandhaltung', due: '2025-06-15' },
            { title: 'Checkliste Formatwechsel einführen', description: '', category: 'Produktion', location: 'Anlage 3', x: 3, y: 7, status: 'Not Started', owner: 'Produktion', due: '2025-06-30' },
            { title: 'Ersatzschiene auf Lager legen', description: '', category: 'Einkauf', location: 'Lager', x: 4, y: 6, status: 'Not Started' },
            { title: 'Zustandsüberwachung nachrüsten', description: 'Sensorik für Spiel und Vibration', category: 'Instandhaltung', location: 'Anlage 3', x: 8, y: 8, status: 'On Hold' },
            { title: 'Kamera-Schwellwert überprüfen', description: '', category: 'Qualität', location: 'Anlage 3', x: 2, y: 4, status: 'Completed' }
        ],
        conclusion: {
            summary: 'Die Ausschussquote an Anlage 3 stieg von 1,8 % auf 6,5 %. Hauptursache ist eine verschlissene Führungsschiene, die mangels Verschleißgrenze im Wartungsplan nicht rechtzeitig getauscht wurde. Mit einem Wartungsplan, einer Formatwechsel-Checkliste und einer Ersatzschiene auf Lager lässt sich die Quote voraussichtlich unter 2 % senken und rund 38.000 € pro Monat einsparen.',
            recommendations: ['Verschleißgrenze und Prüfintervall in den Wartungsplan aufnehmen', 'Formatwechsel nach Checkliste durchführen', 'Ersatzschiene bevorraten', 'Zustandsüberwachung nach Wirksamkeitsnachweis prüfen'],
            decision: 'Die Werksleitung gibt Wartungsplan und Checkliste frei; die Zustandsüberwachung wird nach drei Monaten neu bewertet.',
            lessons: 'Verschleißteile gehören in den vorbeugenden Wartungsplan. Nach einem Formatwechsel muss die Ausschussquote eine Woche lang engmaschig beobachtet werden.',
            nextSteps: [{ action: 'Wartungsplan mit Verschleißgrenze erstellen', owner: 'Instandhaltung', due: '2025-06-15', status: 'In Arbeit' },
                { action: 'Checkliste Formatwechsel pilotieren', owner: 'Produktion', due: '2025-06-30', status: 'Offen' }]
        },
        assumptions: ['Die Kosten je Flasche stammen aus der Kalkulation des Controllings.', 'Die Spätschicht ist repräsentativ für die Ursachen.'],
        openQuestions: ['Wie hoch sind die Stillstandskosten je Stunde?', 'Wie lange ist die Lieferzeit einer Ersatzschiene bei Eilbestellung?']
    };

    /* ---------------- Ansicht ---------------- */
    function mdToHtml(md) {
        var lines = md.split('\n'), out = '', inCode = false, code = [], list = null;
        function inl(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }
        function close() { if (list) { out += '</' + list + '>'; list = null; } }
        lines.forEach(function (ln) {
            var m;
            if (/^```/.test(ln)) {
                if (inCode) { out += '<pre><code>' + esc(code.join('\n')) + '</code></pre>'; code = []; inCode = false; } else { close(); inCode = true; }
                return;
            }
            if (inCode) { code.push(ln); return; }
            if ((m = ln.match(/^(#{1,4})\s+(.*)/))) { close(); var lv = Math.min(6, m[1].length + 2); out += '<h' + lv + '>' + inl(m[2]) + '</h' + lv + '>'; }
            else if ((m = ln.match(/^\s*[-*]\s+(.*)/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += '<li>' + inl(m[1]) + '</li>'; }
            else if ((m = ln.match(/^\s*\d+\.\s+(.*)/))) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += '<li>' + inl(m[1]) + '</li>'; }
            else if (!ln.trim()) close();
            else { close(); out += '<p>' + inl(ln) + '</p>'; }
        });
        close();
        return out;
    }
    PS.mdToHtml = mdToHtml;

    PS.aiState = { tab: 'prompt', material: '', withProject: false, analysis: null, mode: 'merge', text: '' };

    PS.buildPrompt = function () {
        var s = PS.aiState, out = PS.GUIDE_MD.trim();
        out += '\n\n---\n\n# Mein Material\n\n' + (s.material.trim() || '(Hier steht mein Material. Falls nichts folgt, stelle mir zuerst deine Rückfragen.)');
        if (s.withProject) out += '\n\n---\n\n# Aktueller Projektstand (bitte ergänzen und verbessern, nicht verwerfen)\n\n```json\n' + JSON.stringify(PS.toAiJson(), null, 2) + '\n```';
        return out + '\n';
    };

    PS.views.ai = function () {
        var s = PS.aiState;
        function tab(id, label) { return '<button type="button" class="tab' + (s.tab === id ? ' on' : '') + '" data-ai-tab="' + id + '">' + label + '</button>'; }
        var body = '';
        if (s.tab === 'prompt') {
            body = '<ol class="steps">' +
                '<li><b>Prompt kopieren.</b> Er enthält die komplette Anleitung für die KI.</li>' +
                '<li><b>In die KI einfügen</b> (ChatGPT, Claude, Gemini …) und darunter dein Material anhängen: Notizen, E-Mails, Messwerte.</li>' +
                '<li><b>Antwort zurückkopieren</b> und im Reiter „Ergebnis importieren“ einfügen.</li></ol>' +
                PS.ui.card('Prompt zusammenstellen',
                    '<label class="fld"><span class="fld-l">Dein Material (optional)</span><textarea id="aiMaterial" rows="7" placeholder="Hier kannst du Notizen, Messwerte oder E-Mail-Text einfügen. Du kannst das auch direkt in der KI tun.">' + esc(s.material) + '</textarea></label>' +
                    '<label class="check"><input type="checkbox" id="aiWithProject"' + (s.withProject ? ' checked' : '') + '> Aktuellen Projektstand mitgeben (die KI ergänzt und verbessert, statt neu zu beginnen)</label>' +
                    '<div class="row-actions">' + PS.ui.btn('Prompt kopieren', 'data-ai="copy-prompt"', 'primary', 'copy') +
                    PS.ui.btn('Anleitung (.md) herunterladen', 'data-ai="dl-guide"', '', 'download') +
                    PS.ui.btn('Projektstand als JSON kopieren', 'data-ai="copy-state"', 'ghost', 'copy') + '</div>' +
                    '<p class="muted sm" id="aiPromptSize"></p>') +
                '<details class="card guide"><summary>Anleitung für die KI ansehen</summary><div class="md">' + mdToHtml(PS.GUIDE_MD) + '</div></details>';
        } else if (s.tab === 'import') {
            var a = s.analysis, res = '';
            if (a) {
                var rows = a.counts ? Object.keys(a.counts).filter(function (k) { return a.counts[k]; }).map(function (k) { return '<li><b>' + a.counts[k] + '</b> ' + esc(k) + '</li>'; }).join('') : '';
                res = '<div class="result ' + (a.errors.length ? 'bad' : 'ok') + '">' +
                    (a.errors.length ? '<b>Import nicht möglich</b><ul>' + a.errors.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>'
                        : '<b>Bereit zum Import</b><ul class="counts">' + rows + '</ul>') +
                    (a.warnings.length ? '<details open><summary>' + a.warnings.length + ' Hinweis' + (a.warnings.length > 1 ? 'e' : '') + '</summary><ul>' + a.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></details>' : '') + '</div>';
            }
            body = PS.ui.card('Ergebnis der KI einfügen',
                '<label class="fld"><span class="fld-l">Antwort der KI (JSON oder komplette Chat-Antwort)</span><textarea id="aiInput" rows="12" class="mono" placeholder="```json\n{ &quot;schema&quot;: &quot;structured-problem-solving/v1&quot;, … }\n```">' + esc(s.text) + '</textarea></label>' +
                '<div class="row-actions">' + PS.ui.btn('Prüfen', 'data-ai="check"', 'primary', 'check') + PS.ui.btn('Einfügen aus Zwischenablage', 'data-ai="paste"', 'ghost', 'copy') + '</div>' + res +
                (a && !a.errors.length ? '<fieldset class="modes"><legend>Wie soll importiert werden?</legend>' +
                    '<label class="radio"><input type="radio" name="aiMode" value="merge"' + (s.mode === 'merge' ? ' checked' : '') + '><span><b>Ergänzen</b> – bestehende Inhalte bleiben, neue werden hinzugefügt, leere Felder gefüllt.</span></label>' +
                    '<label class="radio"><input type="radio" name="aiMode" value="replace"' + (s.mode === 'replace' ? ' checked' : '') + '><span><b>Ersetzen</b> – Inhalte der importierten Abschnitte werden überschrieben.</span></label>' +
                    '<div class="row-actions">' + PS.ui.btn('Jetzt importieren', 'data-ai="apply"', 'primary', 'upload') + '</div></fieldset>' : ''));
        } else {
            body = PS.ui.card('Beispiel und Schema', '<p class="muted">Das Beispielprojekt zeigt, wie ein vollständiges Ergebnis aussieht. Du kannst es in ein <b>neues Projekt</b> laden oder als JSON ansehen.</p>' +
                '<div class="row-actions">' + PS.ui.btn('Beispiel in neues Projekt laden', 'data-act="example"', 'primary', 'plus') +
                PS.ui.btn('Beispiel-JSON kopieren', 'data-ai="copy-example"', '', 'copy') + PS.ui.btn('Beispiel-JSON herunterladen', 'data-ai="dl-example"', '', 'download') + '</div>' +
                '<pre class="code" tabindex="0"><code>' + esc(JSON.stringify(PS.EXAMPLE_AI, null, 2)) + '</code></pre>');
        }
        return '<div class="tabs">' + tab('prompt', '1 · Prompt &amp; Anleitung') + tab('import', '2 · Ergebnis importieren') + tab('example', 'Beispiel &amp; Schema') + '</div>' + body;
    };

    PS.aiHandle = function (act) {
        var s = PS.aiState;
        if (act === 'copy-prompt') {
            var t = PS.buildPrompt();
            PS.copy(t).then(function () { PS.toast('Prompt kopiert (' + Math.round(t.length / 1000) + ' k Zeichen) – jetzt in die KI einfügen'); }, function () { PS.toast('Kopieren nicht möglich – Browser blockiert die Zwischenablage', 'error'); });
        } else if (act === 'copy-state') {
            PS.copy(JSON.stringify(PS.toAiJson(), null, 2)).then(function () { PS.toast('Projektstand als JSON kopiert'); }, function () { PS.toast('Kopieren nicht möglich', 'error'); });
        } else if (act === 'dl-guide') {
            PS.download('Anleitung_KI_Report.md', PS.GUIDE_MD, 'text/markdown;charset=utf-8');
        } else if (act === 'copy-example') {
            PS.copy(JSON.stringify(PS.EXAMPLE_AI, null, 2)).then(function () { PS.toast('Beispiel kopiert'); });
        } else if (act === 'dl-example') {
            PS.download('beispiel_problemloesung.json', JSON.stringify(PS.EXAMPLE_AI, null, 2), 'application/json');
        } else if (act === 'paste') {
            if (!navigator.clipboard || !navigator.clipboard.readText) return PS.toast('Einfügen per Knopf wird vom Browser nicht unterstützt – nutze Strg+V.', 'error');
            navigator.clipboard.readText().then(function (t) { s.text = t; PS.render(); }, function () { PS.toast('Zugriff auf die Zwischenablage verweigert – nutze Strg+V.', 'error'); });
        } else if (act === 'check') {
            var ta = PS.$('#aiInput'); if (ta) s.text = ta.value;
            var r = PS.parseAiText(s.text);
            s.analysis = r.error ? { errors: [r.error], warnings: [], counts: {}, data: null } : PS.analyzeAi(r.obj);
            PS.render();
        } else if (act === 'apply') {
            if (!s.analysis || s.analysis.errors.length) return;
            var applied = PS.applyAi(s.analysis.data, s.mode);
            s.analysis = null; s.text = '';
            PS.toast('Importiert: ' + applied.join(', '));
            PS.go('home');
        }
    };
})();
