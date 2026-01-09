let streams = [];
let charts = {}; // Store Chart instances
let pinchData = null; // Store calculation results

// --- Initialization & Tabs ---
document.addEventListener('DOMContentLoaded', () => {
    // Demo Data
    addStreamData("Reaktor Feed", "cold", 20, 180, 1600, 1.0);
    addStreamData("Produkt Kühlung", "hot", 250, 40, 2100, 0.8);
    addStreamData("Destillation Reboiler", "cold", 140, 140.1, 3000, 2.0); // Latent
    addStreamData("Abgas", "hot", 200, 80, 1200, 0.5);
    calculate();
});

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    // Resize charts if needed
    Object.values(charts).forEach(c => c && c.resize());
}

// --- Data Management ---

function addStreamData(name, type, tStart, tTarget, heatLoad, hValue) {
    let cp;
    // Handle Latent Heat (T_start approx T_target)
    if (Math.abs(tStart - tTarget) < 0.1) {
        // Internally create a small dT for calculation stability
        if (type === 'hot') tTarget = tStart - 0.1;
        else tTarget = tStart + 0.1;
        cp = Math.abs(heatLoad / 0.1); 
    } else {
        cp = Math.abs(heatLoad / (tStart - tTarget));
    }

    streams.push({ 
        name, type, tStart, tTarget, heatLoad, h: hValue || 1.0, 
        cp, isLatent: Math.abs(tStart - tTarget) < 0.2 
    });
    updateStreamTable();
}

function addOrUpdateStream() {
    const name = document.getElementById('name').value || "S-" + (streams.length + 1);
    const type = document.getElementById('type').value;
    const tStart = parseFloat(document.getElementById('tStart').value);
    let tTarget = parseFloat(document.getElementById('tTarget').value);
    const heatLoad = parseFloat(document.getElementById('heatLoad').value);
    const hValue = parseFloat(document.getElementById('hValue').value);
    const editIndex = parseInt(document.getElementById('editIndex').value);

    if (isNaN(tStart) || isNaN(tTarget) || isNaN(heatLoad)) return alert("Bitte Zahlenwerte prüfen.");

    // Helper: Reuse logic
    let cp;
    if (Math.abs(tStart - tTarget) < 0.1) {
         if (type === 'hot') tTarget = tStart - 0.1;
         else tTarget = tStart + 0.1;
         cp = Math.abs(heatLoad / 0.1);
    } else {
         cp = Math.abs(heatLoad / (tStart - tTarget));
    }

    const sData = { name, type, tStart, tTarget, heatLoad, h: hValue, cp, isLatent: Math.abs(tStart - tTarget) < 0.2 };

    if (editIndex > -1) streams[editIndex] = sData;
    else streams.push(sData);

    resetForm();
    updateStreamTable();
    calculate();
}

function updateStreamTable() {
    const tbody = document.querySelector("#streamTable tbody");
    tbody.innerHTML = "";
    streams.forEach((s, i) => {
        tbody.innerHTML += `<tr>
            <td>${s.name} ${s.isLatent ? '(L)' : ''}</td>
            <td class="${s.type === 'hot' ? 'type-hot' : 'type-cold'}">
                ${s.tStart.toFixed(1)} &rarr; ${s.tTarget.toFixed(1)}
            </td>
            <td>${s.heatLoad.toFixed(1)}</td>
            <td>${s.cp.toFixed(2)}</td>
            <td>
                <button class="btn-sec" onclick="editStream(${i})">✎</button>
                <button class="btn-sec" onclick="removeStream(${i})" style="color:red">×</button>
            </td>
        </tr>`;
    });
}

function removeStream(i) { streams.splice(i, 1); updateStreamTable(); calculate(); }
function editStream(i) {
    const s = streams[i];
    document.getElementById('name').value = s.name;
    document.getElementById('type').value = s.type;
    document.getElementById('tStart').value = s.tStart;
    // Show original T target if latent was shifted slightly, round it for display
    document.getElementById('tTarget').value = s.isLatent ? s.tStart : s.tTarget; 
    document.getElementById('heatLoad').value = s.heatLoad;
    document.getElementById('hValue').value = s.h;
    document.getElementById('editIndex').value = i;
    document.getElementById('addBtn').innerText = "Speichern";
    document.getElementById('cancelBtn').style.display = "inline-block";
}
function resetForm() {
    document.getElementById('editIndex').value = "-1";
    document.getElementById('name').value = "";
    document.getElementById('addBtn').innerText = "Hinzufügen";
    document.getElementById('cancelBtn').style.display = "none";
}

