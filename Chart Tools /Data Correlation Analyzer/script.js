document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dataSet1Input = document.getElementById('data-set-1');
    const dataSet2Input = document.getElementById('data-set-2');
    const processButton = document.getElementById('process-button');
    const exportButton = document.getElementById('export-button');
    const chartDiv = document.getElementById('chart');
    const chartPlaceholder = document.getElementById('chart-placeholder');
    const resultsContainer = document.getElementById('results-container');
    const manualAInput = document.getElementById('manual-a');
    const manualBInput = document.getElementById('manual-b');

    // Filter DOM Elements
    const minYInput = document.getElementById('min-y-value');
    const maxYInput = document.getElementById('max-y-value');
    const minXInput = document.getElementById('min-x-value');
    const maxXInput = document.getElementById('max-x-value');
    const weekdayCheckboxes = document.querySelectorAll('.weekday-selector input[type="checkbox"]');

    // App State
    let originalData = [];
    let excludedPoints = new Set(); 
    let isNewAnalysis = false; 
    let currentResults = {};

    // Event Listeners
    processButton.addEventListener('click', runAnalysis);
    exportButton.addEventListener('click', exportReport);
    
    [minYInput, maxYInput, minXInput, maxXInput, manualAInput, manualBInput, ...weekdayCheckboxes].forEach(el => {
        el.addEventListener('change', () => {
            if (originalData.length > 0) {
                if(el === manualAInput || el === manualBInput) isNewAnalysis = false;
                updateChart();
            }
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
            alert("No matching dates found. Please use DD/MM/YYYY or DD.MM.YYYY.");
            return;
        }

        excludedPoints.clear();
        chartPlaceholder.style.display = 'none';
        chartDiv.style.display = 'block';
        exportButton.style.display = 'block';

        isNewAnalysis = true; 
        updateChart();
    }
    
    // --- DATA PROCESSING FUNCTIONS ---

    function parseData(rawData) {
        return rawData.trim().split('\n')
            .map(line => {
                const parts = line.split(/\s+/);
                if (parts.length < 2) return null;
                
                const dateStr = parts[0];
                const value = parseFloat(parts[parts.length - 1]);

                // Matches 16/03/2025 or 01.01.2025
                const dateParts = dateStr.match(/(\d{2})[\/\.](\d{2})[\/\.](\d{4})/);
                
                if (!dateParts || isNaN(value)) return null;

                const [_, day, month, year] = dateParts;
                const dateObj = new Date(year, month - 1, day);
                return { date: dateObj, value };
            })
            .filter(item => item !== null);
    }

    function mergeData(data1, data2) {
        const dataMap = new Map();
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
            if (excludedPoints.has(point.originalIndex)) return false;
            
            if (!isNaN(minY) && point.y < minY) return false;
            if (!isNaN(maxY) && point.y > maxY) return false;
            if (!isNaN(minX) && point.x < minX) return false;
            if (!isNaN(maxX) && point.x > maxX) return false;

            if (!includedDays.has(point.dayOfWeek)) return false;
            return true;
        });
    }

    function calculateR2(data, a, b) {
        if (data.length < 2) return 0;
        
        const n = data.length;
        let sumY = 0;
        let ssTot = 0;
        let ssRes = 0;

        for (let i = 0; i < n; i++) sumY += data[i][1];
        const meanY = sumY / n;

        for (let i = 0; i < n; i++) {
            const x = data[i][0];
            const y = data[i][1];
            const yPred = (a * x) + b; 

            ssTot += Math.pow(y - meanY, 2);
            ssRes += Math.pow(y - yPred, 2);
        }

        if (ssTot === 0) return 1; 
        return 1 - (ssRes / ssTot);
    }

    // --- CHART & UPDATE ---

    function updateChart() {
        const filteredData = applyFilters();
        
        if (filteredData.length < 2) {
            resultsContainer.innerHTML = `<p class="placeholder">Not enough data points (${filteredData.length}) after filtering.</p>`;
            Plotly.purge(chartDiv);
            return;
        }

        const dataForRegression = filteredData.map(p => [p.x, p.y]);
        
        const autoLinear = regression.linear(dataForRegression);
        const exponential = regression.exponential(dataForRegression);
        const logarithmic = regression.logarithmic(dataForRegression);
        const polynomial = regression.polynomial(dataForRegression, { order: 2 });

        let linearA, linearB, linearString, linearR2;

        if (isNewAnalysis) {
            linearA = autoLinear.equation[0];
            linearB = autoLinear.equation[1];
            manualAInput.value = linearA.toFixed(4);
            manualBInput.value = linearB.toFixed(4);
            isNewAnalysis = false; 
            linearR2 = autoLinear.r2;
            linearString = autoLinear.string;
        } else {
            linearA = parseFloat(manualAInput.value);
            linearB = parseFloat(manualBInput.value);
            
            if (isNaN(linearA) || isNaN(linearB)) {
                linearA = autoLinear.equation[0];
                linearB = autoLinear.equation[1];
            }

            linearR2 = calculateR2(dataForRegression, linearA, linearB);
            const sign = linearB >= 0 ? '+ ' : '- ';
            linearString = `y = ${linearA}x ${sign} ${Math.abs(linearB)}`;
        }

        currentResults = {
            linear: { string: linearString, r2: linearR2, a: linearA, b: linearB },
            exponential: exponential,
            logarithmic: logarithmic,
            polynomial: polynomial,
            dataCount: filteredData.length
        };

        displayResults(currentResults);
        
        const xValues = filteredData.map(p => p.x);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);

        const activePointsTrace = {
            x: xValues,
            y: filteredData.map(p => p.y),
            text: filteredData.map(p => `Date: ${p.date.toLocaleDateString()}<br>X: ${p.x.toFixed(4)}<br>Y: ${p.y.toFixed(2)}`),
            mode: 'markers',
            type: 'scatter',
            name: 'Active Data',
            marker: { color: 'var(--accent-color)', size: 8 }
        };

        const linearTrace = {
            x: [xMin, xMax],
            y: [(linearA * xMin + linearB), (linearA * xMax + linearB)],
            mode: 'lines',
            type: 'scatter',
            name: 'Linear', 
            line: { color: '#2ecc71', width: 3 }
        };

        const traces = [
            linearTrace,
            getTrendlineTrace(exponential, xMin, xMax, 'Exponential', '#e67e22'),
            getTrendlineTrace(logarithmic, xMin, xMax, 'Logarithmic', '#9b59b6'),
            getTrendlineTrace(polynomial, xMin, xMax, 'Polynomial (2nd)', '#e74c3c'),
            activePointsTrace
        ];
        
        const excludedPointsData = originalData.filter(p => excludedPoints.has(p.originalIndex));
        if (excludedPointsData.length > 0) {
            traces.push({
                x: excludedPointsData.map(p => p.x),
                y: excludedPointsData.map(p => p.y),
                text: excludedPointsData.map(p => `EXCLUDED<br>Date: ${p.date.toLocaleDateString()}`),
                mode: 'markers',
                type: 'scatter',
                name: 'Excluded',
                marker: { color: 'var(--text-muted-color)', size: 6, symbol: 'x' }
            });
        }

        const layout = {
            title: 'Correlation Scatter Plot',
            xaxis: { title: 'Dataset 2 Value (X)', color: 'var(--text-color)', gridcolor: 'var(--border-color)' },
            yaxis: { title: 'Dataset 1 Value (Y)', color: 'var(--text-color)', gridcolor: 'var(--border-color)' },
            paper_bgcolor: 'var(--card-bg-color)',
            plot_bgcolor: 'var(--bg-color)',
            font: { color: 'var(--text-color)' },
            legend: { x: 1, xanchor: 'right', y: 1 },
            hovermode: 'closest'
        };

        Plotly.react(chartDiv, traces, layout);
    }

    function getTrendlineTrace(model, xMin, xMax, name, color) {
        const x = [];
        const y = [];
        const steps = 50;
        for (let i = 0; i <= steps; i++) {
            const currentX = xMin + (xMax - xMin) * (i / steps);
            if (name === 'Logarithmic' && currentX <= 0) continue;
            x.push(currentX);
            y.push(model.predict(currentX)[1]);
        }
        return { x, y, mode: 'lines', type: 'scatter', name, line: { color: color, width: 2, dash: 'dash' } };
    }

    function displayResults(models) {
        resultsContainer.innerHTML = `
            <div class="result-item" style="border-left: 4px solid #2ecc71; padding-left: 10px;">
                <h3>Linear (Current Setting)</h3>
                <p><span>Formula:</span> ${models.linear.string.replace('y =', 'y ≈')}</p>
                <p><span>R²:</span> ${models.linear.r2.toFixed(4)}</p>
            </div>
            <div class="result-item">
                <h3>Logarithmic</h3>
                <p><span>Formula:</span> ${models.logarithmic.string}</p>
                <p><span>R²:</span> ${models.logarithmic.r2.toFixed(4)}</p>
            </div>
            <div class="result-item">
                <h3>Exponential</h3>
                <p><span>Formula:</span> ${models.exponential.string}</p>
                <p><span>R²:</span> ${models.exponential.r2.toFixed(4)}</p>
            </div>
            <div class="result-item">
                <h3>Polynomial (2nd)</h3>
                <p><span>Formula:</span> ${models.polynomial.string}</p>
                <p><span>R²:</span> ${models.polynomial.r2.toFixed(4)}</p>
            </div>
        `;
    }

    // --- PDF EXPORT FUNCTION ---
    async function exportReport() {
        if (!currentResults || !currentResults.linear) return;

        // Access jsPDF from global window object
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const now = new Date();

        // 1. Text Content Configuration
        const margin = 15;
        let yPos = 20;

        // Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Correlation Analysis Report", margin, yPos);
        yPos += 10;

        // Metadata
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${now.toLocaleString()}`, margin, yPos);
        yPos += 10;
        
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, 195, yPos);
        yPos += 10;

        // Analysis Summary
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("1. Analysis Summary", margin, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Data Points Analyzed: ${currentResults.dataCount}`, margin, yPos); yPos += 6;
        doc.text(`Original Data Points: ${originalData.length}`, margin, yPos); yPos += 6;
        doc.text(`Points Excluded: ${excludedPoints.size}`, margin, yPos); yPos += 10;

        // Linear Results
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("2. Primary Linear Calculation (Active)", margin, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Formula: ${currentResults.linear.string}`, margin, yPos); yPos += 6;
        doc.text(`Slope (a): ${currentResults.linear.a.toFixed(6)}`, margin, yPos); yPos += 6;
        doc.text(`Intercept (b): ${currentResults.linear.b.toFixed(6)}`, margin, yPos); yPos += 6;
        doc.text(`Correlation (R²): ${currentResults.linear.r2.toFixed(6)}`, margin, yPos); yPos += 10;

        // Other Models
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("3. Comparative Models", margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Logarithmic R²: ${currentResults.logarithmic.r2.toFixed(6)}`, margin, yPos); yPos += 5;
        doc.text(`Exponential R²: ${currentResults.exponential.r2.toFixed(6)}`, margin, yPos); yPos += 5;
        doc.text(`Polynomial (2nd) R²: ${currentResults.polynomial.r2.toFixed(6)}`, margin, yPos); yPos += 10;

        // 2. Add Chart Image
        // Get chart image as base64 string
        try {
            const imgData = await Plotly.toImage(chartDiv, {format: 'png', width: 800, height: 500});
            
            // Add image to PDF (x, y, width, height)
            // A4 page width is approx 210mm. 
            doc.addImage(imgData, 'PNG', margin, yPos, 180, 110);
        } catch (e) {
            console.error("Error generating chart image", e);
            doc.text("Error generating chart image.", margin, yPos + 10);
        }

        // Save
        doc.save(`Analysis_Report_${now.toISOString().slice(0,10)}.pdf`);
    }

    chartDiv.on('plotly_click', (data) => {
        if (data.points.length > 0) {
            const point = data.points[0];
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