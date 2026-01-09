let chartScenario = null;
let chartCost = null;
let chartEnergy = null;
let chartSim = null;

// Default Seasonal Load Profile (Winter High, Summer Low)
const defaultLoads = [100, 95, 80, 50, 20, 10, 10, 10, 30, 60, 85, 95];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Register Chart.js DataLabels (Check if loaded first)
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => { 
    const container = document.getElementById('sourcesContainer');
    if(container && container.children.length === 0) {
        addSource(); 
        addSource(); 
    }
    generateSliders();
});

function generateSliders() {
    const container = document.getElementById('sliderContainer');
    container.innerHTML = "";
    months.forEach((m, i) => {
        const div = document.createElement('div');
        div.className = 'month-slider';
        div.innerHTML = `
            <label>${m}</label>
            <input type="range" min="0" max="100" value="${defaultLoads[i]}" id="slider-${i}" oninput="updateSimValue(${i})">
            <div class="month-value" id="val-${i}">${defaultLoads[i]}%</div>
        `;
        container.appendChild(div);
    });
}

function updateSimValue(index) {
    document.getElementById(`val-${index}`).innerText = document.getElementById(`slider-${index}`).value + "%";
    // Trigger simulation update if main calc is done
    if(lastCalcResult) {
        updateSimulation(lastCalcResult);
    }
}

// Global variable to store last calculation result for simulation
let lastCalcResult = null;