// --- CORE ALGORITHMS ---

function calculate() {
    if (streams.length === 0) return;
    const dTmin = parseFloat(document.getElementById('dTmin').value);
    
    // 1. Problem Table Analysis (GCC)
    const pta = runProblemTable(dTmin);
    pinchData = pta; // Store globally

    // 2. Composite Curves Data
    const ccData = getCompositeCurves(pta.qH);

    // 3. Update KPIs
    document.getElementById('resQH').innerText = pta.qH.toFixed(1);
    document.getElementById('resQC').innerText = pta.qC.toFixed(1);
    document.getElementById('resPinch').innerText = pta.pinchT.toFixed(1);
    const totalCold = streams.filter(s=>s.type==='cold').reduce((a,b)=>a+b.heatLoad,0);
    const recovery = totalCold - pta.qH;
    document.getElementById('resRec').innerText = ((recovery / (pta.qH + recovery || 1))*100).toFixed(1);

    // 4. Render Charts
    renderCompositeChart(ccData, dTmin);
    renderGCCChart(pta.gccPoints);
    drawGridDiagram(dTmin, pta.pinchT);
    
    // 5. Cost Analysis (Supertargeting loop)
    runCostAnalysis();
    generateInterpretation(pta, dTmin);
}

// Problem Table Algorithm (Shifted Temps, Cascade)
function runProblemTable(dT) {
    // 1. Shift Temperatures
    let intervals = [];
    streams.forEach(s => {
        let shift = (s.type === 'hot') ? -dT/2 : dT/2;
        intervals.push(s.tStart + shift);
        intervals.push(s.tTarget + shift);
    });
    // Unique & Sort Descending
    intervals = [...new Set(intervals)].sort((a,b) => b - a);

    // 2. Interval Balance
    let intervalData = [];
    for(let i=0; i<intervals.length-1; i++) {
        let tHigh = intervals[i];
        let tLow = intervals[i+1];
        let dT_int = tHigh - tLow;
        let sumCP_H = 0, sumCP_C = 0;
        
        streams.forEach(s => {
            let shift = (s.type === 'hot') ? -dT/2 : dT/2;
            let sH = s.tStart + shift;
            let sL = s.tTarget + shift;
            let sMax = Math.max(sH, sL);
            let sMin = Math.min(sH, sL);
            // Check overlap
            if (sMax > tLow + 1e-6 && sMin < tHigh - 1e-6) {
                if (s.type === 'hot') sumCP_H += s.cp;
                else sumCP_C += s.cp;
            }
        });
        let netH = (sumCP_H - sumCP_C) * dT_int;
        intervalData.push({ tHigh, tLow, netH });
    }

    // 3. Cascade
    let cascade = [0];
    let minVal = 0;
    intervalData.forEach(d => {
        let nextVal = cascade[cascade.length-1] + d.netH; // Surplus adds up
        cascade.push(nextVal);
        if (nextVal < minVal) minVal = nextVal;
    });

    const qH = Math.abs(minVal); // Minimal Heating
    // Feasible Cascade (GCC Points)
    let gccPoints = [];
    // tPoints are intervals[0]...intervals[end]
    for(let i=0; i<intervals.length; i++) {
        gccPoints.push({ x: cascade[i] + qH, y: intervals[i] });
    }
    
    const qC = gccPoints[gccPoints.length-1].x;
    
    // Find Pinch Temp (where heat flow is 0 in feasible cascade - here it touches 0 at qH shift)
    // In GCC coordinates, X is heat flow. Pinch is where X = 0 (or min).
    // Actually GCC X is usually Net Heat Flow. Here we shifted it to be >= 0.
    // The point(s) with X=0 are the pinch points.
    let pinchCandidates = gccPoints.filter(p => p.x < 1e-4);
    let pinchT = pinchCandidates.length > 0 ? pinchCandidates[0].y : 0;

    return { qH, qC, pinchT, gccPoints, intervals };
}

