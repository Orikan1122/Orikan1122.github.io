/* Structured Tools – Bridge
   Gibt jedem Tool
   1. Auto-Save (localStorage, optional – manche Tools speichern schon selbst),
   2. eine kleine postMessage-Schnittstelle, über die das Studio den Zustand
      lesen/setzen und Schnappschüsse (Bilder für den Report) abholen kann.

   Nutzung im Tool:
     STBridge.init({
       tool: 'risk',                    // eindeutiger Name
       persist: true,                   // false, wenn das Tool selbst speichert
       getState: () => ({...}),         // serialisierbarer Zustand
       setState: (state) => {...},      // Zustand wiederherstellen
       getSnapshot: async () => ({name: 'data:image/png;base64,...'})   // optional
     });

   Nachrichten (alle mit {st: 1, ...}):
     Tool -> Studio : ready | state | snapshot | saved
     Studio -> Tool : load | get | snapshot | theme
*/
(function () {
    'use strict';

    var embedded = false;
    try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
    if (embedded) document.documentElement.classList.add('st-embedded');

    var cfg = null;
    var lastJson = null;
    var timer = null;
    var statusTimer = null;
    var restoring = false;

    function sameOrigin(ev) {
        return location.origin === 'null' || ev.origin === location.origin;
    }
    function post(msg) {
        msg.st = 1;
        msg.tool = cfg && cfg.tool;
        try { window.parent.postMessage(msg, location.origin === 'null' ? '*' : location.origin); } catch (e) { /* ignore */ }
    }

    // ---------- kleine Statusanzeige (unten links) ----------
    function status(text, isError) {
        if (embedded) return;
        var el = document.getElementById('st-save-status');
        if (!el) {
            el = document.createElement('div');
            el.id = 'st-save-status';
            el.className = 'st-save-status';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = text;
        el.classList.toggle('st-save-error', !!isError);
        el.classList.add('show');
        clearTimeout(statusTimer);
        statusTimer = setTimeout(function () { el.classList.remove('show'); }, isError ? 6000 : 1800);
    }

    // ---------- Speichern ----------
    function key() { return 'st:' + cfg.tool; }

    function snapshotState() {
        try { return cfg.getState(); } catch (e) { console.warn('[STBridge] getState', e); return null; }
    }

    function flush() {
        if (!cfg || restoring) return;
        var state = snapshotState();
        if (state === null) return;
        var json = JSON.stringify(state);
        if (json === lastJson) return;
        lastJson = json;
        if (embedded) {
            post({ type: 'state', state: state });
        } else if (cfg.persist) {
            try {
                localStorage.setItem(key(), json);
                status('Automatisch gespeichert');
            } catch (e) {
                status('Speicher voll – bitte Daten manuell exportieren', true);
            }
        }
    }

    function schedule() {
        if (!cfg || restoring) return;
        clearTimeout(timer);
        timer = setTimeout(flush, 500);
    }

    // ---------- Wiederherstellen ----------
    function apply(state) {
        restoring = true;
        try { cfg.setState(state); } catch (e) { console.warn('[STBridge] setState', e); }
        restoring = false;
        var again = snapshotState();
        lastJson = again === null ? null : JSON.stringify(again);
    }

    function restoreLocal() {
        if (embedded || !cfg.persist) return;
        var raw = null;
        try { raw = localStorage.getItem(key()); } catch (e) { /* ignore */ }
        if (!raw) { lastJson = JSON.stringify(snapshotState()); return; }
        try {
            apply(JSON.parse(raw));
            status('Letzter Stand wiederhergestellt');
        } catch (e) {
            console.warn('[STBridge] Wiederherstellen fehlgeschlagen', e);
        }
    }

    // ---------- Nachrichten vom Studio ----------
    window.addEventListener('message', function (ev) {
        var m = ev.data;
        if (!m || m.st !== 1 || !cfg || !sameOrigin(ev)) return;
        if (m.type === 'load') {
            apply(m.state);
        } else if (m.type === 'get') {
            post({ type: 'state', state: snapshotState(), reqId: m.reqId });
        } else if (m.type === 'snapshot') {
            Promise.resolve(cfg.getSnapshot ? cfg.getSnapshot() : {}).then(function (images) {
                post({ type: 'snapshot', images: images || {}, reqId: m.reqId });
            }, function () {
                post({ type: 'snapshot', images: {}, reqId: m.reqId });
            });
        } else if (m.type === 'theme') {
            if (m.theme === 'light' || m.theme === 'dark') document.documentElement.setAttribute('data-theme', m.theme);
        }
    });

    // ---------- Hilfsfunktion: Canvas -> PNG mit Hintergrund ----------
    function canvasToPng(canvas, bg) {
        if (!canvas || !canvas.width || !canvas.height) return null;
        var c = document.createElement('canvas');
        c.width = canvas.width;
        c.height = canvas.height;
        var ctx = c.getContext('2d');
        ctx.fillStyle = bg || '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(canvas, 0, 0);
        return c.toDataURL('image/png');
    }

    // ---------- Start ----------
    function init(options) {
        cfg = options;
        if (cfg.persist === undefined) cfg.persist = true;

        var start = function () {
            restoreLocal();
            ['input', 'change', 'click', 'keyup', 'drop', 'dragend', 'pointerup'].forEach(function (t) {
                document.addEventListener(t, schedule, true);
            });
            new MutationObserver(function (list) {
                for (var i = 0; i < list.length; i++) {
                    var n = list[i].target;
                    var el = n.nodeType === 1 ? n : n.parentElement;
                    if (el && el.closest && el.closest('.st-dock, .st-save-status')) continue;
                    schedule();
                    return;
                }
            }).observe(document.body, { childList: true, subtree: true, characterData: true });
            document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
            window.addEventListener('pagehide', flush);
            if (embedded) post({ type: 'ready' });
        };

        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start);
    }

    window.STBridge = { init: init, flush: flush, canvasToPng: canvasToPng, embedded: embedded };
})();
