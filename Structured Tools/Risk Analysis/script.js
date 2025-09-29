let stepCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
    Chart.register(ChartDataLabels);
    
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importFromJson);
    document.getElementById('export-btn').addEventListener('click', exportToJson);

    addProcessStep();
});

function exportToJson() {
    const state = collectFullState();
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-assessment-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const state = JSON.parse(e.target.result);
            rebuildState(state);
        } catch (error) {
            alert('Error parsing JSON file. Please make sure it is a valid assessment file.');
            console.error("JSON Parse Error:", error);
        }
    };
    reader.readAsText(file);
    event.target.value = null;
}

function rebuildState(state) {
    const container = document.getElementById('process-steps-container');
    container.innerHTML = '';
    stepCounter = 0;

    if (state.steps && Array.isArray(state.steps)) {
        state.steps.forEach(stepData => {
            addProcessStep();
            document.getElementById(`current-${stepCounter}`).value = stepData.current || '';
            document.getElementById(`future-${stepCounter}`).value = stepData.future || '';
            document.getElementById(`change-${stepCounter}`).value = stepData.change || '';
            
            if (stepData.risks) {
                for (const category in stepData.risks) {
                    const riskData = stepData.risks[category];
                    if (riskData.isChecked) {
                        const checkbox = document.getElementById(`risk-check-${stepCounter}-${category}`);
                        checkbox.checked = true;
                        toggleRiskDetails(stepCounter, category);
                        
                        document.getElementById(`risk-desc-${stepCounter}-${category}`).value = riskData.description || '';
                        document.getElementById(`risk-likelihood-${stepCounter}-${category}`).value = riskData.likelihood || '1';
                        document.getElementById(`risk-severity-${stepCounter}-${category}`).value = riskData.severity || '1';
                    }
                }
            }
        });
    }

    let hadMitigationData = false;
    if (state.steps) {
        hadMitigationData = state.steps.some(step => 
            Object.values(step.risks || {}).some(risk => risk.mitigationPlan)
        );
    }
    
    generateRiskAnalysis(); 
    populateMitigationFields(state.steps || []);

    if (hadMitigationData) {
        prioritizeMitigations();
    } else {
        document.getElementById('prioritization-section').style.display = 'none';
        document.getElementById('final-export-buttons').style.display = 'none';
        if (!state.steps || state.steps.length === 0) {
            document.getElementById('output-section').style.display = 'none';
        }
    }
}

function populateMitigationFields(stepsData) {
    stepsData.forEach(step => {
        for (const cat in step.risks) {
            const risk = step.risks[cat];
            if ((risk.likelihood > 1 || risk.severity > 1) && risk.mitigationPlan) {
                const planEl = document.getElementById(`mitigation-plan-${step.id}-${cat}`);
                if (planEl) {
                    planEl.value = risk.mitigationPlan;
                    document.getElementById(`mitigation-impact-${step.id}-${cat}`).value = risk.mitigationImpact || '1';
                    document.getElementById(`mitigation-effort-${step.id}-${cat}`).value = risk.mitigationEffort || '1';
                }
            }
        }
    });
}

function addProcessStep() {
    stepCounter++;
    const container = document.getElementById('process-steps-container');
    const stepDiv = document.createElement('div');
    stepDiv.className = 'process-step-item';
    stepDiv.id = `step-${stepCounter}`;
    stepDiv.innerHTML = `
        <div class="process-step-header"><h4>Process Step #${stepCounter}</h4><button class="remove-step-btn" onclick="removeProcessStep(${stepCounter})">Remove Step</button></div>
        <div class="step-description-grid">
            <div class="form-group"><label for="current-${stepCounter}">Current Process:</label><textarea id="current-${stepCounter}" rows="3" placeholder="e.g., 15 minutes at 85°C"></textarea></div>
            <div class="form-group"><label for="future-${stepCounter}">Future Process:</label><textarea id="future-${stepCounter}" rows="3" placeholder="e.g., Temperature tolerance changes to 84°C"></textarea></div>
            <div class="form-group"><label for="change-${stepCounter}">Change Summary:</label><textarea id="change-${stepCounter}" rows="3" placeholder="e.g., Temp. decrease"></textarea></div>
        </div>
        <h5>Risk Identification for this Step</h5>
        <div class="risk-categories-grid">
            ${createRiskCategoryHTML(stepCounter, 'quality', 'Quality')}
            ${createRiskCategoryHTML(stepCounter, 'foodSafety', 'Food Safety')}
            ${createRiskCategoryHTML(stepCounter, 'environment', 'Environment')}
            ${createRiskCategoryHTML(stepCounter, 'hs', 'Health & Safety')}
        </div>
    `;
    container.appendChild(stepDiv);
}