// True Composite Curves Construction
function getCompositeCurves(qH_offset) {
    // Generate precise points for Hot and Cold composites
    const getCurve = (type, offsetH) => {
        let temps = [];
        streams.filter(s => s.type === type).forEach(s => {
            temps.push(s.tStart, s.tTarget);
        });
        temps = [...new Set(temps)].sort((a,b) => a - b); // Ascending for integration

        let points = [];
        let currentH = 0;
        
        // Start from lowest T to highest T
        for(let i=0; i<temps.length; i++) {
            let T = temps[i];
            points.push({ x: currentH + offsetH, y: T });
            
            if (i < temps.length - 1) {
                let nextT = temps[i+1];
                let sumCP = 0;
                streams.filter(s => s.type === type).forEach(s => {
                    let minT = Math.min(s.tStart, s.tTarget);
                    let maxT = Math.max(s.tStart, s.tTarget);
                    if (minT <= T && maxT >= nextT) sumCP += s.cp;
                });
                currentH += sumCP * (nextT - T);
            }
        }
        return points;
    };

    return {
        hot: getCurve('hot', 0).reverse(), // Draw from high to low usually looks better or consistent
        cold: getCurve('cold', qH_offset).reverse()
    };
}

// Cost Analysis Loop
function runCostAnalysis() {
    let data = { labels: [], total: [], energy: [], capital: [] };
    
    // Loop dTmin from 5 to 40
    for(let dt = 5; dt <= 40; dt += 5) {
        let res = runProblemTable(dt);
        
        // 1. Energy Cost
        // Assume Steam ~ 0.05 $/kWh, Cooling ~ 0.01 $/kWh. 8000 hours/yr
        let costOp = (res.qH * 0.05 + res.qC * 0.01) * 8000;

        // 2. Capital Cost (Area Target simplified)
        // A_target = Sum( q_i / (U * LMTD_i) ) in intervals
        // We approximate using the composite curves at this dt
        // Since getCompositeCurves is computationally heavy, we use a heuristic model here for speed
        // Cost = N * (A + B * Area^C)
        // Simplified: Area ~ 1 / LMTD. LMTD ~ dt. 
        // So Area is proportional to TotalLoad / dt.
        let totalLoad = streams.reduce((a,b) => a + b.heatLoad, 0);
        let approxArea = totalLoad / (dt * 0.5); // Very rough approximation
        let costCap = 1000 + 400 * Math.pow(approxArea, 0.8); // Annualized

        data.labels.push(dt);
        data.total.push(costOp + costCap);
        data.energy.push(costOp);
        data.capital.push(costCap);
    }
    
    renderCostChart(data);
}

// --- VISUALIZATION (Chart.js & Canvas) ---

function renderCompositeChart(data, dt) {
    const ctx = document.getElementById('compositeChart').getContext('2d');
    if (charts.cc) charts.cc.destroy();
    
    charts.cc = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                { label: 'Hot Composite', data: data.hot, borderColor: '#ef4444', showLine: true, borderWidth: 2, pointRadius: 0 },
                { label: 'Cold Composite', data: data.cold, borderColor: '#3b82f6', showLine: true, borderWidth: 2, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', title: {display:true, text: 'Enthalpie H [kW]'} },
                y: { title: {display:true, text: 'Temperatur T [°C]'} }
            },
            plugins: {
                annotation: {
                    annotations: {
                        line1: { type: 'line', scaleID: 'x', value: 0, borderColor: 'black', borderWidth: 1 }
                    }
                },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

function renderGCCChart(points) {
    const ctx = document.getElementById('gccChart').getContext('2d');
    if (charts.gcc) charts.gcc.destroy();

    charts.gcc = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{ 
                label: 'Grand Composite Curve', 
                data: points, 
                borderColor: '#10b981', 
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                showLine: true, 
                fill: true,
                borderWidth: 2 
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { title: {display:true, text: 'Netto Wärmefluss [kW] (0 = Pinch)'} },
                y: { title: {display:true, text: 'Shifted T [°C]'} }
            }
        }
    });
}

