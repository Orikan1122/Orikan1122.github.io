document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element References ---
    // General Controls
    const csvFileInput = document.getElementById('csvFileInput');
    const resetButton = document.getElementById('resetButton');

    // Category Management Section
    const categoryManagementSection = document.getElementById('categoryManagementSection');
    const existingCategoriesList = document.getElementById('existingCategoriesList');
    const newCategoryNameInput = document.getElementById('newCategoryName');
    const newCategoryUnitInput = document.getElementById('newCategoryUnit');
    const addCategoryButton = document.getElementById('addCategoryButton');

    // Column Allocation Section
    const columnAllocationSection = document.getElementById('columnAllocationSection');
    const columnSelectorsContainer = document.getElementById('columnSelectorsContainer');
    const applyAllocationButton = document.getElementById('applyAllocationButton');
    
    // Calculation Section
    const calculationSection = document.getElementById('calculationSection');
    const existingCalculationsList = document.getElementById('existingCalculationsList');
    const calculationFormTitle = document.getElementById('calculationFormTitle'); 
    const newCalcNameInput = document.getElementById('newCalcName');
    const newCalcUnitInput = document.getElementById('newCalcUnit');
    const newCalcFormulaInput = document.getElementById('newCalcFormula');
    const addOrUpdateCalculationButton = document.getElementById('addOrUpdateCalculationButton');
    const exportCalculationsButton = document.getElementById('exportCalculationsButton'); // <<< NEW: Reference to the export button
    const cancelEditButton = document.getElementById('cancelEditButton');
    const availableColumnsForCalc = document.getElementById('availableColumnsForCalc');

    // Time Range Controls
    const timeRangeControls = document.querySelector('.time-range-controls');
    const startTimeSlider = document.getElementById('startTimeSlider');
    const endTimeSlider = document.getElementById('endTimeSlider');
    const selectedStartTimeDisplay = document.getElementById('selectedStartTime');
    const selectedEndTimeDisplay = document.getElementById('selectedEndTime');

    // Configuration Management
    const configControls = document.querySelector('.config-controls');
    const exportConfigButton = document.getElementById('exportConfigButton');
    const importConfigFileInput = document.getElementById('importConfigFileInput');

    // Charts Area
    const chartsArea = document.getElementById('chartsArea');


    // --- 2. State Variables ---
    let allRawColumnData = [];         // Stores parsed CSV data, per column
    let activeChartInstances = {};     // Stores Chart.js instances for dynamic charts
    let globalMinTimestamp = null;     // Minimum timestamp across all CSV data
    let globalMaxTimestamp = null;     // Maximum timestamp across all CSV data
    let currentFileHeaders = [];       // Headers from the currently loaded CSV file
    let managedCategories = [];        // User-defined and system categories
    let calculatedColumns = [];        // User-defined calculated columns (name, unit, formula, id)
    let editingCalculationId = null;   // ID of the calculation being edited (null if not in edit mode)
    // Stores display state (visibility, color) for each CSV/calculated column
    let datasetDisplayStates = {};     // { "csvHeader1": { visible: true, color: "#ff0000"}, "calcColName": {...} }


    // --- 3. Initial Configuration Data ---
    // Default categories provided at application start
    const INITIAL_CATEGORIES = [
        { id: "ignore", name: "--- Ignore ---", unit: "", isSystem: true },
        { id: "tempVL", name: "Temperatur VL (°C)", unit: "°C", isSystem: false },
        { id: "tempRL", name: "Temperatur RL (°C)", unit: "°C", isSystem: false },
        { id: "hotWaterVol", name: "Hotwater tank Volume (L)", unit: "L", isSystem: false },
        { id: "causticVol", name: "Caustic tank Volume (L)", unit: "L", isSystem: false },
        { id: "acidVol", name: "Acid Tank Volume (L)", unit: "L", isSystem: false },
        { id: "volFlow", name: "Volume flow (m³/h)", unit: "m³/h", isSystem: false },
        { id: "pressure", name: "Pressure (bar)", unit: "bar", isSystem: false },
        { id: "conductivity", name: "Conductivity (mS)", unit: "mS", isSystem: false }
    ];
    // Default colors for chart datasets
    const DEFAULT_COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#7f8c8d', '#c0392b', '#8e44ad', '#2c3e50'];


    // --- 4. Event Listeners ---
    csvFileInput.addEventListener('change', handleFileSelect);
    resetButton.addEventListener('click', resetApplicationState);

    // Category Management
    addCategoryButton.addEventListener('click', handleAddCategory);

    // Calculation Management
    addOrUpdateCalculationButton.addEventListener('click', handleAddOrUpdateCalculation);
    exportCalculationsButton.addEventListener('click', handleExportCalculations); // <<< NEW: Event listener for export
    cancelEditButton.addEventListener('click', exitEditMode);
    availableColumnsForCalc.addEventListener('click', handleColumnTagClick);
    existingCalculationsList.addEventListener('click', handleCalculationListClick);

    // Column Allocation
    applyAllocationButton.addEventListener('click', updateChartsBasedOnAllocation);

    // Time Range Filters
    startTimeSlider.addEventListener('input', handleTimeSliderChange);
    endTimeSlider.addEventListener('input', handleTimeSliderChange);

    // Configuration
    exportConfigButton.addEventListener('click', exportConfiguration);
    importConfigFileInput.addEventListener('change', handleImportConfiguration);


    // --- 5. Core Application Functions ---

    /**
     * Resets the entire application state to its initial loaded condition.
     */
    function resetApplicationState() {
        csvFileInput.value = '';
        allRawColumnData = [];
        currentFileHeaders = [];
        destroyAllCharts();
        activeChartInstances = {};
        globalMinTimestamp = null;
        globalMaxTimestamp = null;

        managedCategories = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
        calculatedColumns = [];
        renderManagedCategoriesList();
        renderCalculatedColumnsList();
        datasetDisplayStates = {};

        columnSelectorsContainer.innerHTML = '';
        chartsArea.innerHTML = '';
        availableColumnsForCalc.innerHTML = '';

        categoryManagementSection.style.display = 'none';
        columnAllocationSection.style.display = 'none';
        calculationSection.style.display = 'none';
        timeRangeControls.style.display = 'none';
        configControls.style.display = 'none';
        
        startTimeSlider.disabled = true; startTimeSlider.value = 0;
        endTimeSlider.disabled = true; endTimeSlider.value = 0;
        selectedStartTimeDisplay.textContent = 'N/A';
        selectedEndTimeDisplay.textContent = 'N/A';
        
        resetButton.disabled = true;
        updateCalculationButtonsState(); // <<< MODIFIED: Update button states on reset
        importConfigFileInput.value = '';
        
        newCategoryNameInput.value = '';
        newCategoryUnitInput.value = '';
        exitEditMode(); 
    }

    /**
     * Destroys all currently active Chart.js instances to prevent memory leaks
     */
    function destroyAllCharts() {
        Object.values(activeChartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        activeChartInstances = {};
    }

    // --- 6. File Handling and CSV Parsing ---
    // ... (This section is correct, no changes needed) ...
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                resetApplicationState(); // Always reset state on new file upload
                try {
                    processCsvData(e.target.result);
                    resetButton.disabled = false;
                    // Show dynamic UI sections if data is loaded
                    if (allRawColumnData.length > 0) {
                        categoryManagementSection.style.display = 'block';
                        columnAllocationSection.style.display = 'block';
                        calculationSection.style.display = 'block';
                        if (globalMinTimestamp !== null) timeRangeControls.style.display = 'block';
                        configControls.style.display = 'block';
                    }
                } catch (error) {
                    alert("Error processing CSV file: " + error.message);
                    resetApplicationState();
                }
            };
            reader.onerror = () => {
                alert("Error reading file.");
                resetApplicationState();
            };
            reader.readAsText(file);
        }
    }
    function parseTimestamp(timestampStr) {
        let parts = timestampStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/);
        if (parts) {
            return new Date(parts[3], parts[2] - 1, parts[1], parts[4], parts[5], parts[6], parts[7] || 0);
        }
        parts = timestampStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})/);
        if (parts) {
            return new Date(parts[3], parts[2] - 1, parts[1], parts[4], parts[5], 0, 0);
        }
        return null;
    }
    function processCsvData(csvData) {
        const lines = csvData.trim().split('\n');
        if (lines.length < 2) { alert("CSV file is empty or has no data rows."); return; }

        const headerLine = lines[0].trim().replace(/^Zeit:;/, 'Zeit;');
        currentFileHeaders = headerLine.split(';').map(h => h.trim());
        const numDataColumns = currentFileHeaders.length - 1;

        if (numDataColumns <= 0) {
            alert("No data columns found in CSV after the time column.");
            return;
        }

        allRawColumnData = currentFileHeaders.slice(1).map(header => ({
            header: header,
            values: []
        }));

        datasetDisplayStates = {};
        allRawColumnData.forEach((col, index) => {
            datasetDisplayStates[col.header] = {
                visible: true,
                color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
            };
        });

        let minTs = Infinity, maxTs = -Infinity;
        let validTimestampsFound = false;

        for (let i = 1; i < lines.length; i++) {
            const lineContent = lines[i].trim();
            if (!lineContent) continue;

            const values = lineContent.split(';');
            const timestamp = parseTimestamp(values[0]);
            
            if (!timestamp) continue;
            validTimestampsFound = true;

            const tsValue = timestamp.getTime();
            minTs = Math.min(minTs, tsValue);
            maxTs = Math.max(maxTs, tsValue);

            for (let j = 0; j < numDataColumns; j++) {
                if (allRawColumnData[j]) {
                    const valStr = values[j + 1];
                    allRawColumnData[j].values.push({
                        x: timestamp,
                        y: (valStr && valStr.trim() !== '') ? parseFloat(valStr.replace(',', '.')) : null
                    });
                }
            }
        }
        
        if (!validTimestampsFound) {
            alert("No valid timestamps found in the CSV data. Please check the first column's format.");
            return;
        }

        if (isFinite(minTs) && isFinite(maxTs)) {
            globalMinTimestamp = minTs;
            globalMaxTimestamp = maxTs;
            initializeTimeSliders();
        } else {
            alert("Could not determine a valid time range from the data.");
            globalMinTimestamp = null;
        }

        populateColumnAllocations();
        renderManagedCategoriesList();
        populateAvailableColumnsHelper();
    }


    // --- 7. Category Management ---
    // ... (This section is correct, no changes needed) ...
    function renderManagedCategoriesList() {
        existingCategoriesList.innerHTML = '';
        managedCategories.forEach(cat => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'category-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${cat.name} (${cat.unit || 'No Unit'})`;
            itemDiv.appendChild(nameSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.dataset.categoryId = cat.id;
            deleteBtn.addEventListener('click', handleDeleteCategory);
            
            if (cat.isSystem) {
                deleteBtn.disabled = true;
                deleteBtn.title = "System categories cannot be deleted.";
                const systemLabelSpan = document.createElement('span');
                systemLabelSpan.className = 'system-label';
                systemLabelSpan.textContent = '(System)';
                itemDiv.appendChild(systemLabelSpan);
            }
            itemDiv.appendChild(deleteBtn);
            existingCategoriesList.appendChild(itemDiv);
        });
    }
    function handleAddCategory() {
        const name = newCategoryNameInput.value.trim();
        const unit = newCategoryUnitInput.value.trim();

        if (!name) {
            alert("Category name cannot be empty.");
            return;
        }
        const id = "user_" + name.toLowerCase().replace(/[^a-z0-9]/g, '') + "_" + Date.now().toString().slice(-4);

        if (managedCategories.find(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            alert("A category with this name already exists.");
            return;
        }
         if (managedCategories.find(cat => cat.id === id)) {
            alert("Generated category ID conflict. Please try a slightly different name.");
            return;
        }

        const currentAllocations = getCurrentAllocations();
        managedCategories.push({ id, name, unit, isSystem: false });
        
        renderManagedCategoriesList();
        populateColumnAllocations(currentAllocations);
        
        newCategoryNameInput.value = '';
        newCategoryUnitInput.value = '';
    }
    function handleDeleteCategory(event) {
        const categoryIdToDelete = event.target.dataset.categoryId;
        const categoryToDelete = managedCategories.find(cat => cat.id === categoryIdToDelete);

        if (!categoryToDelete || categoryToDelete.isSystem) {
            alert("Cannot delete this category.");
            return;
        }
        
        let isUsed = false;
        document.querySelectorAll('#columnSelectorsContainer select').forEach(select => {
            if (select.value === categoryIdToDelete) {
                isUsed = true;
            }
        });

        const confirmMessage = isUsed ? 
            `Category "${categoryToDelete.name}" is currently assigned to one or more columns. If you delete it, these columns will be set to "Ignore". Continue?` :
            `Are you sure you want to delete the category "${categoryToDelete.name}"?`;

        if (!confirm(confirmMessage)) {
            return;
        }
        
        const currentAllocations = getCurrentAllocations();

        if (isUsed) {
            for (const colName in currentAllocations) {
                if (currentAllocations[colName] === categoryIdToDelete) {
                    currentAllocations[colName] = 'ignore';
                }
            }
        }
        
        managedCategories = managedCategories.filter(cat => cat.id !== categoryIdToDelete);
        
        renderManagedCategoriesList();
        populateColumnAllocations(currentAllocations);
        updateChartsBasedOnAllocation();
    }


    // --- 8. Calculated Columns Management ---

    // <<< NEW: Helper functions for the export feature
    /**
     * Updates the disabled state of calculation-related buttons based on current state.
     */
    function updateCalculationButtonsState() {
        const hasCalculations = calculatedColumns.length > 0;
        const hasData = allRawColumnData.length > 0;
        exportCalculationsButton.disabled = !(hasCalculations && hasData);
    }
    
    /**
     * Generates a CSV file from the calculated columns and triggers a download.
     */
    function handleExportCalculations() {
        if (!allRawColumnData.length || allRawColumnData[0].values.length === 0) {
            alert("No data loaded to perform calculations on.");
            return;
        }
        if (calculatedColumns.length === 0) {
            alert("No calculated columns have been defined to export.");
            return;
        }

        const headers = ['Zeit', ...calculatedColumns.map(c => c.name)];
        const csvRows = [headers.join(';')];

        const numPoints = allRawColumnData[0].values.length;
        for (let i = 0; i < numPoints; i++) {
            const timestamp = allRawColumnData[0].values[i].x;
            const rowData = {};
            allRawColumnData.forEach(rawCol => {
                rowData[rawCol.header] = rawCol.values[i].y;
            });
            const scope = { data: rowData };

            const calculatedValues = calculatedColumns.map(calcCol => {
                try {
                    const result = math.evaluate(calcCol.formula, scope);
                    return (typeof result === 'number' && isFinite(result)) ? String(result).replace('.', ',') : '';
                } catch (error) {
                    return '';
                }
            });

            const formattedTimestamp = formatTimestampForCsv(timestamp);
            const row = [formattedTimestamp, ...calculatedValues].join(';');
            csvRows.push(row);
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calculated_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Formats a Date object into a "dd.MM.yyyy HH:mm:ss.SSS" string for CSV output.
     */
    function formatTimestampForCsv(date) {
        if (!date) return '';
        const pad = (num, size = 2) => String(num).padStart(size, '0');
        
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        const milliseconds = pad(date.getMilliseconds(), 3);

        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
    // <<< END NEW FUNCTIONS

    function populateAvailableColumnsHelper() {
        availableColumnsForCalc.innerHTML = '';
        allRawColumnData.forEach(col => {
            const tag = document.createElement('span');
            tag.className = 'column-tag';
            tag.textContent = col.header;
            tag.dataset.columnName = col.header;
            availableColumnsForCalc.appendChild(tag);
        });
    }

    function handleColumnTagClick(event) {
        if (event.target.classList.contains('column-tag')) {
            const columnName = event.target.dataset.columnName;
            const textToInsert = `data['${columnName}']`;
            insertTextAtCursor(newCalcFormulaInput, textToInsert);
        }
    }

    function insertTextAtCursor(input, text) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + text + input.value.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + text.length;
    }

    function renderCalculatedColumnsList() {
        existingCalculationsList.innerHTML = '';
        calculatedColumns.forEach(calc => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'calculation-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${calc.name} = ${calc.formula}`;
            itemDiv.appendChild(nameSpan);
            
            const buttonsDiv = document.createElement('div');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'edit-button';
            editBtn.dataset.editCalcId = calc.id;
            buttonsDiv.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.dataset.deleteCalcId = calc.id;
            buttonsDiv.appendChild(deleteBtn);

            itemDiv.appendChild(buttonsDiv);
            existingCalculationsList.appendChild(itemDiv);
        });
    }
    
    function handleCalculationListClick(event) {
        const editId = event.target.dataset.editCalcId;
        const deleteId = event.target.dataset.deleteCalcId;

        if (editId) {
            enterEditMode(editId);
        } else if (deleteId) {
            handleDeleteCalculation(deleteId);
        }
    }
    
    /**
     * Enters "edit mode" for a specific calculated column.
     */
    function enterEditMode(calcId) {
        const calcToEdit = calculatedColumns.find(c => c.id === calcId);
        if (!calcToEdit) return;

        editingCalculationId = calcId;
        
        calculationFormTitle.textContent = 'Edit Calculation';
        addOrUpdateCalculationButton.textContent = 'Update Calculation';
        cancelEditButton.style.display = 'inline-block';

        newCalcNameInput.value = calcToEdit.name;
        newCalcUnitInput.value = calcToEdit.unit; // <<< FIX: Corrected typo from calcToToEdit
        newCalcFormulaInput.value = calcToEdit.formula;

        calculationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Exits "edit mode", clearing the form and resetting button text.
     */
    function exitEditMode() {
        editingCalculationId = null;

        calculationFormTitle.textContent = 'Add New Calculation';
        addOrUpdateCalculationButton.textContent = 'Add Calculation';
        cancelEditButton.style.display = 'none';

        newCalcNameInput.value = '';
        newCalcUnitInput.value = '';
        newCalcFormulaInput.value = '';
    }

    /**
     * Handles adding a new calculation or updating an existing one.
     */
    function handleAddOrUpdateCalculation() {
        const name = newCalcNameInput.value.trim();
        const unit = newCalcUnitInput.value.trim();
        const formula = newCalcFormulaInput.value.trim();

        if (!name || !formula) {
            alert("Calculation Name and Formula cannot be empty.");
            return;
        }

        try {
            math.parse(formula);
        } catch (error) {
            alert(`Invalid formula syntax: ${error.message}`);
            return;
        }
        
        const currentAllocations = getCurrentAllocations();

        if (editingCalculationId) {
            const calcIndex = calculatedColumns.findIndex(c => c.id === editingCalculationId);
            if (calcIndex === -1) {
                exitEditMode();
                return;
            }

            const originalName = calculatedColumns[calcIndex].name;
            const allOtherColumnNames = [
                ...allRawColumnData.map(c => c.header),
                ...calculatedColumns.filter(c => c.id !== editingCalculationId).map(c => c.name)
            ];

            if (allOtherColumnNames.includes(name)) {
                alert("A column with this name already exists.");
                return;
            }

            if (originalName !== name) {
                if(datasetDisplayStates[originalName]) {
                    datasetDisplayStates[name] = datasetDisplayStates[originalName];
                    delete datasetDisplayStates[originalName];
                }
            }
            
            calculatedColumns[calcIndex] = { ...calculatedColumns[calcIndex], name, unit, formula };
            
            exitEditMode();
            renderCalculatedColumnsList();
            populateColumnAllocations(currentAllocations);
            updateChartsBasedOnAllocation();

        } else {
            const allColumnNames = [...allRawColumnData.map(c => c.header), ...calculatedColumns.map(c => c.name)];
            if (allColumnNames.includes(name)) {
                alert("A column with this name already exists.");
                return;
            }
            
            const id = "calc_" + name.toLowerCase().replace(/[^a-z0-9]/g, '') + "_" + Date.now();
            calculatedColumns.push({ id, name, unit, formula });

            datasetDisplayStates[name] = {
                visible: true,
                color: DEFAULT_COLORS[Object.keys(datasetDisplayStates).length % DEFAULT_COLORS.length]
            };

            renderCalculatedColumnsList();
            populateColumnAllocations(currentAllocations);
            exitEditMode();
        }
        updateCalculationButtonsState(); // <<< MODIFIED: Update button states
    }
    
    /**
     * Handles deleting a calculated column.
     */
    function handleDeleteCalculation(idToDelete) {
        const calcToDelete = calculatedColumns.find(c => c.id === idToDelete);
        if (!calcToDelete) return;

        if (editingCalculationId === idToDelete) {
            exitEditMode();
        }
        
        delete datasetDisplayStates[calcToDelete.name];
        
        const currentAllocations = getCurrentAllocations();
        calculatedColumns = calculatedColumns.filter(c => c.id !== idToDelete);
        
        renderCalculatedColumnsList();
        populateColumnAllocations(currentAllocations);
        updateChartsBasedOnAllocation();
        updateCalculationButtonsState(); // <<< MODIFIED: Update button states
    }


    // --- 9. Column Allocation UI Management ---
    // ... (This section is correct, no changes needed) ...
    function getCurrentAllocations() {
        const allocations = {};
        document.querySelectorAll('#columnSelectorsContainer select').forEach(select => {
            const columnName = select.dataset.csvColumnHeader;
            if (columnName) {
                allocations[columnName] = select.value;
            }
        });
        return allocations;
    }
    function populateColumnAllocations(configAllocations = {}) {
        columnSelectorsContainer.innerHTML = '';
        if (!allRawColumnData.length) return;

        const allColumns = [
            ...allRawColumnData,
            ...calculatedColumns.map(c => ({ header: c.name, unit: c.unit }))
        ];

        allColumns.forEach((colData) => {
            const header = colData.header;
            const selectorDiv = document.createElement('div');
            selectorDiv.className = 'column-selector';

            const label = document.createElement('label');
            const selectId = `select-col-${header.replace(/[^a-zA-Z0-9]/g, '')}`;
            label.htmlFor = selectId;
            label.textContent = header;
            label.title = header;

            const select = document.createElement('select');
            select.id = selectId;
            select.dataset.csvColumnHeader = header;

            managedCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                select.appendChild(option);
            });

            const targetCatId = configAllocations[header];
            if (targetCatId && managedCategories.find(c => c.id === targetCatId)) {
                select.value = targetCatId;
            } else {
                select.value = "ignore"; 
            }

            selectorDiv.appendChild(label);
            selectorDiv.appendChild(select);
            columnSelectorsContainer.appendChild(selectorDiv);
        });
    }

    // --- 10. Time Slider Logic ---
    // ... (This section is correct, no changes needed) ...
    function initializeTimeSliders() {
        if (globalMinTimestamp === null || globalMaxTimestamp === null || globalMinTimestamp === Infinity) {
            startTimeSlider.disabled = true;
            endTimeSlider.disabled = true;
            selectedStartTimeDisplay.textContent = 'N/A';
            selectedEndTimeDisplay.textContent = 'N/A';
            return;
        }

        startTimeSlider.min = globalMinTimestamp;
        startTimeSlider.max = globalMaxTimestamp;
        startTimeSlider.value = globalMinTimestamp;
        startTimeSlider.disabled = false;

        endTimeSlider.min = globalMinTimestamp;
        endTimeSlider.max = globalMaxTimestamp;
        endTimeSlider.value = globalMaxTimestamp;
        endTimeSlider.disabled = false;

        updateSliderTimeDisplay();
    }
    function formatSliderTimestamp(timestampMs) {
        if (timestampMs === null || timestampMs === undefined || !isFinite(timestampMs)) return 'N/A';
        return new Date(parseInt(timestampMs)).toLocaleString();
    }
    function updateSliderTimeDisplay() {
        selectedStartTimeDisplay.textContent = formatSliderTimestamp(startTimeSlider.value);
        selectedEndTimeDisplay.textContent = formatSliderTimestamp(endTimeSlider.value);
    }
    function handleTimeSliderChange() {
        const startVal = parseInt(startTimeSlider.value);
        const endVal = parseInt(endTimeSlider.value);

        if (startVal > endVal) {
            if (this.id === 'startTimeSlider') endTimeSlider.value = startVal;
            else if (this.id === 'endTimeSlider') startTimeSlider.value = endVal;
        }
        updateSliderTimeDisplay();
        updateChartsBasedOnAllocation();
    }


    // --- 11. Chart Rendering Logic ---
    // ... (This section is correct, no changes needed) ...
    function updateChartsBasedOnAllocation() {
        if (!allRawColumnData.length || globalMinTimestamp === null) {
            destroyAllCharts();
            chartsArea.innerHTML = '';
            return;
        }

        let calculationErrorCount = 0;
        const calculatedData = calculatedColumns.map(calcCol => {
            const newValues = [];
            const numPoints = allRawColumnData.length > 0 ? allRawColumnData[0].values.length : 0;

            for (let i = 0; i < numPoints; i++) {
                const timestamp = allRawColumnData[0].values[i].x;
                const rowData = {};
                allRawColumnData.forEach(rawCol => {
                    rowData[rawCol.header] = rawCol.values[i].y;
                });
                
                const scope = { data: rowData };
                let result = null;
                try {
                    result = math.evaluate(calcCol.formula, scope);
                    if (typeof result !== 'number' || !isFinite(result)) {
                        result = null;
                    }
                } catch (error) {
                    calculationErrorCount++;
                }
                newValues.push({ x: timestamp, y: result });
            }
            return { header: calcCol.name, values: newValues, unit: calcCol.unit };
        });
        
        if (calculationErrorCount > 0) {
            console.warn(`A total of ${calculationErrorCount} errors occurred during formula calculation. Check formulas and data types.`);
        }

        const allDisplayableData = [...allRawColumnData, ...calculatedData];
        const currentSliderStartTime = parseInt(startTimeSlider.value);
        const currentSliderEndTime = parseInt(endTimeSlider.value);

        const categoryDataMap = managedCategories.reduce((acc, cat) => {
            if (cat.id !== 'ignore') {
                acc[cat.id] = { ...cat, datasets: [] };
            }
            return acc;
        }, {});
        
        allDisplayableData.forEach(colData => {
            const header = colData.header;
            const selectElement = document.querySelector(`#columnSelectorsContainer select[data-csv-column-header="${CSS.escape(header)}"]`);
            if (!selectElement) return;

            const categoryId = selectElement.value;
            if (categoryId === 'ignore' || !categoryDataMap[categoryId]) return;

            if (colData.unit && categoryDataMap[categoryId].datasets.length === 0) {
                 categoryDataMap[categoryId].unit = colData.unit;
            }

            const displayState = datasetDisplayStates[header];
            if (!displayState) return;

            const filteredValues = colData.values.filter(point => {
                if (!point || point.x === null || point.x === undefined) return false;
                const pointTime = point.x.getTime();
                return pointTime >= currentSliderStartTime && pointTime <= currentSliderEndTime;
            });

            if (filteredValues.length > 0) {
                categoryDataMap[categoryId].datasets.push({
                    label: header,
                    data: filteredValues,
                    borderColor: displayState.color,
                    hidden: !displayState.visible,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 1,
                    pointHoverRadius: 5,
                    spanGaps: true
                });
            }
        });
        
        Object.keys(activeChartInstances).forEach(chartCatId => {
            if (!categoryDataMap[chartCatId] || categoryDataMap[chartCatId].datasets.length === 0) {
                if (activeChartInstances[chartCatId]) {
                    activeChartInstances[chartCatId].destroy();
                    delete activeChartInstances[chartCatId];
                    const chartContainer = document.getElementById(`chart-container-${chartCatId}`);
                    if (chartContainer) chartContainer.remove();
                }
            }
        });

        Object.values(categoryDataMap).forEach(category => {
            if (category.datasets.length > 0) {
                createOrUpdateChart(category, currentSliderStartTime, currentSliderEndTime);
            }
        });
    }
    function createOrUpdateChart(category, chartMinTime, chartMaxTime) {
        let chartContainer = document.getElementById(`chart-container-${category.id}`);
        let canvas = document.getElementById(`chart-${category.id}`);
        let datasetControlsContainer = document.getElementById(`dataset-controls-${category.id}`);

        if (!chartContainer) {
            chartContainer = document.createElement('div');
            chartContainer.id = `chart-container-${category.id}`;
            chartContainer.className = 'dynamic-chart-container';

            const title = document.createElement('h3');
            title.textContent = category.name;
            chartContainer.appendChild(title);

            datasetControlsContainer = document.createElement('div');
            datasetControlsContainer.id = `dataset-controls-${category.id}`;
            datasetControlsContainer.className = 'dataset-controls';
            chartContainer.appendChild(datasetControlsContainer);

            canvas = document.createElement('canvas');
            canvas.id = `chart-${category.id}`;
            chartContainer.appendChild(canvas);
            chartsArea.appendChild(chartContainer);
        } else {
            datasetControlsContainer.innerHTML = ''; 
        }
        
        category.datasets.forEach((dataset) => {
            const csvHeader = dataset.label;
            const displayState = datasetDisplayStates[csvHeader];

            const itemDiv = document.createElement('div');
            itemDiv.className = 'dataset-control-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = displayState.visible;
            const checkboxId = `vis-${category.id}-${csvHeader.replace(/[^a-zA-Z0-9]/g, '')}`;
            checkbox.id = checkboxId;
            checkbox.dataset.chartId = category.id;
            checkbox.dataset.datasetLabel = csvHeader;
            checkbox.addEventListener('change', handleDatasetVisibilityToggle);

            const colorSwatch = document.createElement('span');
            colorSwatch.className = 'dataset-color-swatch';
            colorSwatch.style.backgroundColor = displayState.color;

            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.appendChild(colorSwatch);
            label.appendChild(document.createTextNode(` ${csvHeader}`));
            label.title = csvHeader;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = displayState.color;
            colorInput.dataset.chartId = category.id;
            colorInput.dataset.datasetLabel = csvHeader;
            colorInput.addEventListener('input', handleDatasetColorChange);

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            itemDiv.appendChild(colorInput);
            datasetControlsContainer.appendChild(itemDiv);
        });

        if (activeChartInstances[category.id]) {
            activeChartInstances[category.id].data.datasets = category.datasets;
            activeChartInstances[category.id].options.scales.x.min = chartMinTime;
            activeChartInstances[category.id].options.scales.x.max = chartMaxTime;
            activeChartInstances[category.id].options.scales.y.title.text = category.unit || 'Value';
            activeChartInstances[category.id].update('none');
        } else {
            const ctx = canvas.getContext('2d');
            activeChartInstances[category.id] = new Chart(ctx, {
                type: 'line',
                data: { datasets: category.datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        x: {
                            type: 'time',
                            min: chartMinTime,
                            max: chartMaxTime,
                            time: { 
                                tooltipFormat: 'dd.MM.yyyy HH:mm:ss.SSS',
                                displayFormats: {
                                    millisecond: 'HH:mm:ss.SSS',
                                    second: 'HH:mm:ss',
                                    minute: 'HH:mm',
                                    hour: 'HH:mm'
                                }
                            },
                            title: { display: true, text: 'Time' }
                        },
                        y: { 
                            beginAtZero: false,
                            title: { display: true, text: category.unit || 'Value' }
                        }
                    },
                    plugins: { 
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                    },
                }
            });
        }
    }
    function handleDatasetVisibilityToggle(event) {
        const chartId = event.target.dataset.chartId;
        const datasetCsvHeader = event.target.dataset.datasetLabel;
        const isVisible = event.target.checked;

        if (datasetDisplayStates[datasetCsvHeader]) {
            datasetDisplayStates[datasetCsvHeader].visible = isVisible;
        }

        const chart = activeChartInstances[chartId];
        if (chart) {
            const datasetIndex = chart.data.datasets.findIndex(ds => ds.label === datasetCsvHeader);
            if (datasetIndex !== -1) {
                chart.data.datasets[datasetIndex].hidden = !isVisible;
                chart.update('none');
            }
        }
    }
    function handleDatasetColorChange(event) {
        const chartId = event.target.dataset.chartId;
        const datasetCsvHeader = event.target.dataset.datasetLabel;
        const newColor = event.target.value;

        if (datasetDisplayStates[datasetCsvHeader]) {
            datasetDisplayStates[datasetCsvHeader].color = newColor;
        }

        const checkboxId = `vis-${chartId}-${csvHeader.replace(/[^a-zA-Z0-9]/g, '')}`;
        const labelForCheckbox = document.querySelector(`label[for="${CSS.escape(checkboxId)}"]`);
        if(labelForCheckbox) {
            const swatch = labelForCheckbox.querySelector('.dataset-color-swatch');
            if(swatch) swatch.style.backgroundColor = newColor;
        }

        const chart = activeChartInstances[chartId];
        if (chart) {
            const datasetIndex = chart.data.datasets.findIndex(ds => ds.label === datasetCsvHeader);
            if (datasetIndex !== -1) {
                chart.data.datasets[datasetIndex].borderColor = newColor;
                chart.update('none');
            }
        }
    }

    // --- 12. Configuration Import/Export ---
    
    function exportConfiguration() {
        if (!allRawColumnData.length) {
            alert("No CSV data loaded to create a configuration from.");
            return;
        }
        const config = {
            managedCategories: managedCategories,
            calculatedColumns: calculatedColumns,
            allocations: getCurrentAllocations(),
            timeRange: { 
                start: parseInt(startTimeSlider.value), 
                end: parseInt(endTimeSlider.value)
            },
            datasetDisplayStates: datasetDisplayStates
        };

        const jsonString = JSON.stringify(config, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chart_config_v8.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleImportConfiguration(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!allRawColumnData.length) {
            alert("Please load a CSV file first before importing a configuration.");
            importConfigFileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                applyImportedConfiguration(config);
            } catch (error) {
                alert("Error parsing configuration file: " + error.message);
            }
            importConfigFileInput.value = '';
        };
        reader.readAsText(file);
    }

    /**
     * Applies an imported configuration to the application state.
     */
    function applyImportedConfiguration(config) {
        if (config.managedCategories && Array.isArray(config.managedCategories) && config.managedCategories.length > 0) {
            const systemIgnore = INITIAL_CATEGORIES.find(c => c.id === "ignore" && c.isSystem);
            let importedCategories = config.managedCategories.filter(c => c.id !== "ignore");
            managedCategories = systemIgnore ? [systemIgnore, ...importedCategories] : [...importedCategories];
        } else {
            managedCategories = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
        }
        renderManagedCategoriesList();

        if (config.calculatedColumns && Array.isArray(config.calculatedColumns)) {
            calculatedColumns = config.calculatedColumns;
        }
        renderCalculatedColumnsList();
        updateCalculationButtonsState(); // <<< MODIFIED: Update button state after import

        const allCurrentColumnNames = [
            ...allRawColumnData.map(c => c.header),
            ...calculatedColumns.map(c => c.name)
        ];
        if (config.datasetDisplayStates && Object.keys(config.datasetDisplayStates).length > 0) {
            datasetDisplayStates = config.datasetDisplayStates;
            allCurrentColumnNames.forEach((header, index) => {
                if (!datasetDisplayStates[header]) {
                    datasetDisplayStates[header] = {
                        visible: true,
                        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                    };
                }
            });
        } else {
            datasetDisplayStates = {}; 
            allCurrentColumnNames.forEach((header, index) => {
                datasetDisplayStates[header] = {
                    visible: true,
                    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                };
            });
        }

        if (allRawColumnData.length > 0) {
            populateColumnAllocations(config.allocations || {});
        }
        
        if (config.timeRange && 
            globalMinTimestamp !== null && globalMaxTimestamp !== null &&
            isFinite(config.timeRange.start) && isFinite(config.timeRange.end)) {
            
            const importedStart = Math.max(globalMinTimestamp, Math.min(globalMaxTimestamp, config.timeRange.start));
            const importedEnd = Math.max(globalMinTimestamp, Math.min(globalMaxTimestamp, config.timeRange.end));

            startTimeSlider.value = importedStart <= importedEnd ? importedStart : globalMinTimestamp;
            endTimeSlider.value = importedEnd >= importedStart ? importedEnd : globalMaxTimestamp;
            
            updateSliderTimeDisplay();
        } else if (globalMinTimestamp !== null) {
            startTimeSlider.value = globalMinTimestamp;
            endTimeSlider.value = globalMaxTimestamp;
            updateSliderTimeDisplay();
        }
        
        updateChartsBasedOnAllocation();
        alert("Configuration imported successfully!");
    }

    // --- Initial Application Setup Call ---
    resetApplicationState();
});