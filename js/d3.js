/**
 * Swinburne COS30045 Data Visualisation Project
 * Core Graphics Engine: D3.js Implementation 
 */

function renderDashboardCharts(data) {
    // Main hub triggered cleanly by app.js on line 71
    generateViolationsChart(data);
    generateOutcomesChart(data);
}

/**
 * 1. Offence Violation Breakdown Chart (D3 Vertical Bar Layout)
 */
function generateViolationsChart(data) {
    const containerId = "#chartViolations";
    
    // Clear out previous SVG nodes during real-time data filtering cycles
    d3.select(containerId).selectAll("*").remove();

    // Aggregate Fines Issued by Metric/Offence Category
    const summary = {};
    data.forEach(item => {
        const key = item.metric.replace(/_/g, ' ');
        summary[key] = (summary[key] || 0) + item.fines;
    });

    const chartData = Object.keys(summary).map(key => ({
        metric: key,
        value: summary[key]
    }));

    if (chartData.length === 0) return;

    // Dimensions Setup
    const width = 550;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 65, left: 75 };

    // Inject Responsive SVG Base ViewBox
    const svg = d3.select(containerId)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // X Coordinates (Discrete Scale Band)
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.metric))
        .range([0, width - margin.left - margin.right])
        .padding(0.25);

    // Y Coordinates (Linear Scale bounded by calculated max payload values)
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value) || 100])
        .nice()
        .range([height - margin.top - margin.bottom, 0]);

    // Draw Data Bars
    svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.metric))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.value))
        .attr("height", d => height - margin.top - margin.bottom - y(d.value))
        .attr("fill", "#2980b9");

    // Add X-Axis with rotated labels for safety/readability
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-30)");

    // Add Y-Axis formatted cleanly with SI prefix notations (e.g., 50k instead of 50000)
    svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("~s")));
}

/**
 * 2. Enforcement Outcome Comparison Chart (D3 Interactive Donut Layout)
 */
function generateOutcomesChart(data) {
    const containerId = "#chartOutcomes";
    
    // Reset canvas container
    d3.select(containerId).selectAll("*").remove();

    // Aggregate Arrests and Charges counters
    let totalArrests = 0;
    let totalCharges = 0;

    data.forEach(item => {
        totalArrests += item.arrests;
        totalCharges += item.charges;
    });

    const chartData = [
        { label: "Arrests Recorded", value: totalArrests },
        { label: "Charges Filed", value: totalCharges }
    ];

    // Avoid layout break errors if nothing matches the current filter
    if (totalArrests === 0 && totalCharges === 0) return;

    const width = 450;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(containerId)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${width / 2 - 40}, ${height / 2})`);

    // Dynamic Color Range
    const color = d3.scaleOrdinal()
        .domain(["Arrests Recorded", "Charges Filed"])
        .range(["#e67e22", "#9b59b6"]);

    // Calculate Pie Segment angles
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    // Define Radius Extents (Inner Radius > 0 builds a Donut Chart)
    const arc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius * 0.9);

    const arcData = pie(chartData);

    // Append Path Elements
    svg.selectAll("path")
        .data(arcData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.label))
        .attr("stroke", "#ffffff")
        .style("stroke-width", "2px");

    // Dynamic Sidebar Chart Legends
    const legend = d3.select(containerId).find ? d3.select(containerId) : d3.select(containerId).select("svg")
        .append("g")
        .attr("transform", `translate(${width - 150}, 30)`);

    chartData.forEach((d, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(d.label));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .style("font-size", "11px")
            .style("font-family", "sans-serif")
            .text(`${d.label}: ${d.value.toLocaleString()}`);
    });
}