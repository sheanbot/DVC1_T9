
function renderSeatbeltCharts(data) {
    const sbData = data.filter(d => (d.metric || "").toLowerCase().includes('seatbelt'));
    d3.select("#kpi-sb-fines").text(d3.sum(sbData, d => d.fines).toLocaleString());
    d3.select("#kpi-sb-arrests").text(d3.sum(sbData, d => d.arrests).toLocaleString());
    d3.select("#kpi-sb-charges").text(d3.sum(sbData, d => d.charges).toLocaleString());
    generateSbAgeDonut(sbData); 
    generateSbJurisdictionBar(sbData); 
    generateSbLineChart(sbData);
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
    
    const sbDonutColors = ["#ff2828ff", "#ff8d23ff", "#efff16ff", "#4f9c9e", "#1f4fffff", "#9429ceff", "#aed6daff"];
    const color = d3.scaleOrdinal().range(sbDonutColors);
    
    const pie = d3.pie().value(d => d.value).sort(null);
    const arcFull = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.95);

    // FIX: Add click tracking variable
    let activeSelection = null;

    const cT = svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600").style("text-transform", "uppercase");
    const cV = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.5em").style("font-size", "22px").style("fill", "#0f172a").style("font-weight", "bold");
    const cP = svg.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").style("font-size", "12px").style("fill", "#3c7b7d").style("font-weight", "700");

    function up(l, v) { cT.text(`Age: ${l}`); cV.text(v.toLocaleString()); cP.text(`${((v / total) * 100).toFixed(1)}% of Total`); }
    function cl() { cT.text(""); cV.text(""); cP.text(""); }

    const slices = svg.selectAll("path").data(pie(cD)).enter().append("path").attr("fill", d => color(d.data.label)).attr("stroke", "#ffffff").style("stroke-width", "1px").style("transition", "opacity 0.2s, stroke-width 0.2s")
        .each(function(d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; });
    
    function highlight(dL, dV, isClick = false) {
        // Prevent generic hover elements from shifting focus away from an actively clicked slice
        if (activeSelection && !isClick && activeSelection !== dL) return;

        lR.select("text").style("font-weight", "500").style("fill", "#334155");
        lR.filter(ld => ld.label === dL).select("text").style("font-weight", "bold").style("fill", "#0f172a");
        slices.interrupt().transition().duration(200).attr("opacity", 0.15).attr("d", arcFull).attr("stroke", "#ffffff").style("stroke-width", "1px");
        slices.filter(sd => sd.data.label === dL).interrupt().transition().duration(200).attr("opacity", 1).attr("d", arcHover).attr("stroke", color(dL)).style("stroke-width", "4px"); 
        up(dL, dV);
    }
    
    function reset(force = false) { 
        if (activeSelection && !force) return;
        lR.select("text").style("font-weight", "500").style("fill", "#334155"); 
        slices.interrupt().transition().duration(200).attr("opacity", 1).attr("d", arcFull).attr("stroke", "#ffffff").style("stroke-width", "1px"); 
        cl(); 
    }

    function handleToggleClick(dL, dV) {
        if (activeSelection === dL) {
            activeSelection = null;
            reset(true);
        } else {
            activeSelection = dL;
            highlight(dL, dV, true);
        }
    }

    // Attach event structures directly to items to avoid early timeline dropouts
    slices.on("mouseover", function(e, d) { highlight(d.data.label, d.data.value); })
          .on("mouseout", function() { reset(); })
          .on("click", function(e, d) { handleToggleClick(d.data.label, d.data.value); });

    slices.transition().duration(1000).ease(d3.easeExpOut).attrTween("d", function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) { return arcFull(interpolate(t)); };
        });

    const leg = d3.select(containerId).select("svg").append("g").attr("transform", `translate(${width - 150}, 90)`);
    const lR = leg.selectAll("g").data(cD).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * 24})`).style("cursor", "pointer")
        .on("mouseover", function(e, d) { highlight(d.label, d.value); })
        .on("mouseout", function() { reset(); })
        .on("click", function(e, d) { handleToggleClick(d.label, d.value); });

    lR.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", d => color(d.label));
    lR.append("text").attr("x", 20).attr("y", 10).style("font-size", "13px").style("fill", "#334155").text(d => d.label);
}

function generateSbJurisdictionBar(data) {
    const containerId = "#chartSbJurisdiction"; d3.select(containerId).selectAll("*").remove();
    const sum = {}; data.forEach(d => { if(d.jurisdiction !== 'Unknown') sum[d.jurisdiction] = (sum[d.jurisdiction] || 0) + d.fines; });
    let cD = Object.keys(sum).map(k => ({ j: k, f: sum[k] })).sort((a,b) => b.f - a.f); if (cD.length === 0) return;
    
    const w = 550, h = 300, m = { top: 20, right: 40, bottom: 40, left: 220 };
    const svg = d3.select(containerId).append("svg").attr("viewBox", `0 0 ${w} ${h}`).append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(cD, d => d.f)]).range([0, w - m.left - m.right]);
    const y = d3.scaleBand().domain(cD.map(d => d.j)).range([0, h - m.top - m.bottom]).padding(0.35);
    
    const sbColors = ["#ff2828ff", "#ff8d23ff", "#efff16ff", "#4f9c9e", "#1f4fffff", "#9429ceff", "#aed6daff"];
    const colorScale = d3.scaleOrdinal().range(sbColors);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("rect").data(cD).enter().append("rect").attr("y", d => y(d.j)).attr("height", y.bandwidth()).attr("width", 0).attr("fill", d => colorScale(d.j)).attr("rx", 3)
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
    const path = svg.append("path").datum(cD).attr("fill", "none").attr("stroke", "#1b3e3f").attr("stroke-width", 3).attr("d", d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));
    const len = path.node().getTotalLength(); path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(1000).attr("stroke-dashoffset", 0);
    
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    svg.selectAll("circle").data(cD).enter().append("circle").attr("cx", d => x(d.y)).attr("cy", d => y(d.v)).attr("fill", "#ffffff").attr("stroke", "#000000").attr("r", 0)
        .transition().delay(600).duration(400).attr("r", 4)
        .on("end", function() {
            d3.select(this)
                .on("mouseover", function(event, d) { d3.select(this).attr("r", 7).attr("fill", "#469e6a"); tooltip.style("visibility", "visible").html(`<strong>Year: ${d.y}</strong><br/>Fines: $${d.v.toLocaleString()}`); })
                .on("mousemove", event => tooltip.style("top", (event.pageY - 15) + "px").style("left", (event.pageX + 15) + "px"))
                .on("mouseout", function() { d3.select(this).attr("r", 4).attr("fill", "#ffffff"); tooltip.style("visibility", "hidden"); });
        });
    svg.append("g").attr("transform", `translate(0, ${h-m.top-m.bottom})`).call(d3.axisBottom(x).tickValues(['2008','2012','2016','2020','2024'])); svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));
}