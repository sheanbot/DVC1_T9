/**
 * Swinburne COS30045 Data Visualisation Project
 * Core Graphics Engine: D3.js Implementation 
 */

function renderDashboardCharts(data) {
    generateLineChart(data);
    generateViolationsChart(data);
    generateOutcomesChart(data);
}

/**
 * 1. Offence Violation Breakdown (Click-to-Pin Legend Interaction)
 */
function generateViolationsChart(data) {
    const containerId = "#chartViolations";
    d3.select(containerId).selectAll("*").remove();

    // 1. Calculate fines and the Grand Total
    const summary = {};
    let totalFines = 0; 
    
    data.forEach(item => {
        const key = item.metric.replace(/_/g, ' ');
        if (key && key !== 'Unknown') {
            summary[key] = (summary[key] || 0) + item.fines;
            totalFines += item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({
        label: key,
        value: summary[key]
    }));

    if (chartData.length === 0) return;
    chartData.sort((a, b) => b.value - a.value);

    const width = 450;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(containerId)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeTableau10);
    const pie = d3.pie().value(d => d.value).sort(null);
    
    const arc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const arcData = pie(chartData);

    // 2. Build Center Text
    const centerTitle = svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.8em")
        .style("font-size", "11px")
        .style("fill", "#64748b")
        .style("font-weight", "600")
        .style("text-transform", "uppercase")
        .text(""); 

    const centerValue = svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.5em")
        .style("font-size", "22px")
        .style("fill", "#0f172a")
        .style("font-weight", "bold")
        .text(""); 

    const centerPct = svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "2.2em")
        .style("font-size", "12px")
        .style("fill", "#2563eb")
        .style("font-weight", "700")
        .text("");

    function updateCenterText(label, value) {
        centerTitle.text(label.length > 20 ? label.substring(0, 18) + "..." : label);
        centerValue.text(value.toLocaleString());
        const pct = ((value / totalFines) * 100).toFixed(1);
        centerPct.text(`${pct}% of Total`);
    }

    function clearCenterText() {
        centerTitle.text(""); 
        centerValue.text("");
        centerPct.text(""); 
    }

    // 3. Draw the Donut Slices
    const slices = svg.selectAll("path")
        .data(arcData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.label))
        .attr("stroke", "#ffffff")
        .style("stroke-width", "1px")
        .style("transition", "opacity 0.2s, stroke-width 0.2s");

    // ==========================================
    // THE NEW INTERACTION ENGINE
    // ==========================================
    
    let pinnedLabel = null; // Memory variable to track what is currently locked

    // Helper: Turns on the highlight effect
    function highlightSlice(dLabel, dValue, elementContext) {
        legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
        d3.select(elementContext).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        
        slices.attr("opacity", 0.15); 
        const targetSlice = slices.filter(sliceData => sliceData.data.label === dLabel);
        targetSlice.each(function() { this.parentNode.appendChild(this); });
        targetSlice.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(dLabel)).style("stroke-width", "4px"); 
        
        updateCenterText(dLabel, dValue); 
    }

    // Helper: Turns off all effects
    function resetAll() {
        legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
        slices.attr("opacity", 1).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px");
        clearCenterText(); 
    }

    // 4. Build the Interactive Legend
    const legend = d3.select(containerId).select("svg")
        .append("g")
        .attr("transform", `translate(${width - 150}, 30)`);

    const legendRows = legend.selectAll(".legend-row")
        .data(chartData)
        .enter()
        .append("g")
        .attr("class", "legend-row")
        .attr("transform", (d, i) => `translate(0, ${i * 24})`)
        .style("cursor", "pointer")
        
        // --- HOVER PREVIEW ---
        .on("mouseover", function(event, d) {
            // If the user has locked an item, completely ignore hovering
            if (pinnedLabel !== null) return; 
            highlightSlice(d.label, d.value, this);
        })
        
        // --- HOVER END ---
        .on("mouseout", function(event, d) {
            // If the user has locked an item, do NOT clear the data when mouse leaves
            if (pinnedLabel !== null) return; 
            resetAll();
        })

        // --- CLICK TO LOCK / UNLOCK ---
        .on("click", function(event, d) {
            if (pinnedLabel === d.label) {
                // If they click the exact item that is already locked: UNLOCK IT
                pinnedLabel = null; 
                // Note: We don't call resetAll() here because their mouse is still hovering over it!
                // When they move their mouse away, the 'mouseout' rule above will naturally clear it.
            } else {
                // If they click a new item: LOCK IT
                pinnedLabel = d.label;
                highlightSlice(d.label, d.value, this);
            }
        });

    legendRows.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 3)
        .attr("fill", d => color(d.label));

    legendRows.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .style("font-size", "10px")
        .style("fill", "#334155")
        .style("font-weight", "500")
        .text(d => d.label.length > 18 ? d.label.substring(0, 16) + "..." : d.label);
}


