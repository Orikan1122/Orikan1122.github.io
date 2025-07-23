document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let appData = { systems: [], productionLines: [] };
    let selectedNodeId = null;
    let selectedNodeType = null;
    
    // --- STATE FOR ITERATIVE ANALYSIS ---
    let currentModelSECs = new Map();
    let iterationCounter = 0;
    let dailyDataCache = null;
    let baseloadCache = 0;
    let analysisEnergyNode = null;
    let analysisProductionNodes = [];

    let usageChart = null, attributionChart = null, sankeyChart = null, stackedAreaChart = null, multiLineChart = null, organizationChart = null;
    let validationChart = null;


    // --- DOM ELEMENTS (COMPLETE LIST) ---
    const hierarchyTree = document.getElementById('hierarchy-tree');
    const productionTree = document.getElementById('production-tree');
    const detailsPanel = document.getElementById('details-panel');
    const welcomeMessage = document.getElementById('welcome-message');
    const addRootBtn = document.getElementById('add-root-btn');
    const addChildBtn = document.getElementById('add-child-btn');
    const renameNodeBtn = document.getElementById('rename-node-btn');
    const deleteNodeBtn = document.getElementById('delete-node-btn');
    const addRootProductionBtn = document.getElementById('add-root-production-btn');
    const addChildProductionBtn = document.getElementById('add-child-production-btn');
    const renameProductionBtn = document.getElementById('rename-production-btn');
    const deleteProductionBtn = document.getElementById('delete-production-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonInput = document.getElementById('import-json-input');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportUnattributedBtn = document.getElementById('export-unattributed-btn');
    const selectedNodeName = document.getElementById('selected-node-name');
    const energyConfigOptions = document.getElementById('energy-config-options');
    const productionConfigOptions = document.getElementById('production-config-options');
    const typeSelector = document.getElementById('type-selector');
    const electricalOptions = document.getElementById('electrical-options');
    const electricalType = document.getElementById('electrical-type');
    const heatoilOptions = document.getElementById('heatoil-options');
    const heatoilEnergy = document.getElementById('heatoil-energy');
    const productionUnit = document.getElementById('production-unit');
    const dataInput = document.getElementById('data-input');
    const processDataBtn = document.getElementById('process-data-btn');
    const dataTableBody = document.getElementById('data-table-body');
    const productionLinkingContainer = document.getElementById('production-linking-container');
    const productionLinkChecklist = document.getElementById('production-link-checklist');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const updateChartsBtn = document.getElementById('update-charts-btn');
    const sankeyChartDiv = document.getElementById('sankey-chart');
    const organizationChartDiv = document.getElementById('organization-chart');
    const analysisTableBody = document.getElementById('analysis-table-body');
    const sankeyHeightInput = document.getElementById('sankey-height-input');
    const sankeyLevelsInput = document.getElementById('sankey-levels-input');
    const sankeyPercentageToggle = document.getElementById('sankey-percentage-toggle');
    const displayUnitSelector = document.getElementById('display-unit-selector');
    const orgChartHeightInput = document.getElementById('org-chart-height-input');
    const overviewTabBtn = document.getElementById('overview-tab-btn');
    const regressionTabBtn = document.getElementById('regression-tab-btn');
    const overviewView = document.getElementById('overview-view');
    const regressionView = document.getElementById('regression-view');
    const regressionEnergySelect = document.getElementById('regression-energy-select');
    const regressionProductionChecklist = document.getElementById('regression-production-checklist');
    const regressionStartDate = document.getElementById('regression-start-date');
    const regressionEndDate = document.getElementById('regression-end-date');
    const regressionDashboardContainer = document.getElementById('regression-dashboard-container');
    const startResetAnalysisBtn = document.getElementById('start-reset-analysis-btn');
    const refineAnalysisBtn = document.getElementById('refine-analysis-btn');
    const exportSingleCsvBtn = document.getElementById('export-single-csv-btn');
    const attributionTitle = document.getElementById('attribution-title');
    const stackedAreaTitle = document.getElementById('stacked-area-title');
    const multiLineTitle = document.getElementById('multi-line-title');

    function init() {
        addRootBtn.addEventListener('click', () => addRoot('energy'));
        addChildBtn.addEventListener('click', () => addChild());
        renameNodeBtn.addEventListener('click', () => renameNode());
        deleteNodeBtn.addEventListener('click', () => deleteNode());
        addRootProductionBtn.addEventListener('click', () => addRoot('production'));
        addChildProductionBtn.addEventListener('click', () => addChild());
        renameProductionBtn.addEventListener('click', () => renameNode());
        deleteProductionBtn.addEventListener('click', () => deleteNode());
        exportJsonBtn.addEventListener('click', exportJSON);
        importJsonInput.addEventListener('change', importJSON);
        exportCsvBtn.addEventListener('click', exportCSV);
        exportUnattributedBtn.addEventListener('click', exportUnattributedData);
        typeSelector.addEventListener('change', handleTypeChange);
        electricalType.addEventListener('change', saveMetadata);
        heatoilEnergy.addEventListener('change', saveMetadata);
        productionUnit.addEventListener('input', saveMetadata);
        processDataBtn.addEventListener('click', processPastedData);
        dataTableBody.addEventListener('click', handleTableActions);
        dataTableBody.addEventListener('change', handleTableActions);
        updateChartsBtn.addEventListener('click', updateAllVisuals);
        sankeyHeightInput.addEventListener('change', updateAllVisuals);
        sankeyLevelsInput.addEventListener('change', updateAllVisuals);
        sankeyPercentageToggle.addEventListener('change', updateAllVisuals);
        displayUnitSelector.addEventListener('change', updateAllVisuals);
        orgChartHeightInput.addEventListener('change', updateAllVisuals);
        overviewTabBtn.addEventListener('click', () => switchView('overview'));
        regressionTabBtn.addEventListener('click', () => switchView('regression'));
        startResetAnalysisBtn.addEventListener('click', startOrResetIterativeAnalysis);
        refineAnalysisBtn.addEventListener('click', runSingleRefinementPass);
        exportSingleCsvBtn.addEventListener('click', exportSingleCounterCSV);
        productionLinkChecklist.addEventListener('change', handleProductionLinkChange);
        setupDragAndDrop(hierarchyTree, 'energy');
        setupDragAndDrop(productionTree, 'production');
        showWelcomeMessage();
    }

    // --- DATA MODEL & HIERARCHY HELPERS ---
    const getTree = (type) => type === 'energy' ? appData.systems : appData.productionLines;
    const findNodeInTree = (id, nodes) => { for (const n of nodes) { if (n.id === id) return n; if (n.children) { const found = findNodeInTree(id, n.children); if (found) return found; } } return null; };
    const findParentInTree = (childId, nodes, parent = null) => { for (const n of nodes) { if (n.id === childId) return parent; if (n.children) { const found = findParentInTree(childId, n.children, n); if (found) return found; } } return null; };
    const getSelectedNode = () => selectedNodeId ? findNodeInTree(selectedNodeId, getTree(selectedNodeType)) : null;

    function getAllDescendantIds(node, idSet = new Set()) {
        if (node.children) {
            for (const child of node.children) {
                idSet.add(child.id);
                getAllDescendantIds(child, idSet);
            }
        }
        return idSet;
    }

    // --- VIEW SWITCHING ---
    function switchView(viewName) {
        if (!detailsPanel.classList.contains('hidden')) {
            detailsPanel.classList.add('hidden');
        }
         welcomeMessage.classList.add('hidden');
        overviewView.classList.toggle('hidden', viewName !== 'overview');
        regressionView.classList.toggle('hidden', viewName !== 'regression');
        overviewTabBtn.classList.toggle('active', viewName === 'overview');
        regressionTabBtn.classList.toggle('active', viewName === 'regression');
        if (viewName === 'regression') {
            populateRegressionSelectors();
            if (!regressionStartDate.value && startDateInput.value) regressionStartDate.value = startDateInput.value;
            if (!regressionEndDate.value && endDateInput.value) regressionEndDate.value = endDateInput.value;
        } else if (viewName === 'overview') {
            updateAllVisuals();
        }
    }

    function populateRegressionSelectors() {
        regressionEnergySelect.innerHTML = '';
        const traverseEnergy = (nodes, prefix) => {
            nodes.forEach(node => {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = prefix + node.name;
                regressionEnergySelect.appendChild(option);
                if (node.children) { traverseEnergy(node.children, prefix + '---'); }
            });
        };
        traverseEnergy(appData.systems || [], '');
        regressionProductionChecklist.innerHTML = '<i>Production lines for analysis are configured on the details panel of each energy system.</i>';
    }


    function startOrResetIterativeAnalysis() {
        const energyNodeId = regressionEnergySelect.value;
        if (!energyNodeId) return alert('Please select an energy system to analyze.');

        analysisEnergyNode = findNodeInTree(energyNodeId, appData.systems);
        if (!analysisEnergyNode) return alert('Selected energy system not found.');

        const descendantIds = getAllDescendantIds(analysisEnergyNode);
        const descendantNodes = Array.from(descendantIds).map(id => findNodeInTree(id, appData.systems));

        const allRelevantProductionIds = new Set(analysisEnergyNode.metadata.linkedProductionIds || []);
        descendantNodes.forEach(node => {
            (node.metadata.linkedProductionIds || []).forEach(id => allRelevantProductionIds.add(id));
        });

        if (allRelevantProductionIds.size === 0) {
            return alert(`The selected energy system "${analysisEnergyNode.name}" and its children are not linked to any production lines. Please configure the links first.`);
        }

        currentModelSECs = new Map();
        iterationCounter = 1;
        analysisProductionNodes = Array.from(allRelevantProductionIds).map(id => findNodeInTree(id, appData.productionLines)).filter(Boolean);

        const startDate = regressionStartDate.value ? new Date(regressionStartDate.value) : null;
        const endDate = regressionEndDate.value ? new Date(endDateInput.value) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const allNodesToMap = [analysisEnergyNode, ...descendantNodes, ...analysisProductionNodes];
        const dataMaps = new Map();
        allNodesToMap.forEach(node => {
            const dateMap = new Map();
            (node.data || []).forEach(d => {
                const itemDate = new Date(d.date);
                if ((!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate)) {
                    dateMap.set(d.date, d.value);
                }
            });
            dataMaps.set(node.id, dateMap);
        });

        dailyDataCache = new Map();
        const rootNodeDateMap = dataMaps.get(analysisEnergyNode.id);
        if (!rootNodeDateMap) return alert("Selected energy system has no data in the time range.");

        for (const [date, rootEnergy] of rootNodeDateMap.entries()) {
            const energyForAnalysis = rootEnergy;

            const productionForDay = new Map();
            analysisProductionNodes.forEach(pNode => {
                const prodValue = dataMaps.get(pNode.id)?.get(date) || 0;
                if (prodValue > 0) {
                    productionForDay.set(pNode.id, prodValue);
                }
            });

            if (energyForAnalysis > 0) {
                dailyDataCache.set(date, {
                    energy: energyForAnalysis,
                    production: productionForDay
                });
            }
        }

        if (dailyDataCache.size === 0) {
            return alert("No valid data points found for the selected system in the specified time range.");
        }

        // --- MODIFICATION: REMOVE BASELOAD CALCULATION ENTIRELY ---
        // The baseload is now always zero for a direct correlation.
        baseloadCache = 0; 
        
        const directCalculations = new Map();
        // The logic below now works correctly, as (day.energy - 0) is just day.energy.
        for (const day of dailyDataCache.values()) {
            if (day.production.size === 1 && day.energy > baseloadCache) { // baseloadCache is 0 here
                const [productId, productionValue] = day.production.entries().next().value;
                if (!directCalculations.has(productId)) directCalculations.set(productId, []);
                directCalculations.get(productId).push((day.energy - baseloadCache) / productionValue);
            }
        }
        for (const [productId, secValues] of directCalculations.entries()) {
            const avgSEC = secValues.reduce((a, b) => a + b, 0) / secValues.length;
            currentModelSECs.set(productId, { value: avgSEC, method: 'Direct (Single-Product Day)', count: secValues.length });
        }

        renderIterativeAnalysisResults();
        refineAnalysisBtn.classList.remove('hidden');
    }
    function runSingleRefinementPass() {
        if (!dailyDataCache) { return alert("Please start an analysis first."); }
        iterationCounter++;
        const newlyFoundSECsInPass = new Map();

        for (const day of dailyDataCache.values()) {
            const productsMadeIds = Array.from(day.production.keys());
            if (productsMadeIds.length < 2) continue; 

            const knownIds = productsMadeIds.filter(id => currentModelSECs.has(id));
            const unknownIds = productsMadeIds.filter(id => !currentModelSECs.has(id));

            if (unknownIds.length === 1 && knownIds.length > 0 && day.energy > baseloadCache) {
                const unknownId = unknownIds[0];
                let knownEnergy = knownIds.reduce((sum, id) => sum + (day.production.get(id) * currentModelSECs.get(id).value), 0);
                const residualEnergy = (day.energy - baseloadCache) - knownEnergy;
                const unknownProduction = day.production.get(unknownId);

                if (residualEnergy > 0 && unknownProduction > 0) {
                    if (!newlyFoundSECsInPass.has(unknownId)) newlyFoundSECsInPass.set(unknownId, []);
                    newlyFoundSECsInPass.get(unknownId).push(residualEnergy / unknownProduction);
                }
            }
        }

        if (newlyFoundSECsInPass.size === 0) {
            alert(`No new product factors could be determined in Pass ${iterationCounter}. The model is fully refined.`);
            refineAnalysisBtn.disabled = true;
            return;
        }

        for (const [productId, secValues] of newlyFoundSECsInPass.entries()) {
            const avgSEC = secValues.reduce((a, b) => a + b, 0) / secValues.length;
            currentModelSECs.set(productId, { value: avgSEC, method: `Iterative Pass ${iterationCounter}`, count: secValues.length });
        }

        renderIterativeAnalysisResults();
    }
    
    function getManualSECsFromInputs() {
        const manualModelSECs = new Map();
        const inputs = document.querySelectorAll('.manual-sec-input');

        inputs.forEach(input => {
            const productId = input.dataset.productId;
            const manualValue = parseFloat(input.value);
            
            const originalData = currentModelSECs.get(productId) || { method: 'Manual Input', count: 0 };

            if (!isNaN(manualValue)) {
                manualModelSECs.set(productId, {
                    value: manualValue,
                    method: originalData.method,
                    count: originalData.count
                });
            }
        });
        return manualModelSECs;
    }
    function exportSingleCounterCSV() {
        const node = getSelectedNode();

        if (!node) {
            alert("No item selected.");
            return;
        }

        if (!node.data || node.data.length === 0) {
            alert(`No data recorded for "${node.name}" to export.`);
            return;
        }

        // Determine the unit based on the node type and metadata
        let unit = 'Value';
        if (selectedNodeType === 'energy') {
            unit = (node.type === 'Heating Oil' ? 'L' : (node.metadata.electricalType || 'Value'));
        } else { // 'production'
            unit = node.metadata.unit || 'Value';
        }

        // Create CSV header and rows
        const csvRows = ['Date,Value,Unit'];
        node.data.forEach(entry => {
            // Ensure the unit string is quoted in case it contains special characters
            const row = [entry.date, entry.value, `"${unit}"`].join(',');
            csvRows.push(row);
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\r\n');
        const encodedUri = encodeURI(csvContent);

        // Create a link and trigger the download
        const link = document.createElement("a");
        // Sanitize the filename to be safe for all filesystems
        const filename = `data_for_${node.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    function generateSimulationSeries(modelSECs) {
        if (!dailyDataCache) return [];
        const sortedDates = Array.from(dailyDataCache.keys()).sort();
        return sortedDates.map(date => {
            const day = dailyDataCache.get(date);
            let simulatedEnergy = baseloadCache;
            for (const [prodId, prodValue] of day.production.entries()) {
                const secData = modelSECs.get(prodId);
                if (secData && typeof secData.value === 'number' && !isNaN(secData.value)) {
                     simulatedEnergy += prodValue * secData.value;
                }
            }
            return [new Date(date).getTime(), simulatedEnergy];
        });
    }

    function updateSimulationWithManualFactors() {
        if (!validationChart) return;
        const manualModelSECs = getManualSECsFromInputs();
        const newSimulatedData = generateSimulationSeries(manualModelSECs);
        validationChart.series[1].setData(newSimulatedData, true);
        calculateAndDisplaySummaryStats(manualModelSECs);
    }

    // --- *** MODIFIED FUNCTION CALLING OUR NEW, SAFE CALCULATOR *** ---
    /**
     * Calculates and displays overall model performance statistics using our internal, robust calculator.
     * @param {Map<string, {value: number}>} modelSECs The SEC model to evaluate.
     */
    function calculateAndDisplaySummaryStats(modelSECs) {
        const summaryContainer = document.getElementById('iterative-summary-container');
        if (!summaryContainer || !dailyDataCache) return;

        let totalActual = 0;
        let totalSimulated = 0;
        
        // This array will hold the [actual, simulated] data pairs for the statistical calculation.
        const rSquaredData = [];

        const sortedDates = Array.from(dailyDataCache.keys()).sort();
        sortedDates.forEach(date => {
            const dayData = dailyDataCache.get(date);
            const actual = dayData.energy;
            
            let simulated = baseloadCache;
            for (const [prodId, prodValue] of dayData.production.entries()) {
                if (modelSECs.has(prodId)) {
                    const sec = modelSECs.get(prodId).value;
                    if(isFinite(sec)){
                        simulated += prodValue * sec;
                    }
                }
            }
            
            totalActual += actual;
            totalSimulated += simulated;

            // Strict check to ensure both final numbers are valid before adding to the dataset.
            if (isFinite(actual) && isFinite(simulated)) {
                rSquaredData.push([actual, simulated]);
            }
        });

        const overallAccuracy = totalActual > 0 ? (totalSimulated / totalActual) * 100 : 0;
        
        // --- THIS IS THE CRITICAL CHANGE ---
        // We now call our own reliable function and check its result.
        const rSquaredValue = calculateRSquared(rSquaredData);
        const rSquared = isFinite(rSquaredValue) ? rSquaredValue : 'N/A';
        // --- END OF CHANGE ---

        summaryContainer.innerHTML = `
            <hr>
            <h4>Model Performance Summary</h4>
            <p><strong>Total Actual vs. Simulated:</strong> ${totalActual.toFixed(0)} kWh vs. ${totalSimulated.toFixed(0)} kWh</p>
            <p><strong>Overall Accuracy:</strong> <span style="font-weight: bold; color: ${overallAccuracy > 95 && overallAccuracy < 105 ? 'green' : 'orange'};">${overallAccuracy.toFixed(2)}%</span></p>
            <p><strong>Model Fit (R-squared):</strong> ${typeof rSquared === 'number' ? rSquared.toFixed(4) : rSquared} <em>(1.0 is a perfect fit)</em></p>
            <hr>
        `;
    }

    // --- *** NEW, SELF-CONTAINED FUNCTION TO REPLACE THE FAULTY LIBRARY *** ---
    /**
     * Calculates the R-squared value (coefficient of determination) for a set of data pairs.
     * This function is self-contained and does not rely on any external statistics libraries.
     * @param {Array<[number, number]>} dataPairs An array of pairs, where each pair is [actual, simulated].
     * @returns {number | NaN} The R-squared value, or NaN if it cannot be calculated.
     */
    function calculateRSquared(dataPairs) {
        if (!dataPairs || dataPairs.length < 2) {
            return NaN; // Cannot calculate with less than 2 points
        }

        const n = dataPairs.length;
        let sumActual = 0;
        let sumSimulated = 0;
        let sumActualSq = 0;
        let sumSimulatedSq = 0;
        let sumProducts = 0;

        for (let i = 0; i < n; i++) {
            const actual = dataPairs[i][0];
            const simulated = dataPairs[i][1];
            
            sumActual += actual;
            sumSimulated += simulated;
            sumActualSq += actual * actual;
            sumSimulatedSq += simulated * simulated;
            sumProducts += actual * simulated;
        }

        const numerator = (n * sumProducts) - (sumActual * sumSimulated);
        const denominator = Math.sqrt(((n * sumActualSq) - (sumActual * sumActual)) * ((n * sumSimulatedSq) - (sumSimulated * sumSimulated)));

        if (denominator === 0) {
            return 1.0; // Perfect correlation or no variance
        }

        const correlation = numerator / denominator;
        return correlation * correlation; // R-squared is the square of the correlation coefficient
    }
    function exportSimulationData() {
        if (!dailyDataCache) {
            alert("No analysis data available to export.");
            return;
        }
        
        const manualSECs = getManualSECsFromInputs();
        // MODIFICATION: Updated CSV header row.
        let csvRows = ['Date,Actual_Energy,Simulated_Energy,Difference,Difference_Percent'];
        
        const sortedDates = Array.from(dailyDataCache.keys()).sort();
        sortedDates.forEach(date => {
            const dayData = dailyDataCache.get(date);
            const actual = dayData.energy;
            let simulated = baseloadCache;
            for (const [prodId, prodValue] of dayData.production.entries()) {
                if (manualSECs.has(prodId)) {
                    simulated += prodValue * manualSECs.get(prodId).value;
                }
            }

            const difference = simulated - actual;
            const diffPercent = actual > 0 ? (difference / actual) * 100 : 0;
            
            const row = [
                date,
                actual.toFixed(2),
                simulated.toFixed(2),
                difference.toFixed(2),
                diffPercent.toFixed(2)
            ].join(',');
            csvRows.push(row);
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\r\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `simulation_vs_actual_${analysisEnergyNode.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function renderIterativeAnalysisResults() {
        const mainContainer = regressionDashboardContainer;
        mainContainer.innerHTML = `<div id="iterative-table-container" class="card" style="margin-bottom: 20px;"></div><div id="simulation-chart-container" class="card"></div>`;
        
        const tableContainer = document.getElementById('iterative-table-container');
        const chartContainer = document.getElementById('simulation-chart-container');
        
        // --- MODIFICATION: The zeroProdDaysCount is no longer needed. ---
        // const zeroProdDaysCount = Array.from(dailyDataCache.values()).filter(day => day.production.size === 0 && day.energy > 0).length;
        
        // --- MODIFICATION: Removed the <p> tag that mentioned baseload. ---
        let tableHTML = `
            <h3>Direct Correlation SEC Analysis (Pass ${iterationCounter})</h3>
            <div id="iterative-summary-container"></div>
            <table id="analysis-table"><thead><tr><th>Item</th><th>Specific Energy (kWh/unit)</th><th>Method</th><th>Data Points Used</th></tr></thead><tbody>`;
        
        analysisProductionNodes.forEach(node => {
            const result = currentModelSECs.get(node.id);
            if (result) {
                tableHTML += `
                    <tr>
                        <td>${node.name}</td>
                        <td><input type="number" class="manual-sec-input" data-product-id="${node.id}" value="${result.value.toFixed(4)}" step="0.0001"></td>
                        <td>${result.method}</td>
                        <td>${result.count}</td>
                    </tr>`;
            } else {
                tableHTML += `
                    <tr>
                        <td>${node.name}</td>
                        <td><input type="number" class="manual-sec-input" data-product-id="${node.id}" placeholder="Enter manual value" step="0.0001"></td>
                        <td>Not yet calculated</td>
                        <td>0</td>
                    </tr>`;
            }
        });

        tableHTML += `</tbody></table><br>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="update-manual-simulation-btn">Update Simulation with Manual Factors</button>
                <button id="export-simulation-btn" style="background-color: var(--secondary-color);">Export Simulation vs. Actual</button>
            </div>
        `;
        tableContainer.innerHTML = tableHTML;

        document.getElementById('update-manual-simulation-btn').addEventListener('click', updateSimulationWithManualFactors);
        document.getElementById('export-simulation-btn').addEventListener('click', exportSimulationData);

        const sortedDates = Array.from(dailyDataCache.keys()).sort();
        const actualSeriesData = sortedDates.map(date => [new Date(date).getTime(), dailyDataCache.get(date).energy]);
        const simulatedSeriesData = generateSimulationSeries(currentModelSECs);
        
        validationChart = Highcharts.chart(chartContainer, {
            chart: { type: 'line', zoomType: 'x' },
            title: { text: 'Model Validation: Actual vs. Simulated Energy' },
            yAxis: { title: { text: 'Energy (kWh)' }, min: 0 },
            xAxis: { type: 'datetime' },
            tooltip: {
                shared: true,
                crosshairs: true,
                formatter: function () {
                    const dateStr = new Date(this.x).toISOString().split('T')[0];
                    const dayData = dailyDataCache.get(dateStr);
                    let tooltipText = `<b>${Highcharts.dateFormat('%A, %b %e, %Y', this.x)}</b><br/>`;

                    const actual = this.points[0].y;
                    const simulated = this.points[1].y;
                    const diffPercent = actual > 0 ? ((simulated - actual) / actual) * 100 : 0;
                    
                    tooltipText += `Actual Energy: <b>${actual.toFixed(2)} kWh</b><br/>`;
                    tooltipText += `Simulated Energy: <b>${simulated.toFixed(2)} kWh</b> `;
                    tooltipText += `(<span style="color: ${diffPercent >= 0 ? 'red' : 'green'}">${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%</span>)<br/>`;

                    if (dayData && dayData.production.size > 0) {
                        tooltipText += '<br/><b>Production:</b><ul>';
                        for(const [prodId, prodValue] of dayData.production.entries()){
                            const node = findNodeInTree(prodId, appData.productionLines);
                            if(node){
                                tooltipText += `<li>${node.name}: ${prodValue} ${node.metadata.unit || 'units'}</li>`
                            }
                        }
                        tooltipText += '</ul>';
                    } else {
                        tooltipText += '<br/><i>No production recorded.</i>';
                    }

                    return tooltipText;
                }
            },
            series: [
                { name: 'Actual Energy', data: actualSeriesData, zIndex: 2 }, 
                { name: 'Simulated Energy (Model)', data: simulatedSeriesData, zIndex: 1, dashStyle: 'ShortDot' }
            ]
        });
        
        calculateAndDisplaySummaryStats(currentModelSECs);
        refineAnalysisBtn.disabled = false;
    }


    // --- Central Rendering Function ---
    function renderApp() {
        renderHierarchyTree(hierarchyTree, 'energy');
        renderHierarchyTree(productionTree, 'production');
        if (overviewView && !overviewView.classList.contains('hidden')) {
            updateAllVisuals();
        }
        updateHierarchyButtons();
    }
    
    // --- GENERIC HIERARCHY FUNCTIONS ---
    function createNode(name, type) {
        const baseNode = { id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name, data: [], children: [] };
        if (type === 'energy') {
            return { ...baseNode, type: 'Electrical', metadata: { electricalType: 'kWh/Tag', heatoilEnergy: 10, linkedProductionIds: [] } };
        } else {
            return { ...baseNode, metadata: { unit: 'units' } };
        }
    }
    function addRoot(type) { const promptText = type === 'energy' ? "Enter root system name:" : "Enter root production line name:"; const name = prompt(promptText); if (name) { const n = createNode(name, type); getTree(type).push(n); renderApp(); selectNode(n.id, type); } }
    function addChild() { if (!selectedNodeId) return; const name = prompt("Enter child item name:"); if (name) { const p = getSelectedNode(); if (p) { const n = createNode(name, selectedNodeType); if (!p.children) p.children = []; p.children.push(n); renderApp(); selectNode(n.id, selectedNodeType); } } }
    function renameNode() { if (!selectedNodeId) return; const n = getSelectedNode(); if (n) { const newName = prompt("Enter new name:", n.name); if (newName && newName !== n.name) { n.name = newName; renderApp(); if (detailsPanel.classList.contains('hidden')) showWelcomeMessage(); else selectedNodeName.textContent = newName; } } }
    function deleteNode() { if (!selectedNodeId) return; const n = getSelectedNode(); if (n && confirm(`Are you sure you want to delete "${n.name}" and all its children?`)) { const tree = getTree(selectedNodeType); const p = findParentInTree(selectedNodeId, tree); if (p) { p.children = p.children.filter(c => c.id !== selectedNodeId); } else { const updatedTree = tree.filter(r => r.id !== selectedNodeId); if(selectedNodeType === 'energy') appData.systems = updatedTree; else appData.productionLines = updatedTree; } showWelcomeMessage(); } }
    
    function selectNode(id, type) {
        selectedNodeId = id;
        selectedNodeType = type;
        const n = getSelectedNode();
        if (n) {
            welcomeMessage.classList.add('hidden');
            overviewView.classList.add('hidden');
            regressionView.classList.add('hidden');
            detailsPanel.classList.remove('hidden');
            renderDetailsPanel(n, type);
        } else {
            showWelcomeMessage();
        }
        renderApp();
    }

    function renderHierarchyTree(treeContainer, type) {
        treeContainer.innerHTML = '';
        const rootUl = document.createElement('ul');
        const treeData = getTree(type);
        if (treeData) {
            treeData.forEach(node => rootUl.appendChild(createNodeElement(node, type)));
        }
        treeContainer.appendChild(rootUl);
    }
    function createNodeElement(node, type) {
        const li = document.createElement('li');
        li.dataset.id = node.id;
        li.draggable = true;
        const label = document.createElement('span');
        label.className = 'node-label';
        label.textContent = node.name;
        if (node.id === selectedNodeId && selectedNodeType === type) {
            label.classList.add('selected');
        }
        label.addEventListener('click', () => selectNode(node.id, type));
        li.appendChild(label);
        if (node.children && node.children.length > 0) {
            const childUl = document.createElement('ul');
            node.children.forEach(childNode => {
                childUl.appendChild(createNodeElement(childNode, type));
            });
            li.appendChild(childUl);
        }
        return li;
    }
    function updateHierarchyButtons() { const isEnergySelected = selectedNodeType === 'energy' && selectedNodeId; const isProductionSelected = selectedNodeType === 'production' && selectedNodeId; addChildBtn.disabled = !isEnergySelected; renameNodeBtn.disabled = !isEnergySelected; deleteNodeBtn.disabled = !isEnergySelected; addChildProductionBtn.disabled = !isProductionSelected; renameProductionBtn.disabled = !isProductionSelected; deleteProductionBtn.disabled = !isProductionSelected; }
    function setupDragAndDrop(treeElement, type) { let draggedNodeId = null; treeElement.addEventListener('dragstart', e => { const li = e.target.closest('li'); if (li) { draggedNodeId = li.dataset.id; e.dataTransfer.setData('text/plain', draggedNodeId); setTimeout(() => e.target.classList.add('dragging'), 0); } }); treeElement.addEventListener('dragend', e => { e.target.classList.remove('dragging'); }); treeElement.addEventListener('dragover', e => { e.preventDefault(); const targetLabel = e.target.closest('.node-label'); document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); if (targetLabel) { targetLabel.classList.add('drag-over'); } }); treeElement.addEventListener('dragleave', e => { e.target.closest('.node-label')?.classList.remove('drag-over'); }); treeElement.addEventListener('drop', e => { e.preventDefault(); document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); const targetLi = e.target.closest('li'); if (!targetLi || !draggedNodeId || targetLi.dataset.id === draggedNodeId) return; const tree = getTree(type); const droppedOnNodeId = targetLi.dataset.id; const draggedParent = findParentInTree(draggedNodeId, tree); const droppedOnParent = findParentInTree(droppedOnNodeId, tree); if (draggedParent === droppedOnParent) { const siblings = draggedParent ? draggedParent.children : tree; const draggedIndex = siblings.findIndex(n => n.id === draggedNodeId); const droppedOnIndex = siblings.findIndex(n => n.id === droppedOnNodeId); const [draggedItem] = siblings.splice(draggedIndex, 1); siblings.splice(droppedOnIndex, 0, draggedItem); renderApp(); } }); }
    
    // --- DETAILS PANEL & DATA FUNCTIONS ---
    function showWelcomeMessage() {
        welcomeMessage.classList.remove('hidden');
        detailsPanel.classList.add('hidden');
        overviewView.classList.remove('hidden');
        regressionView.classList.add('hidden');
        selectedNodeId = null;
        selectedNodeType = null;
        overviewTabBtn.classList.add('active');
        regressionTabBtn.classList.remove('active');
        renderApp();
        updateAllVisuals();
    }
    function renderDetailsPanel(node, type) {
        selectedNodeName.textContent = node.name;
        energyConfigOptions.classList.toggle('hidden', type !== 'energy');
        productionConfigOptions.classList.toggle('hidden', type !== 'production');
        productionLinkingContainer.classList.toggle('hidden', type !== 'energy');
        if (type === 'energy') {
            typeSelector.value = node.type;
            electricalType.value = node.metadata.electricalType || 'kWh/Tag';
            heatoilEnergy.value = node.metadata.heatoilEnergy || 10;
            if (!node.metadata.linkedProductionIds) {
                node.metadata.linkedProductionIds = [];
            }
            renderProductionLinkChecklist(node);
            handleTypeChange(false);
        } else {
            productionUnit.value = node.metadata.unit || 'units';
        }
        dataInput.value = '';
        renderDataTable(node.data);
        updateAllVisuals();
    }
    
    function renderProductionLinkChecklist(energyNode) {
        productionLinkChecklist.innerHTML = '';
        const linkedIds = new Set(energyNode.metadata.linkedProductionIds || []);
        const traverseProduction = (nodes, path) => {
            nodes.forEach(node => {
                const currentPath = [...path, node.name];
                if (!node.children || node.children.length === 0) {
                     const div = document.createElement('div');
                     const checkbox = document.createElement('input');
                     checkbox.type = 'checkbox';
                     checkbox.id = `link-check-${node.id}`;
                     checkbox.value = node.id;
                     checkbox.checked = linkedIds.has(node.id);
                     const label = document.createElement('label');
                     label.htmlFor = `link-check-${node.id}`;
                     label.textContent = ' ' + currentPath.join(' -> ');
                     div.appendChild(checkbox);
                     div.appendChild(label);
                     productionLinkChecklist.appendChild(div);
                }
                if (node.children) {
                    traverseProduction(node.children, currentPath);
                }
            });
        };
        traverseProduction(appData.productionLines || [], []);
        if (productionLinkChecklist.innerHTML === '') {
            productionLinkChecklist.innerHTML = '<p>No production lines have been created yet.</p>';
        }
    }

    function handleProductionLinkChange() {
        const selectedNode = getSelectedNode();
        if (!selectedNode || selectedNodeType !== 'energy') return;
        const checkedIds = Array.from(productionLinkChecklist.querySelectorAll('input:checked')).map(cb => cb.value);
        selectedNode.metadata.linkedProductionIds = checkedIds;
    }
    
    function handleTypeChange(save = true) { const type = typeSelector.value; electricalOptions.classList.toggle('hidden', type !== 'Electrical'); heatoilOptions.classList.toggle('hidden', type !== 'Heating Oil'); if (save) { saveMetadata(); } }
    function saveMetadata() { if (!selectedNodeId) return; const node = getSelectedNode(); if (!node) return; if (selectedNodeType === 'energy') { node.type = typeSelector.value; node.metadata.electricalType = electricalType.value; node.metadata.heatoilEnergy = parseFloat(heatoilEnergy.value); } else { node.metadata.unit = productionUnit.value; } updateAllVisuals(); }
    function processPastedData() { if (!selectedNodeId) return; const n = getSelectedNode(); if (!n) return; const text = dataInput.value.trim(); const lines = text.split('\n'); let newEntries = 0; lines.forEach(l => { const p = l.split(/[\s\t]+/); if (p.length === 2) { const ds = p[0]; const v = parseFloat(p[1]); const dp = ds.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (dp && !isNaN(v)) { const d = new Date(dp[3], dp[2] - 1, dp[1]); const iso = d.toISOString().split('T')[0]; const ex = n.data.find(e => e.date === iso); if (ex) { ex.value = v; } else { n.data.push({ date: iso, value: v }); newEntries++; } } } }); n.data.sort((a, b) => new Date(a.date) - new Date(b.date)); alert(`${newEntries} new data points added for "${n.name}".`); renderDataTable(n.data); updateAllVisuals(); }
    function renderDataTable(data) { dataTableBody.innerHTML = ''; if (!data || data.length === 0) { dataTableBody.innerHTML = '<tr><td colspan="3">No data recorded.</td></tr>'; return; } data.forEach((e, i) => { const r = document.createElement('tr'); r.innerHTML = `<td><input type="date" class="edit-date" value="${e.date}"></td><td><input type="number" class="edit-value" value="${e.value}"></td><td><button class="delete-row-btn" data-index="${i}">Delete</button></td>`; dataTableBody.appendChild(r); }); }
    function handleTableActions(e) { if (!selectedNodeId) return; const n = getSelectedNode(); if (!n) return; const t = e.target; if (t.classList.contains('delete-row-btn')) { n.data.splice(parseInt(t.dataset.index, 10), 1); } else if (t.classList.contains('edit-date') || t.classList.contains('edit-value')) { const row = t.closest('tr'); const i = Array.from(dataTableBody.children).indexOf(row); const d = row.querySelector('.edit-date').value; const v = parseFloat(row.querySelector('.edit-value').value); if (i > -1 && n.data[i] && d && !isNaN(v)) { n.data[i] = { date: d, value: v }; n.data.sort((a, b) => new Date(a.date) - new Date(b.date)); } } renderDataTable(n.data); updateAllVisuals(); }
    
    // --- VISUALIZATION & UTILITY FUNCTIONS ---
    function setGlobalDefaultTimeFrame() { let allEntries = []; function c(nodes) { if(!nodes) return; for (const n of nodes) { if (n.data) allEntries.push(...n.data); if (n.children) c(n.children); } } c(appData.systems); c(appData.productionLines); if (allEntries.length === 0) { regressionStartDate.value = ''; regressionEndDate.value = ''; startDateInput.value = ''; endDateInput.value = ''; return; } allEntries.sort((a, b) => new Date(a.date) - new Date(b.date)); const firstDate = allEntries[0].date; const lastDate = allEntries[allEntries.length - 1].date; startDateInput.value = firstDate; endDateInput.value = lastDate; regressionStartDate.value = firstDate; regressionEndDate.value = lastDate; }
    function updateAllVisuals() { const start = startDateInput.value ? new Date(startDateInput.value) : null; const end = endDateInput.value ? new Date(endDateInput.value) : null; if (end) end.setHours(23, 59, 59, 999); const displayUnit = displayUnitSelector.value; if (!overviewView.classList.contains('hidden')) { renderOrganizationChart(start, end, displayUnit); renderSankeyChart(start, end); renderAnalysisTable(start, end, displayUnit); } const selectedNode = getSelectedNode(); if (selectedNode && !detailsPanel.classList.contains('hidden')) { renderUsageChart(selectedNode, start, end, selectedNodeType); renderAttributionChart(selectedNode, start, end, selectedNodeType); renderStackedAreaChart(selectedNode, start, end, selectedNodeType); renderMultiLineChart(selectedNode, start, end, selectedNodeType); } else { if (usageChart) { usageChart.destroy(); usageChart = null; } if (attributionChart) { attributionChart.destroy(); attributionChart = null; } if (stackedAreaChart) { stackedAreaChart.destroy(); stackedAreaChart = null; } if (multiLineChart) { multiLineChart.destroy(); multiLineChart = null; } } }
    const calculateTotalForNode = (node, startDate, endDate, type) => { if (!node || !node.data) return 0; let d = node.data; if (startDate && endDate) { d = d.filter(i => { const id = new Date(i.date); return id >= startDate && id <= endDate; }); } const sum = d.reduce((a, i) => a + i.value, 0); if (type === 'energy' && node.type === 'Heating Oil') { return sum * (node.metadata.heatoilEnergy || 10); } return sum; };
    function renderUsageChart(node, startDate, endDate, type) { if (usageChart) { usageChart.destroy(); usageChart = null; } const unit = type === 'energy' ? (node.type === 'Heating Oil' ? 'Liters' : (node.metadata.electricalType || 'Value')) : (node.metadata.unit || 'Value'); let filteredData = node.data; if(startDate && endDate) { filteredData = node.data.filter(d => { const itemDate = new Date(d.date); return itemDate >= startDate && itemDate <= endDate; }); } const chartData = filteredData.map(d => [new Date(d.date).getTime(), d.value]); usageChart = Highcharts.chart('usage-chart', { chart: { type: 'line', zoomType: 'x' }, title: { text: null }, xAxis: { type: 'datetime', title: { text: 'Date' } }, yAxis: { title: { text: `Value (${unit})` } }, legend: { enabled: false }, series: [{ name: `Value (${unit})`, data: chartData }] }); }
    function renderAttributionChart(node, startDate, endDate, type) { if (attributionChart) { attributionChart.destroy(); attributionChart = null; } const containerDiv = document.getElementById('attribution-chart'); if (!node.children || node.children.length === 0) { attributionTitle.classList.add('hidden'); containerDiv.classList.add('hidden'); return; } attributionTitle.classList.remove('hidden'); containerDiv.classList.remove('hidden'); const parentTotal = calculateTotalForNode(node, startDate, endDate, type); if (parentTotal <= 0.01) { containerDiv.innerHTML = '<p style="text-align:center; color: #6c757d;">No data for parent in this period.</p>'; return; } let childrenTotal = 0; const chartData = []; node.children.forEach(child => { const childTotal = calculateTotalForNode(child, startDate, endDate, type); if (childTotal > 0.01) { childrenTotal += childTotal; chartData.push({ name: child.name, y: childTotal }); } }); const unattributed = Math.max(0, parentTotal - childrenTotal); if (unattributed > 0.01) { chartData.push({ name: 'Unattributed', y: unattributed }); } if (chartData.length === 0) { containerDiv.innerHTML = '<p style="text-align:center; color: #6c757d;">No sub-item data in this period.</p>'; return; } const unit = type === 'energy' ? 'kWh' : (node.metadata.unit || 'value'); chartData.sort((a,b) => b.y - a.y); if(chartData.length > 0) { chartData[0].sliced = true; chartData[0].selected = true; } attributionChart = Highcharts.chart('attribution-chart', { chart: { type: 'pie' }, title: { text: null }, tooltip: { pointFormat: `{series.name}: <b>{point.percentage:.1f}%</b> ({point.y:.2f} ${unit})` }, plotOptions: { pie: { allowPointSelect: true, cursor: 'pointer', dataLabels: { enabled: true, format: '<b>{point.name}</b><br>{point.percentage:.1f} %' } } }, series: [{ name: 'Contribution', colorByPoint: true, data: chartData }] }); }
    function renderStackedAreaChart(node, startDate, endDate, type) { if (stackedAreaChart) { stackedAreaChart.destroy(); stackedAreaChart = null; } const containerDiv = document.getElementById('stacked-area-chart'); if (!node.children || node.children.length === 0) { stackedAreaTitle.classList.add('hidden'); containerDiv.classList.add('hidden'); return; } stackedAreaTitle.classList.remove('hidden'); containerDiv.classList.remove('hidden'); let allDates = new Set(); const filterAndAddDates = (data) => { if (!data) return; data.forEach(d => { const itemDate = new Date(d.date); if ((!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate)) { allDates.add(d.date); } }); }; filterAndAddDates(node.data); node.children.forEach(child => filterAndAddDates(child.data)); const sortedDates = Array.from(allDates).sort(); if (sortedDates.length === 0) { containerDiv.innerHTML = '<p style="text-align:center; color: #6c757d;">No data in time range.</p>'; return; } const parentDataMap = new Map(node.data.map(d => [d.date, d.value])); const childDataMaps = node.children.map(child => ({ name: child.name, map: new Map(child.data.map(d => [d.date, d.value])) })); const seriesData = []; childDataMaps.forEach(child => { const data = sortedDates.map(date => [new Date(date).getTime(), child.map.get(date) || 0]); seriesData.push({ name: child.name, data: data }); }); const unattributedData = sortedDates.map(date => { const timestamp = new Date(date).getTime(); const parentValue = parentDataMap.get(date) || 0; const childrenSum = childDataMaps.reduce((sum, child) => sum + (child.map.get(date) || 0), 0); return [timestamp, Math.max(0, parentValue - childrenSum)]; }); seriesData.push({ name: 'Unattributed', data: unattributedData }); const unit = type === 'energy' ? 'kWh' : (node.metadata.unit || 'value'); stackedAreaChart = Highcharts.chart('stacked-area-chart', { chart: { type: 'area', zoomType: 'x' }, title: { text: null }, xAxis: { type: 'datetime' }, yAxis: { labels: { format: '{value}%' }, title: { enabled: false } }, tooltip: { pointFormat: `<span style="color:{series.color}">{series.name}</span>: <b>{point.percentage:.1f}%</b> ({point.y:,.2f} ${unit})<br/>`, split: true }, plotOptions: { area: { stacking: 'percent', marker: { enabled: false } } }, series: seriesData }); }
    function renderMultiLineChart(node, startDate, endDate, type) { if (multiLineChart) { multiLineChart.destroy(); multiLineChart = null; } const containerDiv = document.getElementById('multi-line-chart'); if (!node.children || node.children.length === 0) { multiLineTitle.classList.add('hidden'); containerDiv.classList.add('hidden'); return; } multiLineTitle.classList.remove('hidden'); containerDiv.classList.remove('hidden'); let allDates = new Set(); const filterAndAddDates = (data) => { if (!data) return; data.forEach(d => { const itemDate = new Date(d.date); if ((!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate)) { allDates.add(d.date); } }); }; node.children.forEach(child => filterAndAddDates(child.data)); const sortedDates = Array.from(allDates).sort(); if (sortedDates.length === 0) { containerDiv.innerHTML = '<p style="text-align:center; color: #6c757d;">No sub-item data in time range.</p>'; return; } const seriesData = node.children.map(child => { const childMap = new Map(child.data.map(d => [d.date, d.value])); const data = sortedDates.map(date => [new Date(date).getTime(), childMap.get(date) || 0]); return { name: child.name, data: data }; }); let unit = 'value'; if (type === 'energy') { unit = 'kWh'; } else if (node.children[0] && node.children[0].metadata) { unit = node.children[0].metadata.unit || 'units'; } multiLineChart = Highcharts.chart('multi-line-chart', { chart: { type: 'line', zoomType: 'x' }, title: { text: null }, yAxis: { title: { text: `Value (${unit})` } }, xAxis: { type: 'datetime' }, tooltip: { shared: true, crosshairs: true, pointFormat: `{series.name}: <b>{point.y:.2f} ${unit}</b><br/>` }, legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' }, plotOptions: { series: { label: { connectorAllowed: false } } }, series: seriesData }); }
    const calculateTotalKwh = (node, startDate, endDate) => calculateTotalForNode(node, startDate, endDate, 'energy');
    function renderOrganizationChart(startDate, endDate, displayUnit) {
        if (organizationChart) {
            organizationChart.destroy();
            organizationChart = null;
        }

        const chartHeight = parseInt(orgChartHeightInput.value, 10) || 350;
        const data = [];
        const nodes = [];
        const divisor = displayUnit === 'MWh' ? 1000 : 1;

        const traverse = (node, parent) => {
            const nodeTotalKwh = calculateTotalKwh(node, startDate, endDate);
            let percentage = 100;
            if (parent) {
                const parentTotalKwh = calculateTotalKwh(parent, startDate, endDate);
                percentage = parentTotalKwh > 0 ? (nodeTotalKwh / parentTotalKwh) * 100 : 0;
            }

            const nodeObject = {
                id: node.id,
                name: `${node.name}<br><b>${(nodeTotalKwh / divisor).toFixed(2)} ${displayUnit}</b><br><i>(${percentage.toFixed(1)}%)</i>`
            };
            
            if (parent && node.children && node.children.length > 0) {
                nodeObject.layout = 'hanging';
            }

            nodes.push(nodeObject);

            if (parent) {
                data.push({ from: parent.id, to: node.id });
            }

            if (node.children) {
                node.children.forEach(child => traverse(child, node));
            }
        };

        (appData.systems || []).forEach(root => traverse(root, null));

        if (nodes.length === 0) {
            organizationChartDiv.innerHTML = '<p style="text-align:center; color: #6c757d;">Add energy systems to see the hierarchy.</p>';
            return;
        }

        organizationChartDiv.innerHTML = '';

        organizationChart = Highcharts.chart('organization-chart', {
            chart: {
                height: chartHeight,
                inverted: true
            },
            title: {
                text: null
            },
            series: [{
                type: 'organization',
                name: 'Systems',
                keys: ['from', 'to'],
                data: data,
                nodes: nodes,
                colorByPoint: false,
                color: '#007bff', 
                levels: [
                    { level: 0, color: '686868' }, 
                    { level: 1, color: '#888888' }, 
                    { level: 2, color: '#a9a9a9' }, 
                    { level: 3, color: 'silver' }
                ],
                dataLabels: {
                    color: 'white',
                    useHTML: true
                },
                borderColor: 'white',
                nodeWidth: 90
            }],
            tooltip: {
                outside: true,
                pointFormat: '{point.name}'
            }
        });
    }

    function lightenColor(hex, percent) {
        let [h, s, l] = hexToHsl(hex);
        l = Math.min(1, l + percent);
        return hslToHex(h, s, l);
    }

    function hexToHsl(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length == 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length == 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max == min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    function hslToHex(h, s, l) {
        let r, g, b;
        if (s == 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length == 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function renderSankeyChart(startDate, endDate) {
        if (sankeyChart) {
            sankeyChart.destroy();
            sankeyChart = null;
        }

        const chartHeight = parseInt(sankeyHeightInput.value, 10) || 400;
        const maxLevels = parseInt(sankeyLevelsInput.value, 10);
        const showPercentages = sankeyPercentageToggle.checked;

        const rootColors = [
            '#4682b4', '#2E8B57', '#D2691E', '#6A5ACD',
            '#B22222', '#008B8B', '#9932CC'
        ];
        const nodeColorMap = new Map();
        const dataRows = [];
        const totalSystemInput = (appData.systems || []).reduce((sum, root) => sum + calculateTotalKwh(root, startDate, endDate), 0);

        const traversalQueue = (appData.systems || []).map((rootNode, index) => ({
            node: rootNode,
            level: 1,
            rootIndex: index
        }));
        
        const processedNodes = new Set();

        while (traversalQueue.length > 0) {
            const { node, level, rootIndex } = traversalQueue.shift();

            if (!node || processedNodes.has(node.id)) continue;
            processedNodes.add(node.id);
            
            const baseColor = rootColors[rootIndex % rootColors.length];
            const nodeColor = (level === 1) ? baseColor : lightenColor(baseColor, (level - 1) * 0.15); 
            
            if (!nodeColorMap.has(node.name)) {
                nodeColorMap.set(node.name, nodeColor);
            }

            const parentKwh = calculateTotalKwh(node, startDate, endDate);
            if (parentKwh <= 0.01) continue;

            let childrenKwh = 0;
            
            const shouldProcessChildren = !(maxLevels > 0 && level >= maxLevels);

            if (shouldProcessChildren && node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    const childKwh = calculateTotalKwh(child, startDate, endDate);
                    if (childKwh > 0.01) {
                        dataRows.push([node.name, child.name, childKwh]);
                        childrenKwh += childKwh;
                        traversalQueue.push({ node: child, level: level + 1, rootIndex });
                    }
                });
            }
            
            const unattributedKwh = parentKwh - childrenKwh;
            if (unattributedKwh > 0.01) {
                const unattributedName = `Unattributed (${node.name})`;
                dataRows.push([node.name, unattributedName, unattributedKwh]);
                if (!nodeColorMap.has(unattributedName)) {
                    nodeColorMap.set(unattributedName, lightenColor(baseColor, level * 0.15));
                }
            }
        }

        sankeyChartDiv.innerHTML = '';
        if (dataRows.length === 0) {
            sankeyChartDiv.textContent = 'No energy data available to display the flow.';
            return;
        }

        sankeyChart = Highcharts.chart('sankey-chart', {
            chart: { height: chartHeight },
            title: { text: 'Energy Flow Analysis' },
            tooltip: {
                pointFormat: '{point.fromNode.name} \u2192 {point.toNode.name}: <b>{point.weight:.2f} kWh</b>',
                nodeFormat: '{point.name}: <b>{point.sum:.2f} kWh</b>'
            },
            series: [{
                keys: ['from', 'to', 'weight'],
                nodes: Array.from(nodeColorMap.entries()).map(([name, color]) => ({
                    id: name,
                    name: name,
                    color: color
                })),
                data: dataRows,
                type: 'sankey',
                name: 'Energy Flow',
                linkColorMode: 'from',
                dataLabels: {
                    enabled: true,
                    formatter: function() {
                        if (showPercentages && !this.point.isNode && totalSystemInput > 0) {
                            const percentage = (this.point.weight / totalSystemInput) * 100;
                            if (percentage >= 0.1) return `${percentage.toFixed(1)}%`;
                        }
                        return '';
                    },
                    style: { fontSize: '11px', fontWeight: 'bold' }
                }
            }]
        });
    }
    function renderAnalysisTable(startDate, endDate, displayUnit) { analysisTableBody.innerHTML = ''; const divisor = displayUnit === 'MWh' ? 1000 : 1; document.getElementById('analysis-table-unit-header').textContent = `Total Energy (${displayUnit})`; document.getElementById('analysis-table-unattributed-header').textContent = `Unattributed (${displayUnit})`; if (!appData.systems || appData.systems.length === 0) { analysisTableBody.innerHTML = '<tr><td colspan="4">No systems to analyze.</td></tr>'; return; } const traverseAndBuildTableRows = (node, path, rootNodeTotal) => { const totalKwh = calculateTotalKwh(node, startDate, endDate); if (totalKwh <= 0.01 && path.length > 0) return; let childrenKwh = 0; if (node.children) { node.children.forEach(child => { childrenKwh += calculateTotalKwh(child, startDate, endDate); }); } const unattributedKwh = Math.max(0, totalKwh - childrenKwh); const percentageOfRoot = rootNodeTotal > 0 ? (totalKwh / rootNodeTotal) * 100 : 0; const row = document.createElement('tr'); row.innerHTML = ` <td style="padding-left: ${path.length * 25}px;">${node.name}</td> <td>${(totalKwh / divisor).toFixed(displayUnit === 'MWh' ? 3 : 2)}</td> <td>${percentageOfRoot.toFixed(1)}%</td> <td>${(unattributedKwh / divisor).toFixed(displayUnit === 'MWh' ? 3 : 2)}</td> `; analysisTableBody.appendChild(row); if (node.children) { const newPath = [...path, node.name]; node.children.forEach(child => traverseAndBuildTableRows(child, newPath, rootNodeTotal)); } }; appData.systems.forEach(rootNode => { const rootTotal = calculateTotalKwh(rootNode, startDate, endDate); traverseAndBuildTableRows(rootNode, [], rootTotal); }); }
    function exportJSON() { const str = JSON.stringify(appData, null, 2); const blob = new Blob([str], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'energy_production_setup.json'; a.click(); URL.revokeObjectURL(a.href); }
    function importJSON(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const d = JSON.parse(ev.target.result); if (d && d.systems !== undefined) { appData.systems = d.systems || []; appData.productionLines = d.productionLines || []; showWelcomeMessage(); setGlobalDefaultTimeFrame(); alert('Import successful!'); } else { alert('Invalid file format.'); } } catch (err) { alert('Error reading file: ' + err.message); } }; r.readAsText(f); e.target.value = ''; }
    function exportCSV() { let csvRows = ['Hierarchy_Type,Path,Date,Value,Unit']; const traverseAndCollect = (nodes, path, type) => { if(!nodes) return; nodes.forEach(node => { const currentPath = [...path, node.name]; const unit = type === 'energy' ? (node.type === 'Heating Oil' ? 'L' : (node.metadata.electricalType || 'Value')) : (node.metadata.unit || 'Value'); if(node.data && node.data.length > 0){ node.data.forEach(entry => { const row = [type, `"${currentPath.join(' -> ')}"`, entry.date, entry.value, `"${unit}"`].join(','); csvRows.push(row); }); } if(node.children){ traverseAndCollect(node.children, currentPath, type); } }); }; traverseAndCollect(appData.systems, [], 'energy'); traverseAndCollect(appData.productionLines, [], 'production'); if(csvRows.length <= 1){ alert("No data to export."); return; } const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\r\n'); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "all_data.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    function exportUnattributedData() { const unattributedEntries = []; const allDates = new Set(); const parentNodesWithChildren = []; const findParents = (nodes) => { nodes.forEach(node => { if (node.children && node.children.length > 0) { parentNodesWithChildren.push(node); node.data.forEach(d => allDates.add(d.date)); node.children.forEach(child => { if(child.data) child.data.forEach(d => allDates.add(d.date)); }); } if (node.children) { findParents(node.children); } }); }; findParents(appData.systems); if (parentNodesWithChildren.length === 0) { alert('No parent energy systems with children found to calculate unattributed data.'); return; } const sortedDates = Array.from(allDates).sort(); sortedDates.forEach(date => { parentNodesWithChildren.forEach(parent => { const parentDataMap = new Map(parent.data.map(d => [d.date, d.value])); const parentValueOnDate = parentDataMap.get(date) || 0; let childrenSumOnDate = 0; parent.children.forEach(child => { const childMap = new Map(child.data.map(d => [d.date, d.value])); childrenSumOnDate += (childMap.get(date) || 0); }); const unattributedValue = parentValueOnDate - childrenSumOnDate; let finalUnattributedKwh = unattributedValue; if (parent.type === 'Heating Oil') { finalUnattributedKwh *= (parent.metadata.heatoilEnergy || 10); } if (finalUnattributedKwh > 0.01) { unattributedEntries.push({ date: date, parent: parent.name, value: finalUnattributedKwh.toFixed(2) }); } }); }); if (unattributedEntries.length === 0) { alert('No unattributed energy data found to export.'); return; } let csvContent = "data:text/csv;charset=utf-8,"; csvContent += "Date,Parent_System,Unattributed_kWh\r\n"; unattributedEntries.forEach(row => { csvContent += `${row.date},"${row.parent}",${row.value}\r\n`; }); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "unattributed_energy_data.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    
    init();
});