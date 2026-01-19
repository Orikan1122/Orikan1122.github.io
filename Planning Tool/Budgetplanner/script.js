// --- CONFIGURATION ---
// Replace with your Vault URL
const VAULT_URL = "https://script.google.com/macros/s/AKfycbyVH-r3IMqPDRck8KFBDhPC_Q242HiwWFw7GD8LSIlDByVbP9BDzRMWRnAI219b-Y3iuA/exec"; 

// --- STATE ---
let planData = {
    startBalance: 0,
    entries: [] // { id, type, name, amount, freq, dateStr, endDateStr, growth }
};

let simulation = {
    dailyBalances: [], 
    alerts: [],
    totals: { income: 0, expense: 0, pension: 0 },
    quarterly: []
};

let CURRENT_YEAR = 2026;
let VIEW_MODE = 1; // 1, 5, or 10 years

// --- INIT & RESIZER LOGIC ---
window.onload = function() {
    restoreUser();
    initResizers();
    clearForm();
    
    // Set Today's date for reference
    const now = new Date();
    document.getElementById("lbl-today").innerText = `${now.getDate()}.${now.getMonth()+1}`;

    // Initialize date inputs
    document.getElementById("inp-date").value = now.toISOString().split('T')[0];

    changeYear();
};

function initResizers() {
    setupResizer("drag-1", "col-setup"); 
    setupResizer("drag-2", "col-analytics", true); 
}

function setupResizer(resizerId, panelClass) {
    const resizer = document.getElementById(resizerId);
    const panel = document.querySelector(`.${panelClass}`);
    let x = 0; let w = 0;

    const md = (e) => {
        x = e.clientX;
        const styles = window.getComputedStyle(panel);
        w = parseInt(styles.width, 10);
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup', mu);
        document.body.style.cursor = 'col-resize';
    };

    const mm = (e) => {
        const dx = e.clientX - x;
        if (panelClass === 'col-setup') panel.style.width = `${w + dx}px`;
        else panel.style.width = `${w - dx}px`; 
    };

    const mu = () => {
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
        document.body.style.cursor = 'default';
    };

    resizer.addEventListener('mousedown', md);
}

// --- DATA MANAGEMENT ---
function changeYear() {
    CURRENT_YEAR = parseInt(document.getElementById("global-year").value) || 2026;
    document.getElementById("display-current-year").innerText = CURRENT_YEAR;
    runSimulation();
}

function updateStartBalance() {
    planData.startBalance = parseFloat(document.getElementById("inp-start-balance").value) || 0;
    runSimulation();
}

function clearForm() {
    document.getElementById("inp-id").value = "";
    document.getElementById("inp-name").value = "";
    document.getElementById("inp-amount").value = "";
    document.getElementById("inp-growth").value = "0";
    document.getElementById("inp-date").value = new Date().toISOString().split('T')[0];
    document.getElementById("inp-end-date").value = "";
    
    // UI Reset
    const btn = document.getElementById("btn-save-entry");
    btn.innerText = "Add Entry";
    btn.classList.remove("btn-update");
    btn.classList.add("btn-action");
    document.getElementById("editor-card").classList.remove("editing-mode");
}

function editEntry(id) {
    const entry = planData.entries.find(e => e.id === id);
    if(!entry) return;

    // Populate Form
    document.getElementById("inp-id").value = entry.id;
    document.getElementById("inp-type").value = entry.type;
    document.getElementById("inp-name").value = entry.name;
    document.getElementById("inp-amount").value = entry.amount;
    document.getElementById("inp-growth").value = entry.growth || 0;
    document.getElementById("inp-freq").value = entry.freq;
    document.getElementById("inp-date").value = entry.dateStr || "";
    document.getElementById("inp-end-date").value = entry.endDateStr || "";

    // UI Feedback
    const btn = document.getElementById("btn-save-entry");
    btn.innerText = "Update Entry";
    btn.classList.remove("btn-action");
    btn.classList.add("btn-update");
    document.getElementById("editor-card").classList.add("editing-mode");
}