/**
 * 2. Total Fines by Jurisdiction (D3 Horizontal Bar Chart)
 */
function generateOutcomesChart(data) {
    const containerId = "#chartOutcomes";
    d3.select(containerId).selectAll("*").remove();

    // 1. Calculate Sum of Fines for each Jurisdiction
    const summary = {};
    data.forEach(item => {
        const key = item.jurisdiction;
        if (key && key !== 'Unknown') {
            summary[key] = (summary[key] || 0) + item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({
        jurisdiction: key,
        fines: summary[key]
    }));

    if (chartData.length === 0) return;

    // 2. Sort the bars from highest fines to lowest
    chartData.sort((a, b) => b.fines - a.fines);

    const width = 450;
    const height = 300;
    // Increased left margin significantly to fit jurisdiction names
    const margin = { top: 20, right: 30, bottom: 40, left: 120 }; 

    const svg = d3.select(containerId)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // X Scale (Linear: Total Fines)
    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.fines) || 100])
        .nice()
        .range([0, innerWidth]);

    // Y Scale (Band: Jurisdictions)
    const y = d3.scaleBand()
        .domain(chartData.map(d => d.jurisdiction))
        .range([0, innerHeight])
        .padding(0.25);

    // Color Palette (Assigns a unique color to each Jurisdiction)
    const colorScale = d3.scaleOrdinal(d3.schemeSet2);

    // Create Tooltip Element in the DOM
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    }

    // 3. Draw the interactive bars
    svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.jurisdiction))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.fines))
        .attr("fill", d => colorScale(d.jurisdiction))
        .attr("rx", 3) // Slightly rounded corners for modern look
        .style("cursor", "pointer")
        
        // --- HOVER INTERACTIONS ---
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.7); // Dim slightly on hover
            tooltip.style("visibility", "visible")
                   .html(`<strong>${d.jurisdiction}</strong><br/>Fines: ${d.fines.toLocaleString()}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                   .style("left", (event.pageX + 20) + "px"); // Follow cursor
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1); // Restore color
            tooltip.style("visibility", "hidden");
        });

    // Draw Y Axis (Jurisdiction Names)
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("fill", "#334155");

    // Draw X Axis (Number of Fines)
    svg.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("~s")))
        .style("font-size", "10px")
        .style("fill", "#64748b");
}

/**
 * 3. Annual Fines Trend Line Chart (All Data + Custom Axis Ticks)
 */
function generateLineChart(data) {
    const containerId = "#chartLine";
    d3.select(containerId).selectAll("*").remove();

    // 1. Calculate fines for EVERY year in the dataset
    const summary = {};
    data.forEach(item => {
        const key = String(item.year).trim();
        if (key && key !== 'Unknown') {
            summary[key] = (summary[key] || 0) + item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({
        year: key,
        value: summary[key]
    }));

    if (chartData.length === 0) return;

    // Arrange all years chronologically
    chartData.sort((a, b) => d3.ascending(a.year, b.year));

    const width = 850;
    const height = 280;
    const margin = { top: 30, right: 40, bottom: 40, left: 75 };

    const svg = d3.select(containerId)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Map EVERY year to the X axis
    const x = d3.scalePoint()
        .domain(chartData.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.15); 

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value) || 100])
        .nice()
        .range([innerHeight, 0]);

    const lineGenerator = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 3)
        .attr("d", lineGenerator);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    }

    // Draw interactive dots for EVERY year
    svg.selectAll(".dot")
        .data(chartData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 5)
        .attr("fill", "#ffffff")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .style("transition", "all 0.2s ease")
        .on("mouseover", function(event, d) {
            d3.select(this)
              .attr("r", 7)
              .attr("fill", "#2563eb"); 
              
            tooltip.style("visibility", "visible")
                   .html(`<strong>Year: ${d.year}</strong><br/>Fines: ${d.value.toLocaleString()}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 15) + "px")
                   .style("left", (event.pageX + 15) + "px"); 
        })
        .on("mouseout", function() {
            d3.select(this)
              .attr("r", 5)
              .attr("fill", "#ffffff"); 
              
            tooltip.style("visibility", "hidden");
        });

    // 2. THE FIX: Define exactly which labels to show on the bottom axis
    const specificYears = ['2008', '2012', '2016', '2020', '2024'];

    svg.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x).tickValues(specificYears)) // Forces D3 to only draw these 5 labels
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#334155");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")))
        .style("font-size", "11px");
}
