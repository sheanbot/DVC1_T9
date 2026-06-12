let rawDataset = [];

// Handle Page Navigation
function switchView(viewId) {
    // 1. Clear all active classes and reset layout states
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
        view.style.display = ''; 
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 2. Activate selected view section
    document.getElementById(`${viewId}-view`).classList.add('active');
    document.getElementById(`btn-${viewId}`).classList.add('active');

    // 3. Redraw engine kickstart to prevent hidden 0px container rendering
    if (viewId === 'dashboard') {
        setTimeout(() => {
            if (typeof runDataFilterCycle === "function") {
                runDataFilterCycle();
            }
        }, 50);
    } 
    // --- NEW: Trigger redraw for Seatbelts page ---
    else if (viewId === 'seatbelts') {
        setTimeout(() => {
            if (typeof runSeatbeltFilterCycle === "function") {
                runSeatbeltFilterCycle();
            }
        }, 50);
    }   
    // Add to switchView(viewId) function
    else if (viewId === 'unlicensed') {
        setTimeout(() => {
            if (typeof runUnlicensedFilterCycle === "function") {
                runUnlicensedFilterCycle();
            }
        }, 50);
    }

    else if (viewId === 'mobile') {
            setTimeout(() => {
                if (typeof runMobileFilterCycle === "function") {
                    runMobileFilterCycle();
                }
            }, 50);
        }

    else if (viewId === 'speed') {
        setTimeout(() => {
            if (typeof runSpeedFilterCycle === "function") {
                runSpeedFilterCycle();
            }
        }, 50);
    }
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

    // Main Dashboard Dropdowns
    populateUISelect('filter-jurisdiction', states);
    populateUISelect('filter-location', regions);
    populateUISelect('filter-metric', metrics);

    // --- Seatbelt Page Dropdowns ---
    populateUISelect('filter-sb-jurisdiction', states);
    populateUISelect('filter-sb-location', regions);

    // --- Unlicensed Page Dropdowns ---
    populateUISelect('filter-un-jurisdiction', states);
    populateUISelect('filter-un-location', regions);

    // --- Mobile Page Dropdowns ---
    populateUISelect('filter-mp-jurisdiction', states);
    populateUISelect('filter-mp-location', regions);

    // --- Speed Page Dropdowns ---
    populateUISelect('filter-sp-jurisdiction', states);
    populateUISelect('filter-sp-location', regions);
}

function populateUISelect(elementId, items) {
    const select = document.getElementById(elementId);
    if (!select) return; // Safety check in case elements are missing

    items.forEach(item => {
        if (item && item !== 'Unknown' && item.toLowerCase() !== 'all regions') {
            const el = document.createElement('option');
            el.value = item;
            el.textContent = item.replace(/_/g, ' ');
            select.appendChild(el);
        }
    });
}
// ==========================================
// MAIN DASHBOARD PIPELINE
// ==========================================
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
    if (typeof renderDashboardCharts === "function") {
        renderDashboardCharts(dataSubset);
    }
    populateSummaryTable(dataSubset);
}

// ==========================================
// NEW: SEATBELT PAGE PIPELINE
// ==========================================
function runSeatbeltFilterCycle() {
    const selectedState = document.getElementById('filter-sb-jurisdiction').value;
    const selectedLoc = document.getElementById('filter-sb-location').value;

    // Filter by the dropdown selections first
    const filtered = rawDataset.filter(item => {
        const matchState = (selectedState === 'all' || item.jurisdiction === selectedState);
        const matchLoc = (selectedLoc === 'all' || item.location === selectedLoc);
        return matchState && matchLoc;
    });

    // Send the filtered data to the D3 Master Controller for the seatbelt page
    if (typeof renderSeatbeltCharts === "function") {
        renderSeatbeltCharts(filtered);
    }
}

