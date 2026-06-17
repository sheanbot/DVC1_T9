/**
 * Swinburne COS30045 Data Visualisation Project
 * Core Graphics Engine: D3.js Implementation with Angular Tweening Animations
 */

function renderDashboardCharts(data) {
    generateLineChart(data);
    generateViolationsChart(data);
    generateHeatmapChart(data);
    generateOutcomesChart(data);
}

/**
 * 1. Offence Violation Breakdown (Click-to-Pin Legend Interaction)
 */
function generateViolationsChart(data) {
    const containerId = "#chartViolations";
    const container = d3.select(containerId);
    container.selectAll("*").remove();

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

    const svg = container
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

    const centerTitle = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600").style("text-transform", "uppercase"); 
    const centerValue = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold"); 
    const centerPct = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700");

    function updateCenterText(label, value) {
        centerTitle.text(label.length > 20 ? label.substring(0, 18) + "..." : label);
        centerValue.text(value.toLocaleString());
        centerPct.text(`${((value / totalFines) * 100).toFixed(1)}% of Total`);
    }

    function clearCenterText() { centerTitle.text(""); centerValue.text(""); centerPct.text(""); }

    const slices = svg.selectAll("path")
        .data(arcData)
        .enter()
        .append("path")
        .attr("fill", d => color(d.data.label))
        .attr("stroke", "#ffffff")
        .style("stroke-width", "1px")
        .style("transition", "opacity 0.2s, stroke-width 0.2s")
        .each(function(d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; });

    let pinnedLabel = null;

    function highlightSlice(dLabel, dValue, elementContext) {
        legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
        d3.select(elementContext).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        slices.attr("opacity", 0.15); 
        const targetSlice = slices.filter(sliceData => sliceData.data.label === dLabel);
        targetSlice.each(function() { this.parentNode.appendChild(this); });
        targetSlice.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(dLabel)).style("stroke-width", "4px"); 
        updateCenterText(dLabel, dValue); 
    }

    function resetAll() {
        legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
        slices.attr("opacity", 1).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px");
        clearCenterText(); 
    }

    // ENHANCED TRANSITION: Clockwise Radial Angular Roll-out
    slices.transition()
        .duration(1000)
        .ease(d3.easeExpOut)
        .attrTween("d", function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) { return arc(interpolate(t)); };
        })
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { if (pinnedLabel !== null) return; highlightSlice(d.data.label, d.data.value, this); })
                .on("mouseout", function(event, d) { if (pinnedLabel !== null) return; resetAll(); });
        });

    const legend = container.select("svg").append("g").attr("transform", `translate(${width - 150}, 100)`);
    const legendRows = legend.selectAll(".legend-row")
        .data(chartData).enter().append("g").attr("class", "legend-row")
        .attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(event, d) { if (pinnedLabel !== null) return; highlightSlice(d.label, d.value, this); })
        .on("mouseout", function(event, d) { if (pinnedLabel !== null) return; resetAll(); })
        .on("click", function(event, d) {
            if (pinnedLabel === d.label) { pinnedLabel = null; } 
            else { pinnedLabel = d.label; highlightSlice(d.label, d.value, this); }
        });

    legendRows.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    legendRows.append("text").attr("x", 20).attr("y", 10).style("font-size", "13px").style("fill", "#334155").style("font-weight", "500")
        .text(d => {
            let capitalized = d.label.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            return capitalized.length > 22 ? capitalized.substring(0, 20) + "..." : capitalized;
        });
}

/**
 * 2. Total Fines by Jurisdiction (D3 Horizontal Bar Chart)
 */
