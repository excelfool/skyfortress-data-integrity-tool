# SkyFortress Data Integrity Tool

A web-based data integrity analysis tool for MRPeasy ERP data cleanup. This tool helps manufacturing teams identify and resolve data quality issues in their MRP system.

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import this repository or upload the files
4. Vercel will auto-detect Vite and configure the build
5. Click **"Deploy"**

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project directory
cd skyfortress-data-integrity-tool

# Deploy
vercel

# For production deployment
vercel --prod
```

### Option 3: Deploy from GitHub

1. Push this code to a GitHub repository
2. Go to [vercel.com/excel-fools-projects](https://vercel.com/excel-fools-projects)
3. Click **"Add New Project"**
4. Select the GitHub repository
5. Click **"Deploy"**

## 📁 Project Structure

```
skyfortress-data-integrity-tool/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Tailwind CSS styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
├── vercel.json          # Vercel deployment config
└── README.md            # This file
```

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📊 Features

- **Data Import**: Upload CSV exports from MRPeasy
- **Duplicate Detection**: Find duplicate parts and vendors
- **Currency Validation**: Identify currency conversion issues
- **BOM Matrix**: Visual part-to-BOM relationship matrix
- **Export Functionality**: Download cleaned data as CSV files

## 📋 Required CSV Files

Export these files from MRPeasy:

1. **articles_*.csv** - Articles/Items master data
2. **vendors_*.csv** - Vendor master data  
3. **stock_lots_*.csv** - Stock lot information
4. **parts_*.csv** - BOM parts/components data

## 🔧 Environment

- Node.js 18+ recommended
- Modern browser (Chrome, Firefox, Safari, Edge)

## 📄 License

Internal use only - SkyFortress Manufacturing

## 👥 Support

Contact the MRP Integration Team for support.