function saveEntry() {
    const id = document.getElementById("inp-id").value;
    const type = document.getElementById("inp-type").value;
    const name = document.getElementById("inp-name").value;
    const amount = parseFloat(document.getElementById("inp-amount").value);
    const growth = parseFloat(document.getElementById("inp-growth").value) || 0;
    const freq = document.getElementById("inp-freq").value;
    const dateStr = document.getElementById("inp-date").value; 
    const endDateStr = document.getElementById("inp-end-date").value;

    if (!name || isNaN(amount)) return alert("Please fill Name and Amount");

    if (id) {
        // UPDATE existing
        const index = planData.entries.findIndex(e => e.id == id);
        if(index !== -1) {
            planData.entries[index] = {
                ...planData.entries[index],
                type, name, amount, freq, dateStr, endDateStr, growth
            };
        }
    } else {
        // ADD new
        planData.entries.push({
            id: Date.now(),
            type, name, amount, freq, dateStr, endDateStr, growth
        });
    }

    renderSetupList();
    runSimulation();
    clearForm();
}

function deleteEntry(id) {
    if(!confirm("Delete this entry?")) return;
    planData.entries = planData.entries.filter(e => e.id !== id);
    renderSetupList();
    runSimulation();
    clearForm();
}

function copyDataToNextYear() {
    const targetYear = CURRENT_YEAR + 1;
    if(!confirm(`Copy 'One-Time' events from ${CURRENT_YEAR} to ${targetYear}?`)) return;

    let count = 0;
    planData.entries.forEach(entry => {
        if(entry.freq === 'once' && entry.dateStr.startsWith(CURRENT_YEAR.toString())) {
            const oldDate = new Date(entry.dateStr);
            // safe creation of next year date string
            const newDateStr = `${targetYear}-${String(oldDate.getMonth()+1).padStart(2,'0')}-${String(oldDate.getDate()).padStart(2,'0')}`;
            
            planData.entries.push({
                ...entry,
                id: Date.now() + Math.random(),
                dateStr: newDateStr
            });
            count++;
        }
    });
    alert(`Copied ${count} items. Switch to ${targetYear} to view.`);
}

