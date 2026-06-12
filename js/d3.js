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
        .style("fill", "#000000")
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


// ======================================================================
// SEATBELT ANALYSIS PAGE ENGINE
// ======================================================================

function renderSeatbeltCharts(data) {
    // 1. STRICT FILTER: Isolate ONLY the seatbelt data
    const seatbeltData = data.filter(item => {
        const metricName = item.metric ? item.metric.toLowerCase() : "";
        return metricName.includes('seatbelt'); // Checks for the word "seatbelt"
    });

    // --- NEW: Calculate and Update all 3 KPIs on the left sidebar ---
    const totalSbFines = d3.sum(seatbeltData, d => d.fines);
    const totalSbArrests = d3.sum(seatbeltData, d => d.arrests);
    const totalSbCharges = d3.sum(seatbeltData, d => d.charges);

    d3.select("#kpi-sb-fines").text(totalSbFines.toLocaleString());
    d3.select("#kpi-sb-arrests").text(totalSbArrests.toLocaleString());
    d3.select("#kpi-sb-charges").text(totalSbCharges.toLocaleString());

    // 2. Render the three specific charts
    generateSbAgeDonut(seatbeltData);
    generateSbJurisdictionBar(seatbeltData);
    generateSbLineChart(seatbeltData);
}

// --- Chart A: Age Group Donut (with Click-to-Pin & Chronological Sort) ---
function generateSbAgeDonut(data) {
    const containerId = "#chartSbAge";
    d3.select(containerId).selectAll("*").remove();

    const summary = {};
    let totalFines = 0; 
    
    data.forEach(item => {
        const key = item.ageGroup && item.ageGroup !== 'Unknown' ? item.ageGroup : 'Not Recorded';
        
        if (item.fines > 0) {
            summary[key] = (summary[key] || 0) + item.fines;
            totalFines += item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({ label: key, value: summary[key] }));
    if (chartData.length === 0) return;

    // THE FIX: Override default sorting to force chronological age order
    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    chartData.sort((a, b) => {
        let indexA = ageOrder.indexOf(a.label);
        let indexB = ageOrder.indexOf(b.label);
        if (indexA === -1) indexA = 999; 
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    const width = 450, height = 300;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%").attr("height", "100%").append("g")
        .attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeSet3); 
    const pie = d3.pie().value(d => d.value).sort(null); // sort(null) forces D3 to respect our custom order
    const arc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);
    const arcData = pie(chartData);

    const centerTitle = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600").text(""); 
    const centerValue = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold").text(""); 
    const centerPct = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700").text("");

    function updateCenterText(label, value) {
        centerTitle.text(`Age: ${label}`);
        centerValue.text(value.toLocaleString());
        centerPct.text(`${((value / totalFines) * 100).toFixed(1)}%`);
    }
    function clearCenterText() { centerTitle.text(""); centerValue.text(""); centerPct.text(""); }

    const slices = svg.selectAll("path").data(arcData).enter().append("path").attr("d", arc)
        .attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px").style("transition", "opacity 0.2s");

    let pinnedLabel = null; 
    const legend = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 30)`);
    const legendRows = legend.selectAll(".legend-row").data(chartData).enter().append("g")
        .attr("class", "legend-row").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            if (pinnedLabel !== null) return; 
            legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
            d3.select(this).select("text").style("font-weight", "bold").style("fill", "#0f172a");
            slices.attr("opacity", 0.15); 
            const targetSlice = slices.filter(sd => sd.data.label === d.label);
            targetSlice.each(function() { this.parentNode.appendChild(this); });
            targetSlice.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(d.label)).style("stroke-width", "4px"); 
            updateCenterText(d.label, d.value); 
        })
        .on("mouseout", function(event, d) {
            if (pinnedLabel !== null) return; 
            legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
            slices.attr("opacity", 1).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px");
            clearCenterText(); 
        })
        .on("click", function(event, d) {
            pinnedLabel = pinnedLabel === d.label ? null : d.label;
        });

    legendRows.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    legendRows.append("text").attr("x", 20).attr("y", 10).style("font-size", "10px").style("fill", "#334155").text(d => d.label);
}

// --- Chart B: Jurisdiction Bar Chart ---
function generateSbJurisdictionBar(data) {
    const containerId = "#chartSbJurisdiction";
    d3.select(containerId).selectAll("*").remove();

    const summary = {};
    data.forEach(item => {
        const key = item.jurisdiction;
        if (key && key !== 'Unknown') summary[key] = (summary[key] || 0) + item.fines;
    });

    let chartData = Object.keys(summary).map(key => ({ jurisdiction: key, fines: summary[key] }));
    if (chartData.length === 0) return;
    chartData.sort((a, b) => b.fines - a.fines);

    const width = 450, height = 300, margin = { top: 20, right: 40, bottom: 40, left: 120 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`).append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, d3.max(chartData, d => d.fines) || 100]).nice().range([0, innerWidth]);
    const y = d3.scaleBand().domain(chartData.map(d => d.jurisdiction)).range([0, innerHeight]).padding(0.35);
    const colorScale = d3.scaleOrdinal(d3.schemeSet2);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll(".bar").data(chartData).enter().append("rect").attr("class", "bar")
        .attr("y", d => y(d.jurisdiction)).attr("x", 0).attr("height", y.bandwidth()).attr("width", d => x(d.fines))
        .attr("fill", d => colorScale(d.jurisdiction)).attr("rx", 3).style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.7); 
            tooltip.style("visibility", "visible").html(`<strong>${d.jurisdiction}</strong><br/>Fines: ${d.fines.toLocaleString()}`);
        })
        .on("mousemove", event => tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"))
        .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });

    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "11px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "10px").style("fill", "#64748b");
}

