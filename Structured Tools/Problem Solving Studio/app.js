/* Problem Solving Studio – App: Navigation, Projekte, Ereignisse, Start */
(function () {
    'use strict';
    var PS = window.PS;
    var $ = PS.$, esc = PS.esc;

    PS.current = 'home';
    PS.tabState = {};

    /* ---------------- Theme ---------------- */
    function curTheme() {
        return document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    function renderThemeBtn() {
        var dark = curTheme() === 'dark';
        $('#themeBtn').innerHTML = PS.icon(dark ? 'sun' : 'moon', 18);
        $('#themeBtn').title = dark ? 'Helles Design' : 'Dunkles Design';
        $('#themeBtn').setAttribute('aria-label', $('#themeBtn').title);
    }
    function toggleTheme() {
        var next = curTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('st-theme', next); } catch (e) { /* ignore */ }
        renderThemeBtn();
        PS.pushTheme();
    }

    /* ---------------- Navigation ---------------- */
    function renderNav() {
        var html = '', lastGroup = '__';
        PS.MODULES.forEach(function (m) {
            if (m.group !== lastGroup) {
                if (m.group) html += '<div class="nav-group">' + m.group + '</div>';
                else if (lastGroup !== '__') html += '<div class="nav-sep"></div>';
                lastGroup = m.group;
            }
            html += '<button type="button" class="nav-item' + (PS.current === m.id ? ' on' : '') + '" data-go="' + m.id + '"' + (PS.current === m.id ? ' aria-current="page"' : '') + '>' +
                '<span class="ni">' + PS.icon(m.icon, 19) + '</span><span class="nl">' + m.label + '</span><span class="ns" data-ns="' + m.id + '"></span></button>';
        });
        $('#nav').innerHTML = html;
        updateNavStatus();
    }
    function updateNavStatus() {
        if (!PS.project) return;
        PS.$$('[data-ns]').forEach(function (el) {
            var id = el.getAttribute('data-ns');
            if (['home', 'report', 'ai'].indexOf(id) >= 0) { el.innerHTML = ''; return; }
            var s = PS.status(id), pct = s.pct;
            el.className = 'ns ' + (id === 'docs' ? (pct ? 'done' : '') : pct >= 0.8 ? 'done' : pct > 0 ? 'wip' : '');
            el.innerHTML = pct >= 0.8 || (id === 'docs' && pct) ? PS.icon('check', 12) : '';
            el.title = Math.round(pct * 100) + ' %' + (s.detail ? ' · ' + s.detail : '');
        });
    }
    var debouncedNav = PS.debounce(updateNavStatus, 250);

    function helpHidden(id) { try { return localStorage.getItem('st-help-' + id) === '1'; } catch (e) { return false; } }

    function currentTab(m) {
        if (!m.tabs) return null;
        var t = PS.tabState[m.id];
        if (!t) {
            t = m.id === 'process' && PS.project.process.steps.length && !PS.counts.symbols() ? 'list' : m.tabs[0].id;
            PS.tabState[m.id] = t;
        }
        return m.tabs.filter(function (x) { return x.id === t; })[0] || m.tabs[0];
    }

    PS.go = function (id, tab) {
        if (!PS.module(id)) id = 'home';
        PS.current = id;
        if (tab) PS.tabState[id] = tab;
        try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
        $('#app').classList.remove('nav-open');
        PS.render();
        $('#native').scrollTop = 0;
    };

    PS.render = function (keepScroll) {
        if (!PS.project) return;
        var m = PS.module(PS.current), tab = currentTab(m);
        var frameName = m.frame || (tab && tab.frame) || null;
        var native = $('#native'), scroll = native.scrollTop;
        renderNav();

        var tabs = m.tabs ? '<div class="head-tabs" role="tablist">' + m.tabs.map(function (t) {
            return '<button type="button" role="tab" class="tab' + (tab.id === t.id ? ' on' : '') + '" data-tab="' + t.id + '" aria-selected="' + (tab.id === t.id) + '">' + t.label + '</button>';
        }).join('') + '</div>' : '';
        var help = helpHidden(m.id) ? '' : '<p class="help">' + esc(m.help) + ' <button type="button" class="link" data-hide-help="' + m.id + '">Ausblenden</button></p>';
        $('#viewHead').innerHTML = '<div class="vh-main"><h1>' + esc(m.title) + '</h1>' + help + '</div>' + tabs;
        $('#viewHead').classList.toggle('compact', !!frameName);

        PS.$$('.tool-frame').forEach(function (f) { f.classList.remove('on'); });
        if (frameName) {
            native.classList.add('hidden');
            var f = PS.ensureFrame(frameName);
            f.el.classList.add('on');
        } else {
            native.classList.remove('hidden');
            var view = m.tabs ? PS.views[tab.render] : PS.views[m.id];
            native.innerHTML = '<div class="native-in view-' + m.id + '">' + view() + '</div>';
            if (m.id === 'report') PS.renderPaper(true);
            if (m.id === 'ai') updatePromptSize();
            if (keepScroll) native.scrollTop = scroll;
        }
    };

    function updatePromptSize() {
        var el = $('#aiPromptSize');
        if (el) el.textContent = 'Der Prompt umfasst ca. ' + Math.round(PS.buildPrompt().length / 1000) + ' k Zeichen.';
    }

    /* ---------------- Topbar ---------------- */
    function renderTopbar() {
        $('#projectName').value = PS.project.name;
    }
    PS.onSaved(function (state, err) {
        var el = $('#saveState');
        if (state === 'pending') { el.textContent = 'Speichert …'; el.className = 'save-state'; }
        else if (state) { el.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); el.className = 'save-state ok'; }
        else { el.textContent = 'Speichern fehlgeschlagen'; el.className = 'save-state err'; PS.toast('Speichern fehlgeschlagen – Speicher des Browsers voll? Exportiere das Projekt als JSON.', 'error'); }
    });
    PS.onChange(debouncedNav);
    PS.onToolState(function () { debouncedNav(); });

    /* ---------------- Projekte ---------------- */
    function remember(id) { try { localStorage.setItem('st-studio-active', id); } catch (e) { /* ignore */ } }

    PS.openProject = function (p) {
        return PS.saveNow().then(function () {
            PS.project = PS.normalize(p);
            remember(PS.project.id);
            PS.pushAll();
            renderTopbar();
            PS.render();
        });
    };
    function createProject(name) {
        var p = PS.newProject(name);
        return PS.store.put(p).then(function () { return PS.openProject(p); });
    }
    PS.createExample = function () {
        var p = PS.newProject('Beispiel: Ausschuss senken');
        return PS.store.put(p).then(function () { return PS.openProject(p); }).then(function () {
            var a = PS.analyzeAi(PS.EXAMPLE_AI);
            PS.applyAi(a.data, 'replace');
            PS.go('home');
            PS.toast('Beispielprojekt geladen');
        });
    };

    function closeDialog() { $('#dialog').innerHTML = ''; document.body.classList.remove('modal-open'); }
    function fmtDate(ts) { return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }

    function openProjects() {
        PS.saveNow().then(function () { return PS.store.list(); }).then(function (list) {
            list.sort(function (a, b) { return b.updated - a.updated; });
            var rows = list.map(function (p) {
                var cur = p.id === PS.project.id;
                return '<li class="proj-row' + (cur ? ' cur' : '') + '"><div class="pr-main"><div class="pr-t"><b>' + esc(p.name) + '</b>' + (cur ? '<em class="badge">geöffnet</em>' : '') + '</div>' +
                    '<span class="muted sm">' + esc(p.meta && p.meta.title ? p.meta.title + ' · ' : '') + 'zuletzt ' + fmtDate(p.updated) + '</span></div>' +
                    '<div class="pr-act">' + (cur ? '' : '<button type="button" class="btn sm" data-proj="open" data-id="' + p.id + '">Öffnen</button>') +
                    '<button type="button" class="btn sm ghost" data-proj="dup" data-id="' + p.id + '">Duplizieren</button>' +
                    '<button type="button" class="icon-btn" data-proj="del" data-id="' + p.id + '" title="Löschen" aria-label="Projekt löschen">' + PS.icon('trash', 16) + '</button></div></li>';
            }).join('');
            $('#dialog').innerHTML = '<div class="modal-bg" data-close></div><div class="modal" role="dialog" aria-modal="true" aria-label="Projekte"><header><h2>Projekte</h2>' +
                '<button type="button" class="icon-btn" data-close aria-label="Schließen">' + PS.icon('close', 18) + '</button></header>' +
                '<ul class="proj-list">' + rows + '</ul><footer>' +
                '<button type="button" class="btn primary" data-proj="new">' + PS.icon('plus', 16) + '<span>Neues Projekt</span></button>' +
                '<button type="button" class="btn" data-proj="example">Beispielprojekt</button>' +
                '<button type="button" class="btn ghost" data-proj="import">' + PS.icon('upload', 16) + '<span>Projekt importieren</span></button>' +
                '<input type="file" id="projFile" accept=".json,application/json" hidden></footer></div>';
            document.body.classList.add('modal-open');
        });
    }

    function handleProj(act, id) {
        if (act === 'new') {
            var name = window.prompt('Name des neuen Projekts:', 'Neues Projekt');
            if (name === null) return;
            closeDialog();
            createProject(name.trim() || 'Neues Projekt').then(function () { PS.go('problem'); });
        } else if (act === 'example') { closeDialog(); PS.createExample(); }
        else if (act === 'import') { $('#projFile').click(); }
        else if (act === 'open') { PS.store.get(id).then(function (p) { closeDialog(); return PS.openProject(p); }); }
        else if (act === 'dup') {
            PS.store.get(id).then(function (p) {
                var c = PS.clone(p); c.id = PS.uid(); c.name = p.name + ' (Kopie)'; c.created = c.updated = Date.now();
                return PS.store.put(c);
            }).then(function () { PS.toast('Projekt dupliziert'); openProjects(); });
        } else if (act === 'del') {
            PS.store.get(id).then(function (p) {
                if (!window.confirm('Projekt „' + p.name + '“ endgültig löschen?')) return;
                return PS.store.del(id).then(PS.store.list).then(function (list) {
                    if (id !== PS.project.id) return openProjects();
                    closeDialog();
                    if (list.length) return PS.openProject(list.sort(function (a, b) { return b.updated - a.updated; })[0]);
                    return createProject('Neues Projekt');
                });
            });
        }
    }

    function importProjectFile(file) {
        var r = new FileReader();
        r.onload = function () {
            try {
                var data = JSON.parse(r.result);
                var p = data && data.project ? data.project : data;
                if (!p || typeof p !== 'object' || !(p.problem || p.meta || p.tools)) throw new Error('Das ist keine Studio-Projektdatei.');
                p = PS.normalize(p);
                p.id = PS.uid();
                p.name = (p.name || 'Import') + ' (Import)';
                p.updated = Date.now();
                PS.store.put(p).then(function () { closeDialog(); return PS.openProject(p); }).then(function () { PS.toast('Projekt importiert'); });
            } catch (e) { PS.toast('Import fehlgeschlagen: ' + e.message, 'error'); }
        };
        r.readAsText(file);
    }

    /* ---------------- Aktionen ---------------- */
    var SHAPES = { arrow: 'Pfeil', circle: 'Kreis', rectangle: 'Rechteck' };
    var ACT2STEP = { 'Not Started': 'Offen', 'In Progress': 'In Arbeit', Completed: 'Erledigt', 'On Hold': 'Pausiert' };
    function act(name) {
        var p = PS.project;
        if (name === 'example') {
            if (PS.current !== 'home' && PS.current !== 'ai') return;
            PS.createExample();
        } else if (name === 'steps-from-map') {
            var fl = p.tools.flow, syms = fl && fl.symbols ? fl.symbols.slice().sort(function (a, b) { return (a.number || 0) - (b.number || 0); }) : [];
            if (!syms.length) return PS.toast('Auf der Symbolkarte sind noch keine Symbole.', 'error');
            var have = {};
            p.process.steps.forEach(function (s) { have[(s.description || s.name).toLowerCase()] = 1; });
            var n = 0;
            syms.forEach(function (s) {
                var d = String(s.description || '').trim();
                if (d && have[d.toLowerCase()]) return;
                p.process.steps.push({ name: 'Schritt ' + s.number, description: d || (SHAPES[s.shape] || 'Symbol') + ' ' + s.number, owner: '' });
                n++;
            });
            PS.refreshList('process.steps'); PS.touch(); PS.toast(n + ' Schritt(e) übernommen');
        } else if (name === 'steps-from-actions') {
            var rows = PS.ideaRows().filter(function (r) { return r.status !== 'Completed'; });
            if (!rows.length) return PS.toast('Keine offenen Maßnahmen im Maßnahmen-Tool.', 'error');
            var seen = {};
            p.conclusion.nextSteps.forEach(function (s) { seen[s.action.toLowerCase()] = 1; });
            var added = 0;
            rows.forEach(function (r) {
                if (seen[r.title.toLowerCase()]) return;
                p.conclusion.nextSteps.push({ action: r.title, owner: '', due: '', status: ACT2STEP[r.status] || 'Offen' });
                added++;
            });
            PS.refreshList('conclusion.nextSteps'); PS.touch(); PS.toast(added + ' Maßnahme(n) übernommen');
        }
    }

    /* ---------------- Ereignisse ---------------- */
    function bindEvents() {
        document.addEventListener('click', function (e) {
            var t = e.target.closest('[data-go],[data-tab],[data-act],[data-add],[data-del],[data-ai-tab],[data-ai],[data-export],[data-sec-move],[data-hide-help],[data-proj],[data-close],#projectBtn,#themeBtn,#navToggle,#exportTop,#navScrim');
            if (!t) return;
            if (t.hasAttribute('data-go')) return PS.go(t.getAttribute('data-go'));
            if (t.hasAttribute('data-tab')) { PS.tabState[PS.current] = t.getAttribute('data-tab'); return PS.render(); }
            if (t.hasAttribute('data-act')) return act(t.getAttribute('data-act'));
            if (t.hasAttribute('data-add')) {
                var path = t.getAttribute('data-add'), def = PS.LISTS[path], arr = PS.get(PS.project, path);
                arr.push(def.strings ? '' : PS.clone(def.empty));
                var wrap = PS.refreshList(path), inputs = wrap && wrap.querySelectorAll('input[data-li]');
                if (inputs && inputs.length) { var last = def.strings ? inputs[inputs.length - 1] : inputs[inputs.length - def.cols.length]; if (last) last.focus(); }
                PS.touch(); PS.liveUpdate(path);
                return;
            }
            if (t.hasAttribute('data-del')) {
                var dp = t.getAttribute('data-del'), a2 = PS.get(PS.project, dp);
                a2.splice(+t.getAttribute('data-row'), 1);
                if (dp === 'causes.whys' && !a2.length) a2.push('');
                PS.refreshList(dp); PS.touch(); PS.liveUpdate(dp);
                return;
            }
            if (t.hasAttribute('data-ai-tab')) { PS.aiState.tab = t.getAttribute('data-ai-tab'); return PS.render(); }
            if (t.hasAttribute('data-ai')) return PS.aiHandle(t.getAttribute('data-ai'));
            if (t.hasAttribute('data-export')) return PS.handleExport(t.getAttribute('data-export'));
            if (t.hasAttribute('data-sec-move')) {
                var id = t.getAttribute('data-sec-id'), dir = +t.getAttribute('data-sec-move'), o = PS.reportOrder(), i = o.indexOf(id), j = i + dir;
                if (j < 0 || j >= o.length) return;
                o.splice(i, 1); o.splice(j, 0, id);
                PS.project.report.order = o; PS.touch(); return PS.render(true);
            }
            if (t.hasAttribute('data-hide-help')) { try { localStorage.setItem('st-help-' + t.getAttribute('data-hide-help'), '1'); } catch (er) { /* ignore */ } return PS.render(true); }
            if (t.hasAttribute('data-proj')) return handleProj(t.getAttribute('data-proj'), t.getAttribute('data-id'));
            if (t.hasAttribute('data-close')) return closeDialog();
            if (t.id === 'projectBtn') return openProjects();
            if (t.id === 'themeBtn') return toggleTheme();
            if (t.id === 'navToggle') return $('#app').classList.toggle('nav-open');
            if (t.id === 'navScrim') return $('#app').classList.remove('nav-open');
            if (t.id === 'exportTop') return PS.go('report');
        });

        function onInput(e) {
            var el = e.target;
            if (el.hasAttribute('data-bind')) {
                var path = el.getAttribute('data-bind');
                PS.set(PS.project, path, el.value);
                PS.touch(); PS.liveUpdate(path);
                if (path === 'meta.language' && e.type === 'change') PS.render(true);
            } else if (el.hasAttribute('data-li')) {
                var lp = el.getAttribute('data-li'), arr = PS.get(PS.project, lp), row = +el.getAttribute('data-row'), col = el.getAttribute('data-col');
                if (col) arr[row][col] = el.value; else arr[row] = el.value;
                PS.touch(); PS.liveUpdate(lp);
            } else if (el.id === 'aiMaterial') { PS.aiState.material = el.value; updatePromptSize(); }
            else if (el.id === 'aiInput') { PS.aiState.text = el.value; }
            else if (el.id === 'aiWithProject') { PS.aiState.withProject = el.checked; updatePromptSize(); }
            else if (el.name === 'aiMode') { PS.aiState.mode = el.value; }
            else if (el.hasAttribute('data-sec-toggle')) {
                var sid = el.getAttribute('data-sec-toggle'), off = PS.project.report.off, ix = off.indexOf(sid);
                if (el.checked && ix >= 0) off.splice(ix, 1);
                if (!el.checked && ix < 0) off.push(sid);
                PS.touch(); PS.renderPaper(false);
            } else if (el.id === 'projectName') {
                PS.project.name = el.value.trim() || 'Neues Projekt'; PS.touch();
            } else if (el.id === 'projFile' && e.type === 'change' && el.files[0]) importProjectFile(el.files[0]);
        }
        document.addEventListener('input', onInput);
        document.addEventListener('change', onInput);

        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                PS.saveNow().then(function () { PS.toast('Gespeichert'); });
            } else if (e.key === 'Escape') { closeDialog(); $('#app').classList.remove('nav-open'); }
        });
        window.addEventListener('hashchange', function () {
            var id = location.hash.slice(1);
            if (id && id !== PS.current && PS.module(id)) PS.go(id);
        });
    }

    /* ---------------- Start ---------------- */
    function boot() {
        $('#themeBtn').innerHTML = '';
        renderThemeBtn();
        $('#navToggle').innerHTML = PS.icon('menu', 20);
        $('#projectBtn').innerHTML = PS.icon('folder', 17) + '<span class="pb-l">Projekte</span>';
        $('#exportTop').innerHTML = PS.icon('report', 16) + '<span>Report</span>';
        bindEvents();
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
        PS.store.list().then(function (list) {
            var id = null;
            try { id = localStorage.getItem('st-studio-active'); } catch (e) { /* ignore */ }
            var p = list.filter(function (x) { return x.id === id; })[0] || list.sort(function (a, b) { return b.updated - a.updated; })[0];
            if (!p) { p = PS.newProject('Mein erstes Projekt'); return PS.store.put(p).then(function () { return p; }); }
            return p;
        }).then(function (p) {
            PS.project = PS.normalize(p);
            remember(PS.project.id);
            renderTopbar();
            var h = location.hash.slice(1);
            PS.current = h && PS.module(h) ? h : 'home';
            PS.render();
            window.PS_READY = true;
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