function renderSetupList() {
    const container = document.getElementById("setup-list");
    container.innerHTML = "";
    
    // Sort: Monthly first
    const sorted = [...planData.entries].sort((a,b) => (a.freq === 'monthly' ? -1 : 1));

    sorted.forEach(item => {
        const div = document.createElement("div");
        div.className = "setup-item";
        
        let tagClass = "tag-inc"; let short = "INC";
        if(['fixed','variable','debt'].includes(item.type)) { tagClass = "tag-exp"; short="EXP"; }
        else if (item.type === 'goal') { tagClass = "tag-sav"; short="GOAL"; }
        else if (item.type === 'pension') { tagClass = "tag-pen"; short="3a"; }
        
        const gr = item.growth !== 0 ? `<span style='color:blue; font-size:9px;'>(${item.growth>0?'+':''}${item.growth}%)</span>` : "";
        const endInfo = item.endDateStr ? `<span style='color:#c00; font-size:9px;'> &rarr; ${item.endDateStr}</span>` : "";

        div.innerHTML = `
            <div style="flex:1">
                <span class="item-tag ${tagClass}">${short}</span>
                <strong>${item.name}</strong> ${gr}
                <div style="color:#666; font-size:10px;">${item.freq} | ${item.amount.toLocaleString()} ${endInfo}</div>
            </div>
            <div>
                <button class="btn-icon" onclick="editEntry(${item.id})"><i class="fas fa-pencil-alt"></i></button>
                <button class="btn-icon btn-del" onclick="deleteEntry(${item.id})"><i class="fas fa-times"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- HELPER: TIMEZONE SAFE DATE PARSING ---
function getLocalMidnight(dateString) {
    if(!dateString) return null;
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m-1, d).getTime(); // Returns timestamp of 00:00:00 Local Time
}

// --- SINGLE YEAR SIMULATION (Detailed) ---
function runSimulation() {
    if(VIEW_MODE > 1) { runMultiYearSim(); return; } 

    simulation.dailyBalances = [];
    simulation.alerts = [];
    simulation.totals = { income: 0, expense: 0, pension: 0 };
    simulation.quarterly = [0,0,0,0];
    
    let currentBalance = planData.startBalance; 
    let minBalance = currentBalance;
    
    const now = new Date();
    let balanceToday = 0;

    // Iterate the full year
    const startDate = new Date(CURRENT_YEAR, 0, 1);
    const endDate = new Date(CURRENT_YEAR, 11, 31);
    
    // Loop uses Local Time Date object
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        
        const loopTimestamp = d.getTime(); // 00:00 Local
        const dayNum = d.getDate();
        const monthNum = d.getMonth(); // 0-11
        const dateKey = `${d.getFullYear()}-${String(monthNum+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        
        let dayEvents = [];
        let dayChange = 0;

        planData.entries.forEach(entry => {
            // SAFE DATE COMPARISON
            if(!entry.dateStr) return;

            const startTs = getLocalMidnight(entry.dateStr);
            const endTs = entry.endDateStr ? getLocalMidnight(entry.endDateStr) : null;

            // 1. Global Boundary Check
            if (loopTimestamp < startTs) return; // Before Start
            if (endTs && loopTimestamp > endTs) return; // After End

            // 2. Trigger Logic
            let isDue = false;
            
            if (entry.freq === 'monthly') {
                // Trigger on the same Day of Month as the Start Date
                const startDay = new Date(startTs).getDate();
                if(dayNum === startDay) isDue = true;
            } 
            else if (entry.freq === 'yearly') {
                const sDate = new Date(startTs);
                if (monthNum === sDate.getMonth() && dayNum === sDate.getDate()) isDue = true;
            }
            else if (entry.freq === 'once') {
                if (loopTimestamp === startTs) isDue = true;
            }

            if (isDue) {
                let impact = entry.amount;
                let isExpense = ['fixed', 'variable', 'goal', 'debt', 'pension'].includes(entry.type);

                if (isExpense) {
                    impact = -impact;
                    simulation.totals.expense += entry.amount;
                    if(entry.type === 'pension') simulation.totals.pension += entry.amount;
                } else {
                    simulation.totals.income += entry.amount;
                }
                
                dayChange += impact;
                dayEvents.push({ name: entry.name, amount: impact, type: entry.type });
            }
        });

        currentBalance += dayChange;
        if(currentBalance < minBalance) minBalance = currentBalance;
        
        const qIdx = Math.floor(monthNum / 3);
        simulation.quarterly[qIdx] += dayChange;

        // Capture "Today"
        if(d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            balanceToday = currentBalance;
        }

        simulation.dailyBalances.push({
            dateKey, dateObj: new Date(d), balance: currentBalance, change: dayChange, events: dayEvents
        });
    }

    if(balanceToday === 0 && now.getFullYear() !== CURRENT_YEAR) balanceToday = "-"; 

    updateUI(currentBalance, minBalance, balanceToday);
    renderCalendarGrid();
}

// --- MULTI-YEAR SIMULATION ---
function toggleChart(years) {
    VIEW_MODE = years;
    const btns = document.querySelectorAll('.chart-controls button');
    btns.forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if(years === 1) runSimulation();
    else runMultiYearSim();
}

function runMultiYearSim() {
    const yearsToSim = VIEW_MODE;
    const labels = [];
    const dataPoints = [];
    
    let simBal = planData.startBalance;
    
    for(let i=0; i<yearsToSim; i++) {
        const simYear = CURRENT_YEAR + i;
        let yearChange = 0;

        planData.entries.forEach(e => {
            if(!e.dateStr) return;
            
            // Broad Year Check
            const startY = parseInt(e.dateStr.split('-')[0]);
            if(simYear < startY) return;

            if(e.endDateStr) {
                const endY = parseInt(e.endDateStr.split('-')[0]);
                if(simYear > endY) return;
            }

            // Apply Growth
            const adjustedAmt = e.amount * Math.pow(1 + (e.growth/100), i);
            let occurrences = 0;

            if(e.freq === 'monthly') {
                // Rough calc for active months in this year
                let months = 12;
                
                // If it starts this year
                if(startY === simYear) {
                    const startM = parseInt(e.dateStr.split('-')[1]);
                    months = 13 - startM;
                }

                // If it ends this year
                if(e.endDateStr) {
                    const endY = parseInt(e.endDateStr.split('-')[0]);
                    if(endY === simYear) {
                         const endM = parseInt(e.endDateStr.split('-')[1]);
                         // If it also started this year, calculate range
                         if(startY === simYear) {
                             const startM = parseInt(e.dateStr.split('-')[1]);
                             months = (endM - startM) + 1;
                         } else {
                             months = endM;
                         }
                    }
                }
                occurrences = Math.max(0, months);
            }
            else if(e.freq === 'yearly') occurrences = 1;
            else if(e.freq === 'once') {
                if(startY === simYear) occurrences = 1;
            }

            let impact = adjustedAmt * occurrences;
            if(['fixed','variable','debt','goal','pension'].includes(e.type)) impact = -impact;
            yearChange += impact;
        });

        simBal += yearChange;
        labels.push(simYear);
        dataPoints.push(simBal);
    }

    renderChart(labels, dataPoints, true);
    document.getElementById("stat-bal").innerText = simBal.toLocaleString(undefined, {maximumFractionDigits:0});
    document.getElementById("stat-today").innerText = "N/A";
    document.getElementById("calendar-container").innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Multi-Year View Active.<br>Grid disabled.</div>";
}


// --- UI UPDATES ---
function updateUI(endBal, minBal, balToday) {
    document.getElementById("stat-inc").innerText = simulation.totals.income.toLocaleString();
    document.getElementById("stat-exp").innerText = simulation.totals.expense.toLocaleString();
    document.getElementById("stat-bal").innerText = endBal.toLocaleString();
    document.getElementById("stat-today").innerText = balToday.toLocaleString();
    document.getElementById("stat-bal").style.color = endBal >= 0 ? "var(--green)" : "var(--red)";

    const penTotal = simulation.totals.pension;
    document.getElementById("stat-pension").innerText = penTotal.toLocaleString();
    const pct = Math.min((penTotal / 7056) * 100, 100);
    document.getElementById("pension-bar").style.width = pct + "%";

    const qNames = ["Q1", "Q2", "Q3", "Q4"];
    const qt = document.getElementById("q-table");
    qt.innerHTML = "";
    simulation.quarterly.forEach((val, i) => {
        const cls = val >= 0 ? "q-pos" : "q-neg";
        const sign = val >= 0 ? "+" : "";
        qt.innerHTML += `<tr><td>${qNames[i]}</td><td class="${cls}" style="text-align:right">${sign}${val.toLocaleString()}</td></tr>`;
    });

    const labels = [];
    const points = [];
    simulation.dailyBalances.forEach((d, i) => {
        if(i % 7 === 0 || i === simulation.dailyBalances.length -1) {
            labels.push(`${d.dateObj.getDate()}.${d.dateObj.getMonth()+1}`);
            points.push(d.balance);
        }
    });
    renderChart(labels, points, false);
}

let financeChart = null;
function renderChart(labels, data, isMulti) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if(financeChart) financeChart.destroy();
    
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: isMulti ? 'Year End Balance' : 'Daily Balance',
                data: data,
                borderColor: '#000080',
                backgroundColor: 'rgba(0,0,128,0.1)',
                borderWidth: 1,
                fill: true,
                pointRadius: isMulti ? 4 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { font:{size:9} } }, x: { ticks: { font:{size:9}, maxTicksLimit: 10 } } }
        }
    });
}