function removeProcessStep(id) {
    document.getElementById(`step-${id}`).remove();
}

function createRiskCategoryHTML(stepId, category, title) {
    return `
        <div class="risk-category">
            <div class="risk-category-header"><input type="checkbox" id="risk-check-${stepId}-${category}" onchange="toggleRiskDetails(${stepId}, '${category}')"><label for="risk-check-${stepId}-${category}">${title}</label></div>
            <div class="risk-details" id="risk-details-${stepId}-${category}" style="display:none;">
                <div class="form-group"><label for="risk-desc-${stepId}-${category}">Risk Description:</label><input type="text" id="risk-desc-${stepId}-${category}" placeholder="e.g., Microbial contamination"></div>
                <div class="risk-quantify-grid">
                    <div class="form-group"><label>Likelihood:</label><select id="risk-likelihood-${stepId}-${category}"><option value="1">1-Low</option><option value="2">2-High</option></select></div>
                    <div class="form-group"><label>Severity:</label><select id="risk-severity-${stepId}-${category}"><option value="1">1-Low</option><option value="2">2-High</option></select></div>
                </div>
            </div>
        </div>
    `;
}

function toggleRiskDetails(stepId, category) {
    document.getElementById(`risk-details-${stepId}-${category}`).style.display = document.getElementById(`risk-check-${stepId}-${category}`).checked ? 'block' : 'none';
}

function collectFullState() {
    const state = { steps: [] };
    document.querySelectorAll('.process-step-item').forEach(stepEl => {
        const id = stepEl.id.split('-')[1];
        const stepData = {
            id: id,
            current: document.getElementById(`current-${id}`).value,
            future: document.getElementById(`future-${id}`).value,
            change: document.getElementById(`change-${id}`).value,
            risks: {}
        };
        ['quality', 'foodSafety', 'environment', 'hs'].forEach(cat => {
            const isChecked = document.getElementById(`risk-check-${id}-${cat}`).checked;
            const likelihood = parseInt(document.getElementById(`risk-likelihood-${id}-${cat}`).value);
            const severity = parseInt(document.getElementById(`risk-severity-${id}-${cat}`).value);
            
            const riskData = {
                isChecked: isChecked,
                description: document.getElementById(`risk-desc-${id}-${cat}`).value,
                likelihood: likelihood,
                severity: severity,
            };

            const mitigationPlanEl = document.getElementById(`mitigation-plan-${id}-${cat}`);
            if (mitigationPlanEl && (likelihood > 1 || severity > 1)) {
                riskData.mitigationPlan = mitigationPlanEl.value;
                riskData.mitigationImpact = parseInt(document.getElementById(`mitigation-impact-${id}-${cat}`).value);
                riskData.mitigationEffort = parseInt(document.getElementById(`mitigation-effort-${id}-${cat}`).value);
            }
            stepData.risks[cat] = riskData;
        });
        state.steps.push(stepData);
    });
    return state;
}

function generateRiskAnalysis() {
    const state = collectFullState();
    const outputSection = document.getElementById('output-section');
    outputSection.style.display = 'block';
    generateSummaryTable(state.steps);
    generateMitigationDefinitionArea(state.steps);
    document.getElementById('final-export-buttons').style.display = 'none';
    window.scrollTo({ top: outputSection.offsetTop, behavior: 'smooth' });
}