function generateOutcomesChart(data) {
    const containerId = "#chartOutcomes";
    const container = d3.select(containerId);
    container.selectAll("*").remove();

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

    // FIX: Widened viewBox (550) and increased left margin (220) to fit full state names
    const width = 550;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 220 }; 

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.fines) || 100])
        .nice()
        .range([0, innerWidth]);

    const y = d3.scaleBand()
        .domain(chartData.map(d => d.jurisdiction))
        .range([0, innerHeight])
        .padding(0.25);

    // FIX: Apply a custom 8-step Premium Dashboard Blue gradient
    const dbColors = ["#082f49", "#0f4a73", "#1467a1", "#1985d1", "#22a3ff", "#5caeff", "#8cbaff", "#b8c9ff"];
    const colorScale = d3.scaleOrdinal().range(dbColors);

    // Create Tooltip Element in the DOM
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    }

    // 3. Draw the interactive bars
    const bars = svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.jurisdiction))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.jurisdiction)) // Applies the beautiful new gradient
        .attr("rx", 3) 
        .style("cursor", "pointer")
        .attr("width", 0);

    bars.transition() 
        .duration(800)
        .ease(d3.easeCubicOut)
        .delay((d, i) => i * 60)
        .attr("width", d => x(d.fines))
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) {
                    d3.select(this).attr("opacity", 0.7); 
                    tooltip.style("visibility", "visible")
                           .html(`<strong>${d.jurisdiction}</strong><br/>Fines: $${d.fines.toLocaleString()}`);
                })
                .on("mousemove", function(event) {
                    tooltip.style("top", (event.pageY - 10) + "px")
                           .style("left", (event.pageX + 20) + "px"); 
                })
                .on("mouseout", function() {
                    d3.select(this).attr("opacity", 1); 
                    tooltip.style("visibility", "hidden");
                });
        });

    // Draw Y Axis (Jurisdiction Names)
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#334155");

    // Draw X Axis (Number of Fines)
    svg.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("~s")))
        .style("font-size", "12px")
        .style("fill", "#64748b");
}

/**
 * 3. Annual Fines Trend Line Chart (All Data)
 */
function generateLineChart(data) {
    const containerId = "#chartLine";
    const container = d3.select(containerId);
    container.selectAll("*").remove();

    const summary = {};
    data.forEach(item => {
        const key = String(item.year).trim();
        if (key && key !== 'Unknown') summary[key] = (summary[key] || 0) + item.fines;
    });

    let chartData = Object.keys(summary).map(key => ({ year: key, value: summary[key] }));
    if (chartData.length === 0) return;
    chartData.sort((a, b) => d3.ascending(a.year, b.year));

    const node = container.node();
    const width = node ? node.getBoundingClientRect().width : 450;
    const height = node ? node.getBoundingClientRect().height : 300;
    const margin = { top: 30, right: 40, bottom: 40, left: 75 };

    const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "100%").append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scalePoint().domain(chartData.map(d => d.year)).range([0, innerWidth]).padding(0.15); 
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value) || 100]).nice().range([innerHeight, 0]);

    const lineGenerator = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

    const path = svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 3)
        .attr("d", lineGenerator);

    const totalLength = path.node().getTotalLength();

    path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    const dots = svg.selectAll(".dot")
        .data(chartData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("fill", "#ffffff")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .attr("r", 0);

    dots.transition()
        .delay(600)
        .duration(400)
        .attr("r", 5)
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) {
                    d3.select(this).attr("r", 7).attr("fill", "#2563eb"); 
                    tooltip.style("visibility", "visible").html(`<strong>Year: ${d.year}</strong><br/>Fines: $${d.value.toLocaleString()}`);
                })
                .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
                .on("mouseout", function() {
                    d3.select(this).attr("r", 5).attr("fill", "#ffffff"); 
                    tooltip.style("visibility", "hidden");
                });
        });

    const specificYears = ['2008', '2012', '2016', '2020', '2024'];
    svg.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x).tickValues(specificYears)).style("font-size", "12px").style("font-weight", "600").style("fill", "#334155");
    svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))).style("font-size", "11px");
}

/**
 * 4. HEATMAP: Fines by State and Offence Type (State-by-Offence Matrix Layout)
 */
