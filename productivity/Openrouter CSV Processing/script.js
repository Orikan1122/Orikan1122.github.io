document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKey');
    const fetchModelsBtn = document.getElementById('fetchModelsBtn');
    const modelSelect = document.getElementById('modelSelect');
    const freeModelsFilter = document.getElementById('freeModelsFilter'); // New element
    const promptInput = document.getElementById('prompt');
    const csvFileInput = document.getElementById('csvFile');
    const processBtn = document.getElementById('processBtn');
    const stopBtn = document.getElementById('stopBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    const tableHead = document.querySelector('#csvTable thead');
    const tableBody = document.querySelector('#csvTable tbody');

    // State variables and constants
    let allModels = []; // New: To store a complete list of models
    let csvData = [];
    let headers = [];
    let isProcessing = false;
    let currentIndex = 0;
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY_MS = 2000;

    // --- DATA & STATE MANAGEMENT ---

    const saveData = () => {
        localStorage.setItem('csvAnalyzerData', JSON.stringify(csvData));
        localStorage.setItem('csvAnalyzerApiKey', apiKeyInput.value);
        localStorage.setItem('csvAnalyzerPrompt', promptInput.value);
        localStorage.setItem('csvAnalyzerModel', modelSelect.value);
        localStorage.setItem('csvAnalyzerIndex', currentIndex);
    };

    const loadSavedData = () => {
        const savedApiKey = localStorage.getItem('csvAnalyzerApiKey');
        const savedPrompt = localStorage.getItem('csvAnalyzerPrompt');
        const savedData = localStorage.getItem('csvAnalyzerData');
        const savedIndex = localStorage.getItem('csvAnalyzerIndex');

        if (savedPrompt) promptInput.value = savedPrompt;

        if (savedData) {
            csvData = JSON.parse(savedData);
            if (csvData.length > 0) {
                headers = Object.keys(csvData[0]);
                renderTable();
                downloadBtn.disabled = false;
                currentIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
                updateProgress();
                if (currentIndex > 0) {
                    setTimeout(() => alert(`Resuming from previous session. Processed ${currentIndex} rows.`), 100);
                }
            }
        }
        
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            fetchModels();
        }
    };

    const clearSavedData = () => {
        if (confirm('Are you sure you want to clear all progress and saved data? This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    };

    // --- UI & TABLE RENDERING ---

    const renderTable = () => {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        if (headers.length > 0) {
            const headerRow = document.createElement('tr');
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });
            tableHead.appendChild(headerRow);
        }

        csvData.forEach(row => {
            const tableRow = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';
                tableRow.appendChild(td);
            });
            tableBody.appendChild(tableRow);
        });
    };

    const updateProgress = () => {
        const total = csvData.length;
        progressText.textContent = `${currentIndex} / ${total}`;
        progressBar.value = total > 0 ? (currentIndex / total) * 100 : 0;
    };
    
    const updateTableCell = (rowIndex, columnName, value) => {
        const colIndex = headers.indexOf(columnName);
        if (rowIndex < tableBody.children.length && colIndex !== -1) {
            tableBody.children[rowIndex].children[colIndex].textContent = value;
        }
    };

    const handleFile = (file) => {
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                csvData = results.data;
                headers = results.meta.fields;
                if (!headers.includes('response')) {
                    headers.push('response');
                    csvData.forEach(row => row.response = '');
                }
                currentIndex = 0;
                renderTable();
                updateProgress();
                saveData();
                downloadBtn.disabled = false;
            }
        });
    };
    
    // --- API & PROCESSING LOGIC ---

    const fetchModels = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter your OpenRouter API key first.');
            return;
        }
        modelSelect.innerHTML = '<option value="">-- Fetching models... --</option>';
        modelSelect.disabled = true;
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models');
            if (!response.ok) throw new Error('Failed to fetch models. Check your API key.');
            const { data } = await response.json();

            // Process and store all models with a flag for freeness
            allModels = data.map(model => ({
                id: model.id,
                name: model.name,
                isFree: parseFloat(model.pricing.prompt) === 0 && parseFloat(model.pricing.completion) === 0
            }));

            populateModelDropdown(); // Populate the dropdown for the first time
        } catch (error) {
            console.error('Error fetching models:', error);
            alert(error.message);
            modelSelect.innerHTML = '<option value="">-- Fetching failed --</option>';
        }
    };

    const populateModelDropdown = () => {
        const showFreeOnly = freeModelsFilter.checked;
        const modelsToDisplay = showFreeOnly ? allModels.filter(m => m.isFree) : allModels;

        modelSelect.innerHTML = '';
        if (!modelsToDisplay || modelsToDisplay.length === 0) {
            const message = showFreeOnly ? '-- No free models found --' : '-- No models found --';
            modelSelect.innerHTML = `<option value="">${message}</option>`;
            return;
        }

        modelsToDisplay.sort((a, b) => a.name.localeCompare(b.name)).forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            const freeTag = model.isFree ? ' (Free)' : '';
            option.textContent = `${model.name}${freeTag} (${model.id})`;
            modelSelect.appendChild(option);
        });

        modelSelect.disabled = false;
        const savedModel = localStorage.getItem('csvAnalyzerModel');
        if (savedModel && modelsToDisplay.some(m => m.id === savedModel)) {
            modelSelect.value = savedModel;
        }
    };

    const startProcessing = () => {
        const apiKey = apiKeyInput.value.trim();
        const promptTemplate = promptInput.value.trim();
        const selectedModel = modelSelect.value;

        if (!apiKey || !promptTemplate || csvData.length === 0 || !selectedModel) {
            alert('Please provide an API key, select a model, write a prompt, and upload a CSV file.');
            return;
        }
        if (!promptTemplate.includes('[row]')) {
            alert('Your prompt must include the `[row]` placeholder.');
            return;
        }

        isProcessing = true;
        processBtn.disabled = true;
        stopBtn.disabled = false;
        csvFileInput.disabled = true;
        
        processRow(currentIndex);
    };

    const processRow = async (index, retries = 0) => {
        if (!isProcessing || index >= csvData.length) {
            if (isProcessing) {
                alert('Processing complete!');
            }
            stopProcessing();
            return;
        }

        const row = csvData[index];
        const rowContent = Object.values(row).slice(0, -1).join(', ');
        const prompt = promptInput.value.trim().replace('[row]', rowContent);
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKeyInput.value.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelSelect.value,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error.message || 'Provider returned an error'}`);
            }

            const data = await response.json();
            let rawResult = data.choices[0].message.content;
            const thinkEndTag = '◁/think▷';
            const thinkEndIndex = rawResult.indexOf(thinkEndTag);
            if (thinkEndIndex !== -1) {
                rawResult = rawResult.substring(thinkEndIndex + thinkEndTag.length);
            }
            const finalResult = rawResult.trim();

            csvData[index]['response'] = finalResult;
            updateTableCell(index, 'response', finalResult);
            currentIndex++;
            updateProgress();
            saveData();
            
            processRow(currentIndex);

        } catch (error) {
            console.error(`Error on row ${index + 1} (Attempt ${retries + 1}):`, error);

            if (retries < MAX_RETRIES) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retries);
                console.log(`Retrying in ${delay / 1000}s...`);
                setTimeout(() => {
                    processRow(index, retries + 1);
                }, delay);
            } else {
                console.error(`Failed to process row ${index + 1} after ${MAX_RETRIES} retries.`);
                const failureMessage = 'ERROR: Processing Failed';
                csvData[index]['response'] = failureMessage;
                updateTableCell(index, 'response', failureMessage);
                currentIndex++;
                updateProgress();
                saveData();
                
                processRow(currentIndex);
            }
        }
    };

    const stopProcessing = () => {
        isProcessing = false;
        processBtn.disabled = false;
        stopBtn.disabled = true;
        csvFileInput.disabled = false;
    };

    const downloadCSV = () => {
        if (csvData.length === 0) {
            alert("There is no data to download.");
            return;
        }
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'modified_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- EVENT LISTENERS ---
    csvFileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    fetchModelsBtn.addEventListener('click', fetchModels);
    freeModelsFilter.addEventListener('change', populateModelDropdown); // New listener
    processBtn.addEventListener('click', startProcessing);
    stopBtn.addEventListener('click', stopProcessing);
    downloadBtn.addEventListener('click', downloadCSV);
    clearBtn.addEventListener('click', clearSavedData);

    // Initial Load
    loadSavedData();
});
