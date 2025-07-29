document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const statusEl = document.getElementById('status');
    const downloadBtn = document.getElementById('downloadCSV');
    const updateBtn = document.getElementById('updateData');
    const ctx = document.getElementById('climateChart').getContext('2d');

    // --- DATA SOURCES ---
    const PROXY_URL = "https://api.allorigins.win/raw?url=";
    const GISS_CO2_URL = "https://data.giss.nasa.gov/modelforce/ghgases/Fig1A.ext.txt";
    const GML_CO2_URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_gl.txt";
    // Using a simpler, more direct file for temperature data.
    const BERKELEY_TEMP_URL = "http://berkeleyearth.lbl.gov/auto/Global/Complete_TAVG_complete.txt";
    
    let climateChart;
    let finalMergedData = []; // To store the processed data for download

    // --- LIVE DATA PARSING FUNCTIONS ---

    function parseGissCo2(text) {
        const lines = text.split('\n');
        const data = [];
        let dataStarted = false;
        for (const line of lines) {
            if (line.includes('Ice-') && line.includes('1850')) dataStarted = true;
            if (!dataStarted || !line.trim() || line.startsWith('-') || line.startsWith('Refer')) continue;

            const parts = line.trim().split(/\s+/);
            for (let i = 0; i < parts.length; i++) {
                if (/^\d{4}$/.test(parts[i]) && !isNaN(parseFloat(parts[i + 1]))) {
                    data.push({ Year: parseInt(parts[i]), CO2_Annual: parseFloat(parts[i + 1]) });
                    i++;
                }
            }
        }
        return data;
    }

    function parseGmlCo2(text) {
        return text.trim().split('\n')
            .filter(line => !line.startsWith('#'))
            .map(line => {
                const parts = line.trim().split(/\s+/);
                return { Year: parseInt(parts[0]), Month: parseInt(parts[1]), CO2: parseFloat(parts[3]) };
            });
    }

    function parseBerkeleyTemp(text) {
        return text.trim().split('\n')
            .filter(line => !line.startsWith('%') && line.trim())
            .map(line => {
                const parts = line.trim().split(/\s+/);
                // The Monthly Anomaly is the 3rd column (index 2)
                return { Year: parseInt(parts[0]), Month: parseInt(parts[1]), Temperature_Anomaly: parseFloat(parts[2]) };
            });
    }

    // --- DATA PROCESSING & MERGING ---

    function processAndMergeData(gissData, gmlData, tempData) {
        const gissMap = new Map(gissData.map(i => [i.Year, i.CO2_Annual]));
        const gmlMap = new Map(gmlData.map(i => [`${i.Year}-${i.Month}`, i.CO2]));

        const merged = tempData.map(tempRow => {
            const { Year, Month } = tempRow;
            let co2 = null;
            const gmlKey = `${Year}-${Month}`;

            if (gmlMap.has(gmlKey)) {
                co2 = gmlMap.get(gmlKey);
            } else {
                const prevYearData = gissMap.get(Year - 1);
                const currentYearData = gissMap.get(Year);
                if (prevYearData && currentYearData) {
                    const co2Diff = currentYearData - prevYearData;
                    co2 = prevYearData + (co2Diff * (Month - 1) / 12);
                } else if (currentYearData) {
                    co2 = currentYearData;
                }
            }
            
            return {
                Date: new Date(Year, Month - 1),
                Temperature_Anomaly: tempRow.Temperature_Anomaly,
                CO2: co2 ? parseFloat(co2.toFixed(2)) : null
            };
        });
        
        return merged.filter(row => row.Date.getFullYear() >= 1900 && row.CO2 !== null);
    }

    // --- CHART & UI FUNCTIONS ---

    function renderChart(data, source) {
        if (climateChart) climateChart.destroy();

        climateChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Temperature Anomaly (°C)',
                    data: data,
                    parsing: { xAxisKey: 'Date', yAxisKey: 'Temperature_Anomaly' },
                    borderColor: '#e74c3c', yAxisID: 'y', borderWidth: 1.5, pointRadius: 0
                }, {
                    label: 'CO2 (ppm)',
                    data: data,
                    parsing: { xAxisKey: 'Date', yAxisKey: 'CO2' },
                    borderColor: '#3498db', yAxisID: 'y1', borderWidth: 1.5, pointRadius: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                    y: { position: 'left', title: { display: true, text: 'Temperature Anomaly (°C)', color: '#e74c3c' }, ticks: { color: '#e74c3c' } },
                    y1: { position: 'right', title: { display: true, text: 'CO2 (ppm)', color: '#3498db' }, ticks: { color: '#3498db' }, grid: { drawOnChartArea: false } }
                }
            }
        });
        statusEl.textContent = `Data loaded successfully from ${source}. Displaying ${data.length} records.`;
    }

    function downloadDataAsCSV() {
        if (finalMergedData.length === 0) return;
        const headers = "Date,Temperature_Anomaly_C,CO2_ppm";
        const rows = finalMergedData.map(d => `${d.Date.toISOString().split('T')[0]},${d.Temperature_Anomaly},${d.CO2}`).join('\n');
        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'global_climate_data_live.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // --- MAIN EXECUTION LOGIC ---

    async function loadAndDisplayData() {
        downloadBtn.disabled = true;
        updateBtn.disabled = true;
        statusEl.textContent = 'Attempting to fetch live data from sources...';

        try {
            const [gissText, gmlText, tempText] = await Promise.all([
                fetch(PROXY_URL + encodeURIComponent(GISS_CO2_URL)).then(res => res.text()),
                fetch(PROXY_URL + encodeURIComponent(GML_CO2_URL)).then(res => res.text()),
                fetch(PROXY_URL + encodeURIComponent(BERKELEY_TEMP_URL)).then(res => res.text())
            ]);
            
            statusEl.textContent = 'Parsing live data...';
            const gissData = parseGissCo2(gissText);
            const gmlData = parseGmlCo2(gmlText);
            const tempData = parseBerkeleyTemp(tempText);
            
            statusEl.textContent = 'Processing and merging live data...';
            finalMergedData = processAndMergeData(gissData, gmlData, tempData);

            renderChart(finalMergedData, 'Live Web Sources');
            downloadBtn.disabled = false;

        } catch (error) {
            console.error("Live data fetch failed:", error);
            statusEl.textContent = 'Live data fetch failed. Loading fallback data instead.';
            loadFallbackData(); // Call the fallback function on error
        } finally {
            updateBtn.disabled = false;
        }
    }
    
    // --- FALLBACK DATA FUNCTION ---

    function loadFallbackData() {
        const fallbackCsvData = `Year,Month,Temperature_Anomaly,CO2
        1900,1,-0.285,295.7
        1900,2,0.098,295.7
        ... (the rest of the CSV data you provided earlier) ...
        2025,5,1.078,383.4
        2025,6,1.039,384.2`; // NOTE: You need to paste the full data here.

        const data = parseFallbackCsv(fallbackCsvData).map(row => ({
            ...row,
            Date: new Date(row.Year, row.Month - 1)
        }));

        finalMergedData = data;
        renderChart(data, 'Cached Fallback');
        downloadBtn.disabled = false;
    }
    
    function parseFallbackCsv(csvString) {
        const lines = csvString.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = parseFloat(values[i]);
            });
            return obj;
        });
    }

    // --- INITIAL LOAD ---
    loadAndDisplayData();

    // --- EVENT LISTENERS ---
    updateBtn.addEventListener('click', loadAndDisplayData);
    downloadBtn.addEventListener('click', downloadDataAsCSV);

    // --- Abridged Fallback Data ---
    // In the code above, paste the full CSV content you have into the `fallbackCsvData` variable for a complete fallback.
    // I am only including a small sample here to keep the code block readable.
    const fallbackCsvData = `Year,Month,Temperature_Anomaly,CO2
    1900,1,-0.285,295.7
    1900,2,0.098,295.7
    1900,3,-0.093,295.7
    2023,10,1.404,418.85
    2023,11,1.407,420.4
    2023,12,1.379,421.51
    2024,1,1.245,422.26
    2024,2,1.373,422.82
    2024,3,1.27,423.41`;
});