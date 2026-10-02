# Ledger — Expense Tracker & Anomaly Detector

A lightweight, client-side personal finance tracker with automated categorization and statistical anomaly detection.

![Ledger Dashboard](https://raw.githubusercontent.com/SinghPriyanshu16/expense-tracker/main/preview.png)

## Overview

Ledger automatically classifies transactions using multi-stage heuristic and fuzzy matching, while continuously monitoring spending patterns with standard deviation ($Z$-score) models to surface unusual spikes and outlier activity.

All data persists in local browser storage (`localStorage`) with full export and import support.

## Key Features

- **Automated Categorization**: Multi-tiered classification pipeline:
  1. *User Corrections*: Remembers manual reclassifications and gives them 99% confidence.
  2. *Merchant Matching*: Direct substring lookups across 200+ popular merchants.
  3. *Semantic Keyword Scoring*: Tokenizes descriptions to match domain keywords.
  4. *Fuzzy Matching*: Levenshtein distance matching for typos, prefixes, or terminal IDs.
- **Statistical Anomaly Detection**:
  - *Outlier Amounts*: Flags transactions exceeding user-configurable $Z$-score thresholds (default $2.0\sigma$).
  - *Category Surges*: Evaluates rolling 7-day category totals against historical baselines.
  - *Frequency Anomalies*: Detects days with abnormal transaction volumes.
  - *Daily Spend Spikes*: Identifies aggregate day-over-day spending surges.
- **Interactive Visualizations**:
  - Category breakdown doughnut with percentage distributions.
  - Daily spending timelines with 7-day rolling averages.
  - Top merchant horizontal bar charts.
  - Week-over-week aggregate comparisons.
- **Data Portability**:
  - Single-click CSV export.
  - Drag-and-drop CSV importer with automated classification upon import.
  - Reset to realistic 90-day sample dataset with pre-injected anomaly cases for demonstration.

## Architecture & Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, ES6+ JavaScript.
- **Charts**: [Chart.js](https://www.chartjs.org/) (CDN).
- **Icons**: [Lucide Icons](https://lucide.dev/) (CDN).
- **Zero Build Step**: Runs directly from any modern browser without Node.js, Webpack, or external servers.

## Project Structure

```
expense-tracker/
├── index.html              # Main dashboard interface
├── .gitignore              # Git ignore rules
├── README.md               # Documentation
├── css/
│   └── styles.css          # Minimalist, human-designed light theme
└── js/
    ├── categorizer.js      # Categorization engine & learning cache
    ├── anomaly.js          # Z-score & frequency anomaly detector
    ├── data.js             # Data persistence, sample generator, & CSV parser
    ├── charts.js           # Chart.js visualization wrappers
    └── app.js              # Application controller & state coordinator
```

## Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/SinghPriyanshu16/expense-tracker.git
   ```
2. Open `index.html` in any web browser:
   - On Windows: double-click `index.html` or run:
     ```powershell
     Start-Process index.html
     ```
   - On macOS:
     ```bash
     open index.html
     ```
   - On Linux:
     ```bash
     xdg-open index.html
     ```

## License

MIT License. Free for personal and educational use.