function generateHeatmapChart(data) {
    const containerId = "#chartHeatmap";
    const container = d3.select(containerId);
    container.selectAll("*").remove();

    const matrixMap = {};
    const jurisdictionsSet = new Set();
    const metricsSet = new Set();

    data.forEach(item => {
        let jur = item.jurisdiction ? item.jurisdiction.trim() : "Unknown";
        let met = item.metric ? item.metric.replace(/_/g, ' ').trim() : "Unknown";
        
        if (jur === "Unknown" || met === "Unknown") return;

        met = met.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        jurisdictionsSet.add(jur);
        metricsSet.add(met);

        const key = `${jur}||${met}`;
        matrixMap[key] = (matrixMap[key] || 0) + item.fines;
    });

    const jurisdictions = Array.from(jurisdictionsSet).sort();
    const metrics = Array.from(metricsSet).sort();

    if (jurisdictions.length === 0 || metrics.length === 0) return;

    const chartData = [];
    jurisdictions.forEach(j => {
        metrics.forEach(m => {
            const val = matrixMap[`${j}||${m}`] || 0;
            chartData.push({ jurisdiction: j, metric: m, value: val });
        });
    });

    // UNIFIED CARD BOX VIEWPORT PROPORTIONS
    const width = 450;
    const height = 300; 
    const margin = { top: 15, right: 25, bottom: 65, left: 45 };

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand().domain(metrics).range([0, innerWidth]).padding(0.06);
    const y = d3.scaleBand().domain(jurisdictions).range([innerHeight, 0]).padding(0.06);

    const maxVal = d3.max(chartData, d => d.value) || 1;
    const colorScale = d3.scaleSequential().domain([0, maxVal]).interpolator(d3.interpolateBlues);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    }

    const tiles = svg.selectAll(".tile")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "tile")
        .attr("x", d => x(d.metric))
        .attr("y", d => y(d.jurisdiction))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 2)
        .style("cursor", "pointer")
        // start visually muted for entrance animation
        .attr("fill", "#f8fafc")
        .attr("opacity", 0)
        .on("mouseover", function(event, d) {
            d3.select(this).interrupt()
                .transition()
                .duration(140)
                .attr("stroke", "#0f172a")
                .style("stroke-width", "2px")
                .attr("opacity", 1);
            tooltip.style("visibility", "visible")
                   .html(`<strong>State: ${d.jurisdiction}</strong>${d.metric}<br/>Total Fines: $${d.value.toLocaleString()}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 15) + "px")
                   .style("left", (event.pageX + 15) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).interrupt()
                .transition()
                .duration(200)
                .attr("stroke", "none")
                .style("stroke-width", "0px")
                .attr("opacity", 1);
            tooltip.style("visibility", "hidden");
        });

    // entrance transition: stagger by column then row for a pleasing wave
    tiles.transition()
        .duration(800)
        .delay((d, i) => {
            const cols = metrics.length || 1;
            const col = i % cols;
            const row = Math.floor(i / cols);
            return col * 50 + row * 30;
        })
        .ease(d3.easeCubicOut)
        .attr("fill", d => d.value === 0 ? "#f8fafc" : colorScale(d.value))
        .attr("opacity", 1);

    svg.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "9px")
        .style("font-weight", "500")
        .style("text-anchor", "end")
        .attr("dx", "-.5em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-20)");

    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "10px")
        .style("font-weight", "600")
        .style("fill", "#475569");
}
// ======================================================================
// ENFORCEMENT CATEGORIES SUB-PAGES ENGINES (WITH UPGRADED TWEEN ANIMATION)
// ======================================================================
function renderSeatbeltCharts(data) {
    const sbData = data.filter(d => (d.metric || "").toLowerCase().includes('seatbelt'));
    d3.select("#kpi-sb-fines").text(d3.sum(sbData, d => d.fines).toLocaleString());
    d3.select("#kpi-sb-arrests").text(d3.sum(sbData, d => d.arrests).toLocaleString());
    d3.select("#kpi-sb-charges").text(d3.sum(sbData, d => d.charges).toLocaleString());
    generateSbAgeDonut(sbData); generateSbJurisdictionBar(sbData); generateSbLineChart(sbData);
}

function generateSbAgeDonut(data) {
    const containerId = "#chartSbAge"; d3.select(containerId).selectAll("*").remove();
    const summary = {}; let total = 0;
    data.forEach(item => { const key = item.ageGroup || 'Not Recorded'; if (item.fines > 0) { summary[key] = (summary[key] || 0) + item.fines; total += item.fines; } });
    let cD = Object.keys(summary).map(k => ({ label: k, value: summary[k] })); if (cD.length === 0) return;
    
    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    cD.sort((a, b) => (ageOrder.indexOf(a.label) === -1 ? 999 : ageOrder.indexOf(a.label)) - (ageOrder.indexOf(b.label) === -1 ? 999 : ageOrder.indexOf(b.label)));

    const width = 450, height = 300, radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`).append("g").attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);
    
    // THE FIX: Premium 7-step Teal Color Palette for the Donut Chart
    const sbDonutColors = ["#1b3e3f", "#2b5c5e", "#3c7b7d", "#4f9c9e", "#6ba8a9", "#8cc1c2", "#aedada"];
    const color = d3.scaleOrdinal().range(sbDonutColors);
    
    const pie = d3.pie().value(d => d.value).sort(null);
    const arcFull = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600").style("text-transform", "uppercase");
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold");
    
    // THE FIX: Changed the center percentage text color to match the Teal theme
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#3c7b7d").style("font-weight", "700");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / total) * 100).toFixed(1)}% of Total`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(cD)).enter().append("path").attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px").style("transition", "opacity 0.2s, stroke-width 0.2s")
        .each(function(d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; });
    
    let pinned = null;
    function highlight(dL, dV, ctx) {
        lR.select("text").style("font-weight", "500").style("fill", "#334155");
        d3.select(ctx).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        slices.attr("opacity", 0.15);
        const target = slices.filter(sd => sd.data.label === dL); target.each(function() { this.parentNode.appendChild(this); });
        target.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(dL)).style("stroke-width", "4px"); up(dL, dV);
    }
    function reset() { lR.select("text").style("font-weight", "500").style("fill", "#334155"); slices.attr("opacity", 1).attr("d", arcFull).attr("stroke", "#ffffff").style("stroke-width", "1px"); cl(); }

    slices.transition().duration(1000).ease(d3.easeExpOut).attrTween("d", function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) { return arcFull(interpolate(t)); };
        })
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.data.label, d.data.value, lR.filter(ld => ld.label === d.data.label).node()); })
                .on("mouseout", function() { if (pinned !== null) return; reset(); });
        });

    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 90)`);
    const lR = leg.selectAll("g").data(cD).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.label, d.value, this); })
        .on("mouseout", function() { if (pinned !== null) return; reset(); })
        .on("click", function(e, d) { if (pinned === d.label) { pinned = null; } else { pinned = d.label; highlight(d.label, d.value, this); } });

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "13px").style("fill", "#334155").text(d => d.label);
}

function generateSbJurisdictionBar(data) {
    const containerId = "#chartSbJurisdiction"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f); if (cD.length === 0) return;
    
    // FIX: Widened viewBox (550) and increased left margin (220) to fit full state names
    const w = 550, h = 300, m = { top: 20, right: 40, bottom: 40, left: 220 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);
    
    // FIX: Apply a custom 8-step Teal color gradient
    const sbColors = ["#1b3e3f", "#2b5c5e", "#3c7b7d", "#4f9c9e", "#6ba8a9", "#8cc1c2", "#aedada", "#d0f0f0"];
    const colorScale = d3.scaleOrdinal().range(sbColors);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", 0)
        .attr("fill", d => colorScale(d.j)) // Uses dynamic color instead of solid block
        .attr("rx", 3)
        .transition().duration(800).ease(d3.easeCubicOut).delay((d,i) => i*60).attr("width", d => x(d.f))
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("opacity", 0.7); tooltip.style("visibility", "visible").html(`<strong>${d.j}</strong><br/>Fines: $${d.f.toLocaleString()}`); })
                .on("mousemove", event => tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"))
                .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "12px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "11px").style("fill", "#64748b");
}

function generateSbLineChart(data) {
    const containerId = "#chartSbLine"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; for (let yr = 2008; yr <= 2024; yr++) { sum[String(yr)] = 0; }
    data.forEach(d => { const k = String(d.year).trim(); if(sum.hasOwnProperty(k)) sum[k] += d.fines; });
    let cD = Object.keys(sum).map(k => ({ y: k, v: sum[k] })).sort((a,b) => d3.ascending(a.y, b.y));
    const w = 850, h = 280, m = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scalePoint().domain(cD.map(d => d.y)).range([0, w - m.left - m.right]).padding(0.15);
    const y = d3.scaleLinear().domain([0, d3.max(cD, d => d.v) || 100]).range([h - m.top - m.bottom, 0]);
    const path = svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#ef4444").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));
    const len = path.node().getTotalLength(); path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(1000).attr("stroke-dashoffset", 0);
    
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("fill", "#ffffff").attr("stroke", "#ef4444").attr("r", 0)
        .transition().delay(600).duration(400).attr("r", 4)
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#ef4444"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.year}</strong><br/>Fines: $${d.v.toLocaleString()}`); })
                .on("mousemove", event => tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"))
                .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(['2008','2012','2016','2020','2024'])); svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));
}

