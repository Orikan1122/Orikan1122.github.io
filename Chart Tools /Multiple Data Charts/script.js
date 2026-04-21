document.addEventListener('DOMContentLoaded', function () {
    console.log("Dashboard Script gestartet.");

    // --- SICHERE HELFER-FUNKTION ---
    function getEl(id) { return document.getElementById(id); }

    // --- DOM ELEMENT REFERENCES ---
    const titleInputs = [getEl('titleInput1'), getEl('titleInput2'), getEl('titleInput3')];
    const chartHeaders = [getEl('chartHeader1'), getEl('chartHeader2'), getEl('chartHeader3')];

    titleInputs.forEach((input, idx) => {
        if (input) {
            input.addEventListener('input', () => {
                if (chartHeaders[idx]) chartHeaders[idx].textContent = input.value;
            });
        }
    });
    const generateBtn = getEl('generateChartBtn');
    const resetZoomBtn = getEl('resetZoomBtn');
    const exportBtn = getEl('exportSetupBtn');
    const importBtn = getEl('importSetupBtn');
    const importCsvBtn = getEl('importCsvBtn');
    const exportCsvBtn = getEl('exportCsvBtn');
    const csvFileInput = getEl('csvFileInput');
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
    const vGridSelect = getEl('vGridSelect'); // NEU
    const durationCurveCheckbox = getEl('durationCurveCheckbox');
    const hideTimeGapsCheckbox = getEl('hideTimeGapsCheckbox');

    const createFormulaColumnBtn = getEl('createFormulaColumnBtn');
    const formulaInput = getEl('formulaInput');

    const addColFilterBtn = getEl('addColFilterBtn'); // NEU
    const filterColSelect = getEl('filterColSelect'); // NEU

    // --- STATE VARIABLES ---
    let parsedData = [];
    let uplotInstances = [null, null, null];
    let maxColumnCount = 0;
    let formulaColumns = []; 
    let seriesNames = {}; 
    let specificColFilters = []; // NEU: Speichert spaltenspezifische Filter
    const seriesColors = ["#007bff", "#dc3545", "#28a745", "#ffc107", "#6f42c1", "#fd7e14", "#20c997", "#e83e8c", "#6610f2", "#17a2b8"];

    // --- EVENT LISTENERS ---
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            if (statusDiv) statusDiv.textContent = "Verarbeite...";
            setTimeout(() => {
                parseData();
                seriesNames = {}; 
                updateSeriesConfigInputs();
                drawCharts();
            }, 10);
        });
    }
    
    if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => uplotInstances.forEach(p => p && p.setData(p.data)));
    if (exportBtn) exportBtn.addEventListener('click', exportSetup);
    if (importBtn) importBtn.addEventListener('click', importSetup);
    if (createFormulaColumnBtn) createFormulaColumnBtn.addEventListener('click', createFormulaColumn);

    // CSV Import / Export (NEU)
    if (importCsvBtn) importCsvBtn.addEventListener('click', () => csvFileInput && csvFileInput.click());
    if (csvFileInput) {
        csvFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (dataInput) dataInput.value = ev.target.result;
                if (generateBtn) generateBtn.click();
            };
            reader.readAsText(file);
            csvFileInput.value = ''; 
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (parsedData.length === 0) return alert("Keine Daten zum Exportieren");
            let csv = "Datum Uhrzeit";
            const totalCols = maxColumnCount + formulaColumns.length;
            for(let i=0; i<totalCols; i++) {
                let name = seriesNames[i] || (i >= maxColumnCount ? formulaColumns[i-maxColumnCount].formula : `Spalte ${i+1}`);
                csv += `;${name}`; 
            }
            csv += "\n";

            parsedData.forEach(p => {
                const d = new Date(p.timestamp * 1000);
                // Export mit Sekunden
                const ds = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
                csv += ds;
                for(let i=0; i<totalCols; i++) {
                    let val = p.values[i];
                    // Exportiert Zahlen standardmäßig mit Punkt (für universelle Kompatibilität)
                    csv += `;${(val !== null && val !== undefined) ? val.toString() : ''}`;
                }
                csv += "\n";
            });
            const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'daten_export.csv'; a.click();
        });
    }

    // Spalten-Filter Event (NEU)
    if (addColFilterBtn) {
        addColFilterBtn.addEventListener('click', () => {
            const cIdx = parseInt(filterColSelect.value);
            const op = getEl('filterOpSelect').value;
            const val = parseFloat(getEl('filterValInput').value);
            
            if(isNaN(cIdx) || isNaN(val)) return alert("Bitte gültige Spalte und Wert eingeben.");
            
            specificColFilters.push({ colIdx: cIdx, operator: op, value: val });
            updateColFiltersList();
            drawCharts();
        });
    }

    const controls = [
        enableValueFilter, valueThreshold, filterAction, 
        enableMinValueFilter, minValueThreshold, minFilterAction, 
        aggregationSelect, aggregationMethod, vGridSelect,
        durationCurveCheckbox, hideTimeGapsCheckbox
    ];
    controls.forEach(el => { if (el) el.addEventListener('change', drawCharts); });
    document.querySelectorAll('.weekday-filter').forEach(el => el.addEventListener('change', drawCharts));
    
    window.addEventListener('resize', () => {
        uplotInstances.forEach((instance, i) => {
            if (instance) {
                const wrapper = getEl(`chart-wrapper-${i + 1}`);
                const container = getEl(`chartContainer${i+1}`);
                if (wrapper && container) instance.setSize({ width: container.clientWidth, height: wrapper.clientHeight - 40 });
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
            // Split bei Tab oder Semikolon
            const parts = line.trim().split(/[\t;]/); 

            if (parts.length < 2) { errors++; return; }

            // Datums- und Zeit-Teil extrahieren
            const dtString = parts[0].trim();
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
            const timeComponents = timePart.split(':').map(Number);
            
            // Flexibel: Stunde und Minute sind Pflicht, Sekunde ist optional
            const hour = timeComponents[0];
            const minute = timeComponents[1];
            const second = (timeComponents.length > 2) ? timeComponents[2] : 0;

            if ([day, month, year, hour, minute, second].some(isNaN)) { errors++; return; }

            const dateObj = new Date(year, month - 1, day, hour, minute, second);
            const timestamp = dateObj.getTime() / 1000;

            const values = parts.slice(1).map(v => {
                if (!v) return null;
                // WICHTIG: Nur Komma zu Punkt wandeln. 
                // Ein existierender Punkt bleibt ein Punkt (Dezimalstelle).
                const clean = v.trim().replace(',', '.'); 
                const num = parseFloat(clean);
                return isNaN(num) ? null : num;
            });

            if (values.length > maxColumnCount) maxColumnCount = values.length;
            parsedData.push({ timestamp, dayOfWeek: dateObj.getDay(), values });
            successCount++;
        });

        if (statusDiv) {
            if (successCount === 0) statusDiv.innerHTML = `<strong style="color:red">Keine Daten erkannt. Format: TT.MM.JJJJ HH:mm:ss [TAB] Werte</strong>`;
            else statusDiv.textContent = `${successCount} Zeilen geladen. (${errors} übersprungen)`;
        }
    }

    let currentFilteredData = []; 

    // Hilfsfunktion für die Zeitformatierung (1000er Regel)
    function formatDuration(seconds) {
        if (seconds < 1000) return Math.round(seconds) + " s";
        let mins = seconds / 60;
        if (mins < 1000) return mins.toFixed(1) + " min";
        let hours = mins / 60;
        if (hours < 1000) return hours.toFixed(1) + " h";
        let days = hours / 24;
        return days.toFixed(1) + " d";
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
        
        if (filterColSelect) filterColSelect.innerHTML = ''; // Dropdown für spezifische Filter leeren

        if (totalColumns === 0) {
            seriesConfigContainer.innerHTML = '<p class="placeholder">Bitte zuerst Daten verarbeiten.</p>';
            if (filterColSelect) filterColSelect.innerHTML = '<option value="">(Bitte Daten laden)</option>';
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
                    <option value="1" ${i===1?'selected':''}>Chart 2</option>
                    <option value="2" ${i===2?'selected':''}>Chart 3</option>
                </select>
            `;
            
            itemDiv.querySelector('.series-name-input').addEventListener('input', (e) => {
                seriesNames[i] = e.target.value; 
                updateFilterDropdownNames(); // Dropdown aktualisieren, wenn umbenannt wird
                drawCharts();
            });
            itemDiv.querySelector('.series-chart-select').addEventListener('change', drawCharts);
            seriesConfigContainer.appendChild(itemDiv);

            // Filter-Dropdown aufbauen
            if (filterColSelect) {
                const opt = document.createElement('option');
                opt.value = i; opt.textContent = defVal;
                filterColSelect.appendChild(opt);
            }
        }
    }

    function updateFilterDropdownNames() {
        if (!filterColSelect) return;
        Array.from(filterColSelect.options).forEach(opt => {
            const idx = parseInt(opt.value);
            if(seriesNames[idx]) opt.textContent = seriesNames[idx];
        });
    }

    // Spezifische Filter Liste aktualisieren (NEU)
    function updateColFiltersList() {
        const list = getEl('col-filters-list');
        if (!list) return;
        list.innerHTML = '';
        specificColFilters.forEach((f, idx) => {
            const d = document.createElement('div');
            d.className = 'formula-item';
            const name = seriesNames[f.colIdx] || `Spalte ${f.colIdx+1}`;
            d.innerHTML = `<span>${name} <b>${f.operator}</b> ${f.value}</span>
                           <button class="formula-btn delete-btn">X</button>`;
            d.querySelector('.delete-btn').onclick = () => {
                specificColFilters.splice(idx, 1);
                updateColFiltersList();
                drawCharts();
            };
            list.appendChild(d);
        });
    }

    // --- FORMULA LOGIC ---
    function createFormulaColumn() {
        const val = formulaInput ? formulaInput.value.trim() : "";
        if (!val) return;
        
        const refs = [...val.matchAll(/\{(\d+)\}/g)].map(m => parseInt(m[1])-1);
        if (refs.some(r => r >= maxColumnCount)) return alert("Ungültige Spaltenreferenz");

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
        
        let newNames = {};
        for(let k in seriesNames) {
            let ki = parseInt(k);
            if(ki < delIdx) newNames[ki] = seriesNames[ki];
            if(ki > delIdx) newNames[ki-1] = seriesNames[ki];
        }
        seriesNames = newNames;

        // Auch spezifische Filter aufräumen, die sich auf gelöschte Formel beziehen
        specificColFilters = specificColFilters.filter(f => f.colIdx !== delIdx);
        specificColFilters.forEach(f => { if(f.colIdx > delIdx) f.colIdx--; });
        updateColFiltersList();

        formulaColumns.forEach((c, i) => c.columnIndex = maxColumnCount + i);
        applyFormulas();
        updateFormulaColumnsList();
        updateSeriesConfigInputs();
        drawCharts();
    }

    // --- AGGREGATION & STATS ---
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
        
        // SICHERHEITS-CHECK: Wenn keine Daten da sind oder uPlot noch nicht bereit ist, abbrechen
        if (minI == null || maxI == null || !currentFilteredData || currentFilteredData.length === 0) { 
            panel.innerHTML = "Keine Daten im sichtbaren Bereich"; 
            return; 
        }
        
        let totalSeconds = 0;
        const isDuration = getEl('durationCurveCheckbox') && getEl('durationCurveCheckbox').checked;

        if (!isDuration) {
            // SICHERE BERECHNUNG der Zeitsumme
            for (let j = minI; j < maxI; j++) {
                const p1 = currentFilteredData[j];
                const p2 = currentFilteredData[j+1];
                
                if (p1 && p2 && p1.timestamp && p2.timestamp) {
                    const diff = p2.timestamp - p1.timestamp;
                    if (diff > 0) totalSeconds += diff;
                }
            }
        }

        let html = "";
        if (!isDuration) {
            html += `
                <div class="stats-timeframe">
                    <span>Auswertungszeitraum:</span>
                    <b>${formatDuration(totalSeconds)}</b>
                </div>
                <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
            `;
        }

        for (let i = 1; i < u.series.length; i++) {
            if (!u.series[i].show) continue;
            const sData = u.data[i];
            let min=Infinity, max=-Infinity, sum=0, cnt=0;
            
            for (let j = minI; j <= maxI; j++) {
                const v = sData[j];
                if (v != null) {
                    if (v < min) min = v;
                    if (v > max) max = v;
                    sum += v; cnt++;
                }
            }
            if (cnt === 0) continue;
            
            html += `<div class="stats-series-group" style="border-left:3px solid ${u.series[i].stroke}">
                <strong>${u.series[i].label}</strong>
                <div class="stats-row"><span>Min:</span><b>${min.toFixed(2)}</b></div>
                <div class="stats-row"><span>Max:</span><b>${max.toFixed(2)}</b></div>
                <div class="stats-row"><span>Sum:</span><b>${sum.toFixed(2)}</b></div>
                <div class="stats-row"><span>Ø:</span><b>${(sum/cnt).toFixed(2)}</b></div>
            </div>`;
        }
        panel.innerHTML = html || "Keine sichtbaren Daten";
    }
    // --- MAIN DRAW FUNCTION ---
    function drawCharts() {
        if (typeof uPlot === 'undefined') { console.error("uPlot fehlt!"); return; }
        uplotInstances.forEach(p => p && p.destroy());
        uplotInstances = [null, null, null];

        applyFormulas();
        captureCurrentNames();

        const selDays = Array.from(document.querySelectorAll('.weekday-filter:checked')).map(c => parseInt(c.value));
        let data = parsedData.filter(p => selDays.includes(p.dayOfWeek));
        
        if (specificColFilters.length > 0) {
            data = data.filter(p => {
                return specificColFilters.every(f => {
                    const v = p.values[f.colIdx];
                    if (v == null) return false; 
                    switch(f.operator) {
                        case '>': return v > f.value;
                        case '<': return v < f.value;
                        case '>=': return v >= f.value;
                        case '<=': return v <= f.value;
                        case '==': return v === f.value;
                        case '!=': return v !== f.value;
                        default: return true;
                    }
                });
            });
        }

        data = aggregateData(data);

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

        // WICHTIG: Hier sofort die globalen Daten für UpdateStats und Tooltips speichern!
        currentFilteredData = data;

        const isDuration = durationCurveCheckbox && durationCurveCheckbox.checked;
        const hideGaps = hideTimeGapsCheckbox && hideTimeGapsCheckbox.checked;
        const gridMode = vGridSelect ? vGridSelect.value : 'auto'; 
        
        let xVals;
        if (isDuration) xVals = data.map((_, i) => (i / (data.length - 1)) * 100);
        else xVals = hideGaps ? data.map((_, i) => i) : data.map(p => p.timestamp);

        const sync = uPlot.sync("grp");
        const totalCols = maxColumnCount + formulaColumns.length;
        const dateOpts = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };

        function vGridPlugin() {
            return {
                hooks: {
                    drawAxes: (u) => {
                        if (gridMode === 'auto' || gridMode === 'off' || isDuration) return;
                        const { ctx } = u;
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = "rgba(0,0,0,0.15)";
                        ctx.setLineDash([5, 5]); 
                        ctx.lineWidth = 1;

                        const minIdx = u.valToIdx(u.scales.x.min);
                        const maxIdx = u.valToIdx(u.scales.x.max);
                        if(minIdx == null || maxIdx == null) return;
                        
                        let lastUnit = null;
                        for (let i = minIdx; i <= maxIdx; i++) {
                            const ts = hideGaps ? data[xVals[i]]?.timestamp : xVals[i];
                            if (!ts) continue;
                            const d = new Date(ts * 1000);
                            const currentUnit = gridMode === 'hour' ? d.getHours() : d.getDate();
                            if (lastUnit !== null && currentUnit !== lastUnit) {
                                const xPos = Math.round(u.valToPos(xVals[i], 'x', true)) + 0.5;
                                ctx.moveTo(xPos, u.bbox.top);
                                ctx.lineTo(xPos, u.bbox.top + u.bbox.height);
                            }
                            lastUnit = currentUnit;
                        }
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            };
        }

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
                value: (u, v) => {
                    if (v == null) return "-";
                    if (isDuration) return v.toFixed(1) + "%";
                    
                    let ts;
                    if (hideGaps) {
                        const point = currentFilteredData[Math.round(v)];
                        ts = point ? point.timestamp : null;
                    } else {
                        ts = v;
                    }
                    return ts ? new Date(ts * 1000).toLocaleString('de-DE', dateOpts) : "-";
                }
            }];
            const chartData = [xVals];

            cols.forEach(cIdx => {
                let colData = data.map(p => p.values[cIdx]);
                if (isDuration) colData.sort((a,b) => (b==null? -1 : (a==null? 1 : b-a))); 
                chartData.push(colData);
                
                let name = seriesNames[cIdx] || (cIdx >= maxColumnCount ? formulaColumns[cIdx-maxColumnCount].formula : `Spalte ${cIdx+1}`);
                seriesConfig.push({ label: name, stroke: seriesColors[cIdx % seriesColors.length], width: 2, spanGaps: !isDuration });
            });

            let xAxisConfig = {};
            if (isDuration) {
                xAxisConfig = { label: "% Zeit" };
            } else if (hideGaps) {
                xAxisConfig = {
                    // SICHERHEITS-CHECK hier eingebaut
                    values: (u, splits) => splits.map(v => {
                        const point = currentFilteredData[Math.round(v)];
                        return point && point.timestamp ? new Date(point.timestamp * 1000).toLocaleDateString('de-DE') : "";
                    })
                };
            } else {
                xAxisConfig = {}; 
            }

            const opts = {
                width: container.clientWidth,
                height: 450, 
                series: seriesConfig,
                cursor: { sync: { key: sync } },
                scales: { x: { time: !isDuration && !hideGaps } },
                axes: [ xAxisConfig, {} ],
                plugins: [ vGridPlugin(), {
                    hooks: {
                        draw: (u) => updateStats(u, i),
                        setCursor: (u) => {
                            if (!tooltipEl) return;
                            const idx = u.cursor.idx;
                            if (idx == null) { tooltipEl.style.display = 'none'; return; }
                            
                            const dPoint = currentFilteredData[idx]; 
                            // SICHERHEITS-CHECK für Tooltip
                            if (!dPoint || !dPoint.timestamp) return;

                            let head = isDuration ? `${xVals[idx].toFixed(1)}%` : new Date(dPoint.timestamp*1000).toLocaleString('de-DE', dateOpts);
                            
                            let html = `<b>${head}</b>`;
                            u.series.forEach((s, si) => {
                                if (si>0) html += `<div>${s.label}: ${u.data[si][idx]?.toFixed(2)}</div>`;
                            });
                            
                            tooltipEl.innerHTML = html;
                            tooltipEl.style.display = 'block';
                            const rect = u.root.getBoundingClientRect();
                            
                            // Tooltip Position: Direkt unter dem Cursor
                            tooltipEl.style.left = (rect.left + u.cursor.left + 5) + "px";
                            tooltipEl.style.top = (rect.top + u.cursor.top + 15) + "px";
                        }
                    }
                }]
            };

            uplotInstances[i] = new uPlot(opts, chartData, container);
        }
    }

    // --- IMPORT / EXPORT LAYOUT ---
    function exportSetup() {
        captureCurrentNames();
        const s = {
            names: seriesNames,
            formulas: formulaColumns,
            colFilters: specificColFilters, // NEU gespeichert
            charts: [],
            agg: aggregationSelect ? aggregationSelect.value : 'original',
            method: aggregationMethod ? aggregationMethod.value : 'avg',
            vGrid: vGridSelect ? vGridSelect.value : 'auto', // NEU gespeichert
            dur: durationCurveCheckbox ? durationCurveCheckbox.checked : false,
            chartTitles: [getEl('titleInput1').value, getEl('titleInput2').value, getEl('titleInput3').value]
        };
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
                if (s.formulas) { formulaColumns = s.formulas; applyFormulas(); }
                if (s.names) seriesNames = s.names;
                
                if (s.colFilters) specificColFilters = s.colFilters; // NEU geladen
                else specificColFilters = [];
                
                updateSeriesConfigInputs();
                updateFormulaColumnsList();
                updateColFiltersList(); // NEU UI aktualisieren
                
                if (s.agg && aggregationSelect) aggregationSelect.value = s.agg;
                if (s.method && aggregationMethod) aggregationMethod.value = s.method;
                if (s.vGrid && vGridSelect) vGridSelect.value = s.vGrid; // NEU Dropdown setzen
                if (s.dur !== undefined && durationCurveCheckbox) durationCurveCheckbox.checked = s.dur;
                if (s.chartTitles) {
                    s.chartTitles.forEach((val, idx) => {
                        const input = getEl(`titleInput${idx+1}`);
                        const header = getEl(`chartHeader${idx+1}`);
                        if(input) input.value = val;
                        if(header) header.textContent = val;
                    });
                }
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