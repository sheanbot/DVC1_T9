function renderDashboardCharts(data) {
    generateLineChart(data);
    generateViolationsChart(data);
    generateHeatmapChart(data);
    generateOutcomesChart(data);
}

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
        .style("transition", "opacity 0.2s, stroke-width 0.2s")// Smooth CSS scaling
        .each(function(d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; });

    // FIX: Simplified hover mechanics that won't break the browser DOM tracking
    function highlightSlice(dLabel, dValue) {
        legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
        legendRows.filter(d => d.label === dLabel).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        
        slices.attr("opacity", 0.15).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px"); 
        
        slices.filter(sliceData => sliceData.data.label === dLabel)
              .attr("opacity", 1)
              .attr("d", arcHover)
              .attr("stroke", color(dLabel))
              .style("stroke-width", "4px"); 
              
        updateCenterText(dLabel, dValue); 
    }

    function resetAll() {
        legendRows.select("text").style("font-weight", "500").style("fill", "#334155");
        slices.attr("opacity", 1).attr("d", arc).attr("stroke", "#ffffff").style("stroke-width", "1px");
        clearCenterText(); 
    }

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
                .on("mouseover", function(event, d) { highlightSlice(d.data.label, d.data.value); })
                .on("mouseout", function() { resetAll(); });
        });

    const legend = container.select("svg").append("g").attr("transform", `translate(${width - 150}, 100)`);
    const legendRows = legend.selectAll(".legend-row")
        .data(chartData).enter().append("g").attr("class", "legend-row")
        .attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(event, d) { highlightSlice(d.label, d.value); })
        .on("mouseout", function() { resetAll(); });

    legendRows.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    legendRows.append("text").attr("x", 20).attr("y", 10).style("font-size", "13px").style("fill", "#334155").style("font-weight", "500")
        .text(d => {
            let capitalized = d.label.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            return capitalized.length > 22 ? capitalized.substring(0, 20) + "..." : capitalized;
        });
}

function generateOutcomesChart(data) {
    const containerId = "#chartOutcomes";
    const container = d3.select(containerId);
    container.selectAll("*").remove();

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
    chartData.sort((a, b) => b.fines - a.fines);

    const width = 550, height = 300, margin = { top: 20, right: 30, bottom: 40, left: 220 }; 
    const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "100%").append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, d3.max(chartData, d => d.fines) || 100]).nice().range([0, innerWidth]);
    const y = d3.scaleBand().domain(chartData.map(d => d.jurisdiction)).range([0, innerHeight]).padding(0.25);
    const dbColors = ["#082f49", "#0f4a73", "#1467a1", "#1985d1", "#22a3ff", "#5caeff", "#8cbaff", "#b8c9ff"];
    const colorScale = d3.scaleOrdinal().range(dbColors);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    const bars = svg.selectAll(".bar").data(chartData).enter().append("rect").attr("class", "bar").attr("y", d => y(d.jurisdiction)).attr("x", 0).attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.jurisdiction)).attr("rx", 3).style("cursor", "pointer").attr("width", 0);

    bars.transition().duration(800).ease(d3.easeCubicOut).delay((d, i) => i * 60).attr("width", d => x(d.fines))
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("opacity", 0.7); tooltip.style("visibility", "visible").html(`<strong>${d.jurisdiction}</strong><br/>Fines: $${d.fines.toLocaleString()}`); })
                .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 20) + "px"); })
                .on("mouseout", function() { d3.select(this).attr("opacity", 1); tooltip.style("visibility", "hidden"); });
        });

    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "12px").style("font-weight", "500").style("fill", "#334155");
    svg.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("~s"))).style("font-size", "12px").style("fill", "#64748b");
}

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

    const path = svg.append("path").datum(chartData).attr("fill", "none").attr("stroke", "#2563eb").attr("stroke-width", 3)
        .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX));

    const totalLength = path.node().getTotalLength();
    path.attr("stroke-dasharray", totalLength + " " + totalLength).attr("stroke-dashoffset", totalLength).transition().duration(1000).ease(d3.easeLinear).attr("stroke-dashoffset", 0);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    const dots = svg.selectAll(".dot").data(chartData).enter().append("circle").attr("class", "dot").attr("cx", d => x(d.year)).attr("cy", d => y(d.value)).attr("fill", "#ffffff").attr("stroke", "#2563eb").attr("stroke-width", 2).style("cursor", "pointer").attr("r", 0);

    dots.transition().delay(600).duration(400).attr("r", 5)
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
    jurisdictions.forEach(j => { metrics.forEach(m => { chartData.push({ jurisdiction: j, metric: m, value: matrixMap[`${j}||${m}`] || 0 }); }); });

    const width = 550, height = 300, margin = { top: 15, right: 25, bottom: 65, left: 200 };
    const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "100%").append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand().domain(metrics).range([0, innerWidth]).padding(0.06);
    const y = d3.scaleBand().domain(jurisdictions).range([innerHeight, 0]).padding(0.06);

    const maxVal = d3.max(chartData, d => d.value) || 1;
    const colorScale = d3.scaleLinear().domain([0, maxVal * 0.05, maxVal * 0.3, maxVal]).range(["#f8fafc", "#f59e0b", "#e11d48", "#4c0519"]);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    const tiles = svg.selectAll(".tile").data(chartData).enter().append("rect").attr("class", "tile").attr("x", d => x(d.metric)).attr("y", d => y(d.jurisdiction)).attr("width", x.bandwidth()).attr("height", y.bandwidth())
        .attr("rx", 2).style("cursor", "pointer").attr("fill", "#f8fafc").attr("opacity", 0)
        .on("mouseover", function(event, d) { d3.select(this).interrupt().transition().duration(140).attr("stroke", "#0f172a").style("stroke-width", "2px").attr("opacity", 1); tooltip.style("visibility", "visible").html(`<strong>State: ${d.jurisdiction}</strong><br/>${d.metric}<br/>Total Fines: $${d.value.toLocaleString()}`); })
        .on("mousemove", function(event) { tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"); })
        .on("mouseout", function() { d3.select(this).interrupt().transition().duration(200).attr("stroke", "none").style("stroke-width", "0px").attr("opacity", 1); tooltip.style("visibility", "hidden"); });

    tiles.transition().duration(800).delay((d, i) => { const cols = metrics.length || 1; return (i % cols) * 50 + Math.floor(i / cols) * 30; }).ease(d3.easeCubicOut).attr("fill", d => d.value === 0 ? "#f8fafc" : colorScale(d.value)).attr("opacity", 1);

    svg.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x)).selectAll("text").style("font-size", "9px").style("font-weight", "500").style("text-anchor", "end").attr("dx", "-.5em").attr("dy", ".15em").attr("transform", "rotate(-20)");
    svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "10px").style("font-weight", "600").style("fill", "#475569");
}