function renderUnlicensedCharts(data) {
    const unData = data.filter(d => (d.metric || "").toLowerCase().includes('unlicensed'));
    d3.select("#kpi-un-fines").text(d3.sum(unData, d => d.fines).toLocaleString());
    d3.select("#kpi-un-arrests").text(d3.sum(unData, d => d.arrests).toLocaleString());
    d3.select("#kpi-un-charges").text(d3.sum(unData, d => d.charges).toLocaleString());
    generateUnAgeDonut(unData); generateUnJurisdictionBar(unData); generateUnLineChart(unData);
}

function generateUnAgeDonut(data) {
    const containerId = "#chartUnAge"; d3.select(containerId).selectAll("*").remove();
    const summary = {}; let total = 0;
    data.forEach(item => { const key = item.ageGroup || 'Not Recorded'; if (item.fines > 0) { summary[key] = (summary[key] || 0) + item.fines; total += item.fines; } });
    let cD = Object.keys(summary).map(k => ({ label: k, value: summary[k] })); if (cD.length === 0) return;
    
    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    cD.sort((a, b) => (ageOrder.indexOf(a.label) === -1 ? 999 : ageOrder.indexOf(a.label)) - (ageOrder.indexOf(b.label) === -1 ? 999 : ageOrder.indexOf(b.label)));

    const width = 450, height = 300, radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`).append("g").attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);
    
    const color = d3.scaleOrdinal().range(["#004c6d", "#006989", "#0087a3", "#00a6bb", "#00c6d0", "#00e7e2", "#00ffff"]);
    const pie = d3.pie().value(d => d.value).sort(null);
    const arcFull = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600").style("text-transform", "uppercase");
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold");
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / total) * 100).toFixed(1)}% of Total`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(cD)).enter().append("path").attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px").style("transition", "opacity 0.2s, stroke-width 0.2s")
        .each(function(d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; });
    
    let pinned = null;
    function highlight(dL, dV, ctx) {
        lR.select("text").style("font-weight", "500").style("fill", "#334155");
        d3.select(ctx).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        slices.attr("opacity", 0.15);
        const target = slices.filter(sd => sd.data.label === dL); target.each(function() { this.parentNode.appendChild(this); });
        target.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(dL)).style("stroke-width", "4px"); up(dL, dV);
    }
    function reset() { lR.select("text").style("font-weight", "500").style("fill", "#334155"); slices.attr("opacity", 1).attr("d", arcFull).attr("stroke", "#ffffff").style("stroke-width", "1px"); cl(); }

    slices.transition().duration(1000).ease(d3.easeExpOut).attrTween("d", function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) { return arcFull(interpolate(t)); };
        })
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.data.label, d.data.value, lR.filter(ld => ld.label === d.data.label).node()); })
                .on("mouseout", function() { if (pinned !== null) return; reset(); });
        });

    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 90)`);
    const lR = leg.selectAll("g").data(cD).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.label, d.value, this); })
        .on("mouseout", function() { if (pinned !== null) return; reset(); })
        .on("click", function(e, d) { if (pinned === d.label) { pinned = null; } else { pinned = d.label; highlight(d.label, d.value, this); } });

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "13px").style("fill", "#334155").text(d => d.label);
}

function generateUnJurisdictionBar(data) {
    const containerId = "#chartUnJurisdiction"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f); if (cD.length === 0) return;
    
    // FIX: Adjusted margins to fit full state names
    const w = 550, h = 300, m = { top: 20, right: 40, bottom: 40, left: 220 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);
    
    // FIX: Apply a custom 8-step Cyan color gradient
    const unColors = ["#003f5c", "#005878", "#007394", "#008fac", "#00abc3", "#00c8d7", "#00e5e8", "#00ffff"];
    const colorScale = d3.scaleOrdinal().range(unColors);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", 0)
        .attr("fill", d => colorScale(d.j)) // Uses dynamic color instead of solid block
        .attr("rx", 3)
        .transition().duration(800).ease(d3.easeCubicOut).delay((d,i) => i*60).attr("width", d => x(d.f))
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("opacity", 0.7); tooltip.style("visibility", "visible").html(`<strong>${d.j}</strong><br/>Fines: $${d.f.toLocaleString()}`); })
                .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"); })
                .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "12px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "11px").style("fill", "#64748b");
}

function generateUnLineChart(data) {
    const containerId = "#chartUnLine"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; for (let yr = 2008; yr <= 2024; yr++) { sum[String(yr)] = 0; }
    data.forEach(d => { const k = String(d.year).trim(); if(sum.hasOwnProperty(k)) sum[k] += d.fines; });
    let cD = Object.keys(sum).map(k => ({ y: k, v: sum[k] })).sort((a,b) => d3.ascending(a.y, b.y));
    const w = 850, h = 280, m = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scalePoint().domain(cD.map(d => d.y)).range([0, w - m.left - m.right]).padding(0.15);
    const y = d3.scaleLinear().domain([0, d3.max(cD, d => d.v) || 100]).range([h - m.top - m.bottom, 0]);
    const path = svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#9333ea").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));
    const len = path.node().getTotalLength(); path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(1000).attr("stroke-dashoffset", 0);
    
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("fill", "#ffffff").attr("stroke", "#9333ea").attr("r", 0)
        .transition().delay(600).duration(400).attr("r", 4)
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#9333ea"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.year}</strong><br/>Fines: $${d.v.toLocaleString()}`); })
                .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
                .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(['2008','2012','2016','2020','2024'])); svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));
}