// --- Chart C: Annual Line Chart (Timeline Pre-fill & Trim Fix) ---
function generateSbLineChart(data) {
    const containerId = "#chartSbLine";
    d3.select(containerId).selectAll("*").remove();

    const summary = {};

    // THE FIX 1: Pre-fill a continuous timeline from 2008 to 2024 with zeros.
    // This guarantees the X-Axis never breaks, even if a year is entirely missing.
    for (let year = 2008; year <= 2024; year++) {
        summary[String(year)] = 0;
    }

    // THE FIX 2: Added .trim() to clean invisible spaces from the CSV data
    data.forEach(item => {
        const key = String(item.year).trim();
        if (key && key !== 'Unknown' && summary.hasOwnProperty(key)) {
            summary[key] += item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({ year: key, value: summary[key] }));
    if (chartData.length === 0) return;
    
    // Arrange years chronologically
    chartData.sort((a, b) => d3.ascending(a.year, b.year));

    const width = 850, height = 280, margin = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`).append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scalePoint().domain(chartData.map(d => d.year)).range([0, innerWidth]).padding(0.15); 
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value) || 100]).nice().range([innerHeight, 0]);
    const lineGen = d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX);

    // Draw the red trend line
    svg.append("path").datum(chartData).attr("fill", "none").attr("stroke", "#ef4444").attr("stroke-width", 3).attr("d", lineGen);

    // Ensure tooltip exists
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    // Draw interactive dots
    svg.selectAll(".dot").data(chartData).enter().append("circle").attr("class", "dot")
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.value)).attr("r", 5).attr("fill", "#ffffff").attr("stroke", "#ef4444").attr("stroke-width", 2).style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 7).attr("fill", "#ef4444"); 
            tooltip.style("visibility", "visible").html(`<strong>Year: ${d.year}</strong><br/>Fines: ${d.value.toLocaleString()}`);
        })
        .on("mousemove", event => tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"))
        .on("mouseout", function() { d3.select(this).attr("r", 5).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });

    // Draw perfectly spaced X-Axis specific ticks
    const specificYears = ['2008', '2012', '2016', '2020', '2024'];
    svg.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x).tickValues(specificYears)).style("font-size", "12px").style("fill", "#334155");
    svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))).style("font-size", "11px");
}


// ======================================================================
// UNLICENSED DRIVING PAGE ENGINE
// ======================================================================

function renderUnlicensedCharts(data) {
    const isolatedData = data.filter(item => {
        const name = item.metric ? item.metric.toLowerCase() : "";
        return name.includes('unlicensed');
    });

    d3.select("#kpi-un-fines").text(d3.sum(isolatedData, d => d.fines).toLocaleString());
    d3.select("#kpi-un-arrests").text(d3.sum(isolatedData, d => d.arrests).toLocaleString());
    d3.select("#kpi-un-charges").text(d3.sum(isolatedData, d => d.charges).toLocaleString());

    generateUnAgeDonut(isolatedData);
    generateUnJurisdictionBar(isolatedData);
    generateUnLineChart(isolatedData);
}

// Custom Purple Palette
// Premium LearnUI-Style Teal/Cyan Palette
const unColorArray = ["#004c6d", "#006989", "#0087a3", "#00a6bb", "#00c6d0", "#00e7e2", "#00ffff"];

function generateUnAgeDonut(data) {
    const containerId = "#chartUnAge";
    d3.select(containerId).selectAll("*").remove();

    const summary = {};
    let totalFines = 0; 
    data.forEach(item => {
        const key = item.ageGroup && item.ageGroup !== 'Unknown' ? item.ageGroup : 'Not Recorded';
        if (item.fines > 0) {
            summary[key] = (summary[key] || 0) + item.fines;
            totalFines += item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({ label: key, value: summary[key] }));
    if (chartData.length === 0) return;

    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    chartData.sort((a, b) => {
        let indexA = ageOrder.indexOf(a.label);
        let indexB = ageOrder.indexOf(b.label);
        if (indexA === -1) indexA = 999; 
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    const width = 450, height = 300, radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`)
        .append("g").attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);

    const color = d3.scaleOrdinal().range(unColorArray); 
    const pie = d3.pie().value(d => d.value).sort(null); 
    const arc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").text(""); 
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold").text(""); 
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700").text("");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / totalFines) * 100).toFixed(1)}%`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(chartData)).enter().append("path").attr("d", arc)
        .attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px");

    let pinned = null;
    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 30)`);
    const lR = leg.selectAll("g").data(chartData).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) {
            if (pinned) return;
            slices.attr("opacity", 0.15);
            const ts = slices.filter(sd => sd.data.label === d.label);
            ts.each(function() { this.parentNode.appendChild(this); });
            ts.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(d.label)).style("stroke-width", "4px");
            up(d.label, d.value);
        })
        .on("mouseout", function() { if (!pinned) { slices.attr("opacity", 1).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px"); cl(); } })
        .on("click", (e, d) => pinned = pinned === d.label ? null : d.label);

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "10px").style("fill", "#334155").text(d => d.label);
}

function generateUnJurisdictionBar(data) {
    const containerId = "#chartUnJurisdiction";
    d3.select(containerId).selectAll("*").remove();

    const sum = {};
    data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f);

    const w = 450, h = 300, m = { top: 20, right: 40, bottom: 40, left: 120 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);

    const colorScale = d3.scaleOrdinal().range(unColorArray);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", d => x(d.f))
        .attr("fill", d => colorScale(d.j)) // Fixed dynamic bar color
        .attr("rx", 3).style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.7);
            tooltip.style("visibility", "visible").html(`<strong>${d.j}</strong><br/>Fines: ${d.f.toLocaleString()}`);
        })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"); })
        .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });

    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "11px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "10px").style("fill", "#64748b");
}

function generateUnLineChart(data) {
    const containerId = "#chartUnLine";
    d3.select(containerId).selectAll("*").remove();

    const sum = {};
    for (let year = 2008; year <= 2024; year++) { sum[String(year)] = 0; }
    data.forEach(d => { 
        const key = String(d.year).trim(); 
        if(key && key !== 'Unknown' && sum.hasOwnProperty(key)) { sum[key] += d.fines; } 
    });
    let cD = Object.keys(sum).map(k => ({ y: k, v: sum[k] })).sort((a,b) => d3.ascending(a.y, b.y));

    const w = 850, h = 280, m = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scalePoint().domain(cD.map(d => d.y)).range([0, w - m.left - m.right]).padding(0.15); 
    const y = d3.scaleLinear().domain([0, d3.max(cD, d => d.v) || 100]).range([h - m.top - m.bottom, 0]);
    
    svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#9333ea").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("r", 4).attr("fill", "#ffffff").attr("stroke", "#9333ea").attr("stroke-width", 2).style("cursor", "pointer")
        .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#9333ea"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.y}</strong><br/>Fines: ${d.v.toLocaleString()}`); })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
        .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });

    const ticks = ['2008', '2012', '2016', '2020', '2024'];
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(ticks)).style("font-size", "12px").style("fill", "#334155");
    svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))).style("font-size", "11px");
}

