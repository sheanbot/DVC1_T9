# Australian Traffic Enforcement Dashboard

A comprehensive interactive dashboard for analyzing and visualizing Australian traffic enforcement data across different states and territories. This project provides insights into various traffic violation categories including mobile phone usage, seatbelt compliance, unlicensed driving, and speeding fines.

## Features

- **Interactive Dashboard**: Multi-view interface with navigation between different enforcement categories
- **Real-time Data Filtering**: Filter traffic enforcement data by jurisdiction and violation type
- **Multiple Enforcement Categories**:
  - Mobile Phone Use violations
  - Seatbelt Compliance violations
  - Unlicensed Driving violations
  - Speeding Fines
- **Data Visualization**: Interactive charts powered by D3.js
- **Responsive Design**: Mobile-friendly interface with clean, modern UI
- **Detailed Data Records**: Browse complete enforcement records with detailed information

## Project Structure

```
DVC1_T9/
├── index.html              # Main HTML page with dashboard layout
├── README.md               # This file
├── css/
│   └── style.css          # Styling for the dashboard
├── js/
│   ├── app.js             # Main JavaScript application logic
│   └── d3.js              # D3.js visualization library
└── data/
    ├── police_enforcement_2024_fines.csv  # Main dataset with enforcement records
    └── Output.csv                          # Processed/output data
```

## Data Files

### `police_enforcement_2024_fines.csv`
Main dataset containing Australian traffic enforcement records with the following information:
- Jurisdiction (NSW, QLD, VIC, WA, SA, NT, TAS, ACT)
- Violation Type (Mobile Phone, Seatbelt, Unlicensed Driving, Speeding)
- Number of fines issued
- Enforcement statistics
- Time period data for 2024

## Technologies Used

- **HTML5**: Markup and page structure
- **CSS3**: Styling and responsive design
- **JavaScript**: Application logic and interactivity
- **D3.js**: Interactive data visualization and charting
- **CSV**: Data storage format

## How to Use

1. **Clone or download** the repository
2. **Open** `index.html` in a web browser (or serve with a local web server)
3. **Navigate** through different views using the navigation menu:
   - **Home**: Introduction and overview of the dashboard
   - **Fines Overview**: General dashboard with filtering options
   - **Enforcement Categories**: Explore specific violation types
   - **Data Records**: View detailed enforcement records

## Navigation Menu

- **Home**: Landing page with project introduction
- **Fines Overview**: Interactive dashboard with aggregate statistics
- **Enforcement Categories**:
  - Seatbelt Analysis: Seatbelt compliance violations
  - Unlicensed Driving: Unlicensed operation violations
  - Mobile Phone Use: Mobile phone usage while driving
  - Speeding Fines: Speed limit violations
- **Data Records**: Detailed view of individual enforcement records

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Installation

No installation required! This is a static web application that runs entirely in the browser.

### Local Development

To run locally with a web server:

```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js
npx http-server
```

Then visit `http://localhost:8000` in your browser.

## Data Description

The dataset contains aggregated Australian traffic enforcement statistics for 2024, covering:
- All Australian states and territories
- Four major violation categories
- Monthly or period-based aggregations
- Violation counts and enforcement metrics

## License

[Add your license information here]

## Author

[Add author information here]