function renderCostChart(data) {
    const ctx = document.getElementById('costChart').getContext('2d');
    if (charts.cost) charts.cost.destroy();

    // Find min
    let minCost = Math.min(...data.total);
    let bestIdx = data.total.indexOf(minCost);
    let bestDT = data.labels[bestIdx];

    document.getElementById('costReport').innerHTML = `
        <p>Optimales <b>ΔT<sub>min</sub> ≈ ${bestDT} K</b>. <br>
        Hier sind die Gesamtkosten am geringsten (${Math.round(minCost).toLocaleString()} €/a).</p>
    `;

    charts.cost = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Gesamt', data: data.total, borderColor: 'black', borderWidth: 3, tension: 0.4 },
                { label: 'OPEX (Energie)', data: data.energy, borderColor: 'red', borderDash: [5,5] },
                { label: 'CAPEX (Invest)', data: data.capital, borderColor: 'blue', borderDash: [5,5] }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: false }, x: { title: { display: true, text: 'ΔTmin [K]' } } }
        }
    });
}
// --- INTERPRETATION ENGINE ---

function generateInterpretation(pta, currentDT) {
    const container = document.getElementById('ai-insight-content');
    if (!pta || !pta.gccPoints) return;

    // 1. Analyse: Pinch Point & Aufteilung
    const pinchT = pta.pinchT;
    const hotPinch = pinchT + currentDT / 2;
    const coldPinch = pinchT - currentDT / 2;
    
    // 2. Analyse: Wirtschaftlichkeit (Vergleich mit Optimum)
    // Wir rufen kurz die Kostenfunktion ab (ohne Chart render) um das Optimum zu finden
    let costData = calculateCostCurveData(); 
    let minCost = Math.min(...costData.total);
    let optDT = costData.labels[costData.total.indexOf(minCost)];
    let dtDiff = currentDT - optDT;

    let economicAdvice = "";
    if (Math.abs(dtDiff) <= 5) {
        economicAdvice = `Perfekt! Ihr gewähltes ΔTmin (${currentDT}K) liegt nah am wirtschaftlichen Optimum (${optDT}K).`;
    } else if (dtDiff > 5) {
        economicAdvice = `Ihr ΔTmin ist zu groß (${currentDT}K vs Opt: ${optDT}K). Sie sparen Investitionskosten, verlieren aber viel Energie. Erwägen Sie kleinere Wärmetauscher-Abstände.`;
    } else {
        economicAdvice = `Ihr ΔTmin ist sehr klein (${currentDT}K vs Opt: ${optDT}K). Die Energierückgewinnung ist hoch, aber die Tauscherflächen werden teuer.`;
    }

    // 3. Analyse: Utilities (GCC)
    // Prüfen, ob der Prozess Wärme oberhalb von 100°C braucht (Dampf) oder Kälte unter 20°C (Kältemaschine)
    const maxTempReq = Math.max(...pta.intervals);
    const minTempReq = Math.min(...pta.intervals);
    let utilityAdvice = [];
    
    if (maxTempReq > 100) utilityAdvice.push("Hochtemperatur-Wärme nötig (z.B. Dampfnetz).");
    if (minTempReq < 20) utilityAdvice.push("Tiefkälte nötig (Kältemaschine/Sole), Kühlwasser reicht evtl. nicht.");
    else utilityAdvice.push("Standard-Kühlwasser (20-30°C) ist ausreichend.");

    // HTML Generierung
    let html = `
        <div class="insight-section">
            <span class="insight-title">1. Strategische Aufteilung (Design)</span>
            Um das Ziel von <b>${pta.qH.toFixed(1)} kW Heizung</b> zu erreichen, müssen Sie das Netzwerk in zwei unabhängige Teile splitten:
            <ul>
                <li><b>Oberhalb Pinch:</b> Designen Sie nur Wärmetauscher zwischen ${hotPinch.toFixed(1)}°C und ${maxTempReq.toFixed(1)}°C.</li>
                <li><b>Unterhalb Pinch:</b> Designen Sie nur Wärmetauscher zwischen ${coldPinch.toFixed(1)}°C und ${minTempReq.toFixed(1)}°C.</li>
            </ul>
            <div class="action-tip">Übertragen Sie KEINE Wärme über die Pinch-Grenze (${pinchT.toFixed(1)}°C shifted), sonst steigt Ihr Energiebedarf sofort!</div>
        </div>

        <div class="insight-section">
            <span class="insight-title">2. Matching-Regeln (Umsetzung)</span>
            Beim Verbinden der Ströme im Grid-Diagramm beachten Sie zwingend die CP-Regeln, um den Pinch nicht zu verletzen:
            <ul>
                <li><b>Oberhalb Pinch (${hotPinch.toFixed(1)}°C+):</b> <br> CP(heiß) ≤ CP(kalt). Suchen Sie heiße Ströme mit kleinem CP und paaren Sie sie mit kalten Strömen mit großem CP.</li>
                <li><b>Unterhalb Pinch (<${coldPinch.toFixed(1)}°C):</b> <br> CP(heiß) ≥ CP(kalt). Hier müssen die heißen Ströme die größeren CP-Werte haben.</li>
            </ul>
            ${streams.some(s => s.isLatent) ? '<div class="action-tip">Achtung: Sie haben Phasenwechsel (Latent) im Prozess. Nutzen Sie die GCC Kurve, um zu sehen, ob Sie Prozess-Dampf intern erzeugen können.</div>' : ''}
        </div>

        <div class="insight-section">
            <span class="insight-title">3. Wirtschaftlichkeit & Utilities</span>
            ${economicAdvice}<br>
            <b>Utility-Vorschlag basierend auf Temperaturen:</b> ${utilityAdvice.join(" ")}
        </div>
    `;

    container.innerHTML = html;
}