function renderMobileCharts(data) {
    const mbData = data.filter(d => (d.metric || "").toLowerCase().includes('mobile'));
    d3.select("#kpi-mp-fines").text(d3.sum(mbData, d => d.fines).toLocaleString());
    d3.select("#kpi-mp-arrests").text(d3.sum(mbData, d => d.arrests).toLocaleString());
    d3.select("#kpi-mp-charges").text(d3.sum(mbData, d => d.charges).toLocaleString());
    generateMpAgeDonut(mbData); generateMpJurisdictionBar(mbData); generateMpLineChart(mbData);
}

function generateMpAgeDonut(data) {
    const containerId = "#chartMpAge"; d3.select(containerId).selectAll("*").remove();
    const summary = {}; let total = 0;
    data.forEach(item => { const key = item.ageGroup || 'Not Recorded'; if (item.fines > 0) { summary[key] = (summary[key] || 0) + item.fines; total += item.fines; } });
    let cD = Object.keys(summary).map(k => ({ label: k, value: summary[k] })); if (cD.length === 0) return;
    
    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    cD.sort((a, b) => (ageOrder.indexOf(a.label) === -1 ? 999 : ageOrder.indexOf(a.label)) - (ageOrder.indexOf(b.label) === -1 ? 999 : ageOrder.indexOf(b.label)));

    const width = 450, height = 300, radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`).append("g").attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);
    
    const color = d3.scaleOrdinal().range(["#7a0010", "#9e0018", "#c4001c", "#ea0d1e", "#ff4b38", "#ff7656", "#ffa67c"]);
    const pie = d3.pie().value(d => d.value).sort(null);
    const arcFull = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600").style("text-transform", "uppercase");
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold");
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / total) * 100).toFixed(1)}% of Total`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(cD)).enter().append("path").attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px").style("transition", "opacity 0.2s, stroke-width 0.2s")
        .each(function(d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; });
    
    let pinned = null;
    function highlight(dL, dV, ctx) {
        lR.select("text").style("font-weight", "500").style("fill", "#334155");
        d3.select(ctx).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        slices.attr("opacity", 0.15);
        const target = slices.filter(sd => sd.data.label === dL); target.each(function() { this.parentNode.appendChild(this); });
        target.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(dL)).style("stroke-width", "4px"); up(dL, dV);
    }
    function reset() { lR.select("text").style("font-weight", "500").style("fill", "#334155"); slices.attr("opacity", 1).attr("d", arcFull).attr("stroke", "#ffffff").style("stroke-width", "1px"); cl(); }

    slices.transition().duration(1000).ease(d3.easeExpOut).attrTween("d", function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) { return arcFull(interpolate(t)); };
        })
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.data.label, d.data.value, lR.filter(ld => ld.label === d.data.label).node()); })
                .on("mouseout", function() { if (pinned !== null) return; reset(); });
        });

    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 90)`);
    const lR = leg.selectAll("g").data(cD).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.label, d.value, this); })
        .on("mouseout", function() { if (pinned !== null) return; reset(); })
        .on("click", function(e, d) { if (pinned === d.label) { pinned = null; } else { pinned = d.label; highlight(d.label, d.value, this); } });

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "13px").style("fill", "#334155").text(d => d.label);
}

function generateMpJurisdictionBar(data) {
    const containerId = "#chartMpJurisdiction"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f); if (cD.length === 0) return;
    
    // FIX: Adjusted margins to fit full state names
    const w = 550, h = 300, m = { top: 20, right: 40, bottom: 40, left: 220 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);
    
    // FIX: Apply a custom 8-step Red color gradient
    const mpColors = ["#61000b", "#810013", "#a30018", "#c6001d", "#ea0022", "#ff3d32", "#ff6b52", "#ff9376"];
    const colorScale = d3.scaleOrdinal().range(mpColors);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", 0)
        .attr("fill", d => colorScale(d.j)) // Uses dynamic color instead of solid block
        .attr("rx", 3)
        .transition().duration(800).ease(d3.easeCubicOut).delay((d,i) => i*60).attr("width", d => x(d.f))
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("opacity", 0.7); tooltip.style("visibility", "visible").html(`<strong>${d.j}</strong><br/>Fines: $${d.f.toLocaleString()}`); })
                .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"); })
                .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "12px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "11px").style("fill", "#64748b");
}


function generateMpLineChart(data) {
    const containerId = "#chartMpLine"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; for (let yr = 2008; yr <= 2024; yr++) { sum[String(yr)] = 0; }
    data.forEach(d => { const k = String(d.year).trim(); if(sum.hasOwnProperty(k)) sum[k] += d.fines; });
    let cD = Object.keys(sum).map(k => ({ y: k, v: sum[k] })).sort((a,b) => d3.ascending(a.y, b.y));
    const w = 850, h = 280, m = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scalePoint().domain(cD.map(d => d.y)).range([0, w - m.left - m.right]).padding(0.15);
    const y = d3.scaleLinear().domain([0, d3.max(cD, d => d.v) || 100]).range([h - m.top - m.bottom, 0]);
    const path = svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#e11d48").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));
    const len = path.node().getTotalLength(); path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(1000).attr("stroke-dashoffset", 0);
    
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("fill", "#ffffff").attr("stroke", "#e11d48").attr("stroke-width", 2).attr("r", 0)
        .transition().delay(600).duration(400).attr("r", 4)
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#e11d48"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.year}</strong><br/>Fines: $${d.v.toLocaleString()}`); })
                .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
                .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(['2008','2012','2016','2020','2024'])); svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));
}

