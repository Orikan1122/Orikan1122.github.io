/* Problem Solving Studio – Kern: Hilfsfunktionen, Projektmodell, Speicher, Tool-Frames */
(function () {
    'use strict';
    var PS = window.PS = window.PS || {};

    /* ---------------- Hilfsfunktionen ---------------- */
    PS.$ = function (sel, root) { return (root || document).querySelector(sel); };
    PS.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    PS.esc = function (s) {
        return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };
    PS.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
    PS.today = function () { return new Date().toISOString().slice(0, 10); };
    PS.debounce = function (fn, ms) {
        var t;
        var d = function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
        d.flush = function () { clearTimeout(t); fn(); };
        return d;
    };
    PS.get = function (obj, path) {
        return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
    };
    PS.set = function (obj, path, val) {
        var keys = path.split('.');
        var last = keys.pop();
        var o = keys.reduce(function (acc, k) {
            if (acc[k] == null || typeof acc[k] !== 'object') acc[k] = {};
            return acc[k];
        }, obj);
        o[last] = val;
    };
    PS.hash = function (str) {
        var h = 5381;
        for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        return String(h) + ':' + str.length;
    };
    PS.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
    PS.num = function (v, min, max, dflt) {
        var n = Math.round(Number(v));
        if (!isFinite(n)) return dflt;
        return Math.min(max, Math.max(min, n));
    };
    PS.download = function (name, data, mime) {
        var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    };
    PS.copy = function (text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); }
            catch (e) { reject(e); } finally { ta.remove(); }
        });
    };
    PS.safeName = function (s) {
        return String(s || 'projekt').normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'projekt';
    };

    var toastTimer;
    PS.toast = function (msg, type) {
        var el = PS.$('#toast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'toast show' + (type ? ' ' + type : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('show'); }, type === 'error' ? 5000 : 2600);
    };

    /* ---------------- Projektmodell ---------------- */
    PS.FISH_KEYS = ['people', 'machine', 'method', 'material', 'measurement', 'environment'];

    PS.newProject = function (name) {
        return PS.normalize({ id: PS.uid(), name: name || 'Neues Projekt', created: Date.now(), updated: Date.now() });
    };

    // Ergänzt fehlende Felder (für neue, importierte und ältere Projekte)
    PS.normalize = function (p) {
        p = p && typeof p === 'object' ? p : {};
        p.id = p.id || PS.uid();
        p.name = p.name || 'Neues Projekt';
        p.created = p.created || Date.now();
        p.updated = p.updated || Date.now();
        p.meta = Object.assign({ title: '', subtitle: '', author: '', organization: '', date: PS.today(), version: '1.0', language: 'de' }, p.meta);
        p.problem = Object.assign({ statement: '', context: '', impact: '', goal: '', scopeIn: '', scopeOut: '', stakeholders: '', team: [], kpis: [] }, p.problem);
        p.process = Object.assign({ steps: [] }, p.process);
        p.causes = Object.assign({ whys: [''], fishbone: {}, rootCause: '' }, p.causes);
        PS.FISH_KEYS.forEach(function (k) {
            if (!Array.isArray(p.causes.fishbone[k])) p.causes.fishbone[k] = [];
        });
        if (!Array.isArray(p.causes.whys) || !p.causes.whys.length) p.causes.whys = [''];
        p.conclusion = Object.assign({ summary: '', recommendations: [], decision: '', lessons: '', nextSteps: [], assumptions: [], openQuestions: [] }, p.conclusion);
        p.tools = p.tools && typeof p.tools === 'object' ? p.tools : {};
        if (p.tools.risk) PS.migrateRisk(p.tools.risk);
        p.snapshots = p.snapshots && typeof p.snapshots === 'object' ? p.snapshots : {};
        p.report = Object.assign({ off: [], order: null }, p.report);
        return p;
    };

    // Ältere Risiko-Stände kannten nur 1 (niedrig) und 2 (hoch): niedrig -> 2, hoch -> 4 auf der 1-5-Skala
    PS.migrateRisk = function (st) {
        if (!st || st.scale === 5 || !Array.isArray(st.steps)) return st;
        st.steps.forEach(function (step) {
            Object.keys(step.risks || {}).forEach(function (k) {
                var r = step.risks[k];
                r.likelihood = r.likelihood >= 2 ? 4 : 2;
                r.severity = r.severity >= 2 ? 4 : 2;
            });
        });
        st.scale = 5;
        return st;
    };

    PS.project = null;

    /* ---------------- Speicher (IndexedDB mit localStorage-Ersatz) ---------------- */
    var DB_NAME = 'st-studio', STORE = 'projects', LS_KEY = 'st-studio-projects';
    var dbPromise = null;

    function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise(function (resolve) {
            if (!window.indexedDB) return resolve(null);
            var req;
            try { req = indexedDB.open(DB_NAME, 1); } catch (e) { return resolve(null); }
            req.onupgradeneeded = function () { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { resolve(null); };
            req.onblocked = function () { resolve(null); };
        });
        return dbPromise;
    }
    function tx(db, mode, fn) {
        return new Promise(function (resolve, reject) {
            var t = db.transaction(STORE, mode);
            var store = t.objectStore(STORE);
            var out = fn(store);
            t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
            t.onerror = function () { reject(t.error); };
            t.onabort = function () { reject(t.error); };
        });
    }
    function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; } }
    function lsWrite(map) { localStorage.setItem(LS_KEY, JSON.stringify(map)); }

    PS.store = {
        list: function () {
            return openDb().then(function (db) {
                if (!db) return Object.keys(lsRead()).map(function (k) { return lsRead()[k]; });
                return tx(db, 'readonly', function (s) { return s.getAll(); });
            }).then(function (rows) { return rows || []; });
        },
        get: function (id) {
            return openDb().then(function (db) {
                if (!db) return lsRead()[id] || null;
                return tx(db, 'readonly', function (s) { return s.get(id); });
            });
        },
        put: function (p) {
            return openDb().then(function (db) {
                if (!db) { var m = lsRead(); m[p.id] = p; lsWrite(m); return; }
                return tx(db, 'readwrite', function (s) { return s.put(p); });
            });
        },
        del: function (id) {
            return openDb().then(function (db) {
                if (!db) { var m = lsRead(); delete m[id]; lsWrite(m); return; }
                return tx(db, 'readwrite', function (s) { return s['delete'](id); });
            });
        }
    };

    /* ---------------- Speichern des aktuellen Projekts ---------------- */
    var saveListeners = [];
    PS.onSaved = function (fn) { saveListeners.push(fn); };
    var changeListeners = [];
    PS.onChange = function (fn) { changeListeners.push(fn); };

    var doSave = function () {
        var p = PS.project;
        if (!p) return Promise.resolve();
        p.updated = Date.now();
        return PS.store.put(p).then(function () {
            saveListeners.forEach(function (fn) { fn(true); });
        }, function (e) {
            console.error('Speichern fehlgeschlagen', e);
            saveListeners.forEach(function (fn) { fn(false, e); });
        });
    };
    var debouncedSave = PS.debounce(doSave, 700);
    PS.touch = function () {
        saveListeners.forEach(function (fn) { fn('pending'); });
        changeListeners.forEach(function (fn) { fn(); });
        debouncedSave();
    };
    PS.saveNow = function () { return doSave(); };
    window.addEventListener('pagehide', function () { debouncedSave.flush(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) debouncedSave.flush(); });

    /* ---------------- Tool-Frames (bestehende Tools im Studio) ---------------- */
    PS.TOOLS = {
        swot: { title: 'SWOT', path: '../SWOT%20Analysis/index.html', empty: [] },
        risk: { title: 'Risiko', path: '../Risk%20Analysis/index.html', empty: { scale: 5, steps: [] } },
        flow: { title: 'Prozesskarte', path: '../Process%20Flow%20Map/index.html', empty: { symbols: [] } },
        actions: { title: 'Maßnahmen', path: '../Action%20tracker%20/index.html', empty: {} },
        pdf: { title: 'Dokumente', path: '../PDF%20to%20Text/index.html', empty: { fileName: '', data: null } }
    };
    PS.frames = {};
    var pending = {};
    var reqSeq = 0;

    function currentTheme() {
        return document.documentElement.getAttribute('data-theme') ||
            (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    function postTo(tool, msg) {
        var f = PS.frames[tool];
        if (!f || !f.el.contentWindow) return;
        msg.st = 1;
        f.el.contentWindow.postMessage(msg, location.origin === 'null' ? '*' : location.origin);
    }

    PS.ensureFrame = function (tool) {
        var f = PS.frames[tool];
        if (f) return f;
        var def = PS.TOOLS[tool];
        var el = document.createElement('iframe');
        el.className = 'tool-frame';
        el.title = def.title;
        el.setAttribute('loading', 'eager');
        f = PS.frames[tool] = { el: el, isReady: false };
        f.ready = new Promise(function (resolve) { f.resolveReady = resolve; });
        PS.$('#frameStack').appendChild(el);
        el.src = def.path;
        return f;
    };

    // Schickt den Projektzustand an ein geladenes Tool (leerer Zustand, wenn das Projekt nichts hat)
    PS.pushState = function (tool) {
        var f = PS.frames[tool];
        if (!f || !f.isReady) return;
        var st = PS.project && PS.project.tools[tool];
        postTo(tool, { type: 'load', state: st !== undefined ? st : PS.clone(PS.TOOLS[tool].empty) });
    };
    PS.pushAll = function () { Object.keys(PS.frames).forEach(PS.pushState); };
    PS.pushTheme = function () {
        Object.keys(PS.frames).forEach(function (t) { if (PS.frames[t].isReady) postTo(t, { type: 'theme', theme: currentTheme() }); });
    };

    var toolListeners = [];
    PS.onToolState = function (fn) { toolListeners.push(fn); };

    window.addEventListener('message', function (ev) {
        var m = ev.data;
        if (!m || m.st !== 1 || !PS.project) return;
        if (location.origin !== 'null' && ev.origin !== location.origin) return;
        var f = PS.frames[m.tool];
        if (!f || ev.source !== f.el.contentWindow) return;
        if (m.type === 'ready') {
            f.isReady = true;
            postTo(m.tool, { type: 'theme', theme: currentTheme() });
            PS.pushState(m.tool);
            f.resolveReady();
        } else if (m.type === 'state') {
            if (m.reqId && pending[m.reqId]) { pending[m.reqId](m.state); delete pending[m.reqId]; return; }
            PS.project.tools[m.tool] = m.state;
            PS.touch();
            toolListeners.forEach(function (fn) { fn(m.tool); });
        } else if (m.type === 'snapshot') {
            if (m.reqId && pending[m.reqId]) { pending[m.reqId](m.images); delete pending[m.reqId]; }
        }
    });

    function request(tool, type, timeout) {
        var f = PS.ensureFrame(tool);
        return f.ready.then(function () {
            return new Promise(function (resolve) {
                var id = 'r' + (++reqSeq);
                var timer = setTimeout(function () { delete pending[id]; resolve(null); }, timeout || 8000);
                pending[id] = function (v) { clearTimeout(timer); resolve(v); };
                postTo(tool, { type: type, reqId: id });
            });
        });
    }

    // Holt Bilder (Matrix, Karte, Diagramm) für den Report; nur wenn sich der Zustand geändert hat
    PS.refreshSnapshots = function () {
        var p = PS.project;
        var jobs = [];
        [['actions', function (s) { return s && s.ideas && s.ideas.length; }],
         ['flow', function (s) { return s && s.backgroundImageData; }],
         ['risk', function (s) { return s && s.steps && s.steps.some(function (st) { return Object.keys(st.risks || {}).some(function (k) { return st.risks[k].mitigationPlan; }); }); }]
        ].forEach(function (pair) {
            var tool = pair[0], st = p.tools[tool];
            if (!pair[1](st)) { delete p.snapshots[tool]; delete p.snapshots[tool + 'Sig']; return; }
            var sig = PS.hash(JSON.stringify(st));
            if (p.snapshots[tool] && p.snapshots[tool + 'Sig'] === sig) return;
            jobs.push(request(tool, 'snapshot', 12000).then(function (images) {
                if (images) { p.snapshots[tool] = images; p.snapshots[tool + 'Sig'] = sig; }
            }));
        });
        return Promise.all(jobs).then(function () { if (jobs.length) PS.touch(); });
    };

    // Schaltet alle Frames auf das aktuell geöffnete Projekt um
    PS.resetFrames = function () { PS.pushAll(); };
})();
