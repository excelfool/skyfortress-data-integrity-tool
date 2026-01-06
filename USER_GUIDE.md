# SkyFortress Data Integrity Tool
## User Guide v1.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Exporting Data from MRPeasy](#exporting-data-from-mrpeasy)
4. [Using the Tool](#using-the-tool)
5. [Understanding Each Tab](#understanding-each-tab)
6. [Export Functions](#export-functions)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

The SkyFortress Data Integrity Tool is a web-based application designed to help our team identify and resolve data quality issues in MRPeasy. It analyzes four key data exports and provides actionable insights for data cleanup.

### What This Tool Does

- ✅ Identifies duplicate parts with similar descriptions
- ✅ Finds duplicate vendor records
- ✅ Detects currency conversion issues (UAH → EUR)
- ✅ Flags test data and placeholder items
- ✅ Lists BOM components with zero stock
- ✅ Identifies orphan items not used in any BOM
- ✅ Creates a visual BOM Matrix showing part usage across products

---

## Getting Started

### Step 1: Access the Tool

Open your web browser and navigate to:
```
https://skyfortress-data-integrity.vercel.app
```
(or the URL provided by your administrator)

### Step 2: Prepare Your Data

You'll need to export 4 CSV files from MRPeasy before using the tool.

---

## Exporting Data from MRPeasy

### Export 1: Articles (Items)

1. Go to **Stock → Articles** in MRPeasy
2. Click the **Export** button (top right)
3. Select **CSV** format
4. Save the file (it will be named `articles_YYYY-MM-DD.csv`)

### Export 2: Vendors

1. Go to **Procurement → Vendors** in MRPeasy
2. Click the **Export** button
3. Select **CSV** format
4. Save the file (it will be named `vendors_YYYY-MM-DD.csv`)

### Export 3: Stock Lots

1. Go to **Stock → Stock Lots** in MRPeasy
2. Click the **Export** button
3. Select **CSV** format
4. Save the file (it will be named `stock_lots_YYYY-MM-DD.csv`)

### Export 4: Parts (BOMs)

1. Go to **Stock → Articles** in MRPeasy
2. Select **Parts** view or export BOM data
3. Click the **Export** button
4. Select **CSV** format
5. Save the file (it will be named `parts_YYYY-MM-DD.csv`)

---

## Using the Tool

### Uploading Files

1. When you open the tool, you'll see 4 upload boxes
2. Click each box to select the corresponding CSV file:
   - **Articles** → Upload `articles_*.csv`
   - **Vendors** → Upload `vendors_*.csv`
   - **Stock Lots** → Upload `stock_lots_*.csv`
   - **Parts (BOMs)** → Upload `parts_*.csv`
3. Each box turns green ✅ when successfully loaded
4. Once all 4 files are loaded, the analysis begins automatically

### Navigation

After loading files, you'll see:
- **Left sidebar**: Navigation tabs for different analysis views
- **Main area**: Data tables and analysis results
- **Export section**: Green buttons to download data

---

## Understanding Each Tab

### 📊 Summary Tab

The **Executive Summary** shows:
- Total counts (Items, Vendors, Stock Lots, BOM Entries)
- Issue counts with severity levels
- Progress bars showing how many issues you've marked as fixed
- Financial impact (Currency Overstatement, Orphan Inventory Value)

**Severity Levels:**
- 🔴 **CRITICAL**: Requires immediate attention (e.g., currency issues)
- 🟠 **HIGH**: Important to fix soon (e.g., duplicate parts)
- 🟡 **MEDIUM**: Should be reviewed (e.g., duplicate vendors)
- 🟢 **LOW**: Minor issues (e.g., test data)
- 🔵 **INFO**: Informational only (e.g., orphan items)

### 📐 BOM Matrix Tab

Shows which parts are used in which BOMs:
- **Rows**: Parts (Part No. and Description)
- **Columns**: BOM names (displayed vertically)
- **Green cells**: Part is used in that BOM (quantity shown)
- **White cells**: Part is not used in that BOM

**Features:**
- Filter by part number or description
- Checkbox filters to show only used/unused parts
- Export to CSV for further analysis

### 📦 Dup Parts Tab

Lists potentially duplicate part numbers:
- Shows two part numbers side by side
- Similarity percentage (90%+ considered duplicate)
- Stock quantities for each
- Whether parts are used in BOMs
- Suggested action (MERGE or REVIEW)

**How to Use:**
1. Review each pair
2. If they're truly duplicates, note the preferred part number
3. Click "Fix" to mark as reviewed
4. Update MRPeasy to merge or delete duplicates

### 👥 Dup Vendors Tab

Lists potentially duplicate vendor records:
- Shows vendor numbers and names side by side
- Currency for each vendor
- Match type (EXACT or SIMILAR)

**Action Items:**
- EXACT matches: Usually safe to delete one
- SIMILAR matches: Review carefully, may be different vendors

### 💰 Currency Tab

**Critical financial issue!**

Shows stock lots where UAH values may have been recorded as EUR:
- Current cost (what's in the system)
- Likely correct cost (calculated using UAH→EUR conversion)
- Overstatement amount
- Total financial impact

**Root Cause:** Using Inventory Adjustments instead of Purchase Orders bypasses automatic currency conversion.

### 🧪 Test Data Tab

Lists items that appear to be test or demo data:
- Items with "test" or "demo" in description
- Part numbers starting with "9999"
- Items with Excel errors (like "1.23E+15")

**Action:** Delete items that are clearly test data and not used in BOMs.

### ⚠️ Zero Stock Tab

Lists BOM components that currently have zero stock:
- Part number and description
- Whether it's a procured item
- Which BOMs use this part

**Action:** Review for procurement needs or BOM errors.

### 📋 Not in BOM Tab

Lists items with stock that aren't used in any BOM:
- Sorted by stock value (highest first)
- Shows total orphan inventory value

**Possible Actions:**
- Add to appropriate BOMs if needed
- Sell or dispose of obsolete stock
- Reclassify items

---

## Export Functions

### Export Buttons (Left Sidebar)

Click any green export button to download data:

| Button | Downloads | Use For |
|--------|-----------|---------|
| ⬇️ Articles | `articles_export.csv` | Updated items list |
| ⬇️ Vendors | `vendors_export.csv` | Updated vendors list |
| ⬇️ Lots | `stock_lots_export.csv` | Stock lot data |
| ⬇️ BOMs | `bom_export.csv` | BOM parts data |
| ⬇️ Matrix | `bom_matrix_export.csv` | Part-to-BOM matrix |

### How Export Works

1. Click the export button
2. Your browser downloads the CSV file automatically
3. File saves to your default Downloads folder
4. Open in Excel for further analysis or import back to MRPeasy

### Matrix Export Special Notes

The BOM Matrix export creates a pivot-table style CSV:
- Each row is a part
- Each column is a BOM
- Cell values are quantities
- Useful for identifying common parts across products

---

## Troubleshooting

### Files Won't Upload

- Ensure files are in CSV format (not Excel .xlsx)
- Check file size (very large files may take time)
- Try refreshing the page and re-uploading

### No Data Showing

- Verify all 4 files are uploaded (green checkmarks)
- Check that CSV files contain data (not empty)
- Ensure CSV columns match expected MRPeasy format

### Export Not Working

- Check browser popup blocker settings
- Try a different browser
- Ensure you have write permissions to Downloads folder

### Incorrect Counts

- Re-export fresh data from MRPeasy
- Verify you're using the correct CSV files
- Check for corrupted CSV formatting

---

## Best Practices

1. **Export Fresh Data**: Always use current MRPeasy exports
2. **Work Systematically**: Address issues by severity (CRITICAL first)
3. **Document Changes**: Note what you fix in MRPeasy
4. **Verify Fixes**: Re-run the tool after making corrections
5. **Regular Reviews**: Run this analysis monthly

---

## Support

For questions or issues, contact:
- MRP Integration Team
- Email: mrp-support@skyfortress.com

---

*SkyFortress Data Integrity Tool v1.0 - January 2026*
