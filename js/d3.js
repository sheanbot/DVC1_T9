/**
 * Swinburne COS30045 Data Visualisation Project
 * Core Graphics Engine: D3.js Implementation 
 */

function renderDashboardCharts(data) {
    generateViolationsChart(data);
    generateOutcomesChart(data);
}

/**
 * 1. Offence Violation Breakdown Chart (D3 Vertical Bar Layout)
 */
function generateViolationsChart(data) {
    const containerId = "#chartViolations";
    d3.select(containerId).selectAll("*").remove();

    // 聚合 fines
    const summary = {};
    data.forEach(item => {
        const key = item.metric.replace(/_/g, ' ');
        summary[key] = (summary[key] || 0) + item.fines;
    });

    let chartData = Object.keys(summary).map(key => ({
        metric: key,
        value: summary[key]
    }));
    if (chartData.length === 0) return;

    //sort by value descending for better visual impact
    chartData.sort((a, b) => b.value - a.value);

    const width = 550;
    const height = 300;
    const margin = { top: 30, right: 20, bottom: 65, left: 75 }; 

    const svg = d3.select(containerId)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .domain(chartData.map(d => d.metric))
        .range([0, innerWidth])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value) || 100])
        .nice()
        .range([innerHeight, 0]);

    
    svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.metric))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.value))
        .attr("height", d => innerHeight - y(d.value))
        .attr("fill", "#2980b9");

    svg.selectAll(".bar-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.metric) + x.bandwidth() / 2)
        .attr("y", d => y(d.value) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#333")
        .text(d => d.value.toLocaleString());

    // X axis 
    svg.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-30)");

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("~s")));

    
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Offence Violation Breakdown (sorted)");
}

/**
 * 2. Enforcement Outcome Comparison Chart (D3 Donut Layout)
 */
function generateOutcomesChart(data) {
    const containerId = "#chartOutcomes";
    d3.select(containerId).selectAll("*").remove();

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

    if (totalArrests === 0 && totalCharges === 0) return;

    const width = 450;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;

    // create svg and group for pie chart, with center translation for donut layout
    const svg = d3.select(containerId)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${width / 2 -50}, ${height / 2})`); //adjust the chart position 

    const color = d3.scaleOrdinal()
        .domain(["Arrests Recorded", "Charges Filed"])
        .range(["#e67e22", "#9b59b6"]);

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius * 0.9);

    const arcData = pie(chartData);

    svg.selectAll("path")
        .data(arcData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.label))
        .attr("stroke", "#ffffff")
        .style("stroke-width", "2px");
        
    const legend = d3.select(containerId).select("svg")
        .append("g")
        .attr("transform", `translate(${width - 170}, 30)`); //adjust the text position

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