function generateSummaryTable(stepsData) {
    const tableBody = document.querySelector("#summary-table tbody");
    tableBody.innerHTML = '';
    stepsData.forEach(step => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${step.id}</td>
            <td>${escapeHtml(step.current).replace(/\n/g, '<br>')}</td>
            <td>${escapeHtml(step.future).replace(/\n/g, '<br>')}</td>
            <td>${escapeHtml(step.change).replace(/\n/g, '<br>')}</td>
            <td>${formatRiskCell(step.risks.quality)}</td>
            <td>${formatRiskCell(step.risks.foodSafety)}</td>
            <td>${formatRiskCell(step.risks.environment)}</td>
            <td>${formatRiskCell(step.risks.hs)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function formatRiskCell(riskData) {
    if (!riskData || !riskData.isChecked) return '–';
    const dotLeft = riskData.likelihood === 1 ? '25%' : '75%';
    const dotTop = riskData.severity === 1 ? '75%' : '25%';
    return `
        <div class="risk-visual-container">
            <div class="risk-matrix-grid">
                <div class="risk-matrix-quadrant"></div><div class="risk-matrix-quadrant"></div>
                <div class="risk-matrix-quadrant"></div><div class="risk-matrix-quadrant"></div>
                <div class="risk-matrix-dot" style="top: ${dotTop}; left: ${dotLeft};"></div>
            </div>
            ${riskData.description ? `<div class="risk-description">${escapeHtml(riskData.description)}</div>` : ''}
        </div>
    `;
}

function generateMitigationDefinitionArea(stepsData) {
    const container = document.getElementById('mitigation-input-container');
    const section = document.getElementById('mitigation-definition-section');
    container.innerHTML = '';
    let mitigationRequired = false;
    stepsData.forEach(step => {
        for (const cat in step.risks) {
            const risk = step.risks[cat];
            if (risk.isChecked && (risk.likelihood > 1 || risk.severity > 1)) {
                mitigationRequired = true;
                const catFormatted = cat.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const item = document.createElement('div');
                item.className = 'mitigation-item-input';
                item.id = `mitigation-input-${step.id}-${cat}`;
                item.innerHTML = `
                    <p><span class="risk-source">Source: Step #${step.id} - ${catFormatted}</span><br>${escapeHtml(risk.description)}</p>
                    <div class="form-group"><label for="mitigation-plan-${step.id}-${cat}">Mitigation Plan:</label><textarea id="mitigation-plan-${step.id}-${cat}" rows="3" placeholder="e.g., Change position of sensor (closer to filler)"></textarea></div>
                    <div class="mitigation-assessment-grid">
                         <div class="form-group"><label>Impact:</label><select id="mitigation-impact-${step.id}-${cat}"><option value="2">High</option><option value="1">Low</option></select></div>
                         <div class="form-group"><label>Effort:</label><select id="mitigation-effort-${step.id}-${cat}"><option value="1">Low</option><option value="2">High</option></select></div>
                    </div>
                `;
                container.appendChild(item);
            }
        }
    });
    section.style.display = mitigationRequired ? 'block' : 'none';
    document.getElementById('prioritization-section').style.display = 'none';
}

function prioritizeMitigations() {
    const prioritizationSection = document.getElementById('prioritization-section');
    prioritizationSection.style.display = 'block';
    const mitigationData = collectMitigationData();
    createImpactEffortChart(mitigationData);
    generateMitigationLegend(mitigationData);
    document.getElementById('final-export-buttons').style.display = 'block';
    window.scrollTo({ top: prioritizationSection.offsetTop, behavior: 'smooth' });
}

function generateMitigationLegend(data) {
    const legendContainer = document.getElementById('mitigation-legend');
    legendContainer.innerHTML = '<h4>Mitigation Actions Key:</h4>';
    if (data.length === 0) {
        legendContainer.innerHTML += '<p>No mitigation actions were defined.</p>';
        return;
    }
    data.forEach((mitigation, index) => {
        legendContainer.innerHTML += `<p><strong>${index + 1}:</strong> ${escapeHtml(mitigation.plan)}</p>`;
    });
}

let impactEffortChart = null;
function createImpactEffortChart(data) {
    const ctx = document.getElementById('impact-effort-matrix').getContext('2d');
    if (impactEffortChart) impactEffortChart.destroy();
    
    // --- FIX FOR OVERLAPPING POINTS ---
    const coordinateCounts = {};
    const chartData = data.map((mitigation, index) => {
        const key = `${mitigation.effort},${mitigation.impact}`;
        coordinateCounts[key] = (coordinateCounts[key] || 0) + 1;
        
        let x = mitigation.effort;
        let y = mitigation.impact;

        // If more than one point is at this exact coordinate, apply an offset
        if (coordinateCounts[key] > 1) {
            const angle = (coordinateCounts[key] - 1) * (Math.PI / 4); // 45-degree increments
            const offset = 0.15; // How far from the center point
            x += offset * Math.cos(angle);
            y += offset * Math.sin(angle);
        }

        return { x: x, y: y, label: index + 1 };
    });
    // --- END FIX ---

    impactEffortChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [{ data: chartData, backgroundColor: 'rgba(204, 0, 0, 0.7)', radius: 12, hoverRadius: 16 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Effort' }, min: 0.5, max: 2.5, ticks: { stepSize: 1, callback: (val) => (val === 1 ? 'Low' : 'High') } },
                y: { title: { display: true, text: 'Impact' }, min: 0.5, max: 2.5, ticks: { stepSize: 1, callback: (val) => (val === 1 ? 'Low' : 'High') } }
            },
            plugins: {
                legend: { display: false },
                datalabels: { color: '#ffffff', font: { weight: 'bold', family: 'Montserrat' }, formatter: (value) => value.label },
                tooltip: { enabled: false },
                annotation: {
                    annotations: {
                        highImpactLowEffort: { type: 'box', xMin: 0.5, xMax: 1.5, yMin: 1.5, yMax: 2.5, backgroundColor: 'rgba(40, 167, 69, 0.1)', label: { content: 'Quick Wins', enabled: true, position: 'center', font: { family: 'Montserrat' } } },
                        highImpactHighEffort: { type: 'box', xMin: 1.5, xMax: 2.5, yMin: 1.5, yMax: 2.5, backgroundColor: 'rgba(0, 123, 255, 0.1)', label: { content: 'Major Projects', enabled: true, position: 'center', font: { family: 'Montserrat' } } },
                        lowImpactLowEffort: { type: 'box', xMin: 0.5, xMax: 1.5, yMin: 0.5, yMax: 1.5, backgroundColor: 'rgba(255, 193, 7, 0.1)', label: { content: 'Fill-ins', enabled: true, position: 'center', font: { family: 'Montserrat' } } },
                        lowImpactHighEffort: { type: 'box', xMin: 1.5, xMax: 2.5, yMin: 0.5, yMax: 1.5, backgroundColor: 'rgba(220, 53, 69, 0.1)', label: { content: 'Reconsider', enabled: true, position: 'center', font: { family: 'Montserrat' } } }
                    }
                }
            }
        }
    });
}

function collectMitigationData() {
    const mitigationData = [];
    document.querySelectorAll('.mitigation-item-input').forEach(item => {
        const [, , stepId, cat] = item.id.split('-');
        mitigationData.push({
            plan: document.getElementById(`mitigation-plan-${stepId}-${cat}`).value,
            impact: parseInt(document.getElementById(`mitigation-impact-${stepId}-${cat}`).value),
            effort: parseInt(document.getElementById(`mitigation-effort-${stepId}-${cat}`).value),
        });
    });
    return mitigationData;
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function exportToWordDoc() {
    if (!impactEffortChart) {
        alert("Please complete 'Step 4: Prioritize Mitigation Actions' first to generate the chart before exporting.");
        return; 
    }
    
    const state = collectFullState();
    const mitigationData = collectMitigationData();
    const chartImageURL = impactEffortChart.toBase64Image('image/png', 1.0);

    let tableRows = '';
    state.steps.forEach(step => {
        tableRows += `
            <tr>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${step.id}</td>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${escapeHtml(step.current).replace(/\n/g, '<br/>')}</td>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${escapeHtml(step.future).replace(/\n/g, '<br/>')}</td>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${escapeHtml(step.change).replace(/\n/g, '<br/>')}</td>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${formatRiskCellWord(step.risks.quality)}</td>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${formatRiskCellWord(step.risks.foodSafety)}</td>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${formatRiskCellWord(step.risks.environment)}</td>
                <td style="border:1px solid #bfbfbf; padding:8px; vertical-align:top;">${formatRiskCellWord(step.risks.hs)}</td>
            </tr>
        `;
    });

    let mitigationList = '';
    if (mitigationData.length > 0) {
        mitigationData.forEach((mitigation, index) => {
            mitigationList += `<li>${escapeHtml(mitigation.plan)}</li>`;
        });
    } else {
        mitigationList = '<p>No mitigation actions were defined.</p>';
    }

    const contentHtml = `
        <div style="font-family: 'Montserrat', Calibri, Arial, sans-serif;">
            <h1 style="color:#2F5496; border-bottom:1px solid #ccc;">Risk Assessment Report</h1>
            <h2 style="color:#2F5496; border-bottom:1px solid #ccc;">Risk Quantification Summary</h2>
            <table style="border-collapse:collapse; width:100%; font-size:10pt;">
                <thead>
                    <tr>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">#</th>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">Current Process</th>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">Future Process</th>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">Change</th>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">Quality</th>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">Food Safety</th>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">Environment</th>
                        <th style="background-color:#4472C4; color:white; border:1px solid #bfbfbf; padding:8px;">Health & Safety</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <br style="page-break-before: always;" />

            <div style="text-align:center;">
                <h2 style="color:#2F5496; border-bottom:1px solid #ccc;">Prioritize Mitigation Actions (Impact / Effort Matrix)</h2>
                <img src="${chartImageURL}" style="max-width:800px; height:auto; border:1px solid #ddd;" alt="Impact / Effort Matrix">
                <h3 style="color:#333;">Mitigation Actions Key:</h3>
                <ol style="display:inline-block; text-align:left;">${mitigationList}</ol>
            </div>
        </div>
    `;

    // --- UPDATED HEADER FOR RELIABLE A3 EXPORT ---
    const fullHtml = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Risk Assessment Report</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
                <w:LatentStyles DefLockedState="false" DefUnhideWhenUsed="true" DefSemiHidden="true" DefQFormat="false" DefPriority="99" LatentStyleCount="267">
                </w:LatentStyles>
                <w:SectPr>
                    <w:pgSz w:w="23811" w:h="16838" w:orient="landscape"/>
                    <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
                </w:SectPr>
            </xml>
            <![endif]-->
            <style>
                body { font-family: 'Montserrat', Calibri, sans-serif; }
                @page Section1 {
                    size: 297mm 420mm;
                    mso-page-orientation: landscape;
                    margin: 1in;
                }
                div.Section1 { page: Section1; }
            </style>
        </head>
        <body>
            <div class="Section1">
                ${contentHtml}
            </div>
        </body>
        </html>`;
    // --- END UPDATED HEADER ---

    try {
        const blob = htmlDocx.asBlob(fullHtml);
        saveAs(blob, 'Risk_Assessment_Report_A3.docx');
    } catch (error) {
        console.error("Failed to generate DOCX file:", error);
        alert("An error occurred while generating the document. Please check the console for details.");
    }
}

function formatRiskCellWord(riskData) {
    if (!riskData || !riskData.isChecked) return '–';
    
    let likelihoodText = riskData.likelihood === 1 ? 'Low' : 'High';
    let severityText = riskData.severity === 1 ? 'Low' : 'High';
    let riskLevel = (riskData.likelihood > 1 || riskData.severity > 1) ? '<span style="color:#cc0000; font-weight:bold;">HIGH/MED</span>' : 'LOW';
    
    return `
        <div style="font-family: 'Montserrat', Calibri, Arial, sans-serif;">
            <p style="margin:0; padding:0;"><strong>Risk Level:</strong> ${riskLevel}</p>
            <p style="margin:0; padding:0;">L: ${likelihoodText}, S: ${severityText}</p>
            ${riskData.description ? `<p style="margin:5px 0 0 0; padding:0; font-size:9pt;">${escapeHtml(riskData.description)}</p>` : ''}
        </div>
    `;
}