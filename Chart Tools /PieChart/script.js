
// --- DOM Element References ---
const dataInput = document.getElementById('data-input');
const labelCategoryCheckbox = document.getElementById('label-category');
const labelValueCheckbox = document.getElementById('label-value');
const labelPercentageCheckbox = document.getElementById('label-percentage');
const innerRadiusSlider = document.getElementById('inner-radius');
const breakoutThresholdSlider = document.getElementById('breakout-threshold');
const colorPickerContainer = document.getElementById('color-picker-container');
const updateButton = document.getElementById('update-button');
const tooltip = d3.select("#tooltip");

// --- Chart Configuration ---
const defaultColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
const width = 650;
const height = 500;
const pieCenterX = (width / 2) - 100;
const pieCenterY = height / 2;
const radius = Math.min(height, 400) / 2 - 20;

// --- SVG Setup ---
const svg = d3.select("#pie-chart")
  .append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", `translate(${pieCenterX}, ${pieCenterY})`);

let explodedSlice = null;
let breakoutPosition = { x: null, y: null }; // Stores the position of the draggable bar chart

// --- Data Parsing and Setup ---
function parseData() {
    return d3.csvParseRows(dataInput.value, (d, i) => ({
        category: d[0],
        value: +d[1],
        id: i
    })).filter(d => d.category && !isNaN(d.value) && d.value > 0);
}

function setupColorPickers(data) {
    colorPickerContainer.innerHTML = '';
    data.forEach((d, i) => {
        const group = document.createElement('div');
        group.className = 'color-picker-group';
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = `color-picker-${d.id}`;
        colorInput.value = defaultColors[i % defaultColors.length];
        const label = document.createElement('label');
        label.htmlFor = colorInput.id;
        label.textContent = d.category;
        group.appendChild(colorInput);
        group.appendChild(label);
        colorPickerContainer.appendChild(group);
    });
}

// --- Main Drawing Function ---
function drawChart() {
    svg.selectAll("*").remove();
    const allData = parseData();

    if (allData.length === 0) {
        svg.append("text").attr("text-anchor", "middle").text("Keine gültigen Daten.");
        return;
    }

    const totalValue = d3.sum(allData, d => d.value);
    const threshold = +breakoutThresholdSlider.value;
    const customColors = allData.map(d => document.getElementById(`color-picker-${d.id}`).value);
    const color = d3.scaleOrdinal().domain(allData.map(d => d.category)).range(customColors);

    const mainData = allData.filter(d => (d.value / totalValue * 100) >= threshold);
    const breakoutData = allData.filter(d => (d.value / totalValue * 100) < threshold);
    
    let pieChartData = [...mainData];
    const pie = d3.pie().value(d => d.value).sort(null);

    if (breakoutData.length > 0) {
        const otherValue = d3.sum(breakoutData, d => d.value);
        const otherSliceData = { category: 'Sonstige', value: otherValue, id: 'other' };
        const totalPieValue = d3.sum(mainData, d => d.value) + otherValue;
        const otherAngle = (otherValue / totalPieValue) * 2 * Math.PI;
        
        pie.startAngle(-otherAngle / 2).endAngle(2 * Math.PI - otherAngle / 2);
        pieChartData.unshift(otherSliceData);
    } else {
        // Reset breakout position if it's no longer needed
        breakoutPosition = { x: null, y: null };
    }

    const pieData = pie(pieChartData);
    
    drawPieSlices(pieData, totalValue, color);
    drawPieLabels(pieData, totalValue);
    
    if (breakoutData.length > 0) {
        const otherSlice = pieData.find(d => d.data.id === 'other');
        drawBreakoutBars(breakoutData, otherSlice, totalValue, color);
    }
    
    drawLegend(allData, color);
    drawDataTable(allData, totalValue);
}

