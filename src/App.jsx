import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';

const similarity = (s1, s2) => {
  if (!s1 || !s2) return 0;
  const str1 = String(s1).toLowerCase().trim();
  const str2 = String(s2).toLowerCase().trim();
  if (str1 === str2) return 1;
  if (str1.length < 3 || str2.length < 3) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.indexOf(shorter[i]) !== -1) matches++;
  }
  
  const charRatio = matches / longer.length;
  let prefixLen = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) prefixLen++;
    else break;
  }
  const prefixRatio = prefixLen / Math.max(str1.length, str2.length);
  
  return Math.min(1, charRatio * 0.6 + prefixRatio * 0.4 + (str1.includes(str2) || str2.includes(str1) ? 0.3 : 0));
};

export default function App() {
  const [articles, setArticles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stockLots, setStockLots] = useState([]);
  const [bom, setBom] = useState([]);
  const [loadStatus, setLoadStatus] = useState({ articles: false, vendors: false, stockLots: false, bom: false });
  const [corrections, setCorrections] = useState({
    duplicateParts: {}, duplicateVendors: {}, currencyIssues: {},
    testData: {}, zeroStock: {}, orphanItems: {}
  });
  const [activeTab, setActiveTab] = useState('summary');
  const [matrixFilter, setMatrixFilter] = useState('');
  
  // Filter states for BOM matrix
  const [showUsedInBom, setShowUsedInBom] = useState(true);
  const [showNotUsedInBom, setShowNotUsedInBom] = useState(true);

  const parseCSV = useCallback((file, type) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map((row, idx) => ({ ...row, _id: `${type}_${idx}` }));
        switch(type) {
          case 'articles': setArticles(data); setLoadStatus(s => ({...s, articles: true})); break;
          case 'vendors': setVendors(data); setLoadStatus(s => ({...s, vendors: true})); break;
          case 'stockLots': setStockLots(data); setLoadStatus(s => ({...s, stockLots: true})); break;
          case 'bom': setBom(data); setLoadStatus(s => ({...s, bom: true})); break;
        }
      }
    });
  }, []);

  const handleFileUpload = useCallback((e, type) => {
    const file = e.target.files[0];
    if (file) parseCSV(file, type);
  }, [parseCSV]);

  const bomComponents = useMemo(() => {
    const components = new Set();
    const products = new Set();
    bom.forEach(row => {
      if (row['Part No.']) components.add(row['Part No.']);
      if (row['Product number']) products.add(row['Product number']);
    });
    return { components, products, all: new Set([...components, ...products]) };
  }, [bom]);

  const bomMatrix = useMemo(() => {
    if (bom.length === 0) return { parts: [], boms: [], matrix: {} };
    
    const bomSet = new Map();
    bom.forEach(row => {
      const bomKey = row['BOM name'] || row['Product name'] || row['Product number'];
      if (bomKey && !bomSet.has(bomKey)) {
        bomSet.set(bomKey, { name: bomKey, number: row['BOM number'] || row['Product number'] });
      }
    });
    const boms = Array.from(bomSet.values());
    
    const partSet = new Map();
    bom.forEach(row => {
      const pn = row['Part No.'];
      if (pn && !partSet.has(pn)) {
        partSet.set(pn, { partNo: pn, description: row['Part description'] || '' });
      }
    });
    const parts = Array.from(partSet.values());
    
    const matrix = {};
    bom.forEach(row => {
      const pn = row['Part No.'];
      const bomName = row['BOM name'] || row['Product name'] || row['Product number'];
      const qty = parseFloat(row['Quantity']) || 0;
      if (pn && bomName) {
        if (!matrix[pn]) matrix[pn] = {};
        matrix[pn][bomName] = (matrix[pn][bomName] || 0) + qty;
      }
    });
    
    return { parts, boms, matrix };
  }, [bom]);

  // Filtered matrix data with text filter AND checkbox filters
  const filteredMatrix = useMemo(() => {
    let filteredParts = bomMatrix.parts;
    
    // Apply text filter
    if (matrixFilter) {
      const filter = matrixFilter.toLowerCase();
      filteredParts = filteredParts.filter(p => 
        p.partNo.toLowerCase().includes(filter) || p.description.toLowerCase().includes(filter)
      );
    }
    
    // Apply checkbox filters
    if (!showUsedInBom || !showNotUsedInBom) {
      filteredParts = filteredParts.filter(part => {
        const isUsedInAnyBom = bomMatrix.boms.some(b => bomMatrix.matrix[part.partNo]?.[b.name]);
        
        if (showUsedInBom && !showNotUsedInBom) {
          return isUsedInAnyBom;
        } else if (!showUsedInBom && showNotUsedInBom) {
          return !isUsedInAnyBom;
        }
        return true;
      });
    }
    
    return { ...bomMatrix, parts: filteredParts };
  }, [bomMatrix, matrixFilter, showUsedInBom, showNotUsedInBom]);

  const duplicateParts = useMemo(() => {
    if (articles.length === 0) return [];
    const duplicates = [];
    const seen = new Set();
    const groups = {};
    
    articles.forEach((item) => {
      const desc = String(item['Part description'] || '').toLowerCase();
      if (desc.length >= 4) {
        const key = desc.substring(0, 4);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    });
    
    Object.values(groups).forEach(group => {
      if (group.length < 2 || group.length > 25) return;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const item1 = group[i], item2 = group[j];
          const pn1 = item1['Part No.'], pn2 = item2['Part No.'];
          const pairKey = [pn1, pn2].sort().join('|');
          if (seen.has(pairKey)) continue;
          
          const desc1 = String(item1['Part description'] || '');
          const desc2 = String(item2['Part description'] || '');
          if (desc1.includes('TURRET_') || desc1.includes('TRAILER_')) continue;
          
          const sim = similarity(desc1, desc2);
          if (sim >= 0.90) {
            seen.add(pairKey);
            duplicates.push({
              id: pairKey, pn1, pn2,
              desc1: desc1.substring(0, 45), desc2: desc2.substring(0, 45),
              stock1: parseFloat(item1['In stock']) || 0,
              stock2: parseFloat(item2['In stock']) || 0,
              similarity: Math.round(sim * 100),
              inBom: bomComponents.components.has(pn1) || bomComponents.components.has(pn2),
              action: sim >= 0.97 ? 'MERGE' : 'REVIEW'
            });
          }
        }
      }
    });
    return duplicates.slice(0, 80);
  }, [articles, bomComponents]);

  const duplicateVendors = useMemo(() => {
    if (vendors.length === 0) return [];
    const duplicates = [];
    for (let i = 0; i < vendors.length; i++) {
      for (let j = i + 1; j < vendors.length; j++) {
        const v1 = vendors[i], v2 = vendors[j];
        const name1 = String(v1['Name'] || ''), name2 = String(v2['Name'] || '');
        if (name1.length < 3 || name2.length < 3) continue;
        const sim = similarity(name1, name2);
        if (sim >= 0.85) {
          duplicates.push({
            id: `${v1['Number']}|${v2['Number']}`,
            vn1: v1['Number'], vn2: v2['Number'],
            name1: name1.substring(0, 35), name2: name2.substring(0, 35),
            currency1: v1['Currency'], currency2: v2['Currency'],
            similarity: Math.round(sim * 100),
            matchType: sim >= 0.97 ? 'EXACT' : 'SIMILAR',
            action: sim >= 0.97 ? 'DELETE' : 'REVIEW'
          });
        }
      }
    }
    return duplicates;
  }, [vendors]);

  const currencyIssues = useMemo(() => {
    if (stockLots.length === 0 || vendors.length === 0) return [];
    const issues = [];
    const vendorCurrency = {};
    vendors.forEach(v => { vendorCurrency[v['Number']] = v['Currency']; });
    
    stockLots.forEach(lot => {
      const vendorNo = lot['Vendor number'];
      const unitCost = parseFloat(String(lot['Unit cost'] || '0').replace(',', '.')) || 0;
      const currency = vendorCurrency[vendorNo];
      if (currency === 'UAH' && unitCost > 50) {
        const likelyCorrect = unitCost / 45;
        issues.push({
          id: lot['Lot'], lot: lot['Lot'], partNo: lot['Part No.'],
          description: String(lot['Part description'] || '').substring(0, 40),
          vendorNo, vendorName: (lot['Vendor name'] || '').substring(0, 25),
          vendorCurrency: currency, currentCost: unitCost,
          likelyCost: likelyCorrect, overstatement: unitCost - likelyCorrect,
          inStock: parseFloat(lot['In stock']) || 0
        });
      }
    });
    return issues;
  }, [stockLots, vendors]);

  const testData = useMemo(() => {
    if (articles.length === 0) return [];
    const items = [];
    articles.forEach(item => {
      const pn = String(item['Part No.'] || '');
      const desc = String(item['Part description'] || '');
      if (desc.toUpperCase().includes('TEST DATA SHEET')) return;
      
      let isTest = false, reason = '';
      if (desc.toLowerCase().includes('test') && !desc.toLowerCase().includes('test data')) {
        isTest = true; reason = "Contains 'test'";
      } else if (desc.toLowerCase().includes('demo')) {
        isTest = true; reason = "Contains 'demo'";
      } else if (pn.startsWith('9999')) {
        isTest = true; reason = "Placeholder";
      } else if (pn.includes('E+')) {
        isTest = true; reason = "Excel error";
      }
      
      if (isTest) {
        const inBom = bomComponents.all.has(pn);
        const stock = parseFloat(item['In stock']) || 0;
        items.push({
          id: pn, partNo: pn, description: desc.substring(0, 50),
          inStock: stock, cost: parseFloat(item['Cost']) || 0,
          inBom, reason, action: !inBom && stock === 0 ? 'DELETE' : 'REVIEW'
        });
      }
    });
    return items;
  }, [articles, bomComponents]);

  const zeroStockBom = useMemo(() => {
    if (articles.length === 0 || bom.length === 0) return [];
    const items = [];
    const articleMap = {};
    articles.forEach(a => { articleMap[a['Part No.']] = a; });
    
    bomComponents.components.forEach(pn => {
      const article = articleMap[pn];
      if (article && (parseFloat(article['In stock']) || 0) === 0) {
        const products = bom.filter(b => b['Part No.'] === pn).map(b => b['Product number']).slice(0, 3);
        items.push({
          id: pn, partNo: pn,
          description: String(article['Part description'] || '').substring(0, 45),
          inStock: 0, unitCost: parseFloat(article['Cost']) || 0,
          procured: article['Is procured item'] === '1' ? 'Yes' : 'No',
          vendor: String(article['Vendor name'] || '').substring(0, 25),
          usedIn: products.join(', '), impact: 'CRITICAL'
        });
      }
    });
    return items;
  }, [articles, bom, bomComponents]);

  const orphanItems = useMemo(() => {
    if (articles.length === 0) return [];
    const items = [];
    articles.forEach(item => {
      const pn = item['Part No.'];
      const stock = parseFloat(item['In stock']) || 0;
      if (!bomComponents.all.has(pn) && stock > 0) {
        const cost = parseFloat(item['Cost']) || 0;
        items.push({
          id: pn, partNo: pn,
          description: String(item['Part description'] || '').substring(0, 45),
          inStock: stock, unitCost: cost, stockValue: stock * cost,
          group: item['Group name'] || '',
          procured: item['Is procured item'] === '1' ? 'Yes' : 'No'
        });
      }
    });
    return items.sort((a, b) => b.stockValue - a.stockValue);
  }, [articles, bomComponents]);

  const stats = useMemo(() => {
    const getResolved = (cat, items) => items.filter(i => corrections[cat][i.id]?.resolved).length;
    const currOverstatement = currencyIssues.reduce((s, i) => 
      corrections.currencyIssues[i.id]?.resolved ? s : s + (i.overstatement * i.inStock), 0);
    const orphanValue = orphanItems.reduce((s, i) => 
      corrections.orphanItems[i.id]?.resolved ? s : s + i.stockValue, 0);
    
    return {
      totalItems: articles.length, totalVendors: vendors.length,
      totalLots: stockLots.length, totalBom: bom.length,
      uniqueBoms: bomMatrix.boms.length, uniqueParts: bomMatrix.parts.length,
      dupParts: { total: duplicateParts.length, resolved: getResolved('duplicateParts', duplicateParts) },
      dupVendors: { total: duplicateVendors.length, resolved: getResolved('duplicateVendors', duplicateVendors),
        exact: duplicateVendors.filter(d => d.matchType === 'EXACT').length },
      currency: { total: currencyIssues.length, resolved: getResolved('currencyIssues', currencyIssues), overstatement: currOverstatement },
      test: { total: testData.length, resolved: getResolved('testData', testData) },
      zero: { total: zeroStockBom.length, resolved: getResolved('zeroStock', zeroStockBom) },
      orphan: { total: orphanItems.length, resolved: getResolved('orphanItems', orphanItems), value: orphanValue }
    };
  }, [articles, vendors, stockLots, bom, bomMatrix, duplicateParts, duplicateVendors, currencyIssues, testData, zeroStockBom, orphanItems, corrections]);

  const markResolved = useCallback((category, id) => {
    setCorrections(prev => ({
      ...prev,
      [category]: { ...prev[category], [id]: { resolved: !prev[category][id]?.resolved } }
    }));
  }, []);

  // Export CSV function - downloads file to user's computer
  const exportCSV = useCallback((type) => {
    const dataMap = { articles, vendors, stockLots, bom };
    const nameMap = { 
      articles: 'articles_export.csv', 
      vendors: 'vendors_export.csv', 
      stockLots: 'stock_lots_export.csv', 
      bom: 'bom_export.csv' 
    };
    
    const data = dataMap[type];
    if (!data || data.length === 0) {
      alert(`No ${type} data to export`);
      return;
    }
    
    // Remove internal _id field before export
    const cleanData = data.map(({ _id, ...rest }) => rest);
    const csv = Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nameMap[type];
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [articles, vendors, stockLots, bom]);

  // Export BOM Matrix function
  const exportMatrix = useCallback(() => {
    const { parts, boms, matrix } = bomMatrix;
    
    if (parts.length === 0 || boms.length === 0) {
      alert('No matrix data to export');
      return;
    }
    
    const rows = parts.map(part => {
      const row = { 'Part No.': part.partNo, 'Description': part.description };
      boms.forEach(b => { 
        row[b.name] = matrix[part.partNo]?.[b.name] || ''; 
      });
      return row;
    });
    
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bom_matrix_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [bomMatrix]);

  const allLoaded = loadStatus.articles && loadStatus.vendors && loadStatus.stockLots && loadStatus.bom;

  const ProgressBar = ({ resolved, total }) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${total > 0 ? (resolved / total) * 100 : 0}%` }} />
    </div>
  );

  const Badge = ({ type }) => {
    const colors = { CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-green-500', INFO: 'bg-blue-500' };
    return <span className={`px-2 py-0.5 rounded text-xs text-white font-bold ${colors[type]}`}>{type}</span>;
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: '📊' },
    { id: 'matrix', label: 'BOM Matrix', icon: '📐', count: stats.uniqueBoms },
    { id: 'dupParts', label: 'Dup Parts', count: stats.dupParts.total, icon: '📦' },
    { id: 'dupVendors', label: 'Dup Vendors', count: stats.dupVendors.total, icon: '👥' },
    { id: 'currency', label: 'Currency', count: stats.currency.total, icon: '💰' },
    { id: 'test', label: 'Test Data', count: stats.test.total, icon: '🧪' },
    { id: 'zero', label: 'Zero Stock', count: stats.zero.total, icon: '⚠️' },
    { id: 'orphan', label: 'Not in BOM', count: stats.orphan.total, icon: '📋' }
  ];

  const DataTable = ({ title, columns, data, renderRow, category }) => (
    <div>
      <h2 className="text-lg font-bold text-blue-900 mb-3">{title}</h2>
      <div className="bg-white rounded-lg shadow overflow-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="bg-blue-900 text-white sticky top-0">
            <tr>{columns.map((col, i) => <th key={i} className="px-2 py-2 text-left">{col}</th>)}</tr>
          </thead>
          <tbody>
            {data.map(item => {
              const isResolved = corrections[category][item.id]?.resolved;
              const cells = renderRow(item);
              return (
                <tr key={item.id} className={`border-t hover:bg-gray-50 ${isResolved ? 'bg-green-50' : ''}`}>
                  {cells.map((cell, i) => <td key={i} className="px-2 py-1.5">{cell}</td>)}
                  <td className="px-2 py-1.5">
                    <button onClick={() => markResolved(category, item.id)}
                      className={`px-2 py-1 rounded text-xs ${isResolved ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
                      {isResolved ? '✓' : 'Fix'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Column widths for BOM Matrix
  const PART_NO_WIDTH = 70;
  const DESC_WIDTH = 280;
  const BOM_COL_WIDTH = 28;
  const HEADER_HEIGHT = 220;

  return (
    <div className="min-h-screen bg-gray-100 text-sm">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-3 shadow-lg">
        <h1 className="text-lg font-bold">SkyFortress Data Integrity Tool</h1>
        <p className="text-blue-200 text-xs">MRPeasy Data Cleanup - Jan 2026</p>
      </header>

      {!allLoaded ? (
        <div className="p-4 max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-base font-bold mb-3">📁 Import CSV Files</h2>
            <p className="text-xs text-gray-500 mb-3">Export CSV files from MRPeasy and upload them here to analyze data integrity issues.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'articles', label: 'Articles', file: 'articles_*.csv' },
                { type: 'vendors', label: 'Vendors', file: 'vendors_*.csv' },
                { type: 'stockLots', label: 'Stock Lots', file: 'stock_lots_*.csv' },
                { type: 'bom', label: 'Parts (BOMs)', file: 'parts_*.csv' }
              ].map(({ type, label, file }) => (
                <label key={type} className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition
                  ${loadStatus[type] ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                  <div className="text-2xl mb-1">{loadStatus[type] ? '✅' : '📄'}</div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-500">{loadStatus[type] ? 'Loaded!' : file}</div>
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, type)} />
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex">
          <nav className="w-36 bg-white shadow-lg p-2 space-y-1 text-xs flex-shrink-0">
            {tabs.map(({ id, label, count, icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-1 px-2 py-1.5 rounded text-left transition
                  ${activeTab === id ? 'bg-blue-900 text-white' : 'hover:bg-gray-100'}`}>
                <span>{icon}</span>
                <span className="flex-1 truncate">{label}</span>
                {count !== undefined && <span className={`px-1 rounded text-xs ${activeTab === id ? 'bg-white text-blue-900' : 'bg-gray-200'}`}>{count}</span>}
              </button>
            ))}
            
            {/* Export Section */}
            <div className="pt-2 border-t mt-2">
              <div className="text-xs font-bold text-gray-500 mb-1">Export</div>
              <button onClick={() => exportCSV('articles')}
                className="w-full text-left px-2 py-1.5 text-xs text-green-700 hover:bg-green-50 rounded flex items-center gap-1 font-medium">
                <span className="text-green-500">⬇️</span> Articles
              </button>
              <button onClick={() => exportCSV('vendors')}
                className="w-full text-left px-2 py-1.5 text-xs text-green-700 hover:bg-green-50 rounded flex items-center gap-1 font-medium">
                <span className="text-green-500">⬇️</span> Vendors
              </button>
              <button onClick={() => exportCSV('stockLots')}
                className="w-full text-left px-2 py-1.5 text-xs text-green-700 hover:bg-green-50 rounded flex items-center gap-1 font-medium">
                <span className="text-green-500">⬇️</span> Lots
              </button>
              <button onClick={() => exportCSV('bom')}
                className="w-full text-left px-2 py-1.5 text-xs text-green-700 hover:bg-green-50 rounded flex items-center gap-1 font-medium">
                <span className="text-green-500">⬇️</span> BOMs
              </button>
              <button onClick={exportMatrix}
                className="w-full text-left px-2 py-1.5 text-xs text-purple-700 hover:bg-purple-50 rounded flex items-center gap-1 font-medium">
                <span className="text-purple-500">⬇️</span> Matrix
              </button>
            </div>
          </nav>

          <main className="flex-1 p-3 overflow-auto">
            {activeTab === 'summary' && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-blue-900">Executive Summary</h2>
                <div className="grid grid-cols-4 gap-2">
                  {[{ l: 'Items', v: stats.totalItems }, { l: 'Vendors', v: stats.totalVendors }, { l: 'Stock Lots', v: stats.totalLots }, { l: 'BOM Entries', v: stats.totalBom }].map(({ l, v }) => (
                    <div key={l} className="bg-blue-50 border-l-4 border-blue-500 rounded p-2">
                      <div className="text-xs text-gray-600">{l}</div>
                      <div className="text-base font-bold">{v.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-purple-50 border-l-4 border-purple-500 rounded p-2">
                    <div className="text-xs text-gray-600">Unique BOMs</div>
                    <div className="text-base font-bold">{stats.uniqueBoms}</div>
                  </div>
                  <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded p-2">
                    <div className="text-xs text-gray-600">BOM Parts</div>
                    <div className="text-base font-bold">{stats.uniqueParts}</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-blue-900 text-white px-3 py-1.5 font-bold text-sm">Issues</div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr><th className="px-2 py-1.5 text-left">Issue</th><th className="px-2 py-1.5 text-center">Count</th><th className="px-2 py-1.5 text-center">Fixed</th><th className="px-2 py-1.5 w-20">Progress</th><th className="px-2 py-1.5 text-center">Severity</th></tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Duplicate Parts', ...stats.dupParts, sev: 'HIGH' },
                        { label: `Dup Vendors`, ...stats.dupVendors, sev: 'MEDIUM' },
                        { label: 'Currency Issues', ...stats.currency, sev: 'CRITICAL' },
                        { label: 'Test Data', ...stats.test, sev: 'LOW' },
                        { label: 'Zero Stock BOMs', ...stats.zero, sev: 'HIGH' },
                        { label: 'Items Not in BOMs', ...stats.orphan, sev: 'INFO' }
                      ].map(({ label, total, resolved, sev }) => (
                        <tr key={label} className="border-t"><td className="px-2 py-1.5">{label}</td><td className="px-2 py-1.5 text-center font-bold">{total}</td><td className="px-2 py-1.5 text-center text-green-600">{resolved}</td><td className="px-2 py-1.5"><ProgressBar resolved={resolved} total={total} /></td><td className="px-2 py-1.5 text-center"><Badge type={sev} /></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs text-gray-600">Currency Overstatement</div>
                    <div className="text-lg font-bold text-red-600">€{stats.currency.overstatement.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="text-xs text-gray-600">Orphan Inventory</div>
                    <div className="text-lg font-bold text-yellow-600">€{stats.orphan.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              </div>
            )}

            {/* BOM MATRIX TAB */}
            {activeTab === 'matrix' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-blue-900">BOM Matrix ({filteredMatrix.parts.length} parts × {filteredMatrix.boms.length} BOMs)</h2>
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Filter parts..." value={matrixFilter} onChange={(e) => setMatrixFilter(e.target.value)} className="px-2 py-1 border rounded text-xs w-40" />
                    <button onClick={exportMatrix} className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">⬇️ Export</button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow overflow-auto" style={{ maxHeight: '70vh' }}>
                  <table className="text-xs border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr>
                        <th 
                          className="sticky left-0 z-30 bg-gray-800 text-white px-2 py-2 text-left border-r-2 border-gray-600 align-bottom font-bold"
                          style={{ width: `${PART_NO_WIDTH}px`, minWidth: `${PART_NO_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
                        >
                          Part No.
                        </th>
                        <th 
                          className="sticky z-30 bg-gray-800 text-white px-3 py-2 text-left border-r-2 border-gray-600 align-bottom font-bold"
                          style={{ left: `${PART_NO_WIDTH}px`, width: `${DESC_WIDTH}px`, minWidth: `${DESC_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
                        >
                          Part Description
                        </th>
                        {filteredMatrix.boms.map((b, idx) => (
                          <th 
                            key={idx} 
                            className="bg-amber-500 border-r border-amber-400 p-0"
                            style={{ width: `${BOM_COL_WIDTH}px`, minWidth: `${BOM_COL_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
                          >
                            <div 
                              className="flex items-start justify-center h-full pt-2"
                              style={{ width: `${BOM_COL_WIDTH}px` }}
                            >
                              <span
                                className="text-white font-semibold text-xs whitespace-nowrap"
                                style={{ 
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'mixed',
                                  transform: 'rotate(180deg)',
                                  maxHeight: `${HEADER_HEIGHT - 10}px`,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={b.name}
                              >
                                {b.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMatrix.parts.map((part, rowIdx) => (
                        <tr key={part.partNo} className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td 
                            className="sticky left-0 z-10 px-2 py-1.5 font-mono text-blue-700 border-r-2 border-gray-300 font-medium text-xs"
                            style={{ 
                              width: `${PART_NO_WIDTH}px`, 
                              minWidth: `${PART_NO_WIDTH}px`,
                              backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f9fafb'
                            }}
                          >
                            {part.partNo}
                          </td>
                          <td 
                            className="sticky z-10 px-3 py-1.5 border-r-2 border-gray-300 text-xs truncate"
                            style={{ 
                              left: `${PART_NO_WIDTH}px`, 
                              width: `${DESC_WIDTH}px`, 
                              minWidth: `${DESC_WIDTH}px`,
                              maxWidth: `${DESC_WIDTH}px`,
                              backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f9fafb'
                            }}
                            title={part.description}
                          >
                            {part.description}
                          </td>
                          {filteredMatrix.boms.map((b, colIdx) => {
                            const qty = filteredMatrix.matrix[part.partNo]?.[b.name];
                            return (
                              <td 
                                key={colIdx} 
                                className={`text-center border-r border-gray-200 ${qty ? 'bg-green-100 font-bold text-green-800' : ''}`}
                                style={{ width: `${BOM_COL_WIDTH}px`, minWidth: `${BOM_COL_WIDTH}px` }}
                              >
                                {qty ? (Number.isInteger(qty) ? qty : qty.toFixed(1)) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* FILTER CHECKBOXES */}
                <div className="flex gap-6 text-xs text-gray-700 items-center bg-white p-3 rounded-lg shadow">
                  <span className="font-bold text-gray-500">Filters:</span>
                  
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-green-50 px-2 py-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={showUsedInBom} 
                      onChange={(e) => setShowUsedInBom(e.target.checked)}
                      className="w-4 h-4 accent-green-600"
                    />
                    <div className="w-5 h-5 bg-green-500 border border-green-600 rounded"></div>
                    <span>Part used in BOM (qty shown)</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={showNotUsedInBom} 
                      onChange={(e) => setShowNotUsedInBom(e.target.checked)}
                      className="w-4 h-4 accent-gray-600"
                    />
                    <div className="w-5 h-5 bg-white border border-gray-300 rounded"></div>
                    <span>Part not used in BOM</span>
                  </label>
                  
                  <div className="ml-auto text-gray-500">
                    Showing {filteredMatrix.parts.length} of {bomMatrix.parts.length} parts
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dupParts' && <DataTable title={`Duplicate Parts (${duplicateParts.length})`} columns={['PN 1', 'Desc 1', 'Stk', 'PN 2', 'Desc 2', 'Stk', 'Sim', 'BOM', 'Act', '']} data={duplicateParts} category="duplicateParts" renderRow={(i) => [i.pn1, i.desc1, i.stock1, i.pn2, i.desc2, i.stock2, `${i.similarity}%`, i.inBom?'✓':'', i.action]} />}
            {activeTab === 'dupVendors' && <DataTable title={`Duplicate Vendors (${duplicateVendors.length})`} columns={['V#1', 'Name 1', 'Cur', 'V#2', 'Name 2', 'Cur', 'Sim', 'Type', '']} data={duplicateVendors} category="duplicateVendors" renderRow={(i) => [i.vn1, i.name1, i.currency1, i.vn2, i.name2, i.currency2, `${i.similarity}%`, i.matchType]} />}
            {activeTab === 'currency' && <DataTable title={`Currency Issues (${currencyIssues.length})`} columns={['Lot', 'Part', 'Desc', 'Vendor', 'Cur', 'Current€', 'Likely€', 'Over€', 'Qty', '']} data={currencyIssues.slice(0,80)} category="currencyIssues" renderRow={(i) => [i.lot, i.partNo, i.description, i.vendorName, i.vendorCurrency, `€${i.currentCost.toFixed(0)}`, `€${i.likelyCost.toFixed(0)}`, `€${i.overstatement.toFixed(0)}`, i.inStock]} />}
            {activeTab === 'test' && <DataTable title={`Test Data (${testData.length})`} columns={['Part No.', 'Description', 'Stock', 'Cost', 'BOM', 'Reason', 'Action', '']} data={testData} category="testData" renderRow={(i) => [i.partNo, i.description, i.inStock, `€${i.cost}`, i.inBom?'Y':'N', i.reason, i.action]} />}
            {activeTab === 'zero' && <DataTable title={`Zero Stock BOMs (${zeroStockBom.length})`} columns={['Part', 'Description', 'Stk', 'Cost', 'Proc', 'Vendor', 'Used In', '']} data={zeroStockBom.slice(0,80)} category="zeroStock" renderRow={(i) => [i.partNo, i.description, <span className="text-red-600 font-bold">0</span>, `€${i.unitCost}`, i.procured, i.vendor, i.usedIn]} />}
            {activeTab === 'orphan' && <DataTable title={`Items Not in BOMs (${orphanItems.length}) - €${stats.orphan.value.toLocaleString()}`} columns={['Part', 'Description', 'Stock', 'Unit€', 'Value€', 'Group', 'Proc', '']} data={orphanItems.slice(0,80)} category="orphanItems" renderRow={(i) => [i.partNo, i.description, i.inStock, `€${i.unitCost}`, <span className="font-bold text-orange-600">€{i.stockValue.toLocaleString()}</span>, i.group, i.procured]} />}
          </main>
        </div>
      )}
    </div>
  );
}