// ==========================================
// NEW: UNLICENSED PAGE PIPELINE
// ==========================================
function runUnlicensedFilterCycle() {
    const selectedState = document.getElementById('filter-un-jurisdiction').value;
    const selectedLoc = document.getElementById('filter-un-location').value;

    const filtered = rawDataset.filter(item => {
        const matchState = (selectedState === 'all' || item.jurisdiction === selectedState);
        const matchLoc = (selectedLoc === 'all' || item.location === selectedLoc);
        return matchState && matchLoc;
    });

    if (typeof renderUnlicensedCharts === "function") {
        renderUnlicensedCharts(filtered);
    }
}

// ==========================================
// NEW: MOBILE PAGE PIPELINE
// ==========================================
function runMobileFilterCycle() {
    const selectedState = document.getElementById('filter-mp-jurisdiction').value;
    const selectedLoc = document.getElementById('filter-mp-location').value;

    const filtered = rawDataset.filter(item => {
        const matchState = (selectedState === 'all' || item.jurisdiction === selectedState);
        const matchLoc = (selectedLoc === 'all' || item.location === selectedLoc);
        return matchState && matchLoc;
    });

    if (typeof renderMobileCharts === "function") {
        renderMobileCharts(filtered);
    }
}

// Add New Event Listeners to loadPortalData()
const unTriggers = ['filter-un-jurisdiction', 'filter-un-location'];
unTriggers.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', runUnlicensedFilterCycle);
});

// ==========================================
// NEW: SPEEDING PAGE PIPELINE
// ==========================================
function runSpeedFilterCycle() {
    const selectedState = document.getElementById('filter-sp-jurisdiction').value;
    const selectedLoc = document.getElementById('filter-sp-location').value;

    const filtered = rawDataset.filter(item => {
        const matchState = (selectedState === 'all' || item.jurisdiction === selectedState);
        const matchLoc = (selectedLoc === 'all' || item.location === selectedLoc);
        return matchState && matchLoc;
    });

    if (typeof renderSpeedCharts === "function") {
        renderSpeedCharts(filtered);
    }
}
// 4. Speeding Dropdown Listeners
        const spTriggers = ['filter-sp-jurisdiction', 'filter-sp-location'];
        spTriggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runSpeedFilterCycle);
        });


// ==========================================
// UTILITY UPDATES
// ==========================================
function updateKPICounts(data) {
    const totalFines = data.reduce((sum, current) => sum + current.fines, 0);
    const totalArrests = data.reduce((sum, current) => sum + current.arrests, 0);
    const totalCharges = data.reduce((sum, current) => sum + current.charges, 0);

    const elFines = document.getElementById('kpi-fines');
    const elArrests = document.getElementById('kpi-arrests');
    const elCharges = document.getElementById('kpi-charges');

    if (elFines) elFines.textContent = totalFines.toLocaleString();
    if (elArrests) elArrests.textContent = totalArrests.toLocaleString();
    if (elCharges) elCharges.textContent = totalCharges.toLocaleString();
}

function populateSummaryTable(data) {
    const tbody = document.getElementById('table-body');
    const summaryLabel = document.getElementById('table-summary');
    if (!tbody || !summaryLabel) return;

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

// ==========================================
// APP INITIALIZATION
// ==========================================
async function loadPortalData() {
    try {
        const res = await fetch('./data/Output.csv');
        const text = await res.text();
        
        rawDataset = parseCSVMatrix(text);
        
        buildDropdownInterfaces(rawDataset);
        
        // Execute initial load for BOTH pages so they are ready
        executePipelineUpdate(rawDataset);
        runSeatbeltFilterCycle(); 
        
        // 1. Dashboard Dropdown Listeners
        const triggers = ['filter-jurisdiction', 'filter-location', 'filter-metric'];
        triggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runDataFilterCycle);
        });

        // 2. NEW: Seatbelt Dropdown Listeners
        const sbTriggers = ['filter-sb-jurisdiction', 'filter-sb-location'];
        sbTriggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runSeatbeltFilterCycle);
        });

    } catch (err) {
        console.error("Critical failure streaming data from Output.csv:", err);
    }
}

window.addEventListener('DOMContentLoaded', loadPortalData);


// 3. Mobile Dropdown Listeners
        const mpTriggers = ['filter-mp-jurisdiction', 'filter-mp-location'];
        mpTriggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runMobileFilterCycle);
        });