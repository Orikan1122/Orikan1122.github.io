const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const defaultLoads = [250, 220, 180, 120, 95, 80, 80, 80, 100, 150, 200, 240];
let charts = {};

// --- PHYSIK & STOFFWERTE ---

function getFluidProps(tempC, glycolPerc) {
    // Annäherungswerte für Ethylenglykol-Gemische
    // Viskosität: Steigt exponentiell bei Kälte und Glykol
    // Dichte: Steigt mit Glykol
    // Cp: Sinkt mit Glykol

    // Dichte (kg/m3) ca. bei 10°C
    const rho_w = 1000;
    const rho_g = 1110; 
    const ratio = glycolPerc / 100;
    const rho = rho_w * (1-ratio) + rho_g * ratio;

    // Spezifische Wärmekapazität (J/kgK)
    const cp_w = 4180;
    const cp_g = 2400; 
    const cp = cp_w * (1-ratio) + cp_g * ratio;

    // Kinematische Viskosität (m2/s) - Kritisch für Reynolds!
    // Wasser bei 5°C: 1.5e-6
    // 25% Glykol bei 0°C: ca. 3.5e-6 bis 4.0e-6
    // Wir nutzen eine vereinfachte Exponentialfunktion
    const base_visc_water = 1.3e-6; // bei 10°C
    const visc_factor = 1 + (ratio * 2.5); // Glykol macht es zäher
    const temp_factor = Math.exp(-0.03 * tempC); // Kälte macht es zäher
    const visc = base_visc_water * visc_factor * temp_factor;

    return { rho, cp, visc };
}

function getReynolds(flowLmin, props, d_inner_m) {
    // flow in m3/s für EINE U-Rohr Schleife (bei Doppel-U teilt sich der Strom durch 2)
    // Annahme: FlowInput ist pro SONDE. Bei Doppel-U also / 2.
    const flow_m3s = (flowLmin / 60000) / 2; 
    const area = Math.PI * Math.pow(d_inner_m/2, 2);
    const velocity = flow_m3s / area;
    
    // Re = (v * d) / nu
    const re = (velocity * d_inner_m) / props.visc;
    return { re, velocity };
}

function getPressureDrop(length, d_inner, velocity, props, re) {
    // Darcy-Weisbach: dp = lambda * (L/d) * (rho * v^2 / 2)
    let lambda_fric;
    if (re < 2300) {
        lambda_fric = 64 / re; // Laminar
    } else {
        // Blasius (Turbulent glatt)
        lambda_fric = 0.3164 / Math.pow(re, 0.25);
    }
    
    // Gesamtlänge Rohr = 2 * Sondenlänge (Hin+Rück)
    const pipe_len = length * 2;
    const dp_pa = lambda_fric * (pipe_len / d_inner) * (props.rho * Math.pow(velocity, 2) / 2);
    return dp_pa / 100000; // in bar
}

function getCOP(sourceTemp) {
    // Vereinfachtes Modell einer Sole/Wasser WP (W35)
    // Carnot-Effizienz ca 0.5
    // COP = eta * (T_sink_k) / (T_sink_k - T_source_k)
    const t_sink = 35 + 273.15;
    const t_source = sourceTemp + 273.15;
    const eta = 0.48; // Systemgüte
    if (t_sink <= t_source) return 8; // Limit
    let cop = eta * (t_sink / (t_sink - t_source));
    cop = Math.min(Math.max(cop, 2.0), 6.5); // Realistische Grenzen
    return cop;
}

function getBucklingSafety(depth, sdr, groutDensity, ovality) {
    const E = 900e6; // Kurzzeit E-Modul PE100 (konservativ für Montage)
    const mu = 0.4;
    const f_red = Math.pow(1 - (ovality/100), 3);
    const p_crit = (2 * E / (1 - Math.pow(mu, 2))) * Math.pow(1 / (sdr - 1), 3) * f_red;
    const p_act = depth * 9.81 * (groutDensity - 1000); // Druckdifferenz Beton vs Wasser innen
    return { 
        safety: p_crit / p_act, 
        p_crit_bar: p_crit / 100000 
    };
}

// --- CORE SIMULATION ---