// ======================================================================
// MOBILE PHONE USE PAGE ENGINE
// ======================================================================

function renderMobileCharts(data) {
    const isolatedData = data.filter(item => {
        const name = item.metric ? item.metric.toLowerCase() : "";
        return name.includes('mobile');
    });

    d3.select("#kpi-mp-fines").text(d3.sum(isolatedData, d => d.fines).toLocaleString());
    d3.select("#kpi-mp-arrests").text(d3.sum(isolatedData, d => d.arrests).toLocaleString());
    d3.select("#kpi-mp-charges").text(d3.sum(isolatedData, d => d.charges).toLocaleString());

    generateMpAgeDonut(isolatedData);
    generateMpJurisdictionBar(isolatedData);
    generateMpLineChart(isolatedData);
}


// Premium LearnUI-Style Warm Sunset Palette
const mpColorArray = ["#7a0010", "#9e0018", "#c4001c", "#ea0d1e", "#ff4b38", "#ff7656", "#ffa67c"];

function generateMpAgeDonut(data) {
    const containerId = "#chartMpAge";
    d3.select(containerId).selectAll("*").remove();

    const summary = {};
    let totalFines = 0; 
    data.forEach(item => {
        const key = item.ageGroup && item.ageGroup !== 'Unknown' ? item.ageGroup : 'Not Recorded';
        if (item.fines > 0) {
            summary[key] = (summary[key] || 0) + item.fines;
            totalFines += item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({ label: key, value: summary[key] }));
    if (chartData.length === 0) return;

    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    chartData.sort((a, b) => {
        let indexA = ageOrder.indexOf(a.label);
        let indexB = ageOrder.indexOf(b.label);
        if (indexA === -1) indexA = 999; 
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    const width = 450, height = 300, radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`)
        .append("g").attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);

    const color = d3.scaleOrdinal().range(mpColorArray); 
    const pie = d3.pie().value(d => d.value).sort(null); 
    const arc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").text(""); 
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold").text(""); 
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700").text("");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / totalFines) * 100).toFixed(1)}%`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(chartData)).enter().append("path").attr("d", arc)
        .attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px");

    let pinned = null;
    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 30)`);
    const lR = leg.selectAll("g").data(chartData).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) {
            if (pinned) return;
            slices.attr("opacity", 0.15);
            const ts = slices.filter(sd => sd.data.label === d.label);
            ts.each(function() { this.parentNode.appendChild(this); });
            ts.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(d.label)).style("stroke-width", "4px");
            up(d.label, d.value);
        })
        .on("mouseout", function() { if (!pinned) { slices.attr("opacity", 1).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px"); cl(); } })
        .on("click", (e, d) => pinned = pinned === d.label ? null : d.label);

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "10px").style("fill", "#334155").text(d => d.label);
}

function generateMpJurisdictionBar(data) {
    const containerId = "#chartMpJurisdiction";
    d3.select(containerId).selectAll("*").remove();

    const sum = {};
    data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f);

    const w = 450, h = 300, m = { top: 20, right: 40, bottom: 40, left: 120 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);

    const colorScale = d3.scaleOrdinal().range(mpColorArray);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", d => x(d.f))
        .attr("fill", d => colorScale(d.j)) // Fixed dynamic bar color
        .attr("rx", 3).style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.7);
            tooltip.style("visibility", "visible").html(`<strong>${d.j}</strong><br/>Fines: ${d.f.toLocaleString()}`);
        })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"); })
        .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });

    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "11px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "10px").style("fill", "#64748b");
}

function generateMpLineChart(data) {
    const containerId = "#chartMpLine";
    d3.select(containerId).selectAll("*").remove();

    const sum = {};
    for (let year = 2008; year <= 2024; year++) { sum[String(year)] = 0; }
    data.forEach(d => { 
        const key = String(d.year).trim(); 
        if(key && key !== 'Unknown' && sum.hasOwnProperty(key)) { sum[key] += d.fines; } 
    });
    let cD = Object.keys(sum).map(k => ({ y: k, v: sum[k] })).sort((a,b) => d3.ascending(a.y, b.y));

    const w = 850, h = 280, m = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scalePoint().domain(cD.map(d => d.y)).range([0, w - m.left - m.right]).padding(0.15); 
    const y = d3.scaleLinear().domain([0, d3.max(cD, d => d.v) || 100]).range([h - m.top - m.bottom, 0]);
    
    svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#e11d48").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("r", 4).attr("fill", "#ffffff").attr("stroke", "#e11d48").attr("stroke-width", 2).style("cursor", "pointer")
        .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#e11d48"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.y}</strong><br/>Fines: ${d.v.toLocaleString()}`); })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
        .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });

    const ticks = ['2008', '2012', '2016', '2020', '2024'];
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(ticks)).style("font-size", "12px").style("fill", "#334155");
    svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))).style("font-size", "11px");
}

