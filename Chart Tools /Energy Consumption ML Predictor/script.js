window.addEventListener('load', () => {
    let model;
    let numericalInputFeatureNames = [];
    let timeBasedFeatureSelections = {};
    let allInputFeatureNames = [];
    let outputFeatureName = 'Fuel_Consumption';
    let parsedTrainingData = [];
    let linearModelCoefficients = null;
    let CONSUMER_RATES = {};
    let CONSUMER_INTERCEPTS = {};
    let scenarioChartInstance = null;
    let featureMinMax = [];
    let outputMinMax = { min: 0, max: 0 };
    let averageFeatureValues = [];
    let lastSimulatedData = { x: [], y: [] };
    let lastDisaggregationData = []; // To store value and percentage breakdown

    // --- DOM Elements ---
    const numericalFeaturesContainer = document.getElementById('numericalFeaturesContainer');
    const addNumericalFeatureButton = document.getElementById('addNumericalFeature');
    const outputFeatureNameInput = document.getElementById('outputFeatureName');
    const consumerRatesContainer = document.getElementById('consumerRatesContainer');
    const trainingDataTextarea = document.getElementById('trainingData');
    const trainModelButton = document.getElementById('trainModel');
    const trainingStatus = document.getElementById('trainingStatus');
    const exportModelButton = document.getElementById('exportModel');
    const modelJsonFileInput = document.getElementById('modelJsonFile');
    const weightsBinFileInput = document.getElementById('weightsBinFile');
    const configJsonFileInput = document.getElementById('configJsonFile');
    const importModelButton = document.getElementById('importModel');
    const modelStatus = document.getElementById('modelStatus');
    const predictionInputsContainer = document.getElementById('predictionInputsContainer');
    const predictionDateTimeInput = document.getElementById('predictionDateTime');
    const predictButton = document.getElementById('predict');
    const predictionResult = document.getElementById('predictionResult');
    const timeFeaturesCheckboxes = document.querySelectorAll('.time-features-selector input[type="checkbox"]');
    const trainingFitChartDiv = document.getElementById('trainingFitChart');
    const sensitivityFeatureSelect = document.getElementById('sensitivityFeatureSelect');
    const runSensitivityAnalysisButton = document.getElementById('runSensitivityAnalysis');
    const sensitivityChartDiv = document.getElementById('sensitivityChart');
    const featureToVarySelect = document.getElementById('featureToVarySelect');
    const varyStartInput = document.getElementById('varyStart');
    const varyEndInput = document.getElementById('varyEnd');
    const varyStepsInput = document.getElementById('varySteps');
    const fixedFeatureInputsContainer = document.getElementById('fixedFeatureInputsContainer');
    const resetFixedValuesButton = document.getElementById('resetFixedValues');
    const runScenarioSimulationButton = document.getElementById('runScenarioSimulation');
    const scenarioSimulationChartDiv = document.getElementById('scenarioSimulationChart');
    const exportSimulationCsvButton = document.getElementById('exportSimulationCsv');
    const disaggregatedTimeSeriesChartDiv = document.getElementById('disaggregatedTimeSeriesChart');
    const estimateRatesButton = document.getElementById('estimateRatesButton');
    const estimatedRatesResultsDiv = document.getElementById('estimatedRatesResults');
    const trainingEpochsInput = document.getElementById('trainingEpochs');
    const consumptionPieChartDiv = document.getElementById('consumptionPieChart');
    const exportDisaggregationCsvButton = document.getElementById('exportDisaggregationCsv');


    // --- Feature Management & UI Rendering ---
    function updateNumericalFeatureNames() {
        numericalInputFeatureNames = Array.from(document.querySelectorAll('.numerical-feature-name'))
            .map(input => input.value.trim())
            .filter(name => name);
        updateAllInputFeatureNames();
    }

    function updateTimeBasedFeatureSelections() {
        timeBasedFeatureSelections = {};
        timeFeaturesCheckboxes.forEach(checkbox => {
            timeBasedFeatureSelections[checkbox.value] = checkbox.checked;
        });
        updateAllInputFeatureNames();
    }

    function updateAllInputFeatureNames() {
        allInputFeatureNames = [...numericalInputFeatureNames];
        if (timeBasedFeatureSelections.year) allInputFeatureNames.push('Year');
        if (timeBasedFeatureSelections.month) allInputFeatureNames.push('Month');
        if (timeBasedFeatureSelections.day) allInputFeatureNames.push('Day_of_Month');
        if (timeBasedFeatureSelections.dayofweek) allInputFeatureNames.push('Day_of_Week');
        if (timeBasedFeatureSelections.hour) allInputFeatureNames.push('Hour');
        if (timeBasedFeatureSelections.minute) allInputFeatureNames.push('Minute');
        outputFeatureName = outputFeatureNameInput.value.trim();
        
        renderConsumerRatesInputs();
        renderPredictionInputs();
        populateSensitivitySelect();
        populateFeatureToVarySelect();
        renderFixedFeatureInputs();
    }

    function renderConsumerRatesInputs() {
        const existingRates = { ...CONSUMER_RATES };
        const existingIntercepts = { ...CONSUMER_INTERCEPTS };
        consumerRatesContainer.innerHTML = '';
        numericalInputFeatureNames.forEach(name => {
            const div = document.createElement('div');
            div.classList.add('feature-input');
            const safeIdName = name.replace(/[^a-zA-Z0-9]/g, '_');
            const rateValue = existingRates[name] || 0;
            const interceptValue = existingIntercepts[name] || 0;

            div.innerHTML = `
                <label for="rate-${safeIdName}" style="width: auto; min-width: 120px;">${name} Rate:</label>
                <input type="number" class="consumer-rate-input" id="rate-${safeIdName}" data-feature-name="${name}" value="${rateValue}" step="0.01">
                <label for="intercept-${safeIdName}" style="width: auto; margin-left: 10px;">Baseline:</label>
                <input type="number" class="consumer-intercept-input" id="intercept-${safeIdName}" data-feature-name="${name}" value="${interceptValue}" step="0.1">
                <input type="checkbox" class="lock-baseline-checkbox" id="lock-${safeIdName}" data-feature-name="${name}" title="Lock baseline to 0 and recalculate rates based on this constraint.">
                <label for="lock-${safeIdName}" style="width: auto; font-weight: normal;">Lock to 0</label>
            `;
            consumerRatesContainer.appendChild(div);
        });

        addRateInputEventListeners();
    }

    function addRateInputEventListeners() {
        document.querySelectorAll('.consumer-rate-input').forEach(input => input.addEventListener('input', () => {
            updateConsumerRatesFromUI();
            analyzeModelPerformance();
        }));

        document.querySelectorAll('.consumer-intercept-input').forEach(input => input.addEventListener('input', () => {
            updateConsumerInterceptsFromUI();
            analyzeModelPerformance();
        }));

        document.querySelectorAll('.lock-baseline-checkbox').forEach(checkbox => checkbox.addEventListener('change', (e) => {
            const featureName = e.target.dataset.featureName;
            const interceptInput = document.getElementById(`intercept-${featureName.replace(/[^a-zA-Z0-9]/g, '_')}`);
            if (e.target.checked) {
                interceptInput.value = 0;
                interceptInput.disabled = true;
            } else {
                interceptInput.disabled = false;
            }
            updateConsumerInterceptsFromUI();
            analyzeModelPerformance();
        }));
        
        updateConsumerRatesFromUI();
        updateConsumerInterceptsFromUI();
    }
    function updateConsumerRatesFromUI() {
        CONSUMER_RATES = {};
        document.querySelectorAll('.consumer-rate-input').forEach(input => {
            CONSUMER_RATES[input.dataset.featureName] = parseFloat(input.value) || 0;
        });
    }

    function updateConsumerInterceptsFromUI() {
        CONSUMER_INTERCEPTS = {};
        document.querySelectorAll('.consumer-intercept-input').forEach(input => {
            CONSUMER_INTERCEPTS[input.dataset.featureName] = parseFloat(input.value) || 0;
        });
    }

    function addNumericalFeatureInput(name = '') {
        const div = document.createElement('div');
        div.classList.add('feature-input');
        div.innerHTML = `
            <label>Name:</label>
            <input type="text" class="numerical-feature-name" value="${name}">
            <button class="remove-numerical-feature">Remove</button>
        `;
        numericalFeaturesContainer.appendChild(div);
        div.querySelector('.remove-numerical-feature').addEventListener('click', () => {
            div.remove();
            updateNumericalFeatureNames();
        });
        div.querySelector('.numerical-feature-name').addEventListener('input', updateNumericalFeatureNames);
        updateNumericalFeatureNames();
    }
    
    document.querySelectorAll('.numerical-feature-name').forEach(input => input.addEventListener('input', updateNumericalFeatureNames));
    document.querySelectorAll('.remove-numerical-feature').forEach(button => button.addEventListener('click', (e) => {
        e.target.parentElement.remove();
        updateNumericalFeatureNames();
    }));

    timeFeaturesCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateTimeBasedFeatureSelections));
    addNumericalFeatureButton.addEventListener('click', () => addNumericalFeatureInput('New_Feature'));
    outputFeatureNameInput.addEventListener('input', updateAllInputFeatureNames);

    // --- Data Parsing and Feature Engineering ---
    function parseAndEngineerData(rawData) {
        const lines = rawData.trim().split('\n');
        const engineeredData = [];
        const errors = [];
        lines.forEach((line, lineIndex) => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length !== numericalInputFeatureNames.length + 2) {
                errors.push(`Line ${lineIndex + 1}: Incorrect number of columns. Expected ${numericalInputFeatureNames.length + 2}, got ${parts.length}.`);
                return;
            }
            const dateString = parts[0];
            const numericalValues = parts.slice(1, numericalInputFeatureNames.length + 1).map(Number);
            const outputValue = Number(parts[numericalInputFeatureNames.length + 1]);
            if (numericalValues.some(isNaN) || isNaN(outputValue)) {
                errors.push(`Line ${lineIndex + 1}: Non-numeric values found.`);
                return;
            }
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                errors.push(`Line ${lineIndex + 1}: Invalid date format.`);
                return;
            }
            const rowFeatures = [...numericalValues];
            if (timeBasedFeatureSelections.year) rowFeatures.push(date.getFullYear());
            if (timeBasedFeatureSelections.month) rowFeatures.push(date.getMonth() + 1);
            if (timeBasedFeatureSelections.day) rowFeatures.push(date.getDate());
            if (timeBasedFeatureSelections.dayofweek) rowFeatures.push(date.getDay());
            if (timeBasedFeatureSelections.hour) rowFeatures.push(date.getHours());
            if (timeBasedFeatureSelections.minute) rowFeatures.push(date.getMinutes());
            engineeredData.push({ date: date, features: rowFeatures, output: outputValue });
        });
        return { data: engineeredData, errors: errors };
    }

    // --- Data Scaling ---
    function calculateMinMax(data) {
        if (data.length === 0) return;
        featureMinMax = new Array(allInputFeatureNames.length).fill(0).map(() => ({ min: Infinity, max: -Infinity }));
        outputMinMax = { min: Infinity, max: -Infinity };
        data.forEach(d => {
            d.features.forEach((val, i) => {
                if (val < featureMinMax[i].min) featureMinMax[i].min = val;
                if (val > featureMinMax[i].max) featureMinMax[i].max = val;
            });
            if (d.output < outputMinMax.min) outputMinMax.min = d.output;
            if (d.output > outputMinMax.max) outputMinMax.max = d.output;
        });
        averageFeatureValues = new Array(allInputFeatureNames.length).fill(0);
        data.forEach(d => {
            d.features.forEach((val, i) => {
                averageFeatureValues[i] += val;
            });
        });
        averageFeatureValues = averageFeatureValues.map(sum => sum / data.length);
    }

    function scaleFeature(value, index) {
        const { min, max } = featureMinMax[index];
        if (max === min) return 0;
        return (value - min) / (max - min);
    }

    function scaleOutput(value) {
        const { min, max } = outputMinMax;
        if (max === min) return 0;
        return (value - min) / (max - min);
    }

    function inverseScaleOutput(scaledValue) {
        const { min, max } = outputMinMax;
        return scaledValue * (max - min) + min;
    }
    
    // --- Rate Estimation ---
    async function estimateRates() {
        const { data, errors } = parseAndEngineerData(trainingDataTextarea.value);
        if (errors.length > 0) {
            estimatedRatesResultsDiv.innerHTML = `<p class="error">Could not estimate rates due to data parsing errors.</p>`;
            return;
        }
        if (data.length < allInputFeatureNames.length + 1) {
            estimatedRatesResultsDiv.innerHTML = `<p class="error">Need more data points than features to estimate rates.</p>`;
            return;
        }
        
        parsedTrainingData = data;
        calculateMinMax(parsedTrainingData);

        const lockedFeatureNames = [];
        document.querySelectorAll('.lock-baseline-checkbox:checked').forEach(cb => {
            lockedFeatureNames.push(cb.dataset.featureName);
        });

        const X_full = data.map(d => d.features);
        const y_full = data.map(d => [d.output]); // Target is the raw output

        const result = performConstrainedRegression(X_full, y_full, allInputFeatureNames, lockedFeatureNames);

        if (result.success) {
            linearModelCoefficients = result.coefficients;
            updateEstimationUI(result.coefficients);
        } else {
            estimatedRatesResultsDiv.innerHTML = `<p class="error">An error occurred during regression analysis: ${result.error.message}</p>`;
        }
    }
    
    // --- Model Training ---
    function createModel() {
        if (allInputFeatureNames.length === 0) {
            trainingStatus.textContent = 'Error: Please define at least one input feature.';
            trainingStatus.className = 'error';
            return null;
        }
        if (typeof tf === 'undefined') {
            trainingStatus.textContent = 'Error: TensorFlow.js is not loaded.';
            trainingStatus.className = 'error';
            return null;
        }
        model = tf.sequential();
        model.add(tf.layers.lstm({ units: 50, inputShape: [1, allInputFeatureNames.length], returnSequences: false }));
        model.add(tf.layers.dense({ units: 25, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1 }));
        model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });
        return model;
    }

    async function trainModel() {
        trainingStatus.textContent = '';
        const { data, errors } = parseAndEngineerData(trainingDataTextarea.value);
        parsedTrainingData = data;
        if (errors.length > 0) {
            trainingStatus.textContent = 'Data parsing errors:\n' + errors.join('\n');
            trainingStatus.className = 'error';
            return;
        }
        if (parsedTrainingData.length === 0) {
            trainingStatus.textContent = 'Error: No valid training data found.';
            trainingStatus.className = 'error';
            return;
        }
        if (parsedTrainingData[0].features.length !== allInputFeatureNames.length) {
            trainingStatus.textContent = `Error: Mismatch between defined features (${allInputFeatureNames.length}) and parsed data features (${parsedTrainingData[0].features.length}).`;
            trainingStatus.className = 'error';
            return;
        }
        calculateMinMax(parsedTrainingData);
        const currentModel = createModel();
        if (!currentModel) return;

        const scaledXs = parsedTrainingData.map(d => d.features.map((val, i) => scaleFeature(val, i)));
        const scaledYs = parsedTrainingData.map(d => scaleOutput(d.output));
        const xsTensor = tf.tensor3d(scaledXs.map(f => [f]), [scaledXs.length, 1, allInputFeatureNames.length]);
        const ysTensor = tf.tensor2d(scaledYs, [scaledYs.length, 1]);

        let epochs = parseInt(trainingEpochsInput.value, 10);
        if (isNaN(epochs) || epochs < 1) {
            console.warn(`Invalid epoch value "${trainingEpochsInput.value}". Defaulting to 200.`);
            epochs = 200; 
            trainingEpochsInput.value = 200;
        }

        trainingStatus.textContent = 'Training model...';
        trainingStatus.className = '';
        await currentModel.fit(xsTensor, ysTensor, {
            epochs: epochs,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    trainingStatus.textContent = `Epoch ${epoch + 1}/${epochs}: Loss = ${logs.loss.toFixed(4)}`;
                }
            }
        });
        trainingStatus.textContent = 'Training complete!';
        trainingStatus.className = 'success';
        await analyzeModelPerformance();
    }
    
    // --- Analysis Functions ---
    async function analyzeModelPerformance() {
        document.getElementById('lstm-mseValue').textContent = 'N/A';
        document.getElementById('lstm-rSquaredValue').textContent = 'N/A';
        document.getElementById('lstm-max-error').textContent = 'N/A';
        document.getElementById('lstm-total-comparison').textContent = 'N/A';
        document.getElementById('manual-mseValue').textContent = 'N/A';
        document.getElementById('manual-rSquaredValue').textContent = 'N/A';
        document.getElementById('manual-max-error').textContent = 'N/A';
        document.getElementById('manual-total-comparison').textContent = 'N/A';

        trainingFitChartDiv.innerHTML = '';
        disaggregatedTimeSeriesChartDiv.innerHTML = '';
        consumptionPieChartDiv.innerHTML = '';

        if (parsedTrainingData.length === 0) {
            const { data, errors } = parseAndEngineerData(trainingDataTextarea.value);
            if (errors.length > 0 || data.length === 0) {
                 trainingFitChartDiv.innerHTML = '<p style="text-align:center; padding: 20px;">Provide data and define features to see performance analysis.</p>';
                 return;
            }
            parsedTrainingData = data;
        }

        const actualOutputs = parsedTrainingData.map(d => d.output);
        const dates = parsedTrainingData.map(d => d.date.getTime());

        const calculateMSE = (actuals, predictions) => actuals.reduce((sum, actual, i) => sum + Math.pow(actual - predictions[i], 2), 0) / actuals.length;
        const calculateRSquared = (actuals, predictions) => {
            const meanActual = actuals.reduce((sum, val) => sum + val, 0) / actuals.length;
            const ssTotal = actuals.reduce((sum, actual) => sum + Math.pow(actual - meanActual, 2), 0);
            const ssResidual = actuals.reduce((sum, actual, i) => sum + Math.pow(actual - predictions[i], 2), 0);
            return ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);
        };

        const chartSeries = [{ name: `Actual ${outputFeatureName}`, data: actualOutputs.map((y, i) => [dates[i], y]), zIndex: 2, color: '#333333' }];
        
        if (model) {
            const inputFeaturesForLstm = parsedTrainingData.map(d => d.features.map((val, i) => scaleFeature(val, i)));
            const inputTensor = tf.tensor3d(inputFeaturesForLstm.map(f => [f]), [inputFeaturesForLstm.length, 1, allInputFeatureNames.length]);
            const scaledPredictedOutputsTensor = model.predict(inputTensor);
            const lstmPredictedOutputs = Array.from(scaledPredictedOutputsTensor.dataSync()).map(val => inverseScaleOutput(val));
            
            document.getElementById('lstm-mseValue').textContent = calculateMSE(actualOutputs, lstmPredictedOutputs).toFixed(4);
            document.getElementById('lstm-rSquaredValue').textContent = calculateRSquared(actualOutputs, lstmPredictedOutputs).toFixed(4);
            const lstmMetrics = calculateAdditionalMetrics(actualOutputs, lstmPredictedOutputs);
            document.getElementById('lstm-max-error').textContent = isFinite(lstmMetrics.maxPercentageError) ? lstmMetrics.maxPercentageError.toFixed(2) : "N/A";
            document.getElementById('lstm-total-comparison').textContent = isFinite(lstmMetrics.totalComparison) ? lstmMetrics.totalComparison.toFixed(2) : "N/A";

            chartSeries.push({ name: `Predicted (LSTM)`, data: lstmPredictedOutputs.map((y, i) => [dates[i], y]), zIndex: 1, color: '#007bff'});
        }

        // --- Manual Rate Model Analysis (with Percentage Calculation) ---
        lastDisaggregationData = []; // Clear previous data
        const disaggregatedDataByConsumer = {};
        const totalConsumptionByConsumer = {};
        numericalInputFeatureNames.forEach(name => {
            disaggregatedDataByConsumer[name] = [];
            totalConsumptionByConsumer[name] = 0;
        });

        const manualModelPredictions = parsedTrainingData.map((dataPoint, index) => {
            const featureMap = {};
            dataPoint.features.forEach((val, i) => { featureMap[allInputFeatureNames[i]] = val; });

            const contributionsForPoint = {};
            let totalPredictionForPoint = 0;

            // First pass: calculate individual raw contributions
            numericalInputFeatureNames.forEach(name => {
                const activity = featureMap[name] || 0;
                const rate = CONSUMER_RATES[name] || 0;
                const baseline = CONSUMER_INTERCEPTS[name] || 0;
                const contribution = Math.max(0, baseline + (activity * rate));
                contributionsForPoint[name] = contribution;
                totalPredictionForPoint += contribution;
            });

            // Second pass: build data structures for charts and CSV export
            const dataRow = { date: dates[index], values: {}, percentages: {} };
            numericalInputFeatureNames.forEach(name => {
                const contribution = contributionsForPoint[name];
                const percentage = totalPredictionForPoint > 0 ? (contribution / totalPredictionForPoint) * 100 : 0;
                
                dataRow.values[name] = contribution;
                dataRow.percentages[name] = percentage;
                
                disaggregatedDataByConsumer[name].push([dates[index], contribution]);
                totalConsumptionByConsumer[name] += contribution;
            });

            lastDisaggregationData.push(dataRow);
            return totalPredictionForPoint;
        });


        document.getElementById('manual-mseValue').textContent = calculateMSE(actualOutputs, manualModelPredictions).toFixed(4);
        document.getElementById('manual-rSquaredValue').textContent = calculateRSquared(actualOutputs, manualModelPredictions).toFixed(4);
        const manualMetrics = calculateAdditionalMetrics(actualOutputs, manualModelPredictions);
        document.getElementById('manual-max-error').textContent = isFinite(manualMetrics.maxPercentageError) ? manualMetrics.maxPercentageError.toFixed(2) : "N/A";
        document.getElementById('manual-total-comparison').textContent = isFinite(manualMetrics.totalComparison) ? manualMetrics.totalComparison.toFixed(2) : "N/A";
        
        chartSeries.push({
            name: `Predicted (Manual Rates)`,
            data: manualModelPredictions.map((y, i) => [dates[i], y]),
            dashStyle: 'ShortDot',
            color: '#28a745'
        });

        Highcharts.chart(trainingFitChartDiv, {
            chart: { type: 'spline' },
            title: { text: `Actual vs. Predicted ${outputFeatureName}` },
            xAxis: { type: 'datetime', title: { text: 'Date' } },
            yAxis: { title: { text: outputFeatureName } },
            tooltip: { shared: true, crosshairs: true },
            series: chartSeries
        });
        
        plotConsumptionPieChart(totalConsumptionByConsumer);
        plotDisaggregatedTimeSeries(disaggregatedDataByConsumer, manualModelPredictions, actualOutputs, dates);
    }

    function plotConsumptionPieChart(totalConsumptionByConsumer) {
        const pieData = Object.keys(totalConsumptionByConsumer).map(name => {
            return {
                name: name,
                y: totalConsumptionByConsumer[name]
            };
        }).filter(d => d.y > 0); 

        if (pieData.length === 0) {
            consumptionPieChartDiv.innerHTML = '<p style="text-align:center; padding: 20px;">No consumption data to display for the manual model.</p>';
            return;
        }

        Highcharts.chart(consumptionPieChartDiv, {
            chart: { type: 'pie' },
            title: { text: null },
            tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y:.2f} units)' },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    },
                    showInLegend: true
                }
            },
            series: [{
                name: 'Consumption',
                colorByPoint: true,
                data: pieData
            }]
        });
    }

    function plotDisaggregatedTimeSeries(disaggregatedDataByConsumer, predictedTotals, actualTotals, dates) {
        const series = [];

        for (const consumerName in disaggregatedDataByConsumer) {
            series.push({
                type: 'area',
                name: consumerName,
                data: disaggregatedDataByConsumer[consumerName]
            });
        }
        
        series.push({
            type: 'spline',
            name: `Predicted Total (Manual)`,
            data: predictedTotals.map((y, i) => [dates[i], y]),
            color: '#28a745',
            marker: { enabled: false, symbol: 'circle', radius: 2 },
            zIndex: 1
        });

        series.push({
            type: 'spline',
            name: `Actual ${outputFeatureName}`,
            data: actualTotals.map((y, i) => [dates[i], y]),
            color: '#333333',
            dashStyle: 'shortdash',
            marker: { enabled: false, symbol: 'circle', radius: 2 },
            zIndex: 2
        });

        Highcharts.chart(disaggregatedTimeSeriesChartDiv, {
            chart: { type: 'area' },
            title: { text: null },
            xAxis: { type: 'datetime', title: { text: 'Date' } },
            yAxis: { title: { text: outputFeatureName }, stacking: 'normal' },
            tooltip: {
                shared: true,
                formatter: function () {
                    const pointData = lastDisaggregationData.find(d => d.date === this.x);
                    let s = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b>`;
            
                    const sortedPoints = [...this.points].sort((a, b) => {
                        if (a.series.options.type === 'area' && b.series.options.type !== 'area') return -1;
                        if (a.series.options.type !== 'area' && b.series.options.type === 'area') return 1;
                        return b.y - a.y; // Sort by value otherwise
                    });
                    
                    sortedPoints.forEach(point => {
                        let percentageText = '';
                        if (point.series.options.type === 'area' && pointData?.percentages[point.series.name] !== undefined) {
                            percentageText = ` (${pointData.percentages[point.series.name].toFixed(1)}%)`;
                        }
                        s += `<br/><span style="color:${point.series.color}">\u25CF</span> ${point.series.name}: <b>${point.y.toFixed(2)}</b>${percentageText}`;
                    });
                    
                    return s;
                }
            },
            plotOptions: {
                area: {
                    stacking: 'normal',
                    marker: { enabled: false },
                    lineWidth: 1,
                }
            },
            series: series
        });
    }
    
    // --- NEW FUNCTION: Export Disaggregation Data ---
    function exportDisaggregationDataAsCsv() {
        if (!lastDisaggregationData || lastDisaggregationData.length === 0) {
            alert('No disaggregation data available to export. Please run model analysis first.');
            return;
        }
    
        const headers = ['Date', 'Total_Predicted'];
        numericalInputFeatureNames.forEach(name => {
            headers.push(`${name}_Value`, `${name}_Percent`);
        });
        let csvContent = headers.join(',') + '\n';
    
        lastDisaggregationData.forEach(row => {
            const date = new Date(row.date);
            const dateString = date.toISOString().slice(0, 16).replace('T', ' '); 
            const totalPredicted = Object.values(row.values).reduce((sum, val) => sum + val, 0);
    
            const csvRow = [dateString, totalPredicted.toFixed(4)];
            numericalInputFeatureNames.forEach(name => {
                csvRow.push((row.values[name] || 0).toFixed(4));
                csvRow.push((row.percentages[name] || 0).toFixed(2));
            });
    
            csvContent += csvRow.join(',') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "disaggregation_analysis.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // --- Scenario & Prediction ---
    async function runScenarioSimulation() {
        if (!model) { 
            alert('Please train the main LSTM model first.');
            return;
        }
        if (scenarioChartInstance) {
            scenarioChartInstance.destroy();
            scenarioChartInstance = null;
        }
        const featureToVary = featureToVarySelect.value;
        if (!featureToVary) {
            alert('Please select a feature to vary.');
            return;
        }
        const varyIndex = allInputFeatureNames.indexOf(featureToVary);
        const startVal = Number(varyStartInput.value);
        const endVal = Number(varyEndInput.value);
        const numSteps = Number(varyStepsInput.value);
        if (isNaN(startVal) || isNaN(endVal) || isNaN(numSteps) || numSteps < 2) {
            alert('Please enter valid numbers for start, end, and steps (min 2 steps).');
            return;
        }
        const fixedValues = new Array(allInputFeatureNames.length);
        let allFixedInputsValid = true;
        allInputFeatureNames.forEach((name, index) => {
            if (name === featureToVary) {
                fixedValues[index] = null;
            } else {
                const safeIdName = name.replace(/[^a-zA-Z0-9]/g, '_');
                const inputElement = document.getElementById(`fixed-${safeIdName}`);
                const value = Number(inputElement.value);
                if (isNaN(value)) {
                    allFixedInputsValid = false;
                }
                fixedValues[index] = value;
            }
        });
        if (!allFixedInputsValid) {
            alert('Please enter valid numbers for all fixed feature inputs.');
            return;
        }

        const lstmSimulatedData = [];
        const simpleModelSimulatedData = [];
        const manualModelSimulatedData = [];

        for (let i = 0; i < numSteps; i++) {
            const currentVaryValue = startVal + (endVal - startVal) * (i / (numSteps - 1));
            const inputForPrediction = [...fixedValues];
            inputForPrediction[varyIndex] = currentVaryValue;

            const scaledInput = inputForPrediction.map((val, idx) => scaleFeature(val, idx));
            const inputTensor = tf.tensor3d([[scaledInput]], [1, 1, allInputFeatureNames.length]);
            lstmSimulatedData.push([currentVaryValue, inverseScaleOutput(model.predict(inputTensor).dataSync()[0])]);

            if (linearModelCoefficients) {
                let simplePrediction = linearModelCoefficients.intercept;
                inputForPrediction.forEach((value, index) => {
                    simplePrediction += value * (linearModelCoefficients.rates[index] || 0);
                });
                simpleModelSimulatedData.push([currentVaryValue, simplePrediction]);
            }
            
            let manualPrediction = 0;
            const inputMap = {};
            allInputFeatureNames.forEach((name, index) => { inputMap[name] = inputForPrediction[index]; });
            
            numericalInputFeatureNames.forEach(name => {
                const activity = inputMap[name] || 0;
                const rate = CONSUMER_RATES[name] || 0;
                const baseline = CONSUMER_INTERCEPTS[name] || 0;
                manualPrediction += (activity * rate) + baseline;
            });
            manualModelSimulatedData.push([currentVaryValue, manualPrediction]);
        }

        lastSimulatedData = { x: lstmSimulatedData.map(d => d[0]), y: lstmSimulatedData.map(d => d[1]) };

        const chartSeries = [{ name: `Predicted (LSTM Model)`, data: lstmSimulatedData, zIndex: 2, color: '#007bff' }];
        
        if (simpleModelSimulatedData.length > 0) {
            chartSeries.push({ name: `Predicted (Simple Linear Model)`, data: simpleModelSimulatedData, dashStyle: 'ShortDash', color: '#dc3545', zIndex: 1 });
        }
        
        chartSeries.push({ name: `Prediction (Manual Rates)`, data: manualModelSimulatedData, dashStyle: 'Dot', color: '#28a745', zIndex: 0 });

        scenarioChartInstance = Highcharts.chart(scenarioSimulationChartDiv, {
            chart: { type: 'spline' },
            title: { text: `Scenario Simulation Comparison` },
            xAxis: { title: { text: featureToVary } },
            yAxis: { title: { text: outputFeatureName } },
            tooltip: { shared: true, crosshairs: true },
            series: chartSeries
        });
    }
    
    function calculateAdditionalMetrics(actuals, predictions) {
        let maxPercentageError = 0;
        let totalActual = 0;
        let totalPredicted = 0;

        for (let i = 0; i < actuals.length; i++) {
            const actual = actuals[i];
            const predicted = predictions[i];

            totalActual += actual;
            totalPredicted += predicted;

            if (actual !== 0) {
                const percentageError = Math.abs((actual - predicted) / actual) * 100;
                if (percentageError > maxPercentageError) {
                    maxPercentageError = percentageError;
                }
            }
        }
        const totalComparison = totalActual !== 0 ? (totalPredicted / totalActual) * 100 : 100;

        return { maxPercentageError, totalComparison };
    }
    function renderPredictionInputs() {
        predictionInputsContainer.innerHTML = '';
        numericalInputFeatureNames.forEach(name => {
            const div = document.createElement('div');
            div.classList.add('prediction-input-group');
            div.innerHTML = `<label for="predict-${name}">${name}:</label><input type="number" id="predict-${name}" value="0">`;
            predictionInputsContainer.appendChild(div);
        });
    }
        
    function applyEstimatedRatesToUI(coefficients) {
        const { intercept, rates, featureOrder, lockedFeatures = [] } = coefficients;
        const unlockedNumericalFeatures = numericalInputFeatureNames.filter(name => !lockedFeatures.includes(name));

        let totalAverageImpact = 0;
        const featureImpacts = {};

        unlockedNumericalFeatures.forEach(name => {
            const featureIndex = allInputFeatureNames.indexOf(name);
            const rateIndex = featureOrder.indexOf(name);
            
            if (featureIndex !== -1 && rateIndex !== -1 && averageFeatureValues[featureIndex] !== undefined) {
                const avgValue = averageFeatureValues[featureIndex] || 0;
                const rateValue = rates[rateIndex] || 0;
                const impact = Math.abs(avgValue * rateValue);
                featureImpacts[name] = impact;
                totalAverageImpact += impact;
            }
        });

        featureOrder.forEach((featureName, i) => {
            if (numericalInputFeatureNames.includes(featureName)) {
                const rate = rates[i];
                const rateInput = document.querySelector(`.consumer-rate-input[data-feature-name="${featureName}"]`);
                if (rateInput) rateInput.value = rate.toFixed(4);
            }
        });

        numericalInputFeatureNames.forEach(featureName => {
            const interceptInput = document.querySelector(`.consumer-intercept-input[data-feature-name="${featureName}"]`);
            
            if (lockedFeatures.includes(featureName)) {
                if(interceptInput) interceptInput.value = 0;
            } else {
                let distributedIntercept = 0;
                if (totalAverageImpact > 0) {
                    const weight = (featureImpacts[featureName] || 0) / totalAverageImpact;
                    distributedIntercept = intercept * weight;
                } else {
                    const numUnlocked = unlockedNumericalFeatures.length > 0 ? unlockedNumericalFeatures.length : 1;
                    distributedIntercept = intercept / numUnlocked;
                }
                if(interceptInput) interceptInput.value = distributedIntercept.toFixed(4);
            }
        });

        document.querySelectorAll('.lock-baseline-checkbox').forEach(cb => {
            const featureName = cb.dataset.featureName;
            const interceptInput = document.getElementById(`intercept-${featureName.replace(/[^a-zA-Z0-9]/g, '_')}`);
            
            if (lockedFeatures.includes(featureName)) {
                cb.checked = true;
                interceptInput.disabled = true;
            } else {
                cb.checked = false;
                interceptInput.disabled = false;
            }
        });

        updateConsumerRatesFromUI();
        updateConsumerInterceptsFromUI();
        analyzeModelPerformance();
        alert('Constrained rates and weighted baselines have been applied!');
    }
    
    function performConstrainedRegression(X_full, y_full, allFeatureNames, lockedFeatureNames) {
        try {
            const prelimRegression = new ML.MultivariateLinearRegression(X_full, y_full, { intercept: false });
            const prelimRates = prelimRegression.weights.map(w => w[0]);

            let knownConsumption = new Array(X_full.length).fill(0);
            if (lockedFeatureNames.length > 0) {
                X_full.forEach((dataRow, rowIndex) => {
                    lockedFeatureNames.forEach(name => {
                        const featureIndex = allFeatureNames.indexOf(name);
                        if (featureIndex !== -1) {
                            knownConsumption[rowIndex] += dataRow[featureIndex] * prelimRates[featureIndex];
                        }
                    });
                });
            }
            
            const y_adjusted = y_full.map((y, i) => [y[0] - knownConsumption[i]]);

            const unlockedFeatureIndices = allFeatureNames
                .map((name, i) => i)
                .filter(i => !lockedFeatureNames.includes(allFeatureNames[i]));
                
            const X_unlocked = X_full.map(dataRow => unlockedFeatureIndices.map(i => dataRow[i]));

            const mainRegression = new ML.MultivariateLinearRegression(X_unlocked, y_adjusted, { intercept: true });
            const mainWeights = mainRegression.weights.map(w => w[0]);
            const mainIntercept = mainWeights[mainWeights.length - 1];
            const unlockedRates = mainWeights.slice(0, -1);

            const finalRates = new Array(allFeatureNames.length).fill(0);
            unlockedFeatureIndices.forEach((globalIndex, i) => {
                finalRates[globalIndex] = unlockedRates[i];
            });
            lockedFeatureNames.forEach(name => {
                const featureIndex = allFeatureNames.indexOf(name);
                finalRates[featureIndex] = prelimRates[featureIndex];
            });
            
            return {
                success: true,
                coefficients: {
                    intercept: mainIntercept,
                    rates: finalRates,
                    featureOrder: allFeatureNames,
                    lockedFeatures: lockedFeatureNames
                }
            };

        } catch (e) {
            return { success: false, error: e };
        }
    }
    
    function updateEstimationUI(coefficients) {
        const { intercept, rates, featureOrder, lockedFeatures } = coefficients;
        let resultsHtml = '<h4>Estimated Rates (with Constraints):</h4>';
        let functionString = `${outputFeatureName} ≈ ${intercept.toFixed(4)}`;
        
        featureOrder.forEach((name, i) => {
            functionString += ` + (${name} * ${rates[i].toFixed(4)})`;
            if (lockedFeatures.includes(name)) {
                functionString += ` [LOCKED BASELINE]`;
            }
        });
        resultsHtml += `<p><b>Function Diagram:</b> <code>${functionString}</code></p><ul>`;
        
        featureOrder.forEach((name, i) => {
            resultsHtml += `<li><strong>${name}:</strong> ${rates[i].toFixed(4)}</li>`;
        });
        resultsHtml += `<li><strong>Intercept (for unlocked features):</strong> ${intercept.toFixed(4)}</li></ul>`;
        resultsHtml += '<p>The intercept will be distributed among the UNLOCKED feature baselines.</p>';
        resultsHtml += '<button id="applyRatesButton">Apply Estimated Rates & Baselines</button>';

        estimatedRatesResultsDiv.innerHTML = resultsHtml;

        document.getElementById('applyRatesButton').addEventListener('click', () => {
            applyEstimatedRatesToUI(coefficients);
        });
    }
    
    async function estimateRatesFromLstm() {
        if (!model) {
            alert('You must train the main LSTM model first!');
            return;
        }
        if (parsedTrainingData.length === 0) {
            alert('No training data available to make predictions from.');
            return;
        }
        
        estimatedRatesResultsDiv.innerHTML = '<p>Generating LSTM predictions and running constrained regression...</p>';

        const inputFeatures = parsedTrainingData.map(d => d.features.map((val, i) => scaleFeature(val, i)));
        const inputTensor = tf.tensor3d(inputFeatures.map(f => [f]), [inputFeatures.length, 1, allInputFeatureNames.length]);
        const scaledPredictedOutputsTensor = model.predict(inputTensor);
        const lstmPredictedOutputs = Array.from(scaledPredictedOutputsTensor.dataSync()).map(val => inverseScaleOutput(val));
        
        const lockedFeatureNames = [];
        document.querySelectorAll('.lock-baseline-checkbox:checked').forEach(cb => {
            lockedFeatureNames.push(cb.dataset.featureName);
        });

        const X_full = parsedTrainingData.map(d => d.features);
        const y_full = lstmPredictedOutputs.map(d => [d]); 

        const result = performConstrainedRegression(X_full, y_full, allInputFeatureNames, lockedFeatureNames);

        if (result.success) {
            linearModelCoefficients = result.coefficients;
            updateEstimationUI(result.coefficients);
        } else {
            estimatedRatesResultsDiv.innerHTML = `<p class="error">An error occurred during regression analysis: ${result.error.message}</p>`;
        }
    }
    
    async function runSensitivityAnalysis() { 
        if (!model || parsedTrainingData.length === 0) {
            alert('Please train a model and provide training data first.');
            sensitivityChartDiv.innerHTML = '';
            return;
        }

        const selectedFeature = sensitivityFeatureSelect.value;
        if (!selectedFeature) {
            alert('Please select a feature for sensitivity analysis.');
            sensitivityChartDiv.innerHTML = '';
            return;
        }

        const featureIndex = allInputFeatureNames.indexOf(selectedFeature);
        const avgScaledFeatures = averageFeatureValues.map((val, i) => scaleFeature(val, i));

        const rawFeatureValues = [...new Set(parsedTrainingData.map(d => d.features[featureIndex]))].sort((a, b) => a - b);
        const sensitivityData = [];

        for (const rawVal of rawFeatureValues) {
            const inputForPrediction = [...avgScaledFeatures];
            inputForPrediction[featureIndex] = scaleFeature(rawVal, featureIndex);
            const inputTensor = tf.tensor3d([[inputForPrediction]], [1, 1, allInputFeatureNames.length]);
            const scaledPrediction = model.predict(inputTensor);
            sensitivityData.push([rawVal, inverseScaleOutput(scaledPrediction.dataSync()[0])]);
        }
        
        Highcharts.chart(sensitivityChartDiv, {
            chart: { type: 'spline' },
            title: { text: `Sensitivity of ${outputFeatureName} to ${selectedFeature}` },
            xAxis: { title: { text: selectedFeature } },
            yAxis: { title: { text: outputFeatureName } },
            series: [{
                name: `Predicted ${outputFeatureName}`,
                data: sensitivityData
            }]
        });
    }

    async function exportModel() {
        if (!model) {
            modelStatus.textContent = 'No model to export. Please train a model first.';
            modelStatus.className = 'error';
            return;
        }
        try {
            await model.save('downloads://energy-consumption-model');
            const config = {
                numericalInputFeatureNames, timeBasedFeatureSelections, outputFeatureName,
                featureMinMax, outputMinMax, averageFeatureValues,
                trainingDataRaw: trainingDataTextarea.value
            };
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'energy-consumption-model-config.json';
            a.click();
            URL.revokeObjectURL(url);
            modelStatus.textContent = 'Model exported successfully!';
            modelStatus.className = 'success';
        } catch (error) {
            modelStatus.textContent = `Error exporting model: ${error.message}`;
            modelStatus.className = 'error';
        }
    }

    async function importModel() {
        modelStatus.textContent = 'Loading model...';
        const modelFile = modelJsonFileInput.files[0];
        const weightsFile = weightsBinFileInput.files[0];
        const configFile = configJsonFileInput.files[0];
        if (!modelFile || !weightsFile || !configFile) {
            modelStatus.textContent = 'Please select all three model files.';
            modelStatus.className = 'error';
            return;
        }
        try {
            const config = JSON.parse(await configFile.text());
            model = await tf.loadLayersModel(tf.io.browserFiles([modelFile, weightsFile]));
            numericalInputFeatureNames = config.numericalInputFeatureNames;
            timeBasedFeatureSelections = config.timeBasedFeatureSelections;
            outputFeatureName = config.outputFeatureName;
            featureMinMax = config.featureMinMax;
            outputMinMax = config.outputMinMax;
            averageFeatureValues = config.averageFeatureValues;
            
            numericalFeaturesContainer.innerHTML = '';
            numericalInputFeatureNames.forEach(name => addNumericalFeatureInput(name));
            
            timeFeaturesCheckboxes.forEach(cb => { cb.checked = !!timeBasedFeatureSelections[cb.value]; });
            outputFeatureNameInput.value = outputFeatureName;
            
            if (config.trainingDataRaw) {
                trainingDataTextarea.value = config.trainingDataRaw;
                const { data, errors } = parseAndEngineerData(config.trainingDataRaw);
                if (errors.length === 0 && data.length > 0) {
                    parsedTrainingData = data;
                    analyzeModelPerformance();
                }
            }
            updateAllInputFeatureNames();
            modelStatus.textContent = 'Model imported successfully!';
            modelStatus.className = 'success';
        } catch (error) {
            modelStatus.textContent = `Error importing model: ${error.message}`;
        }
    }

    async function makePrediction() {
        if (!model) {
            predictionResult.textContent = 'No model available. Train or load a model first.';
            predictionResult.className = 'error';
            return;
        }
        const dateStr = predictionDateTimeInput.value;
        if (!dateStr) {
            predictionResult.textContent = 'Error: Please select a Prediction Date/Time.';
            predictionResult.className = 'error';
            return;
        }
        const predictionDate = new Date(dateStr);
        const rawValues = numericalInputFeatureNames.map(name => Number(document.getElementById(`predict-${name}`).value));
        
        if (timeBasedFeatureSelections.year) rawValues.push(predictionDate.getFullYear());
        if (timeBasedFeatureSelections.month) rawValues.push(predictionDate.getMonth() + 1);
        if (timeBasedFeatureSelections.day) rawValues.push(predictionDate.getDate());
        if (timeBasedFeatureSelections.dayofweek) rawValues.push(predictionDate.getDay());
        if (timeBasedFeatureSelections.hour) rawValues.push(predictionDate.getHours());
        if (timeBasedFeatureSelections.minute) rawValues.push(predictionDate.getMinutes());
        
        const scaledValues = rawValues.map((v, i) => scaleFeature(v, i));
        const input = tf.tensor3d([[scaledValues]], [1, 1, allInputFeatureNames.length]);
        const prediction = inverseScaleOutput(model.predict(input).dataSync()[0]);

        predictionResult.textContent = `Predicted ${outputFeatureName}: ${prediction.toFixed(4)}`;
        predictionResult.className = 'success';
    }

    function exportSimulationDataAsCsv() {
        if (lastSimulatedData.x.length === 0) {
            alert('No simulation data to export. Please run a scenario simulation first.');
            return;
        }
        const featureToVary = featureToVarySelect.value;
        let csv = `${featureToVary},${outputFeatureName}\n`;
        for (let i = 0; i < lastSimulatedData.x.length; i++) {
            csv += `${lastSimulatedData.x[i].toFixed(4)},${lastSimulatedData.y[i].toFixed(4)}\n`;
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'scenario_simulation_data.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    }
    function populateSensitivitySelect() {
        sensitivityFeatureSelect.innerHTML = '';
        allInputFeatureNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            sensitivityFeatureSelect.appendChild(opt);
        });
    }
    function populateFeatureToVarySelect() {
        featureToVarySelect.innerHTML = '';
        allInputFeatureNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            featureToVarySelect.appendChild(opt);
        });
        featureToVarySelect.addEventListener('change', renderFixedFeatureInputs);
    }
    function renderFixedFeatureInputs() {
        fixedFeatureInputsContainer.innerHTML = '';
        const featureToVary = featureToVarySelect.value;
        allInputFeatureNames.forEach((name, i) => {
            if (name !== featureToVary) {
                const val = averageFeatureValues[i] !== undefined ? averageFeatureValues[i].toFixed(2) : 0;
                const div = document.createElement('div');
                div.classList.add('prediction-input-group');
                const safeIdName = name.replace(/[^a-zA-Z0-9]/g, '_');
                div.innerHTML = `<label for="fixed-${safeIdName}">${name}:</label><input type="number" id="fixed-${safeIdName}" value="${val}">`;
                fixedFeatureInputsContainer.appendChild(div);
            }
        });
    }
    function resetFixedValues() {
        const featureToVary = featureToVarySelect.value;
        allInputFeatureNames.forEach((name, i) => {
            if (name !== featureToVary) {
                const safeIdName = name.replace(/[^a-zA-Z0-9]/g, '_');
                const input = document.getElementById(`fixed-${safeIdName}`);
                if (input) input.value = averageFeatureValues[i] !== undefined ? averageFeatureValues[i].toFixed(2) : 0;
            }
        });
    }
        // --- Initial Setup ---
    addNumericalFeatureInput('Temperature');
    addNumericalFeatureInput('CIP');
    addNumericalFeatureInput('KEG');
    addNumericalFeatureInput('WAMA');
    // --- Event Listeners ---
    trainModelButton.addEventListener('click', trainModel);
    exportModelButton.addEventListener('click', exportModel);
    importModelButton.addEventListener('click', importModel);
    predictButton.addEventListener('click', makePrediction);
    runSensitivityAnalysisButton.addEventListener('click', runSensitivityAnalysis);
    runScenarioSimulationButton.addEventListener('click', runScenarioSimulation);
    resetFixedValuesButton.addEventListener('click', resetFixedValues);
    exportSimulationCsvButton.addEventListener('click', exportSimulationDataAsCsv);
    estimateRatesButton.addEventListener('click', estimateRates);
    document.getElementById('estimateRatesFromLstmButton').addEventListener('click', estimateRatesFromLstm);
    exportDisaggregationCsvButton.addEventListener('click', exportDisaggregationDataAsCsv);
});