document.addEventListener('DOMContentLoaded', function () {
    // --- DOM ELEMENT REFERENCES ---
    const generateBtn = document.getElementById('generateChartBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const exportBtn = document.getElementById('exportSetupBtn');
    const importBtn = document.getElementById('importSetupBtn');
    const dataInput = document.getElementById('dataInput');
    const statusDiv = document.getElementById('status');
    const seriesConfigContainer = document.getElementById('seriesConfigContainer');
    const tooltipEl = document.querySelector('.u-tooltip');

    // --- VALUE FILTER REFERENCES ---
    const enableValueFilter = document.getElementById('enableValueFilter');
    const valueThreshold = document.getElementById('valueThreshold');
    const filterAction = document.getElementById('filterAction');
    const enableMinValueFilter = document.getElementById('enableMinValueFilter');
    const minValueThreshold = document.getElementById('minValueThreshold');
    const minFilterAction = document.getElementById('minFilterAction');

    // --- FORMULA COLUMN REFERENCES ---
    const createFormulaColumnBtn = document.getElementById('createFormulaColumnBtn');

    // --- STATE VARIABLES ---
    let parsedData = [];
    let uplotInstances = [null, null, null];
    let maxColumnCount = 0;
    let formulaColumns = []; // To store formula-based columns
    const seriesColors = ["#007bff", "#dc3545", "#28a745", "#ffc107", "#6f42c1", "#fd7e14", "#20c997", "#e83e8c", "#6610f2", "#17a2b8"];

    // --- EVENT LISTENERS ---
    generateBtn.addEventListener('click', () => {
        parseData();
        updateSeriesConfigInputs();
        drawCharts();
    });
    
    resetZoomBtn.addEventListener('click', () => {
        uplotInstances.forEach(p => p && p.setData(p.data));
    });

    exportBtn.addEventListener('click', exportSetup);
    importBtn.addEventListener('click', importSetup);

    createFormulaColumnBtn.addEventListener('click', createFormulaColumn);

    document.querySelectorAll('.weekday-filter, #hideTimeGapsCheckbox').forEach(element => {
        element.addEventListener('change', drawCharts);
    });
    
    [enableValueFilter, valueThreshold, filterAction, enableMinValueFilter, minValueThreshold, minFilterAction].forEach(element => {
        element.addEventListener('change', drawCharts);
    });
    
    window.addEventListener('resize', () => {
        uplotInstances.forEach((instance, i) => {
            if (instance) {
                const wrapper = document.getElementById(`chart-wrapper-${i + 1}`);
                instance.setSize({ width: wrapper.clientWidth - 20, height: wrapper.clientHeight - 50 });
            }
        });
    });

    // --- DATA PARSING & UI ---
    function parseData() {
        const lines = dataInput.value.trim().split('\n');
        parsedData = [];
        maxColumnCount = 0;
        formulaColumns = []; // Reset formula columns on new data import
        updateFormulaColumnsList(); // Clear the formula list UI

        lines.forEach(line => {
            const parts = line.trim().split('\t');
            if (parts.length < 2) return;

            const dateTimeString = parts[0].trim();
            const [datePart, timePart] = dateTimeString.split(' ');
            if (!datePart || !timePart) return;

            // Use a regular expression to split by either '.' or '/'
            const dateComponents = datePart.split(/[.\/]/).map(Number);
            if (dateComponents.length !== 3) return; 
            const [day, month, year] = dateComponents;

            // Handle time with optional seconds
            const timeComponents = timePart.split(':').map(Number);
            if (timeComponents.length < 2 || timeComponents.length > 3) return;
            const hour = timeComponents[0];
            const minute = timeComponents[1];
            const second = timeComponents[2] || 0; // Default seconds to 0 if not present

            if ([day, month, year, hour, minute, second].some(isNaN)) return;
            
            // The 'month' argument in new Date() is 0-indexed (0-11)
            const dateObject = new Date(year, month - 1, day, hour, minute, second);
            const timestamp = Math.floor(dateObject.getTime() / 1000);
            
            // Final check to ensure the date is valid and wasn't rolled over by the Date constructor
            if (isNaN(timestamp) || dateObject.getFullYear() !== year || dateObject.getMonth() !== month - 1 || dateObject.getDate() !== day) {
                 console.warn(`Skipping invalid date format: ${dateTimeString}`);
                 return;
            }
            
            const values = parts.slice(1).map(v => parseFloat(v.replace(',', '.')) || null);
            if (values.length > maxColumnCount) maxColumnCount = values.length;
            
            parsedData.push({ timestamp, dayOfWeek: dateObject.getDay(), values });
        });
        statusDiv.textContent = `${parsedData.length} Datenzeilen mit bis zu ${maxColumnCount} Wertespalten eingelesen.`;
    }

    function updateSeriesConfigInputs() {
        seriesConfigContainer.innerHTML = '';
        const totalColumns = maxColumnCount + formulaColumns.length;

        if (totalColumns === 0) {
            seriesConfigContainer.innerHTML = '<p class="placeholder">Bitte zuerst Daten verarbeiten.</p>';
            return;
        }

        for (let i = 0; i < totalColumns; i++) {
            const isFormulaColumn = i >= maxColumnCount;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'series-item';
            
            const label = isFormulaColumn ? `Formel ${i + 1}` : `Spalte ${i + 1}`;
            // Use the formula itself as the default name for a formula column
            const defaultValue = isFormulaColumn ? formulaColumns[i - maxColumnCount].formula : `Wert ${i + 1}`;

            itemDiv.innerHTML = `
                <span class="series-item-label">${label}</span>
                <input type="text" class="series-name-input" id="seriesName${i}" value="${defaultValue}" placeholder="Serienname">
                <select class="series-chart-select" id="seriesChartSelect${i}">
                    <option value="-1">Verbergen</option>
                    <option value="0">Chart 1</option>
                    <option value="1">Chart 2</option>
                    <option value="2">Chart 3</option>
                </select>
            `;
            
            itemDiv.querySelector('.series-name-input').addEventListener('input', drawCharts);
            itemDiv.querySelector('.series-chart-select').addEventListener('change', drawCharts);
            
            seriesConfigContainer.appendChild(itemDiv);
        }
    }

    // --- FORMULA COLUMN FUNCTIONS ---
    function createFormulaColumn() {
        const formula = document.getElementById('formulaInput').value.trim();
        if (!formula) {
            alert("Bitte geben Sie eine Formel ein.");
            return;
        }

        const columnRegex = /\{(\d+)\}/g;
        const columnsInFormula = [...formula.matchAll(columnRegex)].map(match => parseInt(match[1], 10) - 1);

        if (columnsInFormula.some(colIndex => colIndex >= maxColumnCount)) {
            alert("Fehler: Die Formel verweist auf eine Original-Spalte, die nicht existiert.");
            return;
        }

        const newColumnIndex = maxColumnCount + formulaColumns.length;
        const newColumn = { formula, columnIndex: newColumnIndex };

        formulaColumns.push(newColumn);
        applyFormulas();
        updateSeriesConfigInputs();
        drawCharts();
        updateFormulaColumnsList();
        document.getElementById('formulaInput').value = '';
    }

    function applyFormulas() {
        if (formulaColumns.length === 0 || parsedData.length === 0) return;

        parsedData.forEach(row => {
            // Ensure the values array is long enough to hold new formula results
            row.values.length = maxColumnCount + formulaColumns.length;

            formulaColumns.forEach(formulaCol => {
                let formulaToEvaluate = formulaCol.formula;
                const columnRegex = /\{(\d+)\}/g;
                
                formulaToEvaluate = formulaToEvaluate.replace(columnRegex, (match, colNum) => {
                    const colIndex = parseInt(colNum, 10) - 1;
                    const value = row.values[colIndex];
                    return value !== null ? value : 'null';
                });

                try {
                    const result = new Function(`return ${formulaToEvaluate}`)();
                    row.values[formulaCol.columnIndex] = (typeof result === 'number' && isFinite(result)) ? result : null;
                } catch (e) {
                    console.error("Fehler bei der Formel-Auswertung:", e);
                    row.values[formulaCol.columnIndex] = null;
                }
            });
        });
    }

    function updateFormulaColumnsList() {
        const listContainer = document.getElementById('formula-columns-list');
        listContainer.innerHTML = '';
        formulaColumns.forEach((col) => {
            const item = document.createElement('div');
            item.className = 'formula-item';
            item.textContent = `Spalte ${col.columnIndex + 1}: ${col.formula}`;
            listContainer.appendChild(item);
        });
    }

    // --- CHART DRAWING & SYNC ---
    function drawCharts() {
        uplotInstances.forEach(p => p && p.destroy());
        uplotInstances = [null, null, null];
        
        applyFormulas(); // Apply formulas before any filtering or drawing

        const selectedDays = Array.from(document.querySelectorAll('.weekday-filter:checked')).map(cb => parseInt(cb.value, 10));
        let dataToDisplay = parsedData.filter(point => selectedDays.includes(point.dayOfWeek));
        
        // Apply MAX value filter
        const isMaxFilterEnabled = enableValueFilter.checked;
        const maxThreshold = parseFloat(valueThreshold.value);
        const maxAction = filterAction.value;

        if (isMaxFilterEnabled && !isNaN(maxThreshold)) {
            if (maxAction === 'replace') {
                dataToDisplay = dataToDisplay.map(point => ({ ...point, values: point.values.map(v => (v !== null && v > maxThreshold) ? null : v) }));
            } else {
                dataToDisplay = dataToDisplay.filter(point => point.values.every(v => v === null || v <= maxThreshold));
            }
        }
        
        // Apply MIN value filter
        const isMinFilterEnabled = enableMinValueFilter.checked;
        const minThreshold = parseFloat(minValueThreshold.value);
        const minAction = minFilterAction.value;

        if (isMinFilterEnabled && !isNaN(minThreshold)) {
            if (minAction === 'replace') {
                dataToDisplay = dataToDisplay.map(point => ({ ...point, values: point.values.map(v => (v !== null && v < minThreshold) ? null : v) }));
            } else {
                dataToDisplay = dataToDisplay.filter(point => point.values.every(v => v === null || v >= minThreshold));
            }
        }
        
        if (dataToDisplay.length === 0) {
            for (let i = 1; i <= 3; i++) document.getElementById(`chartContainer${i}`).innerHTML = '<p class="placeholder">Keine Daten zum Anzeigen.</p>';
            return;
        }
        
        const hideGaps = document.getElementById('hideTimeGapsCheckbox').checked;
        const xValues = hideGaps ? dataToDisplay.map((_, i) => i) : dataToDisplay.map(p => p.timestamp);
        const totalColumns = maxColumnCount + formulaColumns.length;
        const syncKey = uPlot.sync("my-sync-group");

        for (let i = 0; i < 3; i++) {
            const chartContainer = document.getElementById(`chartContainer${i+1}`);
            chartContainer.innerHTML = '';
            
            const seriesForThisChart = [];
            for (let j = 0; j < totalColumns; j++) {
                const selectEl = document.getElementById(`seriesChartSelect${j}`);
                if (selectEl && parseInt(selectEl.value, 10) === i) {
                    seriesForThisChart.push(j);
                }
            }
            
            if (seriesForThisChart.length === 0) {
                chartContainer.innerHTML = '<p class="placeholder">Dieser Chart hat keine zugewiesenen Spalten.</p>';
                continue;
            }

            const uplotData = [xValues];
            const uplotSeriesConfig = [{}];
            
            seriesForThisChart.forEach(colIndex => {
                uplotData.push(dataToDisplay.map(p => p.values[colIndex] || null));
                const nameInput = document.getElementById(`seriesName${colIndex}`);
                uplotSeriesConfig.push({
                    label: nameInput ? nameInput.value : `Spalte ${colIndex + 1}`,
                    stroke: seriesColors[colIndex % seriesColors.length],
                    width: 1.5,
                    spanGaps: true
                });
            });

            const opts = {
                width: chartContainer.clientWidth,
                height: chartContainer.clientHeight,
                series: uplotSeriesConfig,
                cursor: { sync: { key: syncKey, setCursor: true, setSelect: true } },
                axes: [ { values: hideGaps ? (self, ticks) => ticks.map(tickIndex => { const point = dataToDisplay[Math.round(tickIndex)]; return point ? new Date(point.timestamp * 1000).toLocaleDateString('de-DE') : ''; }) : null }, {} ],
                plugins: [{ hooks: {
                    setCursor: (u) => {
                        const { idx } = u.cursor;
                        if (idx == null) { tooltipEl.style.display = 'none'; return; }
                        const timestamp = hideGaps ? dataToDisplay[idx].timestamp : u.data[0][idx];
                        const date = new Date(timestamp * 1000).toLocaleString('de-DE', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                        let content = `<div><strong>${date}</strong></div>`;
                        u.series.forEach((s, k) => {
                            if (k > 0 && s.show) {
                               const value = u.data[k][idx];
                               content += `<div style="color:${s.stroke}">${s.label}: ${value != null ? value.toFixed(3) : 'N/A'}</div>`;
                            }
                        });
                        tooltipEl.innerHTML = content;
                        tooltipEl.style.display = 'block';
                        const chartRect = u.root.getBoundingClientRect();
                        const areaRect = document.getElementById('charts-area').getBoundingClientRect();
                        tooltipEl.style.left = `${chartRect.left - areaRect.left + u.cursor.left + 10}px`;
                        tooltipEl.style.top = `${chartRect.top - areaRect.top + u.cursor.top + 10}px`;
                    }
                }}]
            };
            
            uplotInstances[i] = new uPlot(opts, uplotData, chartContainer);
        }
    }

    // --- IMPORT / EXPORT SETUP ---
    function exportSetup() {
        if (maxColumnCount === 0) {
            alert("Bitte zuerst Daten verarbeiten, bevor ein Layout exportiert wird.");
            return;
        }
        const totalColumns = maxColumnCount + formulaColumns.length;
        const setup = {
            weekdays: Array.from(document.querySelectorAll('.weekday-filter:checked')).map(cb => parseInt(cb.value)),
            hideGaps: document.getElementById('hideTimeGapsCheckbox').checked,
            valueFilter: {
                enabled: enableValueFilter.checked,
                threshold: valueThreshold.value,
                action: filterAction.value
            },
            minValueFilter: {
                enabled: enableMinValueFilter.checked,
                threshold: minValueThreshold.value,
                action: minFilterAction.value
            },
            series: [],
            // Note: Formulas are not exported as they depend on the current data structure.
        };
        for (let i = 0; i < totalColumns; i++) {
            setup.series.push({
                name: document.getElementById(`seriesName${i}`).value,
                chartIndex: document.getElementById(`seriesChartSelect${i}`).value
            });
        }
        const blob = new Blob([JSON.stringify(setup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard-layout.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importSetup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const setup = JSON.parse(event.target.result);
                    applySetup(setup);
                } catch (err) {
                    alert("Fehler beim Lesen der Konfigurationsdatei: " + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function applySetup(setup) {
        if (!setup || !setup.series) {
            alert("Ungültige Konfigurationsdatei.");
            return;
        }
        // Assuming formulas are not part of the layout, we match against original columns + existing formulas
        const totalColumns = maxColumnCount + formulaColumns.length;
        if (setup.series.length !== totalColumns) {
            alert(`Layout-Fehler: Das Layout ist für ${setup.series.length} Spalten, aber die aktuellen Daten haben ${totalColumns}. Bitte zuerst passende Daten laden oder Formeln anpassen.`);
            return;
        }

        document.querySelectorAll('.weekday-filter').forEach(cb => cb.checked = setup.weekdays.includes(parseInt(cb.value)));
        document.getElementById('hideTimeGapsCheckbox').checked = setup.hideGaps;

        if (setup.valueFilter) {
            enableValueFilter.checked = setup.valueFilter.enabled;
            valueThreshold.value = setup.valueFilter.threshold;
            filterAction.value = setup.valueFilter.action;
        }

        if (setup.minValueFilter) {
            enableMinValueFilter.checked = setup.minValueFilter.enabled;
            minValueThreshold.value = setup.minValueFilter.threshold;
            minFilterAction.value = setup.minValueFilter.action;
        }

        for (let i = 0; i < setup.series.length; i++) {
            document.getElementById(`seriesName${i}`).value = setup.series[i].name;
            document.getElementById(`seriesChartSelect${i}`).value = setup.series[i].chartIndex;
        }
        
        drawCharts();
        statusDiv.textContent = "Layout erfolgreich importiert und angewendet.";
    }

    drawCharts(); // Initial draw on page load
});
