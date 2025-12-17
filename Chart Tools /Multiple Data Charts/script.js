document.addEventListener('DOMContentLoaded', function () {
    console.log("Dashboard Script gestartet.");

    // --- SICHERE HELFER-FUNKTION ---
    // Holt ein Element. Falls es fehlt, gibt es null zurück, stürzt aber nicht ab.
    function getEl(id) {
        return document.getElementById(id);
    }

    // --- DOM ELEMENT REFERENCES ---
    const generateBtn = getEl('generateChartBtn');
    const resetZoomBtn = getEl('resetZoomBtn');
    const exportBtn = getEl('exportSetupBtn');
    const importBtn = getEl('importSetupBtn');
    const dataInput = getEl('dataInput');
    const statusDiv = getEl('status');
    const seriesConfigContainer = getEl('seriesConfigContainer');
    const tooltipEl = document.querySelector('.u-tooltip');

    // --- OPTIONS REFERENCES ---
    const enableValueFilter = getEl('enableValueFilter');
    const valueThreshold = getEl('valueThreshold');
    const filterAction = getEl('filterAction');
    const enableMinValueFilter = getEl('enableMinValueFilter');
    const minValueThreshold = getEl('minValueThreshold');
    const minFilterAction = getEl('minFilterAction');
    
    const aggregationSelect = getEl('aggregationSelect');
    const aggregationMethod = getEl('aggregationMethod');
    const durationCurveCheckbox = getEl('durationCurveCheckbox');
    const hideTimeGapsCheckbox = getEl('hideTimeGapsCheckbox');

    const createFormulaColumnBtn = getEl('createFormulaColumnBtn');
    const formulaInput = getEl('formulaInput');

    // --- STATE VARIABLES ---
    let parsedData = [];
    let uplotInstances = [null, null, null];
    let maxColumnCount = 0;
    let formulaColumns = []; 
    let seriesNames = {}; 
    const seriesColors = ["#007bff", "#dc3545", "#28a745", "#ffc107", "#6f42c1", "#fd7e14", "#20c997", "#e83e8c", "#6610f2", "#17a2b8"];

    // --- EVENT LISTENERS (Sicher angehängt) ---
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            console.log("Generiere Charts...");
            if (statusDiv) statusDiv.textContent = "Verarbeite...";
            setTimeout(() => {
                parseData();
                seriesNames = {}; // Reset bei neuen Daten
                updateSeriesConfigInputs();
                drawCharts();
            }, 10);
        });
    } else {
        console.error("FEHLER: 'generateChartBtn' nicht gefunden!");
    }
    
    if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => uplotInstances.forEach(p => p && p.setData(p.data)));
    if (exportBtn) exportBtn.addEventListener('click', exportSetup);
    if (importBtn) importBtn.addEventListener('click', importSetup);
    if (createFormulaColumnBtn) createFormulaColumnBtn.addEventListener('click', createFormulaColumn);

    // Alle Checkboxen/Selects, die ein Neu-Zeichnen auslösen
    const controls = [
        enableValueFilter, valueThreshold, filterAction, 
        enableMinValueFilter, minValueThreshold, minFilterAction, 
        aggregationSelect, aggregationMethod, 
        durationCurveCheckbox, hideTimeGapsCheckbox
    ];
    
    controls.forEach(el => {
        if (el) el.addEventListener('change', drawCharts);
    });

    document.querySelectorAll('.weekday-filter').forEach(el => el.addEventListener('change', drawCharts));
    
    window.addEventListener('resize', () => {
        uplotInstances.forEach((instance, i) => {
            if (instance) {
                const wrapper = getEl(`chart-wrapper-${i + 1}`);
                const container = getEl(`chartContainer${i+1}`);
                if (wrapper && container) {
                    instance.setSize({ width: container.clientWidth, height: wrapper.clientHeight - 40 });
                }
            }
        });
    });

    // --- DATA PARSING ---
    function parseData() {
        if (!dataInput) return;
        const rawText = dataInput.value.trim();
        if (!rawText) {
            if (statusDiv) statusDiv.innerHTML = '<span style="color:red">Eingabefeld ist leer.</span>';
            return;
        }

        const lines = rawText.split('\n');
        parsedData = [];
        maxColumnCount = 0;
        formulaColumns = []; 
        updateFormulaColumnsList(); 

        let successCount = 0;
        let errors = 0;

        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.trim().split(/[\t;]/); // Split bei Tab ODER Semikolon

            if (parts.length < 2) { errors++; return; }

            // Datum parsen (verschiedene Formate)
            const dtString = parts[0].trim();
            // Zerlege bei Leerzeichen (Datum <-> Zeit)
            const splitDT = dtString.split(' '); 
            
            if (splitDT.length < 2) { errors++; return; }

            let day, month, year;
            const datePart = splitDT[0];
            
            // Format check: DD.MM.YYYY oder YYYY-MM-DD
            if (datePart.includes('.')) {
                [day, month, year] = datePart.split('.').map(Number);
            } else if (datePart.includes('-')) {
                [year, month, day] = datePart.split('-').map(Number);
            } else {
                errors++; return;
            }

            const timePart = splitDT[1];
            const [hour, minute, second = 0] = timePart.split(':').map(Number);

            if ([day, month, year, hour, minute].some(isNaN)) { errors++; return; }

            const dateObj = new Date(year, month - 1, day, hour, minute, second);
            const timestamp = dateObj.getTime() / 1000;

            const values = parts.slice(1).map(v => {
                // Komma zu Punkt, Tausendertrennzeichen entfernen
                if (!v) return null;
                const clean = v.replace(/\./g, '').replace(',', '.'); 
                const num = parseFloat(clean);
                return isNaN(num) ? null : num;
            });

            if (values.length > maxColumnCount) maxColumnCount = values.length;
            parsedData.push({ timestamp, dayOfWeek: dateObj.getDay(), values });
            successCount++;
        });

        if (statusDiv) {
            if (successCount === 0) statusDiv.innerHTML = `<strong style="color:red">Keine Daten erkannt. Format prüfen (TT.MM.JJJJ HH:mm TAB Wert).</strong>`;
            else statusDiv.textContent = `${successCount} Zeilen geladen. (${errors} übersprungen)`;
        }
    }

    function captureCurrentNames() {
        document.querySelectorAll('.series-name-input').forEach(input => {
            const id = input.id.replace('seriesName', '');
            seriesNames[id] = input.value;
        });
    }

    function updateSeriesConfigInputs() {
        if (!seriesConfigContainer) return;
        const totalColumns = maxColumnCount + formulaColumns.length;
        seriesConfigContainer.innerHTML = '';

        if (totalColumns === 0) {
            seriesConfigContainer.innerHTML = '<p class="placeholder">Bitte zuerst Daten verarbeiten.</p>';
            return;
        }

        for (let i = 0; i < totalColumns; i++) {
            const isFormula = i >= maxColumnCount;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'series-item';
            
            let defVal = `Wert ${i + 1}`;
            if (isFormula) defVal = formulaColumns[i - maxColumnCount].formula;
            if (seriesNames[i]) defVal = seriesNames[i];
            seriesNames[i] = defVal;

            itemDiv.innerHTML = `
                <span class="series-item-label">${isFormula ? 'Formel' : 'Spalte'} ${i + 1}</span>
                <input type="text" class="series-name-input" id="seriesName${i}" value="${defVal}">
                <select class="series-chart-select" id="seriesChartSelect${i}">
                    <option value="-1">Verbergen</option>
                    <option value="0">Chart 1</option>
                    <option value="1">Chart 2</option>
                    <option value="2">Chart 3</option>
                </select>
            `;
            
            itemDiv.querySelector('.series-name-input').addEventListener('input', (e) => {
                seriesNames[i] = e.target.value; 
                drawCharts();
            });
            itemDiv.querySelector('.series-chart-select').addEventListener('change', drawCharts);
            seriesConfigContainer.appendChild(itemDiv);
        }
    }

    // --- FORMULA LOGIC ---
    function createFormulaColumn() {
        const val = formulaInput ? formulaInput.value.trim() : "";
        if (!val) { alert("Bitte Formel eingeben"); return; }
        
        // Check Referenzen
        const refs = [...val.matchAll(/\{(\d+)\}/g)].map(m => parseInt(m[1])-1);
        if (refs.some(r => r >= maxColumnCount)) { alert("Ungültige Spaltenreferenz"); return; }

        captureCurrentNames();
        formulaColumns.push({ formula: val, columnIndex: maxColumnCount + formulaColumns.length });
        
        applyFormulas();
        updateSeriesConfigInputs();
        updateFormulaColumnsList();
        drawCharts();
        if(formulaInput) formulaInput.value = '';
    }

    function applyFormulas() {
        parsedData.forEach(row => {
            row.values.length = maxColumnCount + formulaColumns.length;
            formulaColumns.forEach(col => {
                let expr = col.formula.replace(/\{(\d+)\}/g, (_, c) => {
                    const v = row.values[parseInt(c)-1];
                    return v !== null ? v : 'null';
                });
                try {
                    const res = new Function(`return ${expr}`)();
                    row.values[col.columnIndex] = (typeof res === 'number' && isFinite(res)) ? res : null;
                } catch { row.values[col.columnIndex] = null; }
            });
        });
    }

    function updateFormulaColumnsList() {
        const list = getEl('formula-columns-list');
        if (!list) return;
        list.innerHTML = '';
        formulaColumns.forEach((col, idx) => {
            const d = document.createElement('div');
            d.className = 'formula-item';
            d.innerHTML = `<span>Spalte ${col.columnIndex+1}: ${col.formula}</span>
                <div><button class="formula-btn edit-btn">Edit</button><button class="formula-btn delete-btn">Del</button></div>`;
            d.querySelector('.edit-btn').onclick = () => {
                deleteFormula(idx); 
                if(formulaInput) formulaInput.value = col.formula; 
            };
            d.querySelector('.delete-btn').onclick = () => deleteFormula(idx);
            list.appendChild(d);
        });
    }

    function deleteFormula(idx) {
        if(!confirm("Löschen?")) return;
        const delIdx = maxColumnCount + idx;
        formulaColumns.splice(idx, 1);
        
        // Namen shiften
        let newNames = {};
        for(let k in seriesNames) {
            let ki = parseInt(k);
            if(ki < delIdx) newNames[ki] = seriesNames[ki];
            if(ki > delIdx) newNames[ki-1] = seriesNames[ki];
        }
        seriesNames = newNames;

        formulaColumns.forEach((c, i) => c.columnIndex = maxColumnCount + i);
        applyFormulas();
        updateFormulaColumnsList();
        updateSeriesConfigInputs();
        drawCharts();
    }

    // --- AGGREGATION & DRAW ---
    function aggregateData(data) {
        const type = aggregationSelect ? aggregationSelect.value : 'original';
        if (type === 'original') return data;
        
        const method = aggregationMethod ? aggregationMethod.value : 'avg';
        const map = {};

        data.forEach(p => {
            const d = new Date(p.timestamp * 1000);
            let k;
            if (type === 'hour') k = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
            else k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

            if (!map[k]) map[k] = { c: 0, s: Array(p.values.length).fill(0), n: Array(p.values.length).fill(0), d: new Date(k).getDay() };
            
            p.values.forEach((v, i) => {
                if (v !== null) { map[k].s[i] += v; map[k].n[i]++; }
            });
        });

        return Object.keys(map).sort((a,b)=>a-b).map(k => {
            const o = map[k];
            const vals = o.s.map((sum, i) => {
                if (o.n[i] === 0) return null;
                return method === 'sum' ? sum : sum / o.n[i];
            });
            return { timestamp: parseInt(k)/1000, dayOfWeek: o.d, values: vals };
        });
    }

    function updateStats(u, chartIdx) {
        const panel = getEl(`stats-panel-${chartIdx + 1}`);
        if (!panel) return;
        
        const minI = u.valToIdx(u.scales.x.min);
        const maxI = u.valToIdx(u.scales.x.max);
        
        if (minI == null || maxI == null) { panel.innerHTML = "Zoom ungültig"; return; }
        
        let html = "";
        const isDuration = durationCurveCheckbox && durationCurveCheckbox.checked;

        for (let i = 1; i < u.series.length; i++) {
            if (!u.series[i].show) continue;
            const data = u.data[i];
            let min=Infinity, max=-Infinity, sum=0, cnt=0;
            
            // Statistik über sichtbaren Bereich
            for (let j = minI; j <= maxI; j++) {
                const v = data[j];
                if (v != null) {
                    if (v < min) min = v;
                    if (v > max) max = v;
                    sum += v; cnt++;
                }
            }

            if (cnt === 0) continue;
            const avg = sum / cnt;

            html += `<div class="stats-series-group" style="border-left:3px solid ${u.series[i].stroke}">
                <strong>${u.series[i].label}</strong>
                <div class="stats-row"><span>Min:</span><b>${min.toFixed(2)}</b></div>
                <div class="stats-row"><span>Max:</span><b>${max.toFixed(2)}</b></div>
                <div class="stats-row"><span>Sum:</span><b>${sum.toFixed(2)}</b></div>
                <div class="stats-row"><span>Ø:</span><b>${avg.toFixed(2)}</b></div>`;
            
            if (isDuration) {
                html += `<table style="width:100%; font-size:10px; margin-top:5px; border-collapse:collapse;">
                <tr style="background:#eee"><th>%</th><th>Ø</th></tr>`;
                const len = data.length;
                for(let s=0; s<10; s++) {
                    let subSum=0, subCnt=0;
                    const start = Math.floor((s*10/100)*len);
                    const end = Math.floor(((s+1)*10/100)*len);
                    for(let k=start; k<end; k++) {
                        if(data[k]!=null) { subSum+=data[k]; subCnt++; }
                    }
                    html += `<tr><td>${s*10}-${(s+1)*10}%</td><td style="text-align:right">${subCnt? (subSum/subCnt).toFixed(2):'-'}</td></tr>`;
                }
                html += `</table>`;
            }
            html += `</div>`;
        }
        panel.innerHTML = html || "Keine sichtbaren Daten";
    }

    function drawCharts() {
        if (typeof uPlot === 'undefined') { console.error("uPlot fehlt!"); return; }
        uplotInstances.forEach(p => p && p.destroy());
        uplotInstances = [null, null, null];

        applyFormulas();
        captureCurrentNames();

        const selDays = Array.from(document.querySelectorAll('.weekday-filter:checked')).map(c => parseInt(c.value));
        let data = parsedData.filter(p => selDays.includes(p.dayOfWeek));
        data = aggregateData(data);

        // Filter Min/Max
        const maxOn = enableValueFilter && enableValueFilter.checked;
        const maxVal = parseFloat(valueThreshold ? valueThreshold.value : 0);
        const maxAct = filterAction ? filterAction.value : 'filter';
        
        if (maxOn) {
            if (maxAct === 'replace') data.forEach(p => p.values = p.values.map(v => (v!=null && v>maxVal)?null:v));
            else data = data.filter(p => p.values.every(v => v==null || v<=maxVal));
        }

        const minOn = enableMinValueFilter && enableMinValueFilter.checked;
        const minVal = parseFloat(minValueThreshold ? minValueThreshold.value : 0);
        const minAct = minFilterAction ? minFilterAction.value : 'filter';

        if (minOn) {
            if (minAct === 'replace') data.forEach(p => p.values = p.values.map(v => (v!=null && v<minVal)?null:v));
            else data = data.filter(p => p.values.every(v => v==null || v>=minVal));
        }

        if (data.length === 0) return;

        const isDuration = durationCurveCheckbox && durationCurveCheckbox.checked;
        const hideGaps = hideTimeGapsCheckbox && hideTimeGapsCheckbox.checked;
        
        let xVals;
        if (isDuration) {
            xVals = data.map((_, i) => (i / (data.length - 1)) * 100);
        } else {
            xVals = hideGaps ? data.map((_, i) => i) : data.map(p => p.timestamp);
        }

        const sync = uPlot.sync("grp");
        const totalCols = maxColumnCount + formulaColumns.length;

        for (let i = 0; i < 3; i++) {
            const container = getEl(`chartContainer${i+1}`);
            if (!container) continue;
            container.innerHTML = '';

            const cols = [];
            for(let j=0; j<totalCols; j++) {
                const sel = getEl(`seriesChartSelect${j}`);
                if (sel && parseInt(sel.value) === i) cols.push(j);
            }
            if (cols.length === 0) {
                container.innerHTML = '<p class="placeholder">Leer</p>'; 
                const p = getEl(`stats-panel-${i+1}`); if(p) p.innerHTML='';
                continue; 
            }

            const seriesConfig = [{
                label: isDuration ? "%" : "Zeit",
                value: (u, v) => isDuration ? v.toFixed(1) + "%" : new Date(v*1000).toLocaleDateString()
            }];
            const chartData = [xVals];

            cols.forEach(cIdx => {
                let colData = data.map(p => p.values[cIdx]);
                if (isDuration) colData.sort((a,b) => (b==null? -1 : (a==null? 1 : b-a))); // Descending
                
                chartData.push(colData);
                
                let name = seriesNames[cIdx];
                if (!name && cIdx >= maxColumnCount) name = formulaColumns[cIdx-maxColumnCount].formula;
                if (!name) name = `Spalte ${cIdx+1}`;

                seriesConfig.push({
                    label: name,
                    stroke: seriesColors[cIdx % seriesColors.length],
                    width: 2,
                    spanGaps: !isDuration
                });
            });

            const opts = {
                width: container.clientWidth,
                height: 300,
                series: seriesConfig,
                cursor: { sync: { key: sync } },
                scales: { x: { time: !isDuration && !hideGaps } },
                axes: [ 
                    isDuration ? { label: "% Zeit" } : (hideGaps ? { values: (u,v)=>v.map(t=> new Date(data[t].timestamp*1000).toLocaleDateString()) } : {}),
                    {}
                ],
                plugins: [{
                    hooks: {
                        draw: (u) => updateStats(u, i),
                        setCursor: (u) => {
                            if (!tooltipEl) return;
                            const idx = u.cursor.idx;
                            if (idx == null) { tooltipEl.style.display = 'none'; return; }
                            
                            const dPoint = data[hideGaps && !isDuration ? xVals[idx] : idx]; // Mapping fix
                            let head = isDuration ? `${xVals[idx].toFixed(1)}%` : new Date(dPoint.timestamp*1000).toLocaleString();
                            
                            let html = `<b>${head}</b>`;
                            u.series.forEach((s, si) => {
                                if (si>0) html += `<div>${s.label}: ${u.data[si][idx]?.toFixed(2)}</div>`;
                            });
                            
                            tooltipEl.innerHTML = html;
                            tooltipEl.style.display = 'block';
                            const rect = u.root.getBoundingClientRect();
                            tooltipEl.style.left = (rect.left + u.cursor.left + 10) + "px";
                            tooltipEl.style.top = (rect.top + u.cursor.top + 10) + "px";
                        }
                    }
                }]
            };

            uplotInstances[i] = new uPlot(opts, chartData, container);
        }
    }

    // --- IMPORT / EXPORT (Stark vereinfacht) ---
    function exportSetup() {
        captureCurrentNames();
        const s = {
            names: seriesNames,
            formulas: formulaColumns,
            charts: [],
            // Settings
            agg: aggregationSelect ? aggregationSelect.value : 'original',
            method: aggregationMethod ? aggregationMethod.value : 'avg',
            dur: durationCurveCheckbox ? durationCurveCheckbox.checked : false
        };
        // Charts mapping
        const total = maxColumnCount + formulaColumns.length;
        for(let j=0; j<total; j++) {
            const el = getEl(`seriesChartSelect${j}`);
            s.charts.push(el ? el.value : -1);
        }
        
        const blob = new Blob([JSON.stringify(s)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download='config.json'; a.click();
    }

    function importSetup() {
        const i = document.createElement('input'); i.type='file';
        i.onchange = e => {
            const r = new FileReader();
            r.onload = ev => {
                const s = JSON.parse(ev.target.result);
                if (s.formulas) {
                    formulaColumns = s.formulas;
                    applyFormulas();
                }
                if (s.names) seriesNames = s.names;
                updateSeriesConfigInputs();
                updateFormulaColumnsList();
                
                if (s.agg && aggregationSelect) aggregationSelect.value = s.agg;
                if (s.method && aggregationMethod) aggregationMethod.value = s.method;
                if (s.dur !== undefined && durationCurveCheckbox) durationCurveCheckbox.checked = s.dur;
                
                if (s.charts) {
                    s.charts.forEach((v, idx) => {
                        const el = getEl(`seriesChartSelect${idx}`);
                        if(el) el.value = v;
                    });
                }
                drawCharts();
            };
            r.readAsText(e.target.files[0]);
        };
        i.click();
    }
});