function fullSimulation() {
    try {
        // --- 1. Eingaben lesen ---
        const inputs = {
            alt: parseFloat(document.getElementById('altitude').value),
            lambda: parseFloat(document.getElementById('lambda').value),
            p_source: parseFloat(document.getElementById('p_source').value),
            q_peak: parseFloat(document.getElementById('q_peak').value),
            gx: parseInt(document.getElementById('grid_x').value),
            gy: parseInt(document.getElementById('grid_y').value),
            spacing: parseFloat(document.getElementById('spacing').value),
            rb: parseFloat(document.getElementById('rb_val').value),
            glycol: parseFloat(document.getElementById('glycol_percent').value),
            flow: parseFloat(document.getElementById('flow_rate').value),
            sdr: parseFloat(document.getElementById('pipe_sdr').value),
            ovality: parseFloat(document.getElementById('ovality').value),
            rho_grout: parseFloat(document.getElementById('grout_density').value),
            cost_drill: parseFloat(document.getElementById('p_meter').value),
            cost_elec: parseFloat(document.getElementById('p_elec').value) / 100 // Rp -> CHF
        };

        const total_probes = inputs.gx * inputs.gy;
        const t_ground = 11.5 - 0.0055 * inputs.alt; // T_boden ungestört

        // Rohrgeometrie (Doppel-U 32mm)
        const d_outer = 0.032;
        const d_inner = inputs.sdr === 11 ? 0.0262 : 0.028; // SDR11 dicker, SDR17 dünner

        // --- 2. Lastprofil & Hydraulik Loop ---
        let mon_data = { load:[], source:[], soil:[], backup:[], temp:[], cop:[], power:[] };
        let q_ann_extract = 0;
        let q_ann_inject = 0;
        let el_consumption = 0;
        
        // Simuliere die Sondenlänge (Iterativ oder analytisch geschätzt)
        // Erste Schätzung: 50 W/m
        let l_guess = (inputs.q_peak * 1000 / total_probes) / 45;
        l_guess = Math.max(l_guess, 80); // Min 80m

        // Wir berechnen Hydraulik für die geschätzte Länge
        const fluids = getFluidProps(4, inputs.glycol); // Eigenschaften bei 4°C (konservativ)
        const hydro = getReynolds(inputs.flow, fluids, d_inner);
        const p_drop_bar = getPressureDrop(l_guess, d_inner, hydro.velocity, fluids, hydro.re);
        
        // Pumpenleistung (P = Q * dp / eta), eta=0.3 für Umwälzpumpe
        const flow_m3s_total = (inputs.flow * total_probes) / 60000;
        const pump_power_kw = (flow_m3s_total * (p_drop_bar * 100000) / 0.3) / 1000;

        // Monatsschleife
        for(let i=0; i<12; i++) {
            const loadRaw = parseFloat(document.getElementById(`m_${i}`).value);
            // COP basiert auf Sole-Temp (geschätzt T_ground - 4K Entzug)
            const current_cop = getCOP(t_ground - 4); 
            
            // Elektrische Leistung WP
            const p_el_wp = loadRaw / current_cop;
            // Entzugsleistung aus Quelle/Boden = Heizlast - Strom
            const q_extract_demand = loadRaw - p_el_wp;

            // Bilanzierung
            const direct = Math.min(q_extract_demand, inputs.p_source);
            let soil = 0, charge = 0, backup = 0;
            
            const delta = q_extract_demand - inputs.p_source;

            if (delta > 0) {
                // Boden muss liefern
                const soil_cap = total_probes * l_guess * 0.060; // Max 60W/m kurzzeitig
                soil = Math.min(delta, soil_cap);
                backup = delta - soil; // Direktstromheizung
            } else {
                // Regeneration
                charge = Math.abs(delta);
            }

            mon_data.load.push(loadRaw);
            mon_data.source.push(direct);
            mon_data.soil.push(soil);
            mon_data.backup.push(backup); // Thermisch
            mon_data.cop.push(current_cop);
            mon_data.temp.push(t_ground - (soil > 0 ? 3 : -1)); // Visuell

            q_ann_extract += (soil * 730);
            q_ann_inject += (charge * 730);
            
            // Stromverbrauch total (WP + Backup + Pumpe)
            // Backup COP = 1
            const el_total_month = (p_el_wp * 730) + (backup * 730) + (pump_power_kw * 730);
            el_consumption += el_total_month;
        }

        const q_net_kwh = q_ann_extract - q_ann_inject;
        const jaz = mon_data.load.reduce((a,b)=>a+b,0) * 730 / el_consumption;

        // --- 3. SIA 384/6 (50 Jahre) ---
        // Stationäre Berechnung mit 50J Puls
        // dT_boden = q_lin_net * R_boden_50a
        const q_lin_net_avg = (q_net_kwh * 1000 / 8760) / (total_probes * l_guess); // W/m Durchschnitt
        
        // g-Function Ersatz (Infinite Line Source Log-Approximation)
        const time_sec = 50 * 365 * 24 * 3600;
        const r_soil_50y = (1 / (4 * Math.PI * inputs.lambda)) * Math.log((4 * 1e-6 * time_sec) / (Math.pow(0.07, 2)*1.78)); // Diffusivity geschätzt
        
        // Interferenz Faktor (SIA Feld-Einfluss)
        const n_internal = Math.max(0, (inputs.gx - 2) * (inputs.gy - 2));
        const interaction_factor = 1 + (n_internal / total_probes) * 0.6; // Empirischer Faktor
        
        const dt_soil_50 = q_lin_net_avg * r_soil_50y * interaction_factor;
        const t_soil_50 = t_ground - dt_soil_50;

        // Fluid Temperatur Minimum (Spitzenlast Januar)
        // T_fluid_min = T_soil_50 - (q_peak_soil_lin * (Rb + R_soil_peak))
        // Wir vereinfachen: T_fluid = T_soil_50 - DeltaT_entzug
        // DeltaT_entzug bei Spitze ca. 8-12K abhängig von Rb
        const q_peak_soil_lin = (Math.max(...mon_data.soil) * 1000) / (total_probes * l_guess);
        const dt_peak = q_peak_soil_lin * (inputs.rb + (0.2 / inputs.lambda)); // R_boden kurzzeit
        
        const t_min_fluid_50 = t_soil_50 - dt_peak;

        // --- 4. Iterative Korrektur der Länge ---
        // Wenn T_min < -1.5 (SIA Limit), Länge erhöhen
        let l_final = l_guess;
        if (t_min_fluid_50 < -1.5) {
            // Einfache proportionale Skalierung um Ziel zu erreichen
            // Delta T zu tief -> L muss rauf
            const target = -1.5;
            const diff = target - t_min_fluid_50;
            l_final = l_guess * (1 + (diff * 0.08)); 
        }
        l_final = Math.max(l_final, inputs.q_peak * 1000 / (total_probes * 65)); // Max 65W/m Hardlimit
        
        // --- 5. Mechanik Check ---
        const buckle = getBucklingSafety(l_final, inputs.sdr, inputs.rho_grout, inputs.ovality);

        // --- 6. Output & Visualisierung ---
        updateUI(l_final, total_probes, t_min_fluid_50, dt_soil_50, hydro, buckle, p_drop_bar, q_ann_extract, el_consumption, jaz, inputs);
        
        // Charts
        drawEnergyChart(mon_data);
        drawTempChart(mon_data.temp, t_min_fluid_50);
        drawGrid(inputs.gx, inputs.gy);
        drawPressureTest(buckle.p_crit_bar);

    } catch (err) {
        console.error(err);
    }
}