function renderSpeedCharts(data) {
    const spData = data.filter(d => (d.metric || "").toLowerCase().includes('speed'));
    d3.select("#kpi-sp-fines").text(d3.sum(spData, d => d.fines).toLocaleString());
    d3.select("#kpi-sp-arrests").text(d3.sum(spData, d => d.arrests).toLocaleString());
    d3.select("#kpi-sp-charges").text(d3.sum(spData, d => d.charges).toLocaleString());
    generateSpAgeDonut(spData); generateSpJurisdictionBar(spData); generateSpLineChart(spData);
}

function generateSpAgeDonut(data) {
    const containerId = "#chartSpAge"; d3.select(containerId).selectAll("*").remove();
    const summary = {}; let total = 0;
    data.forEach(item => { const key = item.ageGroup || 'Not Recorded'; if (item.fines > 0) { summary[key] = (summary[key] || 0) + item.fines; total += item.fines; } });
    let cD = Object.keys(summary).map(k => ({ label: k, value: summary[k] })); if (cD.length === 0) return;
    
    const ageOrder = ["0-16", "17-25", "26-39", "40-64", "65 and over", "All ages", "Not Recorded"];
    cD.sort((a, b) => (ageOrder.indexOf(a.label) === -1 ? 999 : ageOrder.indexOf(a.label)) - (ageOrder.indexOf(b.label) === -1 ? 999 : ageOrder.indexOf(b.label)));

    const width = 450, height = 300, radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${width} ${height}`).append("g").attr("transform", `translate(${width / 2 - 70}, ${height / 2})`);
    
    const color = d3.scaleOrdinal().range(["#002051", "#00357a", "#004ca5", "#0065d2", "#2b7fff", "#6b9bff", "#a1b8ff"]);
    const pie = d3.pie().value(d => d.value).sort(null);
    const arcZero = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.65);
    const arcFull = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600").style("text-transform", "uppercase");
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold");
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#000000").style("font-weight", "700");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / total) * 100).toFixed(1)}% of Total`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(cD)).enter().append("path").attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px").style("transition", "opacity 0.2s, stroke-width 0.2s").attr("d", arcZero);
    
    let pinned = null;
    function highlight(dL, dV, ctx) {
        lR.select("text").style("font-weight", "500").style("fill", "#334155");
        d3.select(ctx).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        slices.attr("opacity", 0.15);
        const target = slices.filter(sd => sd.data.label === dL); target.each(function() { this.parentNode.appendChild(this); });
        target.attr("opacity", 1).attr("d", arcHover).attr("stroke", color(dL)).style("stroke-width", "4px"); up(dL, dV);
    }
    function reset() { lR.select("text").style("font-weight", "500").style("fill", "#334155"); slices.attr("opacity", 1).attr("d", arcFull).attr("stroke", "#ffffff").style("stroke-width", "1px"); cl(); }

    slices.transition().duration(1000).ease(d3.easeExpOut).attrTween("d", function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) { return arcFull(interpolate(t)); };
        })
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.data.label, d.data.value, lR.filter(ld => ld.label === d.data.label).node()); })
                .on("mouseout", function() { if (pinned !== null) return; reset(); });
        });

    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 90)`);
    const lR = leg.selectAll("g").data(cD).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) { if (pinned !== null) return; highlight(d.label, d.value, this); })
        .on("mouseout", function() { if (pinned !== null) return; reset(); })
        .on("click", function(e, d) { if (pinned === d.label) { pinned = null; } else { pinned = d.label; highlight(d.label, d.value, this); } });

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "13px").style("fill", "#334155").text(d => d.label);
}

function generateSpJurisdictionBar(data) {
    const containerId = "#chartSpJurisdiction"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f); if (cD.length === 0) return;
    
    // FIX: Adjusted margins to fit full state names
    const w = 550, h = 300, m = { top: 20, right: 40, bottom: 40, left: 220 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);
    
    // FIX: Apply a custom 8-step Blue color gradient
    const spColors = ["#00153b", "#00275d", "#003a82", "#004ea8", "#0064d1", "#287dff", "#669cff", "#9ebcff"];
    const colorScale = d3.scaleOrdinal().range(spColors);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", 0)
        .attr("fill", d => colorScale(d.j)) // Uses dynamic color instead of solid block
        .attr("rx", 3)
        .transition().duration(800).ease(d3.easeCubicOut).delay((d,i) => i*60).attr("width", d => x(d.f))
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("opacity", 0.7); tooltip.style("visibility", "visible").html(`<strong>${d.j}</strong><br/>Fines: $${d.f.toLocaleString()}`); })
                .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"); })
                .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "12px").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s"))).style("font-size", "11px").style("fill", "#64748b");
}

function generateSpLineChart(data) {
    const containerId = "#chartSpLine"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; for (let yr = 2008; yr <= 2024; yr++) { sum[String(yr)] = 0; }
    data.forEach(d => { const k = String(d.year).trim(); if(sum.hasOwnProperty(k)) sum[k] += d.fines; });
    let cD = Object.keys(sum).map(k => ({ y: k, v: sum[k] })).sort((a,b) => d3.ascending(a.y, b.y));
    const w = 850, h = 280, m = { top: 30, right: 40, bottom: 40, left: 75 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scalePoint().domain(cD.map(d => d.y)).range([0, w - m.left - m.right]).padding(0.15); 
    const y = d3.scaleLinear().domain([0, d3.max(cD, d => d.v) || 100]).range([h - m.top - m.bottom, 0]);
    const path = svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#4338ca").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));
    const len = path.node().getTotalLength(); path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(1000).attr("stroke-dashoffset", 0);
    
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    
    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("fill", "#ffffff").attr("stroke", "#4338ca").attr("stroke-width", 2).style("cursor", "pointer")
        .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#4338ca"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.year}</strong><br/>Fines: $${d.v.toLocaleString()}`); })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
        .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); })
        .attr("r", 0).transition().delay(600).duration(400).attr("r", 4);
        
    const ticks = ['2008', '2012', '2016', '2020', '2024'];
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(ticks)).style("font-size", "12px").style("fill", "#334155");
    svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))).style("font-size", "11px");
}