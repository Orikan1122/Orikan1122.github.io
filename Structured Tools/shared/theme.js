/* Structured Tools – Theme-Umschalter und Navigation.
   Setzt das Theme sofort (kein Aufblitzen) und fügt unten rechts eine
   kleine Leiste mit Zurück-Link und Hell/Dunkel-Umschalter ein. */
(function () {
    var KEY = 'st-theme';
    var root = document.documentElement;

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function store(value) {
        try { localStorage.setItem(KEY, value); } catch (e) { /* z. B. privater Modus */ }
    }
    function systemDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function current() {
        var t = root.getAttribute('data-theme');
        return t || (systemDark() ? 'dark' : 'light');
    }

    var saved = stored();
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

    function buildDock() {
        var dock = document.createElement('nav');
        dock.className = 'st-dock';
        dock.setAttribute('aria-label', 'Navigation');

        var back = document.createElement('a');
        back.className = 'st-dock-btn';
        back.href = '../../index.html';
        back.title = 'Zur Übersicht';
        back.innerHTML = '<span aria-hidden="true">←</span><span class="st-dock-label">Übersicht</span>';

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'st-dock-btn';
        function render() {
            var dark = current() === 'dark';
            toggle.innerHTML = '<span aria-hidden="true">' + (dark ? '☀' : '☾') + '</span>' +
                '<span class="st-dock-label">' + (dark ? 'Hell' : 'Dunkel') + '</span>';
            toggle.title = dark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln';
            toggle.setAttribute('aria-label', toggle.title);
        }
        toggle.addEventListener('click', function () {
            var next = current() === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            store(next);
            render();
        });
        render();

        dock.appendChild(back);
        dock.appendChild(toggle);
        document.body.appendChild(dock);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildDock);
    else buildDock();
})();