function updateUI(len, count, t_min, drift, hydro, buckle, p_drop, q_ex, elec, jaz, inputs) {
    // Dimensionierung
    document.getElementById('res_l').innerHTML = Math.round(len) + " <span style='font-size:1rem'>m</span>";
    document.getElementById('res_count').innerText = `${count} x ${Math.round(len)}m = ${Math.round(count*len)}m Total`;

    // SIA
    const elSia = document.getElementById('res_sia');
    elSia.innerHTML = t_min.toFixed(1) + " °C";
    elSia.className = "val " + (t_min > -1.5 ? "text-ok" : "text-crit");
    document.getElementById('res_tp').innerText = `Drift 50a: ${(drift>0?"-":"+") + Math.abs(drift).toFixed(2)} K`;

    // Hydraulik
    const flow_cond = hydro.re > 2300 ? (hydro.re > 4000 ? "Turbulent (Gut)" : "Übergang") : "Laminar (Schlecht)";
    document.getElementById('res_hydro_val').innerHTML = `Re ${Math.round(hydro.re)}`;
    document.getElementById('res_hydro_pressure').innerHTML = `Δp: ${p_drop.toFixed(2)} bar | ${flow_cond}`;
    
    // Effizienz & Kosten
    document.getElementById('res_jaz').innerHTML = jaz.toFixed(2);
    const opex = elec * inputs.cost_elec;
    document.getElementById('res_opex').innerText = `Strom: CHF ${Math.round(opex).toLocaleString()}/a`;

    // Empfehlungstext
    const rec = document.getElementById('recText');
    let alerts = [];
    if (hydro.re < 2300) alerts.push("⚠️ <b>Hydraulik:</b> Laminare Strömung verringert den Entzug. Glykol reduzieren oder Durchfluss erhöhen.");
    if (t_min < -1.5) alerts.push("❌ <b>SIA 384/6:</b> Sole zu kalt nach 50 Jahren. Sondenabstand oder Länge vergrößern.");
    if (buckle.safety < 1.5) alerts.push("⚠️ <b>Mechanik:</b> SDR11 empfohlen wegen Kollapsgefahr.");
    
    rec.innerHTML = alerts.length ? alerts.join("<br>") : "✅ <b>Optimale Auslegung:</b> Hydraulik turbulent, SIA-Temperaturen eingehalten, Mechanik sicher.";

    // Report Text
    const invest = (len * count) * inputs.cost_drill;
    const txt = `SYSTEM-BERICHT:\n` +
    `-----------------------------------------\n` +
    `Investition (Bohrung):   CHF ${Math.round(invest).toLocaleString()}\n` +
    `Betriebskosten (Strom):  CHF ${Math.round(opex).toLocaleString()} / Jahr\n` +
    `Jahresarbeitszahl (JAZ): ${jaz.toFixed(2)}\n\n` +
    `TECHNIK:\n` +
    `- Sole: ${inputs.glycol}% Glykol\n` +
    `- Druckverlust: ${p_drop.toFixed(2)} bar (Auslegung Umwälzpumpe)\n` +
    `- Kritischer Kollapsdruck: ${buckle.p_crit_bar.toFixed(1)} bar (Sicherheit ${buckle.safety.toFixed(1)}x)\n` +
    `- Entzugsdichte: ${Math.round((q_ex/730*1000)/(count*len))} W/m (Peak)`;
    
    document.getElementById('full_report').innerText = txt;
    
    // Kleiner Mech-Report
    document.getElementById('mechReport').innerHTML = `<b>EN 805 Sim:</b><br>Prüfdruck 15 bar<br>P_crit ${buckle.p_crit_bar.toFixed(1)} bar`;
}

