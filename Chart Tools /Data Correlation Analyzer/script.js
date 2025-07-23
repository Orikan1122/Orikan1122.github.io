document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dataSet1Input = document.getElementById('data-set-1');
    const dataSet2Input = document.getElementById('data-set-2');
    const processButton = document.getElementById('process-button');
    const chartDiv = document.getElementById('chart');
    const chartPlaceholder = document.getElementById('chart-placeholder');
    const resultsContainer = document.getElementById('results-container');
    const manualAInput = document.getElementById('manual-a');
    const manualBInput = document.getElementById('manual-b');

    // Filter DOM Elements
    const minYInput = document.getElementById('min-y-value'); // ADDED
    const maxYInput = document.getElementById('max-y-value');
    const minXInput = document.getElementById('min-x-value'); // ADDED
    const maxXInput = document.getElementById('max-x-value'); // ADDED
    const weekdayCheckboxes = document.querySelectorAll('.weekday-selector input[type="checkbox"]');

    // App State
    let originalData = [];
    let excludedPoints = new Set(); // Stores indices of individually excluded points

    // Event Listeners
    processButton.addEventListener('click', runAnalysis);
    
    // ADDED new filter inputs to the event listener list
    [minYInput, maxYInput, minXInput, maxXInput, manualAInput, manualBInput, ...weekdayCheckboxes].forEach(el => {
        el.addEventListener('change', () => {
            if (originalData.length > 0) updateChart();
        });
    });

    function runAnalysis() {
        const rawData1 = dataSet1Input.value;
        const rawData2 = dataSet2Input.value;

        if (!rawData1 || !rawData2) {
            alert("Please paste data into both text areas.");
            return;
        }

        const parsedData1 = parseData(rawData1);
        const parsedData2 = parseData(rawData2);

        originalData = mergeData(parsedData1, parsedData2);
        
        if (originalData.length === 0) {
            alert("No matching dates found between the two datasets. Please check your data format (DD/MM/YYYY).");
            return;
        }

        excludedPoints.clear(); // Reset individual exclusions on new analysis
        chartPlaceholder.style.display = 'none';
        chartDiv.style.display = 'block';

        updateChart();
    }
    
    // --- DATA PROCESSING FUNCTIONS ---

    function parseData(rawData) {
        return rawData.trim().split('\n')
            .map(line => {
                const parts = line.split(/\s+/); // Split by one or more spaces/tabs
                if (parts.length < 2) return null;
                
                const dateStr = parts[0];
                const value = parseFloat(parts[parts.length - 1]);

                const dateParts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (!dateParts || isNaN(value)) return null;

                const [_, day, month, year] = dateParts;
                // JS Date is (year, monthIndex, day)
                const dateObj = new Date(year, month - 1, day);
                return { date: dateObj, value };
            })
            .filter(item => item !== null);
    }

    function mergeData(data1, data2) {
        const dataMap = new Map();
        // Use YYYY-MM-DD as a reliable key
        const toKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        data1.forEach(item => {
            dataMap.set(toKey(item.date), { y: item.value, date: item.date });
        });

        const merged = [];
        data2.forEach(item => {
            const key = toKey(item.date);
            if (dataMap.has(key)) {
                const entry = dataMap.get(key);
                merged.push({ 
                    x: item.value, 
                    y: entry.y, 
                    date: entry.date,
                    dayOfWeek: entry.date.getDay() 
                });
            }
        });

        return merged.map((p, index) => ({...p, originalIndex: index}));
    }

    // --- FILTERING ---
    
    // UPDATED applyFilters function with new range checks
    function applyFilters() {
        const minY = parseFloat(minYInput.value);
        const maxY = parseFloat(maxYInput.value);
        const minX = parseFloat(minXInput.value);
        const maxX = parseFloat(maxXInput.value);

        const includedDays = new Set();
        weekdayCheckboxes.forEach(cb => {
            if (cb.checked) includedDays.add(parseInt(cb.value));
        });

        return originalData.filter(point => {
            if (excludedPoints.has(point.originalIndex)) return false; // Individual exclusion
            
            // Value range filters (check for NaN to ignore empty inputs)
            if (!isNaN(minY) && point.y < minY) return false;
            if (!isNaN(maxY) && point.y > maxY) return false;
            if (!isNaN(minX) && point.x < minX) return false;
            if (!isNaN(maxX) && point.x > maxX) return false;

            if (!includedDays.has(point.dayOfWeek)) return false; // Weekday filter
            return true;
        });
    }


    // --- CHART & ANALYSIS UPDATE (No changes below this line, but included for completeness) ---

    function updateChart() {
        const filteredData = applyFilters();
        
        if (filteredData.length < 2) {
            resultsContainer.innerHTML = `<p class="placeholder">Not enough data points (${filteredData.length}) after filtering to perform analysis.</p>`;
            Plotly.purge(chartDiv);
            return;
        }

        const dataForRegression = filteredData.map(p => [p.x, p.y]);
        
        // Calculate Trendlines
        const linear = regression.linear(dataForRegression);
        const exponential = regression.exponential(dataForRegression);
        const logarithmic = regression.logarithmic(dataForRegression);
        const polynomial = regression.polynomial(dataForRegression, { order: 2 });

        displayResults({ linear, exponential, logarithmic, polynomial });
        
        if (!manualAInput.value) manualAInput.value = linear.equation[0].toFixed(4);
        if (!manualBInput.value) manualBInput.value = linear.equation[1].toFixed(4);
        
        const manualA = parseFloat(manualAInput.value);
        const manualB = parseFloat(manualBInput.value);
        
        const xValues = filteredData.map(p => p.x);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);

        const activePointsTrace = {
            x: xValues,
            y: filteredData.map(p => p.y),
            text: filteredData.map(p => `Date: ${p.date.toLocaleDateString()}<br>X: ${p.x.toFixed(2)}<br>Y: ${p.y.toFixed(2)}`),
            mode: 'markers',
            type: 'scatter',
            name: 'Active Data',
            marker: { color: 'var(--accent-color)', size: 8 }
        };

        const excludedPointsData = originalData.filter(p => excludedPoints.has(p.originalIndex));
        const excludedPointsTrace = {
            x: excludedPointsData.map(p => p.x),
            y: excludedPointsData.map(p => p.y),
            text: excludedPointsData.map(p => `EXCLUDED<br>Date: ${p.date.toLocaleDateString()}<br>X: ${p.x.toFixed(2)}<br>Y: ${p.y.toFixed(2)}`),
            mode: 'markers',
            type: 'scatter',
            name: 'Excluded Points',
            marker: { color: 'var(--text-muted-color)', size: 8, symbol: 'x' }
        };
        
        const traces = [
            getTrendlineTrace(linear, xMin, xMax, 'Linear'),
            getTrendlineTrace(exponential, xMin, xMax, 'Exponential'),
            getTrendlineTrace(logarithmic, xMin, xMax, 'Logarithmic'),
            getTrendlineTrace(polynomial, xMin, xMax, 'Polynomial (2nd)'),
            activePointsTrace,
            excludedPointsTrace
        ];
        
        if (!isNaN(manualA) && !isNaN(manualB)) {
             traces.push(getManualLineTrace(manualA, manualB, xMin, xMax));
        }

        const layout = {
            title: 'Correlation Scatter Plot',
            xaxis: { title: 'Dataset 2 Value (X-Axis)', color: 'var(--text-color)', gridcolor: 'var(--border-color)' },
            yaxis: { title: 'Dataset 1 Value (Y-Axis)', color: 'var(--text-color)', gridcolor: 'var(--border-color)' },
            paper_bgcolor: 'var(--card-bg-color)',
            plot_bgcolor: 'var(--bg-color)',
            font: { color: 'var(--text-color)' },
            legend: { x: 1, xanchor: 'right', y: 1 },
            hovermode: 'closest'
        };

        Plotly.react(chartDiv, traces, layout);
    }

    function getTrendlineTrace(model, xMin, xMax, name) {
        const x = [];
        const y = [];
        for (let i = 0; i < 100; i++) {
            const currentX = xMin + (xMax - xMin) * (i / 99);
            if (name === 'Logarithmic' && currentX <= 0) continue;
            x.push(currentX);
            y.push(model.predict(currentX)[1]);
        }
        return { x, y, mode: 'lines', type: 'scatter', name };
    }
    
    function getManualLineTrace(a, b, xMin, xMax) {
        return {
            x: [xMin, xMax],
            y: [a * xMin + b, a * xMax + b],
            mode: 'lines',
            type: 'scatter',
            name: 'Manual Line',
            line: { dash: 'dot', color: 'var(--danger-color)', width: 3 }
        };
    }

    function displayResults(models) {
        resultsContainer.innerHTML = `
            <div class="result-item">
                <h3>Linear</h3>
                <p><span>Formula:</span> y = ${models.linear.string}</p>
                <p><span>R²:</span> ${models.linear.r2.toFixed(4)}</p>
            </div>
            <div class="result-item">
                <h3>Logarithmic</h3>
                <p><span>Formula:</span> y = ${models.logarithmic.string}</p>
                <p><span>R²:</span> ${models.logarithmic.r2.toFixed(4)}</p>
            </div>
            <div class="result-item">
                <h3>Exponential</h3>
                <p><span>Formula:</span> y = ${models.exponential.string}</p>
                <p><span>R²:</span> ${models.exponential.r2.toFixed(4)}</p>
            </div>
            <div class="result-item">
                <h3>Polynomial (2nd order)</h3>
                <p><span>Formula:</span> y = ${models.polynomial.string}</p>
                <p><span>R²:</span> ${models.polynomial.r2.toFixed(4)}</p>
            </div>
        `;
    }

    chartDiv.on('plotly_click', (data) => {
        if (data.points.length > 0) {
            const point = data.points[0];
            if (point.curveNumber < 4) return;
            if (point.data.name !== 'Active Data') return;

            const pointIndex = point.pointIndex;
            const filteredData = applyFilters();
            const originalPointIndex = filteredData[pointIndex].originalIndex;

            if (excludedPoints.has(originalPointIndex)) {
                excludedPoints.delete(originalPointIndex);
            } else {
                excludedPoints.add(originalPointIndex);
            }
            updateChart();
        }
    });

});