function drawPieSlices(pieData, totalValue, color) {
    const innerRadius = +innerRadiusSlider.value;
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
    const explodedArc = d3.arc().innerRadius(innerRadius).outerRadius(radius + 20);

    svg.selectAll(".arc")
      .data(pieData)
      .enter()
      .append("g").attr("class", "arc")
      .append("path")
        .attr("d", d => explodedSlice === d.data.id ? explodedArc(d) : arc(d))
        .attr("fill", d => d.data.id === 'other' ? '#cccccc' : color(d.data.category))
        .on("mouseover", (event, d) => tooltip.style("opacity", 1))
        .on("mousemove", (event, d) => {
            const percentage = ((d.data.value / totalValue) * 100).toFixed(2);
            tooltip.html(`<strong>${d.data.category}</strong><br>Wert: ${d.data.value}<br>Anteil: ${percentage}%`)
                   .style("left", `${event.pageX + 15}px`).style("top", `${event.pageY - 28}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0))
        .on("click", (event, d) => {
            explodedSlice = explodedSlice === d.data.id ? null : d.data.id;
            svg.selectAll(".arc path").transition().duration(300)
               .attr("d", p => explodedSlice === p.data.id ? explodedArc(p) : arc(p));
        });
}

function drawPieLabels(pieData, totalValue) {
    const innerRadius = +innerRadiusSlider.value;
    const labelArc = d3.arc()
        .outerRadius(innerRadius + (radius - innerRadius) * 0.6)
        .innerRadius(innerRadius + (radius - innerRadius) * 0.6);

    const text = svg.selectAll(".arc-label").data(pieData).enter()
        .append("text").attr("class", "arc-label")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`);

    appendMultiLineText(text, d => d.data, totalValue);
}

function drawBreakoutBars(breakoutData, otherSlice, totalValue, color) {
    const barHeight = 22, barPadding = 5;
    const breakoutHeight = breakoutData.length * (barHeight + barPadding);
    
    // Initialize position if not already set by dragging
    if (breakoutPosition.x === null) {
        breakoutPosition.x = radius + 80;
        breakoutPosition.y = -breakoutHeight / 2;
    }

    const g = svg.append("g")
        .attr("class", "breakout-container")
        .attr("transform", `translate(${breakoutPosition.x}, ${breakoutPosition.y})`)
        .style("cursor", "move");

    const barScale = d3.scaleLinear()
        .domain([0, d3.max(breakoutData, d => d.value)])
        .range([0, 120]);

    g.selectAll(".breakout-bar").data(breakoutData).enter()
      .append("rect").attr("class", "breakout-bar")
      .attr("y", (d, i) => i * (barHeight + barPadding))
      .attr("width", d => barScale(d.value)).attr("height", barHeight)
      .attr("fill", d => color(d.category));

    g.selectAll(".breakout-label").data(breakoutData).enter()
      .append("text").attr("class", "breakout-label")
      .attr("x", d => barScale(d.value) + 5)
      .attr("y", (d, i) => i * (barHeight + barPadding) + barHeight / 2)
      .attr("dy", "0.35em")
      .text(d => `${d.category} (${(d.value / totalValue * 100).toFixed(1)}%)`);

    // Draw the single connector line
    drawConnectorLine(otherSlice, breakoutPosition, breakoutHeight);
    
    // --- Define Drag Behavior ---
    const dragHandler = d3.drag()
        .on("start", function() { d3.select(this).raise(); })
        .on("drag", function(event) {
            breakoutPosition.x += event.dx;
            breakoutPosition.y += event.dy;
            d3.select(this).attr("transform", `translate(${breakoutPosition.x}, ${breakoutPosition.y})`);
            drawConnectorLine(otherSlice, breakoutPosition, breakoutHeight);
        });

    g.call(dragHandler);
}

function drawConnectorLine(otherSlice, position, height) {
    svg.select(".connector-line").remove();

    const outerArc = d3.arc().innerRadius(radius).outerRadius(radius);
    const startPoint = outerArc.centroid(otherSlice);
    const endPoint = [position.x, position.y + height / 2];

    const path = d3.path();
    path.moveTo(startPoint[0], startPoint[1]);
    const midX = startPoint[0] + (endPoint[0] - startPoint[0]) / 2;
    path.quadraticCurveTo(midX, startPoint[1], endPoint[0], endPoint[1]);
    
    svg.insert("path", ".breakout-container")
       .attr("class", "connector-line")
       .attr("d", path.toString());
}


// --- Helper Functions ---
function appendMultiLineText(textElement, dataAccessor, totalValue) {
    const selectedLabels = [
        { key: 'category', checked: labelCategoryCheckbox.checked },
        { key: 'value', checked: labelValueCheckbox.checked },
        { key: 'percentage', checked: labelPercentageCheckbox.checked }
    ].filter(l => l.checked);

    textElement.each(function(d) {
        const element = d3.select(this);
        const data = dataAccessor(d);
        selectedLabels.forEach((label, i) => {
            let labelText = '';
            switch(label.key) {
                case 'value':      labelText = data.value; break;
                case 'percentage': labelText = `${((data.value / totalValue) * 100).toFixed(1)}%`; break;
                case 'category':   labelText = data.category; break;
            }
            element.append('tspan').attr('x', 0).attr('dy', i === 0 ? '0' : '1.2em').text(labelText);
        });
    });
}

function drawLegend(data, colorScale) {
    const legendContainer = d3.select("#legend");
    legendContainer.html("");
    const legendItems = legendContainer.selectAll(".legend-item").data(data).enter().append("div").attr("class", "legend-item");
    legendItems.append("div").attr("class", "legend-color").style("background-color", d => colorScale(d.category));
    legendItems.append("span").text(d => d.category);
}

function drawDataTable(data, total) {
    const tableContainer = d3.select("#data-table");
    tableContainer.html("");
    const table = tableContainer.append("table").attr("class", "data-table");
    thead = table.append("thead"), tbody = table.append("tbody");
    thead.append("tr").selectAll("th").data(["Kategorie", "Wert", "Anteil (%)"]).enter().append("th").text(d => d);
    const rows = tbody.selectAll("tr").data(data).enter().append("tr");
    rows.append("td").text(d => d.category);
    rows.append("td").text(d => d.value);
    rows.append("td").text(d => ((d.value / total) * 100).toFixed(2));
}

// --- Initializer and Event Listeners ---
function initialize() {
    const initialData = parseData();
    setupColorPickers(initialData);
    drawChart();
}

updateButton.addEventListener('click', () => {
    const newData = parseData();
    if (newData.length !== colorPickerContainer.children.length) {
        setupColor-pickers(newData);
    }
    // Reset breakout position on full update for predictability
    breakoutPosition = { x: null, y: null };
    drawChart();
});

document.querySelectorAll('.controls input, .controls select').forEach(el => {
    if (el.id !== 'update-button') {
        el.addEventListener('input', drawChart);
    }
});

initialize();