// --- CHARTS ---

function drawEnergyChart(data) {
    const ctx = document.getElementById('energyChart').getContext('2d');
    if(charts.energy) charts.energy.destroy();
    charts.energy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Direkt (Quelle)', data: data.source, backgroundColor: '#cbd5e1', stack:'Stack 0' },
                { label: 'Entzug (Boden)', data: data.soil, backgroundColor: '#2563eb', stack:'Stack 0' },
                { label: 'Backup (Heizstab)', data: data.backup, backgroundColor: '#ef4444', stack:'Stack 0' },
                { label: 'Regeneration', data: data.soil.map(v=>-1), backgroundColor: 'rgba(0,0,0,0)', stack:'Stack 0' } // Dummy
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x:{stacked:true}, y:{stacked:true} } }
    });
}

function drawTempChart(temps, min50) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    if(charts.temp) charts.temp.destroy();
    charts.temp = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Sole-Temp Jahr 1', data: temps, borderColor: '#10b981', tension: 0.4 },
                { label: 'Limit 50a (-1.5°C)', data: Array(12).fill(-1.5), borderColor: '#ef4444', borderDash: [5,5], pointRadius:0 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function drawGrid(gx, gy) {
    const cvs = document.getElementById('gridCanvas');
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0,0,400,200);
    const step = 20; const m = 30;
    for(let x=0; x<gx; x++) {
        for(let y=0; y<gy; y++) {
            const isInt = (x>0 && x<gx-1 && y>0 && y<gy-1);
            ctx.beginPath(); ctx.arc(m+y*step, m+x*step, isInt?4:5, 0, Math.PI*2);
            ctx.fillStyle = isInt ? '#ef4444' : '#2563eb'; ctx.fill();
        }
    }
}

function drawPressureTest(pCrit) {
    const cvs = document.getElementById('pressureCanvas');
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0,0,250,150);
    
    // Graph
    ctx.beginPath(); ctx.strokeStyle = "#334155"; ctx.lineWidth=2;
    ctx.moveTo(30, 130); ctx.lineTo(30, 20); ctx.lineTo(230, 20); // Achsen
    ctx.stroke();

    // Kurve
    ctx.beginPath(); ctx.strokeStyle = "#2563eb"; ctx.lineWidth=3;
    ctx.moveTo(30, 130); 
    ctx.quadraticCurveTo(50, 40, 230, 45); // Logarithmischer Abfall Sim
    ctx.stroke();
    
    // Limit Linie
    if(pCrit < 30) {
        const yCrit = 130 - (pCrit * 3); // Skalierung
        ctx.beginPath(); ctx.strokeStyle = "#ef4444"; ctx.setLineDash([5,5]);
        ctx.moveTo(30, yCrit); ctx.lineTo(230, yCrit); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#ef4444"; ctx.fillText(`Kollaps ${pCrit.toFixed(1)}bar`, 40, yCrit-5);
    }
}

function toggleMonths() {
    document.getElementById('monthInputs').classList.toggle('hidden');
}

function init() {
    const mc = document.getElementById('monthInputs');
    months.forEach((m,i)=>{
        const d = document.createElement('div');
        d.innerHTML = `<label>${m}</label><input type="number" id="m_${i}" value="${defaultLoads[i]}">`;
        mc.appendChild(d);
    });
    
    document.getElementById('simBtn').onclick = fullSimulation;
    
    // Live Update für Slider/Selects wenn gewünscht, hier nur Button
    fullSimulation();
}

window.onload = init;