// Hilfsfunktion: Berechnet nur die Daten für die Kostenkurve (ohne Chart zu zeichnen)
// Damit wir das Optimum im Text verwenden können
function calculateCostCurveData() {
    let labels = [];
    let total = [];
    // Kurzer Loop analog zu runCostAnalysis
    for(let dt = 5; dt <= 40; dt += 5) {
        let res = runProblemTable(dt); // Nutzt existierende Logik
        let costOp = (res.qH * 0.05 + res.qC * 0.01) * 8000;
        let totalLoad = streams.reduce((a,b) => a + b.heatLoad, 0);
        let approxArea = totalLoad / (dt * 0.5);
        let costCap = 1000 + 400 * Math.pow(approxArea, 0.8);
        labels.push(dt);
        total.push(costOp + costCap);
    }
    return { labels, total };
}

function drawGridDiagram(dTmin, pinchT) {
    const canvas = document.getElementById('gridCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.parentElement.offsetWidth - 20;
    const h = 50 + streams.length * 60;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.font = '14px sans-serif';

    // 1. Draw Pinch Line
    const pinchX = w / 2;
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(pinchX, 20);
    ctx.lineTo(pinchX, h - 20);
    ctx.strokeStyle = '#aaa';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#666';
    ctx.fillText(`Pinch ${pinchT.toFixed(1)}°C (Shifted)`, pinchX + 5, 20);

    // 2. Draw Streams
    streams.forEach((s, i) => {
        const y = 60 + i * 60;
        const isHot = s.type === 'hot';
        const color = isHot ? '#ef4444' : '#3b82f6';
        
        // Calculate relative length based on temps (simple scaling)
        // We simply draw lines directionally
        const startX = isHot ? 50 : w - 50;
        const endX = isHot ? w - 50 : 50;

        // Draw Stream Line
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        if (isHot) {
             ctx.moveTo(endX, y); ctx.lineTo(endX-10, y-5); ctx.lineTo(endX-10, y+5);
        } else {
             ctx.moveTo(endX, y); ctx.lineTo(endX+10, y-5); ctx.lineTo(endX+10, y+5);
        }
        ctx.fillStyle = color;
        ctx.fill();

        // Labels
        ctx.fillStyle = 'black';
        ctx.fillText(`${s.name}`, 10, y - 10);
        ctx.font = '12px monospace';
        
        // Temp Labels
        ctx.fillText(`${s.tStart}°`, startX + (isHot ? 0 : -30), y + 20);
        ctx.fillText(`${s.tTarget}°`, endX + (isHot ? -30 : 0), y + 20);
        
        // CP & H info
        ctx.fillStyle = '#888';
        ctx.fillText(`CP: ${s.cp.toFixed(2)} | h: ${s.h}`, w/2 - 60, y + 20);
    });
}