function addSource(data = null) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const div = document.createElement('div');
    div.className = 'source-item';
    div.id = `src-${id}`;
    
    const nameVal = data ? data.name : `Source ${document.querySelectorAll('.source-item').length + 1}`;
    const vMin = data ? data.vMin : "";
    const vMax = data ? data.vMax : "";
    const tMin = data ? data.tMin : "";
    const tMax = data ? data.tMax : "";

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <input type="text" class="val-name" placeholder="Name" style="width:70%; margin:0; padding:4px;" value="${nameVal}">
            <button class="btn-remove" onclick="removeSource('${id}')">×</button>
        </div>
        <div class="source-grid">
            <div><label>Min Vol (m³/24h)</label><input type="number" class="val-vol-min" step="1" value="${vMin}"></div>
            <div><label>Max Vol (m³/24h)</label><input type="number" class="val-vol-max" step="1" value="${vMax}"></div>
            <div><label>Min Temp (°C)</label><input type="number" class="val-temp-min" step="0.1" value="${tMin}"></div>
            <div><label>Max Temp (°C)</label><input type="number" class="val-temp-max" step="0.1" value="${tMax}"></div>
        </div>
    `;
    document.getElementById('sourcesContainer').appendChild(div);
}

function removeSource(id) { 
    const el = document.getElementById(`src-${id}`);
    if(el) el.remove(); 
}

function exportData() {
    const sources = [];
    const sourceItems = document.querySelectorAll('.source-item');
    sourceItems.forEach(item => {
        sources.push({
            name: item.querySelector('.val-name').value,
            vMin: item.querySelector('.val-vol-min').value,
            vMax: item.querySelector('.val-vol-max').value,
            tMin: item.querySelector('.val-temp-min').value,
            tMax: item.querySelector('.val-temp-max').value,
        });
    });

    const data = {
        version: 3.2,
        sources: sources,
        settings: {
            returnTemp: document.getElementById('sourceReturnTemp').value,
            sinkPipe: document.getElementById('sinkPipeSize').value,
            targetTemp: document.getElementById('targetFlowTemp').value,
            deltaT: document.getElementById('heatingDeltaT').value,
            sep: document.getElementById('systemSeparation').checked,
            demand: document.getElementById('yearlyDemand').value,
            priceElec: document.getElementById('priceElec').value,
            priceCurr: document.getElementById('priceCurrent').value
        }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "heatpump_project.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      // 1. Clear existing sources
      const container = document.getElementById("sourcesContainer");
      if (container) container.innerHTML = "";

      // 2. Handle both array formats (legacy and new)
      let sourceArray = [];
      if (Array.isArray(data)) {
        sourceArray = data;
      } else if (data && Array.isArray(data.sources)) {
        sourceArray = data.sources;
      }

      sourceArray.forEach((s) => addSource(s));

      // 3. Apply settings if they exist
      if (data && data.settings) {
        const s = data.settings;
        if (s.returnTemp !== undefined) document.getElementById("sourceReturnTemp").value = s.returnTemp;
        if (s.sinkPipe !== undefined) document.getElementById("sinkPipeSize").value = s.sinkPipe;
        if (s.targetTemp !== undefined) document.getElementById("targetFlowTemp").value = s.targetTemp;
        if (s.deltaT !== undefined) document.getElementById("heatingDeltaT").value = s.deltaT;
        if (s.sep !== undefined) document.getElementById("systemSeparation").checked = !!s.sep;
        if (s.demand !== undefined) document.getElementById("yearlyDemand").value = s.demand;
        if (s.priceElec !== undefined) document.getElementById("priceElec").value = s.priceElec;
        if (s.priceCurr !== undefined) document.getElementById("priceCurrent").value = s.priceCurr;
      }

      // 4. Trigger calculation safely (Double Animation Frame allows DOM to settle)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            calculate();
          } catch (err) {
            console.error("Auto-calculation failed:", err);
          }
        });
      });

    } catch (err) {
      alert("Error parsing JSON file!");
      console.error(err);
    }
    
    // CRITICAL FIX FOR EDGE:
    // Do NOT reset input.value = "" here. Modifying the input during the 'change' event causes the crash.
  };

  reader.readAsText(file);

  // Instead, ensure the input is cleared NEXT time the user clicks "Import"
  // This modifies the input only when safe (during the click, before the dialog opens).
  input.onclick = function() {
      this.value = null;
  };
}





function calculate() {
    const logDiv = document.getElementById('calculationLog');
    logDiv.innerHTML = ""; // Clear Log

    const names = document.querySelectorAll('.val-name');
    const vMins = document.querySelectorAll('.val-vol-min');
    const vMaxs = document.querySelectorAll('.val-vol-max');
    const tMins = document.querySelectorAll('.val-temp-min');
    const tMaxs = document.querySelectorAll('.val-temp-max');
    
    let scenarios = {
        min: { vol: 0, wTemp: 0 },
        avg: { vol: 0, wTemp: 0 },
        max: { vol: 0, wTemp: 0 }
    };

    let sourcesList = [];
    let validDataFound = false;

    for(let i=0; i<vMins.length; i++){
        const vMin = parseFloat(vMins[i].value) || 0;
        const vMax = parseFloat(vMaxs[i].value) || 0;
        const tMin = parseFloat(tMins[i].value) || 0;
        const tMax = parseFloat(tMaxs[i].value) || 0;

        if (vMax > 0) {
            validDataFound = true;
            const vAvg = (vMin + vMax) / 2;
            const tAvg = (tMin + tMax) / 2;

            scenarios.min.vol += vMin;
            scenarios.min.wTemp += vMin * tMin;
            scenarios.max.vol += vMax;
            scenarios.max.wTemp += vMax * tMax;
            scenarios.avg.vol += vAvg;
            scenarios.avg.wTemp += vAvg * tAvg;

            sourcesList.push({
                name: names[i].value || `Source ${i+1}`,
                vRange: `${vMin} - ${vMax}`,
                tRange: `${tMin} - ${tMax}`
            });
        }
    }

    if (!validDataFound) {
        logDiv.innerHTML = "Please enter valid source data.";
        return;
    }

    const mixTempMin = scenarios.min.vol > 0 ? scenarios.min.wTemp / scenarios.min.vol : 0;
    const mixTempAvg = scenarios.avg.vol > 0 ? scenarios.avg.wTemp / scenarios.avg.vol : 0;
    const mixTempMax = scenarios.max.vol > 0 ? scenarios.max.wTemp / scenarios.max.vol : 0;

    const c = 1.163;
    const sourceReturnTempLimit = parseFloat(document.getElementById('sourceReturnTemp').value) || 15;
    const targetFlowTemp = parseFloat(document.getElementById('targetFlowTemp').value) || 50;
    const useSep = document.getElementById('systemSeparation').checked;
    const loss = useSep ? 2.0 : 0;

    const calcScenario = (volDay, mixT, label) => {
        if(volDay <= 0) return null;
        const flowHour = volDay / 24;
        const effT = mixT - loss;
        const deltaT = effT - sourceReturnTempLimit;
        
        if (deltaT <= 0) return null;

        const pSource = flowHour * c * deltaT;
        
        const t_cond = targetFlowTemp + 273.15;
        const t_evap = sourceReturnTempLimit + 273.15 - 5;
        let cop = (t_cond / (t_cond - t_evap)) * 0.50;
        if(cop > 7) cop = 7; if(cop < 1.5) cop = 1.5;

        const pHeat = pSource / (1 - (1/cop));
        const pElec = pHeat - pSource;

        return { label, flowHour, pSource, pHeat, pElec, cop, effT };
    };

    const resMin = calcScenario(scenarios.min.vol, mixTempMin, "Min");
    const resAvg = calcScenario(scenarios.avg.vol, mixTempAvg, "Avg");
    const resMax = calcScenario(scenarios.max.vol, mixTempMax, "Max");

    const results = { min: resMin, avg: resAvg, max: resMax };
    
    // Store global for simulation
    lastCalcResult = { 
        avgRes: resAvg, 
        c: c, 
        limitTemp: sourceReturnTempLimit 
    };

    if (!resAvg) {
        addLog("Error", "Return temperature higher than source temperature.");
        return;
    }

    // --- LOGS ---
    addLog("1. Source Scenarios",
           `<strong>Avg Scenario:</strong> Flow: ${resAvg.flowHour.toFixed(2)} m³/h | Eff. Temp: ${resAvg.effT.toFixed(2)}°C<br>` +
           `Avg Source Power: ${resAvg.pSource.toFixed(2)} kW`);

    const sinkDn = parseInt(document.getElementById('sinkPipeSize').value) || 50;
    const heatDeltaT = parseFloat(document.getElementById('heatingDeltaT').value) || 5;
    
    const checkRes = resMax || resAvg; 
    const flowSinkHour = checkRes.pHeat / (c * heatDeltaT);
    const flowSinkSec = flowSinkHour / 3600;
    const r = (sinkDn / 1000) / 2;
    const area = Math.PI * r * r;
    const velSink = flowSinkSec / area;
    const heatReturnTemp = targetFlowTemp - heatDeltaT;

    addLog("2. Hydraulics Check (DN"+sinkDn+")",
           `Check at <strong>${checkRes.label}</strong> Load: ${checkRes.pHeat.toFixed(1)} kW | Delta T: ${heatDeltaT} K<br>` +
           `Velocity: ${velSink.toFixed(2)} m/s`);

    const yearlyDemand = parseFloat(document.getElementById('yearlyDemand').value) || 0;
    const priceElec = parseFloat(document.getElementById('priceElec').value) || 0;
    const priceCurr = parseFloat(document.getElementById('priceCurrent').value) || 0;
    
    const avgCOP = resAvg.cop;
    const hpElecNeeded = yearlyDemand / avgCOP;
    const costHP = hpElecNeeded * priceElec;
    const costCurrent = yearlyDemand * priceCurr;
    const savings = costCurrent - costHP;

    addLog("3. Economics",
           `Yearly Demand: ${yearlyDemand} kWh<br>` +
           `Current Cost: ${costCurrent.toFixed(0)} € -> <strong>Savings: ${savings.toFixed(0)} €</strong>`);

    // UI Updates
    document.getElementById('resHeatOutput').innerText = resAvg.pHeat.toFixed(1) + " kW";
    document.getElementById('resVelocitySink').innerText = velSink.toFixed(2) + " m/s";
    document.getElementById('resCOP').innerText = avgCOP.toFixed(2);
    
    const savEl = document.getElementById('resSavings');
    savEl.innerText = savings.toFixed(0) + " €/yr";
    savEl.style.color = savings > 0 ? "#27ae60" : "#c0392b";

    const alertBox = document.getElementById('hydraulicAlertBox');
    alertBox.style.display = "block";
    if (velSink > 2.0) {
        alertBox.className = "status-box status-crit";
        alertBox.innerHTML = `⚠️ CRITICAL: Max Velocity ${velSink.toFixed(2)} m/s!<br>DN${sinkDn} is too small. Increase Delta T!`;
    } else if (velSink > 1.5) {
        alertBox.className = "status-box status-warn";
        alertBox.innerHTML = `⚠️ High Velocity: ${velSink.toFixed(2)} m/s. High pressure loss.`;
    } else {
        alertBox.className = "status-box status-ok";
        alertBox.innerHTML = `✅ Hydraulics OK. Max Velocity: ${velSink.toFixed(2)} m/s.`;
    }

    const classData = analyzeSystem(resAvg.pHeat, targetFlowTemp, mixTempAvg);
    renderClassification(classData);

    const ecoData = { demand: yearlyDemand, costHP: costHP, costCurr: costCurrent, savings: savings };
    
    renderTable(sourcesList, results, sinkDn, heatDeltaT, velSink, ecoData, heatReturnTemp, flowSinkHour);
    renderAllCharts(results, costHP, costCurrent);
    updateSimulation(lastCalcResult);
}

function updateSimulation(data) {
    if (!data) return;

    const ctx = document.getElementById('simChart').getContext('2d');
    if (chartSim) chartSim.destroy();

    // 1. Get Inputs
    const loadFactors = [];
    for (let i = 0; i < 12; i++) {
        const el = document.getElementById(`slider-${i}`);
        const val = el ? parseInt(el.value) : 0;
        loadFactors.push(val / 100);
    }

    // System Parameters
    const inletTemp = data.avgRes.effT;
    const maxSourceExtraction = data.avgRes.pSource; 
    const maxHeatingPower = data.avgRes.pHeat;       

    // Sink Side Inputs
    const targetFlowTemp = parseFloat(document.getElementById('targetFlowTemp').value) || 50;
    const designDeltaT = parseFloat(document.getElementById('heatingDeltaT').value) || 5;
    
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Data Arrays
    const sourceReturnTemps = [];
    const sinkReturnTemps = [];
    const monthlyEnergy = [];
    const monthlyAvgPower = []; // New Dataset
    const sourceSafetyLimit = Array(12).fill(data.limitTemp);

    // 2. Calculations
    loadFactors.forEach((factor, i) => {
        // A. Source Side
        const currentSourcePower = maxSourceExtraction * factor;
        const sourceDeltaT = currentSourcePower / (data.avgRes.flowHour * data.c);
        sourceReturnTemps.push(inletTemp - sourceDeltaT);

        // B. Sink Side (Heating System)
        const currentSinkDeltaT = designDeltaT * factor;
        sinkReturnTemps.push(targetFlowTemp - currentSinkDeltaT);

        // C. Power & Energy
        const currentHeatingPower = maxHeatingPower * factor;
        monthlyAvgPower.push(currentHeatingPower); // Store Power (kW)
        
        const hours = daysInMonth[i] * 24;
        monthlyEnergy.push(currentHeatingPower * hours); // Store Energy (kWh)
    });

    // Helper: Max 2 decimals
    const fmt = (num) => parseFloat(num.toFixed(2));

    // 3. Chart Generation
    chartSim = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Source Return Temp (°C)',
                    data: sourceReturnTemps,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Heating Return Temp (°C)',
                    data: sinkReturnTemps,
                    borderColor: '#e67e22',
                    backgroundColor: 'rgba(230, 126, 34, 0.2)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Power (kW)',
                    data: monthlyAvgPower,
                    borderColor: '#9b59b6', // Purple
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    fill: false,
                    borderDash: [5, 5], // Dashed line for distinction
                    tension: 0.2,
                    yAxisID: 'y2' // Separate Axis
                },
                {
                    label: 'Monthly Energy (kWh)',
                    data: monthlyEnergy,
                    type: 'bar',
                    backgroundColor: 'rgba(46, 204, 113, 0.5)', // Green bars
                    borderColor: '#27ae60',
                    borderWidth: 1,
                    yAxisID: 'y1'
                },
                {
                    label: 'Source Safety Limit',
                    data: sourceSafetyLimit,
                    borderColor: '#e74c3c',
                    borderDash: [2, 2],
                    pointRadius: 0,
                    fill: false,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Temperature (°C)' },
                    ticks: { callback: (v) => fmt(v) }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Energy (kWh)' },
                    grid: { drawOnChartArea: false },
                    ticks: { callback: (v) => fmt(v) }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Power (kW)' },
                    grid: { drawOnChartArea: false },
                    ticks: { callback: (v) => fmt(v) }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += fmt(context.parsed.y);
                            }
                            return label;
                        },
                        footer: (items) => {
                            const idx = items[0].dataIndex;
                            return `Load Factor: ${(loadFactors[idx] * 100).toFixed(0)}%`;
                        }
                    }
                },
                datalabels: {
                    display: false // Hide data labels by default to avoid clutter
                }
            }
        }
    });
}


// --- HELPER FUNCTIONS ---

function analyzeSystem(kW, tOut, tIn) {
    let result = { category: "", techType: "", refrigerantSuggestion: "", operationMode: "", notes: [] };

    if (kW < 100) {
        result.category = "Residential / Light Commercial";
        result.operationMode = "Monovalent (preferred) or Monoenergetic";
    } else {
        result.category = "Large-Scale / Industrial";
        result.operationMode = "Base load / Process Heat Integration";
        result.notes.push("Output > 100kW: Classified as Large-Scale (VDI 4646).");
    }

    if (tOut <= 55) {
        result.techType = "Standard Heat Pump";
        result.refrigerantSuggestion = "R410A, R32, R290 (Propane)";
        result.notes.push("Ideal for underfloor heating.");
    } else if (tOut > 55 && tOut <= 90) {
        result.techType = "High-Performance / District Heating Pump";
        result.refrigerantSuggestion = "R290, NH3 (R717), R1234ze";
        result.notes.push("Suitable for radiator upgrades or micro-grids.");
    } else {
        result.techType = "High-Temperature Heat Pump (HTHP)";
        result.refrigerantSuggestion = "R1233zd(E), R245fa, R718";
        result.notes.push("Industrial Application.");
    }
    
    result.notes.push("💧 Mineral Water: Indirect system mandatory.");
    return result;
}

function renderClassification(data) {
    const div = document.getElementById('classificationResult');
    if (!div) return;
    let html = `<ul style="margin:0; padding-left:20px; font-size:0.9rem;">
        <li><strong>Category:</strong> ${data.category}</li>
        <li><strong>Tech:</strong> ${data.techType}</li>
        <li><strong>Refrigerants:</strong> ${data.refrigerantSuggestion}</li>
    </ul>`;
    div.innerHTML = html;
}

function addLog(title, content) {
    document.getElementById('calculationLog').innerHTML += 
        `<div class="log-step"><strong>${title}</strong><br>${content}</div>`;
}

function renderTable(srcList, res, dn, dt, vel, eco, tRet, flowSink) {
    const table = document.getElementById('summaryTable');
    let html = `
        <tr class="table-sub-header"><td colspan="5">1. Input Sources</td></tr>
        <tr><th>Name</th><th>Vol Range (m³/24h)</th><th>Temp Range (°C)</th><th colspan="2"></th></tr>`;
    
    srcList.forEach(s => {
        html += `<tr><td>${s.name}</td><td>${s.vRange}</td><td>${s.tRange}</td><td colspan="2"></td></tr>`;
    });

    html += `<tr class="table-sub-header"><td colspan="5">2. Heat Pump Scenarios</td></tr>
             <tr><th>Scenario</th><th class="col-num">Source kW</th><th class="col-num">Elec. kW</th><th class="col-num">Output kW</th><th class="col-num">COP</th></tr>`;
    
    ['min', 'avg', 'max'].forEach(k => {
        if(res[k]) {
            html += `<tr><td><strong>${res[k].label}</strong></td><td class="col-num">${res[k].pSource.toFixed(1)}</td><td class="col-num">${res[k].pElec.toFixed(1)}</td><td class="col-num"><strong>${res[k].pHeat.toFixed(1)}</strong></td><td class="col-num">${res[k].cop.toFixed(2)}</td></tr>`;
        }
    });

    html += `<tr class="table-sub-header"><td colspan="5">3. Hydraulics (DN${dn})</td></tr>
             <tr><td colspan="4">Heating Delta T (Return: ${tRet.toFixed(1)}°C)</td><td class="col-num">${dt} K</td></tr>
             <tr><td colspan="4">Flow Rate (Sink)</td><td class="col-num">${flowSink.toFixed(2)} m³/h</td></tr>
             <tr><td colspan="4">Max Velocity</td><td class="col-num" style="color:${vel>1.5?'red':'green'}"><strong>${vel.toFixed(2)} m/s</strong></td></tr>`;

    html += `<tr class="table-sub-header"><td colspan="5">4. Financials (Annual)</td></tr>
             <tr><td colspan="4">Heat Demand</td><td class="col-num">${eco.demand.toLocaleString()} kWh</td></tr>
             <tr><td colspan="4">Current Cost</td><td class="col-num">${eco.costCurr.toLocaleString()} €</td></tr>
             <tr><td colspan="4">Heat Pump Cost</td><td class="col-num">${eco.costHP.toLocaleString()} €</td></tr>
             <tr><td colspan="4"><strong>Savings</strong></td><td class="col-num" style="color:${eco.savings>0?'green':'red'}"><strong>${eco.savings.toLocaleString()} €</strong></td></tr>`;

    table.innerHTML = html;
}

function renderAllCharts(res, costHP, costCurr) {
  // Detect Edge (Chromium Edge). This avoids ChartDataLabels issues seen in Edge.
  const ua = navigator.userAgent || "";
  const isEdge = ua.includes("Edg/");

  // Precompute once (avoids reduce() inside formatter redraw loops)
  const energyData = [res.avg.pSource, res.avg.pElec];
  const energySum = energyData.reduce((a, b) => a + b, 0);

  // ---- 1) Scenario Bar Chart ----
  const ctx1 = document.getElementById("scenarioChart").getContext("2d");
  if (chartScenario) chartScenario.destroy();

  const dataVals = [res.min?.pHeat || 0, res.avg?.pHeat || 0, res.max?.pHeat || 0];

  chartScenario = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: ["Min (Worst)", "Average", "Max (Best)"],
      datasets: [
        {
          label: "Heating Output Potential (kW)",
          data: dataVals,
          backgroundColor: ["#95a5a6", "#3498db", "#2ecc71"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "Performance Range" },
        datalabels: { display: false }
      }
    }
  });

  // ---- 2) Energy Donut Chart ----
  const ctx2 = document.getElementById("energyChart").getContext("2d");
  if (chartEnergy) chartEnergy.destroy();

  chartEnergy = new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: ["Free Source Energy", "Electrical Input"],
      datasets: [
        {
          data: energyData,
          backgroundColor: ["#3498db", "#e74c3c"],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        title: { display: true, text: `Avg Output: ${res.avg.pHeat.toFixed(1)} kW` },

        // Key fix: Disable datalabels plugin on Edge
        datalabels: isEdge
          ? { display: false }
          : {
              color: "#fff",
              font: { weight: "bold" },
              formatter: (value) => {
                const pct = energySum > 0 ? (value * 100) / energySum : 0;
                return `${value.toFixed(1)} kW\n${pct.toFixed(1)}%`;
              }
            }
      }
    }
  });

  // ---- 3) Cost Comparison Chart ----
  const ctx3 = document.getElementById("costChart").getContext("2d");
  if (chartCost) chartCost.destroy();

  chartCost = new Chart(ctx3, {
    type: "bar",
    data: {
      labels: ["Current System", "Heat Pump"],
      datasets: [
        {
          label: "Yearly Cost",
          data: [costCurr, costHP],
          backgroundColor: ["#e74c3c", "#27ae60"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        title: { display: true, text: "Cost Comparison" },
        datalabels: { display: false }
      }
    }
  });
}
