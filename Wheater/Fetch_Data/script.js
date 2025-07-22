document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const startDateInput = document.getElementById('start_date');
    const endDateInput = document.getElementById('end_date');
    const fetchButton = document.getElementById('fetch-button');
    const downloadButton = document.getElementById('download-csv-button');
    const statusEl = document.getElementById('status');
    const chartCanvas = document.getElementById('weather-chart');
    const optionCheckboxes = document.querySelectorAll('.options-grid input[type="checkbox"]');

    let weatherChart = null;
    let csvContent = null;
    let map = null;
    let marker = null;

    // --- Initialize Map and Set Default Dates ---
    initializeMap();
    setDefaultDates();

    // --- Event Listeners ---
    fetchButton.addEventListener('click', fetchData);
    downloadButton.addEventListener('click', downloadCsv);

    /**
     * Initializes the Leaflet map on the page.
     */
    function initializeMap() {
        map = L.map('map').setView([52.52, 13.41], 5); // Default view
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        updateMapMarker(latitudeInput.value, longitudeInput.value);
    }

    /**
     * Sets default start and end dates (e.g., the last 7 days).
     */
    function setDefaultDates() {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        endDateInput.value = today.toISOString().split('T')[0];
        startDateInput.value = sevenDaysAgo.toISOString().split('T')[0];
    }

    /**
     * Updates the map view and marker position.
     * @param {number} lat Latitude
     * @param {number} lon Longitude
     */
    function updateMapMarker(lat, lon) {
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker([lat, lon]).addTo(map);
        map.setView([lat, lon], 10);
    }

    /**
     * Fetches weather data from the API based on user inputs.
     */
    async function fetchData() {
        const latitude = latitudeInput.value;
        const longitude = longitudeInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!latitude || !longitude || !startDate || !endDate) {
            statusEl.textContent = "Error: All location and date fields are required.";
            statusEl.style.color = 'red';
            return;
        }

        statusEl.textContent = "Fetching data...";
        statusEl.style.color = '#333';
        fetchButton.disabled = true;
        downloadButton.classList.add('hidden');

        let hourlyParams = "temperature_2m"; // Temperature is always included
        optionCheckboxes.forEach(cb => {
            if (cb.checked) {
                hourlyParams += `,${cb.dataset.variable}`;
            }
        });

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&hourly=${hourlyParams}&timezone=Europe%2FBerlin`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            
            const data = await response.json();
            if (data.error) throw new Error(`API Error: ${data.reason}`);
            if (!data.hourly || !data.hourly.time || !data.hourly.time.length) {
                throw new Error("No hourly data found for the selected range.");
            }

            statusEl.textContent = "Data successfully fetched!";
            statusEl.style.color = 'green';
            updateMapMarker(latitude, longitude);
            renderChart(data.hourly);
            prepareCsv(data.hourly);
            downloadButton.classList.remove('hidden');

        } catch (error) {
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.style.color = 'red';
            if (weatherChart) {
                weatherChart.destroy();
                weatherChart = null;
            }
        } finally {
            fetchButton.disabled = false;
        }
    }

    /**
     * Renders the weather chart with multiple datasets.
     * @param {object} hourlyData - The hourly data from the API.
     */
    function renderChart(hourlyData) {
        if (weatherChart) {
            weatherChart.destroy();
        }

        const datasets = [];
        const colors = {
            temperature_2m: '#0077b6',
            precipitation: '#00b4d8',
            wind_speed_10m: '#ef476f',
            relative_humidity_2m: '#06d6a0',
            shortwave_radiation: '#ffd166',
        };
        const labels = {
            temperature_2m: 'Temperature (°C)',
            precipitation: 'Precipitation (mm)',
            wind_speed_10m: 'Wind Speed (km/h)',
            relative_humidity_2m: 'Humidity (%)',
            shortwave_radiation: 'Solar (W/m²)',
        };

        // Create a dataset for each available variable
        for (const key in hourlyData) {
            if (key !== 'time') {
                datasets.push({
                    label: labels[key] || key,
                    data: hourlyData[key],
                    borderColor: colors[key] || '#333',
                    backgroundColor: `${colors[key] || '#333'}1A`, // Add alpha for fill
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false, // Set to true if you want area charts
                    tension: 0.1,
                    yAxisID: key, // Assign a unique Y-axis for each dataset
                });
            }
        }
        
        const scales = {
            x: {
                title: { display: true, text: 'Date / Time' },
                ticks: { maxRotation: 45, minRotation: 45 }
            }
        };

        // Dynamically create Y-axes
        datasets.forEach((ds, index) => {
            scales[ds.yAxisID] = {
                type: 'linear',
                display: true,
                position: index % 2 === 0 ? 'left' : 'right', // Alternate axes positions
                title: {
                    display: true,
                    text: ds.label
                },
                grid: {
                    drawOnChartArea: index === 0, // Only draw grid lines for the primary axis
                },
            };
        });

        const ctx = chartCanvas.getContext('2d');
        weatherChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hourlyData.time.map(t => t.replace('T', ' ')),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: scales,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
            }
        });
    }

    /**
     * Prepares data for CSV download, including all fetched variables.
     * @param {object} hourlyData - The hourly data from the API.
     */
    function prepareCsv(hourlyData) {
        const headers = Object.keys(hourlyData);
        const headerRow = headers.join(',') + '\n';

        const numRows = hourlyData.time.length;
        const rows = [];
        for (let i = 0; i < numRows; i++) {
            const row = headers.map(header => {
                const value = hourlyData[header][i];
                // Format time for Excel and wrap in quotes
                if (header === 'time') {
                    return `"${new Date(value).toLocaleString('en-GB')}"`;
                }
                return value;
            });
            rows.push(row.join(','));
        }

        csvContent = headerRow + rows.join('\n');
    }

    /**
     * Triggers the download of the prepared CSV file.
     */
    function downloadCsv() {
        if (!csvContent) return;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);

        const startDate = startDateInput.value.replace(/-/g, '');
        const endDate = endDateInput.value.replace(/-/g, '');
        const filename = `weather-data_${startDate}-${endDate}.csv`;
        
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