// --- CALENDAR RENDERER ---
function renderCalendarGrid() {
    const container = document.getElementById("calendar-container");
    container.innerHTML = "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const groups = [{ name: "H1", m: [0,1,2,3,4,5] }, { name: "H2", m: [6,7,8,9,10,11] }];

    groups.forEach(g => {
        const table = document.createElement("table");
        table.className = "cal-grid";
        
        const trM = document.createElement("tr");
        trM.innerHTML = `<th>${CURRENT_YEAR}</th>`;
        g.m.forEach(mi => {
             const days = new Date(CURRENT_YEAR, mi+1, 0).getDate();
             const weeks = Math.ceil(days/7);
             const th = document.createElement("th");
             th.colSpan = weeks; th.innerText = months[mi]; th.className = "month-end-border";
             trM.appendChild(th);
        });
        table.appendChild(trM);

        const weekDays = ["M","T","W","T","F","S","S"];
        const anchor = new Date(CURRENT_YEAR, g.m[0], 1);
        let shift = anchor.getDay() === 0 ? 6 : anchor.getDay()-1;
        anchor.setDate(anchor.getDate() - shift);

        weekDays.forEach((wd, rIdx) => {
            const tr = document.createElement("tr");
            if(rIdx>=5) tr.className="weekend-row";
            tr.innerHTML = `<td class="day-label">${wd}</td>`;
            
            for(let c=0; c<26; c++) {
                const cellDate = new Date(anchor);
                cellDate.setDate(cellDate.getDate() + (c*7) + rIdx);
                
                const td = document.createElement("td");
                if(cellDate.getFullYear() === CURRENT_YEAR && g.m.includes(cellDate.getMonth())) {
                    td.innerText = cellDate.getDate();
                    const dk = cellDate.toISOString().split('T')[0];
                    const sim = simulation.dailyBalances.find(s=>s.dateKey===dk);
                    
                    if(sim && sim.events.length>0) {
                        const inc = sim.events.some(e=>e.amount>0);
                        const exp = sim.events.some(e=>e.amount<0);
                        if(inc) td.innerHTML += `<div class="dot inc"></div>`;
                        if(exp) td.innerHTML += `<div class="dot exp"></div>`;
                    }
                    td.onclick = () => showDetail(sim);
                    
                    const nextWeek = new Date(cellDate); nextWeek.setDate(cellDate.getDate()+7);
                    if(nextWeek.getMonth() !== cellDate.getMonth()) td.classList.add("month-end-border");

                } else { td.className = "empty-cell"; }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        });
        container.appendChild(table);
    });
}

function showDetail(sim) {
    const p = document.getElementById("day-detail-panel");
    if(!sim) { p.innerHTML = "<div class='empty-state'>No data.</div>"; return; }
    let h = `<strong>${sim.dateObj.toDateString()}</strong> | Bal: ${sim.balance.toLocaleString()}<br><table class="detail-table">`;
    sim.events.forEach(e => {
        h += `<tr><td>${e.name}</td><td style="color:${e.amount>0?'green':'red'}">${e.amount}</td></tr>`;
    });
    p.innerHTML = h + "</table>";
}

// --- VAULT & SYNC ---
function restoreUser() {
    if(localStorage.getItem("bp_user")) {
        document.getElementById("user-display").innerText = localStorage.getItem("bp_user");
        document.getElementById("user-display").style.display = "inline";
        document.getElementById("conf-url").value = localStorage.getItem("bp_conf_url");
        document.getElementById("conf-id").value = localStorage.getItem("bp_conf_id");
        document.getElementById("conf-pw").value = localStorage.getItem("bp_conf_pw");
    }
}
function openLogin() { document.getElementById("login-modal").style.display = "flex"; }
async function performVaultLogin() {
    const u = document.getElementById("vault-user").value;
    const p = document.getElementById("vault-pass").value;
    try {
        const r = await fetch(`${VAULT_URL}?u=${u}&p=${p}`).then(res=>res.json());
        if(r.success) {
            localStorage.setItem("bp_user", u);
            localStorage.setItem("bp_conf_url", r.config.cfgUrl);
            localStorage.setItem("bp_conf_id", r.config.cfgId);
            localStorage.setItem("bp_conf_pw", r.config.cfgPw);
            restoreUser();
            document.getElementById("login-modal").style.display = "none";
        } else alert(r.message);
    } catch(e) { alert("Error"); }
}

async function saveData() {
    if(!confirm("Overwrite Cloud Save?")) return;
    await performSync("SAVE");
}

async function loadData() {
    if(!confirm("Load from Cloud? (Unsaved changes lost)")) return;
    await performSync("LOAD");
}

async function performSync(action) {
    const url = localStorage.getItem("bp_conf_url");
    const id = localStorage.getItem("bp_conf_id");
    const pw = localStorage.getItem("bp_conf_pw"); // Corresponds to cfgPw ("Lady123")
    
    if(!url) return alert("Please Login first.");

    // Update Button Text
    const btn = document.querySelector(`.btn-sync.${action.toLowerCase()}`);
    if(btn) btn.innerText = "...";

    // MATCHING SNIPETDB LOGIC:
    // We send 'id' and 'pw' in the URL.
    // timestamp 't' prevents caching.
    const finalUrl = `${url}?id=${id}&pw=${encodeURIComponent(pw)}&t=${Date.now()}`;

    try {
        if(action === "SAVE") {
            // HTTP POST = SAVE
            const response = await fetch(finalUrl, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(planData) 
            });
            
            // The worker script returns JSON
            const result = await response.json();
            
            if(result.error) throw new Error(result.error);
            alert("✅ Saved Successfully!");

        } else {
            // HTTP GET = LOAD
            const response = await fetch(finalUrl);
            const result = await response.json();
            
            if(result.error) throw new Error(result.error);
            
            // Check if we got valid data back
            if(result.entries) {
                planData = result;
                document.getElementById("inp-start-balance").value = planData.startBalance || 0;
                renderSetupList();
                runSimulation();
                alert("✅ Loaded Successfully!");
            } else {
                // If file is empty (first time)
                alert("File loaded, but it is empty.");
            }
        }
    } catch(e) { 
        console.error(e);
        alert("Sync Failed: " + e.message); 
    } finally {
        if(btn) btn.innerText = action === "SAVE" ? "Save" : "Load";
    }
}