// ======================================================================
// SPEEDING FINES PAGE ENGINE
// ======================================================================

function renderSpeedCharts(data) {
    const isolatedData = data.filter(item => {
        const name = item.metric ? item.metric.toLowerCase() : "";
        return name.includes('speed'); 
    });

    d3.select("#kpi-sp-fines").text(d3.sum(isolatedData, d => d.fines).toLocaleString());
    d3.select("#kpi-sp-arrests").text(d3.sum(isolatedData, d => d.arrests).toLocaleString());
    d3.select("#kpi-sp-charges").text(d3.sum(isolatedData, d => d.charges).toLocaleString());

    generateSpAgeDonut(isolatedData);
    generateSpJurisdictionBar(isolatedData);
    generateSpLineChart(isolatedData);
}

// Premium LearnUI-Style Deep Blue Palette
const spColorArray = ["#002051", "#00357a", "#004ca5", "#0065d2", "#2b7fff", "#6b9bff", "#a1b8ff"];

function generateSpAgeDonut(data) {
    const containerId = "#chartSpAge";
    d3.select(containerId).selectAll("*").remove();

    const summary = {};
    let totalFines = 0; 
    data.forEach(item => {
        const key = item.ageGroup && item.ageGroup !== 'Unknown' ? item.ageGroup : 'Not Recorded';
        if (item.fines > 0) {
            summary[key] = (summary[key] || 0) + item.fines;
            totalFines += item.fines;
        }
    });

    let chartData = Object.keys(summary).map(key => ({ label: key, value: summary[key] }));
    if (chartData.length === 0) return;

    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    chartData.sort((a, b) => {
        let indexA = ageOrder.indexOf(a.label);
        let indexB = ageOrder.indexOf(b.label);
        if (indexA === -1) indexA = 999; 
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    const width = 450, height = 300, radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`)
        .append("g").attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);

    const color = d3.scaleOrdinal().range(spColorArray); 
    const pie = d3.pie().value(d => d.value).sort(null); 
    const arc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").text(""); 
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold").text(""); 
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700").text("");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / totalFines) * 100).toFixed(1)}%`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(chartData)).enter().append("path").attr("d", arc)
        .attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px");

    let pinned = null;
    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 30)`);
    const lR = leg.selectAll("g").data(chartData).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) {
            if (pinned) return;
            slices.attr("opacity", 0.15);
            const ts = slices.filter(sd => sd.data.label === d.label);
            ts.each(function() { this.parentNode.appendChild(this); });
            ts.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(d.label)).style("stroke-width", "4px");
            up(d.label, d.value);
        })
        .on("mouseout", function() { if (!pinned) { slices.attr("opacity", 1).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px"); cl(); } })
        .on("click", (e, d) => pinned = pinned === d.label ? null : d.label);

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "10px").style("fill", "#334155").text(d => d.label);
}

function generateSpJurisdictionBar(data) {
    const containerId = "#chartSpJurisdiction";
    d3.select(containerId).selectAll("*").remove();

    const sum = {};
    data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f);

    const w = 450, h = 300, m = { top: 20, right: 40, bottom: 40, left: 120 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);

    const colorScale = d3.scaleOrdinal().range(spColorArray);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", d => x(d.f))
        .attr("fill", d => colorScale(d.j)) // Fixed dynamic bar color
        .attr("rx", 3).style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.7);
            tooltip.style("visibility", "visible").html(`<strong>${d.j}</strong><br/>Fines: ${d.f.toLocaleString()}`);
        })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"); })
        .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });

    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "11px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "10px").style("fill", "#64748b");
}

function generateSpLineChart(data) {
    const containerId = "#chartSpLine";
    d3.select(containerId).selectAll("*").remove();

    const sum = {};
    for (let year = 2008; year <= 2024; year++) { sum[String(year)] = 0; }
    data.forEach(d => { 
        const key = String(d.year).trim(); 
        if(key && key !== 'Unknown' && sum.hasOwnProperty(key)) { sum[key] += d.fines; } 
    });
    let cD = Object.keys(sum).map(k => ({ y: k, v: sum[k] })).sort((a,b) => d3.ascending(a.y, b.y));

    const w = 850, h = 280, m = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scalePoint().domain(cD.map(d => d.y)).range([0, w - m.left - m.right]).padding(0.15); 
    const y = d3.scaleLinear().domain([0, d3.max(cD, d => d.v) || 100]).range([h - m.top - m.bottom, 0]);
    
    svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#4338ca").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("r", 4).attr("fill", "#ffffff").attr("stroke", "#4338ca").attr("stroke-width", 2).style("cursor", "pointer")
        .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#4338ca"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.y}</strong><br/>Fines: ${d.v.toLocaleString()}`); })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
        .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });

    const ticks = ['2008', '2012', '2016', '2020', '2024'];
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(ticks)).style("font-size", "12px").style("fill", "#334155");
    svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))).style("font-size", "11px");
}