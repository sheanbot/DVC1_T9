// Map short form jurisdiction abbreviations to their full names
const jurisdictionMap = {
    'NSW': 'New South Wales (NSW)',
    'QLD': 'Queensland (QLD)',
    'VIC': 'Victoria (VIC)',
    'WA':  'Western Australia (WA)',
    'SA':  'South Australia (SA)',
    'NT':  'Northern Territory (NT)',
    'TAS': 'Tasmania (TAS)',
    'ACT': 'Australian Capital Territory (ACT)'
};

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
    // Trigger redraw for Seatbelts page
    else if (viewId === 'seatbelts') {
        setTimeout(() => {
            if (typeof runSeatbeltFilterCycle === "function") {
                runSeatbeltFilterCycle();
            }
        }, 50);
    }   
    // Trigger redraw for Unlicensed page
    else if (viewId === 'unlicensed') {
        setTimeout(() => {
            if (typeof runUnlicensedFilterCycle === "function") {
                runUnlicensedFilterCycle();
            }
        }, 50);
    }
    // Trigger redraw for Mobile Phone page
    else if (viewId === 'mobile') {
        setTimeout(() => {
            if (typeof runMobileFilterCycle === "function") {
                runMobileFilterCycle();
            }
        }, 50);
    }
    // Trigger redraw for Speeding page
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

        // Extract and clean the raw short-form abbreviation
        const rawJurisdiction = cols[1] ? cols[1].trim().replace(/^"|"$/g, '') : 'Unknown';
        
        // Convert to full form if it exists in our dictionary; otherwise keep the raw value
        const fullJurisdiction = jurisdictionMap[rawJurisdiction] || rawJurisdiction;

        return {
            year: cols[0] ? cols[0].trim().replace(/^"|"$/g, '') : 'Unknown',
            jurisdiction: fullJurisdiction, // Standardized full name output
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
            
            // 1. Clean the string by replacing underscores with spaces
            let cleanText = item.replace(/_/g, ' ');
            
            // 2. Transform the text to Title Case (Capitalize each word)
            let formattedText = cleanText.split(' ')
                                         .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                         .join(' ');
            
            el.textContent = formattedText;
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
// UNLICENSED PAGE PIPELINE
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
// APP INITIALIZATION & PORTAL LOAD
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

        // 2. Seatbelt Dropdown Listeners
        const sbTriggers = ['filter-sb-jurisdiction', 'filter-sb-location'];
        sbTriggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runSeatbeltFilterCycle);
        });

        // 3. Unlicensed Dropdown Listeners
        const unTriggers = ['filter-un-jurisdiction', 'filter-un-location'];
        unTriggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runUnlicensedFilterCycle);
        });

        // 4. Mobile Dropdown Listeners
        const mpTriggers = ['filter-mp-jurisdiction', 'filter-mp-location'];
        mpTriggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runMobileFilterCycle);
        });

        // 5. Speeding Dropdown Listeners
        const spTriggers = ['filter-sp-jurisdiction', 'filter-sp-location'];
        spTriggers.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', runSpeedFilterCycle);
        });

    } catch (err) {
        console.error("Critical failure streaming data from Output.csv:", err);
    }
}

window.addEventListener('DOMContentLoaded', loadPortalData);

// ==========================================
// DYNAMIC VIEWPORT RESIZE ENGINE
// ==========================================
let resizeDebounceTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
        const activeSection = document.querySelector('.view-section.active');
        if (!activeSection) return;
        
        const viewId = activeSection.id.replace('-view', '');
        if (viewId === 'dashboard') runDataFilterCycle();
        else if (viewId === 'seatbelts') runSeatbeltFilterCycle();
        else if (viewId === 'unlicensed') runUnlicensedFilterCycle();
        else if (viewId === 'mobile') runMobileFilterCycle();
        else if (viewId === 'speed') runSpeedFilterCycle();
    }, 250); 
});

// ======================================================================
// SHARED CONSTANTS: GLOBAL CROSS-FILTER INTERACTION ENGINE STATE
// ======================================================================
const ACTIVE_FILTERS = {
    jurisdiction: 'all',
    location: 'all',
    metric: 'all'
};

/**
 * Attaches real-time event tracking to dropdown select nodes.
 * Run this function right after streaming your dataset from Output.csv
 */
function initializeFilterEventListeners() {
    // 1. State / Jurisdiction Selector
    const jurSelect = document.getElementById('filter-jurisdiction');
    if (jurSelect) {
        jurSelect.addEventListener('change', function() {
            ACTIVE_FILTERS.jurisdiction = this.value; // Mutate shared state
            runDataFilterCycle();                     // Kickstart rendering pipe
        });
    }

    // 2. Geographic Location Selector
    const locSelect = document.getElementById('filter-location');
    if (locSelect) {
        locSelect.addEventListener('change', function() {
            ACTIVE_FILTERS.location = this.value;     // Mutate shared state
            runDataFilterCycle();                     // Kickstart rendering pipe
        });
    }

    // 3. Offence Metric Selector
    const metSelect = document.getElementById('filter-metric');
    if (metSelect) {
        metSelect.addEventListener('change', function() {
            ACTIVE_FILTERS.metric = this.value;       // Mutate shared state
            runDataFilterCycle();                     // Kickstart rendering pipe
        });
    }
}