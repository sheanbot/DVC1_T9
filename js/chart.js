let chartViolationsInstance = null;
let chartOutcomesInstance = null;

function renderDashboardCharts(data) {
    generateViolationsChart(data);
    generateOutcomesChart(data);
}

function generateViolationsChart(data) {
    const summary = {};
    data.forEach(item => {
        const key = item.metric.replace(/_/g, ' ');
        summary[key] = (summary[key] || 0) + item.fines;
    });

    const labels = Object.keys(summary);
    const datasetValues = Object.values(summary);
    const ctx = document.getElementById('chartViolations').getContext('2d');

    if (chartViolationsInstance) {
        chartViolationsInstance.data.labels = labels;
        chartViolationsInstance.data.datasets[0].data = datasetValues;
        chartViolationsInstance.update();
    } else {
        chartViolationsInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Fines Issued ($)',
                    data: datasetValues,
                    backgroundColor: ['#2980b9', '#e74c3c', '#27ae60', '#f1c40f'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

function generateOutcomesChart(data) {
    const summary = { Arrests: 0, Charges: 0 };
    data.forEach(item => {
        summary.Arrests += item.arrests;
        summary.Charges += item.charges;
    });

    const ctx = document.getElementById('chartOutcomes').getContext('2d');

    if (chartOutcomesInstance) {
        chartOutcomesInstance.data.datasets[0].data = [summary.Arrests, summary.Charges];
        chartOutcomesInstance.update();
    } else {
        chartOutcomesInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Arrests Recorded', 'Charges Filed'],
                datasets: [{
                    data: [summary.Arrests, summary.Charges],
                    backgroundColor: ['#e67e22', '#9b59b6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
}