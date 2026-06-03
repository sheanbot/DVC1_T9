let rawDataset = [];

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${viewId}-view`).style.display = 'block';
    document.getElementById(`btn-${viewId}`).classList.add('active');
}

function parseCSVMatrix(text) {
    const rows = text.split('\n').filter(r => r.trim() !== '');
    return rows.slice(1).map(row => {
        // Simple regex split to handle quotes cleanly if present
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let loc = cols[2] ? cols[2].trim().replace(/^"|"$/g, '') : 'Unknown';
        if (loc.toLowerCase() === 'all regions') loc = 'All Regions';

        return {
            year: cols[0] ? cols[0].trim().replace(/^"|"$/g, '') : 'Unknown',
            jurisdiction: cols[1] ? cols[1].trim().replace(/^"|"$/g, '') : 'Unknown',
            location: loc,
            ageGroup: cols[3] ? cols[3].trim().replace(/^"|"$/g, '') : 'Unknown',
            metric: cols[4] ? cols[4].trim().replace(/^"|"$/g, '') : 'Unknown',
            fines: parseInt(cols[6]) || 0,
            arrests: parseInt(cols[7]) || 0,
            charges: parseInt(cols[8]) || 0
        };
    });
}

function buildDropdownInterfaces(data) {
    const states = [...new Set(data.map(d => d.jurisdiction))].sort();
    const regions = [...new Set(data.map(d => d.location))].sort();
    const metrics = [...new Set(data.map(d => d.metric))].sort();

    populateUISelect('filter-jurisdiction', states);
    populateUISelect('filter-location', regions);
    populateUISelect('filter-metric', metrics);
}

function populateUISelect(elementId, items) {
    const select = document.getElementById(elementId);
    items.forEach(item => {
        if (item && item !== 'Unknown') {
            const el = document.createElement('option');
            el.value = item;
            el.textContent = item.replace(/_/g, ' ');
            select.appendChild(el);
        }
    });
}

function runDataFilterCycle() {
    const selectedState = document.getElementById('filter-jurisdiction').value;
    const selectedLoc = document.getElementById('filter-location').value;
    const selectedMetric = document.getElementById('filter-metric').value;

    const filtered = rawDataset.filter(item => {
        const matchState = (selectedState === 'all' || item.jurisdiction === selectedState);
        const matchLoc = (selectedLoc === 'all' || item.location === selectedLoc);
        const matchMetric = (selectedMetric === 'all' || item.metric === selectedMetric);
        return matchState && matchLoc && matchMetric;
    });

    executePipelineUpdate(filtered);
}

function executePipelineUpdate(dataSubset) {
    updateKPICounts(dataSubset);
    renderDashboardCharts(dataSubset);
    populateSummaryTable(dataSubset);
}

function updateKPICounts(data) {
    const totalFines = data.reduce((sum, current) => sum + current.fines, 0);
    const totalArrests = data.reduce((sum, current) => sum + current.arrests, 0);
    const totalCharges = data.reduce((sum, current) => sum + current.charges, 0);

    document.getElementById('kpi-fines').textContent = totalFines.toLocaleString();
    document.getElementById('kpi-arrests').textContent = totalArrests.toLocaleString();
    document.getElementById('kpi-charges').textContent = totalCharges.toLocaleString();
}

function populateSummaryTable(data) {
    const tbody = document.getElementById('table-body');
    const summaryLabel = document.getElementById('table-summary');
    tbody.innerHTML = '';

    const totalRows = data.length;
    const displaySubset = data.slice(0, 100);
    const summaryText = totalRows === 0
        ? 'No matching records found.'
        : totalRows > 100
            ? `Showing first 100 of ${totalRows.toLocaleString()} matching records.`
            : `Showing all ${totalRows.toLocaleString()} matching records.`;

    summaryLabel.textContent = summaryText;

    displaySubset.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.year}</td>
            <td>${row.jurisdiction}</td>
            <td>${row.location}</td>
            <td>${row.ageGroup}</td>
            <td>${row.metric.replace(/_/g, ' ')}</td>
            <td>${row.fines.toLocaleString()}</td>
            <td>${row.arrests.toLocaleString()}</td>
            <td>${row.charges.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadPortalData() {
    try {
        const res = await fetch('./data/Output.csv');
        const text = await res.text();
        
        rawDataset = parseCSVMatrix(text);
        
        buildDropdownInterfaces(rawDataset);
        executePipelineUpdate(rawDataset);
        
        const triggers = ['filter-jurisdiction', 'filter-location', 'filter-metric'];
        triggers.forEach(id => {
            document.getElementById(id).addEventListener('change', runDataFilterCycle);
        });
    } catch (err) {
        console.error("Critical failure streaming data from Output.csv:", err);
    }
}

window.addEventListener('DOMContentLoaded', loadPortalData);