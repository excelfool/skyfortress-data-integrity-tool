import React, { useState, useMemo, useCallback } from 'react';
import { BarChart3, FileText, Users, DollarSign, Beaker, AlertTriangle, Package, Grid3X3, Download, Upload, Check, X, Search, Languages, GitBranch } from 'lucide-react';

// ============================================================================
// SKYFORTRESS DATA INTEGRITY TOOL v11
// Enhanced with Cyrillic-Latin Transliteration & Root-Based Detection
// January 2026
// ============================================================================

// Ukrainian Cyrillic to Latin Transliteration Map
const CYRILLIC_TO_LATIN = {
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E',
  'Є': 'YE', 'Ж': 'ZH', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'YI', 'Й': 'Y',
  'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R',
  'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'KH', 'Ц': 'TS', 'Ч': 'CH',
  'Ш': 'SH', 'Щ': 'SHCH', 'Ь': '', 'Ю': 'YU', 'Я': 'YA', 'Ъ': '', 'Ы': 'Y',
  'Э': 'E', 'Ё': 'YO',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e',
  'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y',
  'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya', 'ъ': '', 'ы': 'y',
  'э': 'e', 'ё': 'yo'
};

// Common business words to exclude from root matching
const COMMON_BUSINESS_WORDS = new Set([
  'TOVARYSTVO', 'OBMEZHENOYU', 'VIDPOVIDALNISTYU', 'VIDPOVIDALNIST',
  'PRYVATNE', 'PIDPRYYEMSTVO', 'PIDPRYYEMETS', 'AKTSIONERNE',
  'FIZYCHNA', 'OSOBA', 'HRUP', 'GROUP', 'GRUP',
  'COMPANY', 'KOMPANIYA', 'CORP', 'CORPORATION', 'ENTERPRISE',
  'LIMITED', 'GMBH', 'SPZOO', 'SPOLKA',
  'UKRAINE', 'UKRAYINA', 'UKRAINA', 'KYIV', 'KIEV', 'KHARKIV', 'ODESA',
  'LVIV', 'DNIPRO', 'SHENZHEN', 'CHINA', 'KYTAY',
  'INTERNATIONAL', 'MIZHNARODNYI', 'NATIONAL', 'NATSIONALNYI',
  'GLOBAL', 'HLOBALNYI', 'WORLD', 'SVIT',
  'TRADING', 'TREYDINH', 'SERVICE', 'SERVIS', 'SERVICES', 'SERVISY',
  'SYSTEMS', 'SYSTEMY', 'TECHNOLOGY', 'TEKHNOLOHIYI', 'TECH', 'TEKH',
  'PLUS', 'PLYUS', 'CENTER', 'TSENTR', 'CENTR', 'TRADE',
  'MARKET', 'RYNOK', 'INVEST', 'DEVELOPMENT', 'ROZVYTOK',
  'INDUSTRIAL', 'PROMYSLOVYI', 'PRODUCTION', 'VYROBNYTSTVO', 'MANUFACTURING',
  'LOGISTICS', 'LOHISTYKA', 'SUPPLY', 'POSTACHANNYA', 'SALES', 'PRODAZHI',
  'ELECTRONIC', 'ELEKTRONIKA', 'ELEKTRO', 'ELECTRIC', 'ELECTRICAL',
  'METAL', 'METALL', 'STEEL', 'STAL', 'AUTO', 'AVTO', 'MOTOR',
  'COMPONENTS', 'KOMPONENTY',
  'PROFESSIONAL', 'PROFESIONALNYI', 'QUALITY', 'YAKIST', 'STANDARD',
  'EXPERT', 'MASTER', 'MAYSTER', 'SPECIAL', 'SPETSIAL', 'PREMIUM',
  'OLEKSANDR', 'VOLODYMYR', 'SERHIY', 'ANDRIY', 'VIKTOR', 'OLENA', 'NATALIA',
  'VOLODYMYROVYCH', 'VOLODYMYRIVNA', 'SERHIYOVYCH', 'SERHIYIVNA',
  'VIKTOROVYCH', 'VIKTORIVNA', 'OLEKSANDROVYCH', 'OLEKSANDRIVNA',
  'VASYLOVYCH', 'VASYLIVNA', 'MYKOLAYOVYCH', 'MYKOLAYIVNA',
  'IVANIVNA', 'IVANOVYCH', 'PETROVYCH', 'PETRIVNA',
  'SHOP', 'KRAM', 'MART', 'STOR', 'PARK', 'CITY', 'TOWN', 'HOME', 'WORK',
  'SOFT', 'HARD', 'DATA', 'INFO', 'NEWS', 'LINK', 'PORT', 'BANK', 'FOND'
]);

const MIN_ROOT_LENGTH = 4;
const EXCHANGE_RATE_UAH_EUR = 45;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const containsCyrillic = (text) => {
  if (!text) return false;
  return /[\u0400-\u04FF]/.test(String(text));
};

const transliterateToLatin = (text) => {
  if (!text) return '';
  return String(text).split('').map(char => CYRILLIC_TO_LATIN[char] || char).join('');
};

const normalizeForComparison = (text) => {
  if (!text) return '';
  let normalized = String(text).toUpperCase();
  normalized = transliterateToLatin(normalized);
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  return normalized;
};

const extractSignificantRoots = (text) => {
  if (!text) return new Set();
  let normalized = transliterateToLatin(String(text).toUpperCase());
  const words = normalized.split(/[^A-Z0-9]+/);
  const roots = new Set();
  words.forEach(word => {
    if (word.length >= MIN_ROOT_LENGTH && !COMMON_BUSINESS_WORDS.has(word)) {
      roots.add(word);
    }
  });
  return roots;
};

const levenshteinSimilarity = (s1, s2) => {
  if (!s1 || !s2) return 0;
  const len1 = s1.length, len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i-1] === s2[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  
  return 1 - (dp[len1][len2] / Math.max(len1, len2));
};

const stringSimilarity = (s1, s2) => {
  if (!s1 || !s2) return 0;
  s1 = String(s1).toUpperCase();
  s2 = String(s2).toUpperCase();
  
  const chars1 = new Set(s1);
  const chars2 = new Set(s2);
  const intersection = new Set([...chars1].filter(x => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);
  const charRatio = intersection.size / Math.max(union.size, 1);
  
  const minLen = Math.min(s1.length, s2.length);
  let prefixMatch = 0;
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) prefixMatch++;
    else break;
  }
  const prefixRatio = prefixMatch / Math.max(minLen, 1);
  
  const substringBonus = (s1.includes(s2) || s2.includes(s1)) ? 0.2 : 0;
  const levSim = levenshteinSimilarity(s1, s2);
  
  return Math.min(1.0, charRatio * 0.3 + prefixRatio * 0.2 + levSim * 0.4 + substringBonus * 0.1 + substringBonus);
};

const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const parseRow = (row) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
};

const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] || '');
      return val.includes(',') || val.includes('"') || val.includes('\n') 
        ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DataIntegrityToolV11() {
  // Data state
  const [articles, setArticles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stockLots, setStockLots] = useState([]);
  const [boms, setBoms] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('summary');
  const [fixedItems, setFixedItems] = useState({});
  const [partFilter, setPartFilter] = useState('');
  const [showUsedInBom, setShowUsedInBom] = useState(true);
  const [showNotInBom, setShowNotInBom] = useState(true);

  // File handlers
  const handleFileUpload = (setter, fileType) => (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = parseCSV(e.target.result);
        setter(data);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const toggleFixed = (category, id) => {
    setFixedItems(prev => ({
      ...prev,
      [`${category}-${id}`]: !prev[`${category}-${id}`]
    }));
  };

  const countFixed = (category, total) => {
    return Object.keys(fixedItems).filter(k => k.startsWith(`${category}-`) && fixedItems[k]).length;
  };

  // ============================================================================
  // ANALYSIS ALGORITHMS
  // ============================================================================

  // Build lookup maps
  const vendorCurrencyMap = useMemo(() => {
    const map = {};
    vendors.forEach(v => { map[String(v['Number'] || v['number'] || '')] = v['Currency'] || v['currency'] || ''; });
    return map;
  }, [vendors]);

  const articleStockMap = useMemo(() => {
    const map = {};
    articles.forEach(a => {
      const pn = a['Part No.'] || a['part_no'] || '';
      map[pn] = parseFloat(a['In stock'] || a['in_stock'] || 0) || 0;
    });
    return map;
  }, [articles]);

  const bomPartsSet = useMemo(() => {
    const set = new Set();
    boms.forEach(b => {
      const pn = b['Part No.'] || b['part_no'] || b['Component'] || '';
      if (pn) set.add(pn);
    });
    return set;
  }, [boms]);

  const bomProductsSet = useMemo(() => {
    const set = new Set();
    boms.forEach(b => {
      const pn = b['Product number'] || b['product_number'] || b['Product'] || '';
      if (pn) set.add(pn);
    });
    return set;
  }, [boms]);

  // Get unique BOMs
  const uniqueBoms = useMemo(() => {
    const bomSet = new Set();
    boms.forEach(b => {
      const product = b['Product number'] || b['product_number'] || b['Product'] || '';
      if (product) bomSet.add(product);
    });
    return Array.from(bomSet);
  }, [boms]);

  // ALGORITHM 1: Duplicate Parts Detection
  const duplicateParts = useMemo(() => {
    const results = [];
    const groups = {};
    
    const exclusions = ['SCREW', 'PIN', 'WASHER', 'NUT', 'BOLT', 'DIN', 'ISO', 
      'BEARING', 'O-RING', 'SPRING', 'RIVET', 'CONNECTOR', 'TURRET_', 'TRAILER_',
      'ГВИНТ', 'БОЛТ', 'ГАЙКА', 'ШАЙБА'];
    
    articles.forEach(a => {
      const pn = a['Part No.'] || a['part_no'] || '';
      const desc = a['Part description'] || a['description'] || '';
      if (!desc || desc.length < 4) return;
      
      const descUpper = desc.toUpperCase();
      if (exclusions.some(ex => descUpper.includes(ex))) return;
      
      const key = desc.substring(0, 4).toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push({ pn, desc, stock: articleStockMap[pn] || 0 });
    });
    
    Object.values(groups).forEach(items => {
      if (items.length < 2) return;
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const sim = stringSimilarity(items[i].desc, items[j].desc);
          if (sim >= 0.90) {
            const inBom = bomPartsSet.has(items[i].pn) || bomPartsSet.has(items[j].pn);
            results.push({
              pn1: items[i].pn,
              desc1: items[i].desc.substring(0, 50),
              stock1: items[i].stock,
              pn2: items[j].pn,
              desc2: items[j].desc.substring(0, 50),
              stock2: items[j].stock,
              similarity: Math.round(sim * 100),
              inBom,
              action: sim >= 0.97 ? 'MERGE' : 'REVIEW'
            });
          }
        }
      }
    });
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }, [articles, articleStockMap, bomPartsSet]);

  // ALGORITHM 2: Duplicate Vendors (Enhanced with Transliteration & Root Matching)
  const { transliterationPairs, rootBasedPairs, similarVendors } = useMemo(() => {
    const translitPairs = [];
    const rootPairs = [];
    const simPairs = [];
    const processedPairs = new Set();
    
    // Prepare vendor data
    const vendorData = vendors.map(v => {
      const name = v['Name'] || v['name'] || '';
      const num = v['Number'] || v['number'] || '';
      const curr = v['Currency'] || v['currency'] || '';
      return {
        num, name, currency: curr,
        normalized: normalizeForComparison(name),
        roots: extractSignificantRoots(name),
        isCyrillic: containsCyrillic(name)
      };
    });
    
    const cyrillicVendors = vendorData.filter(v => v.isCyrillic);
    const latinVendors = vendorData.filter(v => !v.isCyrillic);
    
    // 2A: Transliteration matches (Cyrillic ↔ Latin)
    cyrillicVendors.forEach(cyr => {
      latinVendors.forEach(lat => {
        const pairKey = [cyr.num, lat.num].sort().join('-');
        if (processedPairs.has(pairKey)) return;
        if (cyr.normalized.length < 5 || lat.normalized.length < 5) return;
        
        let similarity = levenshteinSimilarity(cyr.normalized, lat.normalized);
        const isSubstring = cyr.normalized.includes(lat.normalized) || lat.normalized.includes(cyr.normalized);
        let matchType = 'FUZZY';
        
        if (isSubstring) {
          const shorter = Math.min(cyr.normalized.length, lat.normalized.length);
          const longer = Math.max(cyr.normalized.length, lat.normalized.length);
          if (shorter >= longer * 0.4) {
            similarity = Math.max(similarity, 0.90);
            matchType = 'SUBSTRING';
          }
        }
        
        if (similarity >= 0.80) {
          processedPairs.add(pairKey);
          if (similarity >= 0.98) matchType = 'EXACT';
          translitPairs.push({
            cyrNum: cyr.num, cyrName: cyr.name.substring(0, 40), cyrCurrency: cyr.currency,
            latNum: lat.num, latName: lat.name.substring(0, 40), latCurrency: lat.currency,
            cyrNorm: cyr.normalized.substring(0, 25), latNorm: lat.normalized.substring(0, 25),
            similarity: Math.round(similarity * 100), matchType,
            action: 'MERGE'
          });
        }
      });
    });
    
    // 2B: Root-based matches
    for (let i = 0; i < vendorData.length; i++) {
      for (let j = i + 1; j < vendorData.length; j++) {
        const v1 = vendorData[i], v2 = vendorData[j];
        const pairKey = [v1.num, v2.num].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        
        const sharedRoots = new Set([...v1.roots].filter(r => v2.roots.has(r)));
        if (sharedRoots.size > 0) {
          processedPairs.add(pairKey);
          rootPairs.push({
            num1: v1.num, name1: v1.name.substring(0, 35), currency1: v1.currency,
            num2: v2.num, name2: v2.name.substring(0, 35), currency2: v2.currency,
            sharedRoots: Array.from(sharedRoots).slice(0, 3).join(', '),
            matchType: 'ROOT',
            action: 'REVIEW'
          });
        }
      }
    }
    
    // 2C: Standard similarity matches
    for (let i = 0; i < vendorData.length; i++) {
      for (let j = i + 1; j < vendorData.length; j++) {
        const v1 = vendorData[i], v2 = vendorData[j];
        const pairKey = [v1.num, v2.num].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        
        const similarity = levenshteinSimilarity(v1.normalized, v2.normalized);
        if (similarity >= 0.80) {
          processedPairs.add(pairKey);
          simPairs.push({
            num1: v1.num, name1: v1.name.substring(0, 35), currency1: v1.currency,
            num2: v2.num, name2: v2.name.substring(0, 35), currency2: v2.currency,
            similarity: Math.round(similarity * 100),
            matchType: similarity >= 0.95 ? 'EXACT' : 'SIMILAR',
            action: similarity >= 0.95 ? 'MERGE' : 'REVIEW'
          });
        }
      }
    }
    
    return { 
      transliterationPairs: translitPairs.sort((a, b) => b.similarity - a.similarity),
      rootBasedPairs: rootPairs,
      similarVendors: simPairs.sort((a, b) => b.similarity - a.similarity)
    };
  }, [vendors]);

  // Combined duplicate vendors for sidebar count
  const allDuplicateVendors = useMemo(() => {
    return [...transliterationPairs, ...rootBasedPairs, ...similarVendors];
  }, [transliterationPairs, rootBasedPairs, similarVendors]);

  // ALGORITHM 3: Currency Issues
  const currencyIssues = useMemo(() => {
    const results = [];
    stockLots.forEach(lot => {
      const vendorNum = String(lot['Vendor number'] || lot['vendor_number'] || '');
      const vendorCurrency = vendorCurrencyMap[vendorNum] || '';
      const unitCost = parseFloat(lot['Unit cost'] || lot['unit_cost'] || 0) || 0;
      
      if (vendorCurrency === 'UAH' && unitCost > 50) {
        const likelyCost = unitCost / EXCHANGE_RATE_UAH_EUR;
        const overstatement = unitCost - likelyCost;
        results.push({
          lot: lot['Lot'] || lot['lot'] || '',
          partNo: lot['Part No.'] || lot['part_no'] || '',
          desc: (lot['Part description'] || lot['description'] || '').substring(0, 40),
          vendorNum,
          vendorName: (lot['Vendor name'] || lot['vendor_name'] || '').substring(0, 30),
          currency: vendorCurrency,
          currentCost: unitCost,
          likelyCost: Math.round(likelyCost * 100) / 100,
          overstatement: Math.round(overstatement * 100) / 100,
          qty: parseFloat(lot['Quantity'] || lot['quantity'] || lot['In stock'] || 1) || 1
        });
      }
    });
    return results.sort((a, b) => b.overstatement - a.overstatement);
  }, [stockLots, vendorCurrencyMap]);

  const totalOverstatement = useMemo(() => {
    return currencyIssues.reduce((sum, c) => sum + (c.overstatement * c.qty), 0);
  }, [currencyIssues]);

  // ALGORITHM 4: Test Data
  const testData = useMemo(() => {
    const results = [];
    articles.forEach(a => {
      const pn = a['Part No.'] || a['part_no'] || '';
      const desc = (a['Part description'] || a['description'] || '').toLowerCase();
      const stock = parseFloat(a['In stock'] || a['in_stock'] || 0) || 0;
      const cost = parseFloat(a['Cost'] || a['cost'] || 0) || 0;
      
      let isTest = false;
      let reason = [];
      
      if (desc.includes('test') && !desc.includes('test data sheet')) {
        isTest = true; reason.push("Contains 'test'");
      }
      if (desc.includes('demo')) {
        isTest = true; reason.push("Contains 'demo'");
      }
      if (pn.startsWith('9999')) {
        isTest = true; reason.push("Placeholder");
      }
      if (pn.includes('E+')) {
        isTest = true; reason.push("Excel error");
      }
      
      if (isTest) {
        const inBom = bomPartsSet.has(pn);
        results.push({
          pn, desc: (a['Part description'] || '').substring(0, 40),
          stock, cost: Math.round(cost * 100) / 100,
          inBom: inBom ? 'Y' : 'N',
          reason: reason.join(', '),
          action: !inBom && stock === 0 ? 'DELETE' : 'REVIEW'
        });
      }
    });
    return results;
  }, [articles, bomPartsSet]);

  // ALGORITHM 5: Zero Stock BOM Components
  const zeroStockBom = useMemo(() => {
    const results = [];
    const tempPatterns = [/^TEMP[-_]/i, /^TMP[-_]/i, /^TEST[-_]/i, /^DEMO[-_]/i, /^XXX/i, /^\d{5}$/];
    
    bomPartsSet.forEach(pn => {
      const stock = articleStockMap[pn] || 0;
      if (stock === 0) {
        const article = articles.find(a => (a['Part No.'] || a['part_no']) === pn);
        const desc = article ? (article['Part description'] || article['description'] || '').substring(0, 45) : 'NOT IN ARTICLES';
        const cost = article ? parseFloat(article['Cost'] || article['cost'] || 0) : 0;
        const isTemp = tempPatterns.some(p => p.test(pn));
        
        // Find vendor info
        const lot = stockLots.find(l => (l['Part No.'] || l['part_no']) === pn);
        const vendorName = lot ? (lot['Vendor name'] || lot['vendor_name'] || '').substring(0, 25) : '';
        
        // Find which BOMs use this part
        const usedIn = boms.filter(b => (b['Part No.'] || b['part_no'] || b['Component']) === pn)
          .map(b => b['Product number'] || b['product_number'] || b['Product'])
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 3)
          .join(', ');
        
        const isProcured = article ? (article['Procured'] || article['procured'] || 'Yes') : 'Yes';
        
        results.push({
          pn, desc, stock: 0, cost: Math.round(cost * 100) / 100,
          procured: isProcured === 'Yes' || isProcured === 'Y' ? 'Yes' : 'No',
          vendor: vendorName, usedIn, isTemp,
          action: isTemp ? 'REPLACE PN' : 'PROCURE'
        });
      }
    });
    return results;
  }, [bomPartsSet, articleStockMap, articles, stockLots, boms]);

  // ALGORITHM 6: Items Not in BOMs (Orphans)
  const orphanItems = useMemo(() => {
    const results = [];
    articles.forEach(a => {
      const pn = a['Part No.'] || a['part_no'] || '';
      const stock = parseFloat(a['In stock'] || a['in_stock'] || 0) || 0;
      const cost = parseFloat(a['Cost'] || a['cost'] || 0) || 0;
      
      if (!bomPartsSet.has(pn) && !bomProductsSet.has(pn) && stock > 0) {
        const stockValue = stock * cost;
        const group = a['Group'] || a['group'] || a['Item group'] || 'Unknown';
        const isProcured = a['Procured'] || a['procured'] || 'Yes';
        
        results.push({
          pn, desc: (a['Part description'] || a['description'] || '').substring(0, 45),
          stock, unitCost: Math.round(cost * 100) / 100,
          value: Math.round(stockValue * 100) / 100,
          group,
          procured: isProcured === 'Yes' || isProcured === 'Y' ? 'Yes' : 'No'
        });
      }
    });
    return results.sort((a, b) => b.value - a.value);
  }, [articles, bomPartsSet, bomProductsSet]);

  const totalOrphanValue = useMemo(() => {
    return orphanItems.reduce((sum, o) => sum + o.value, 0);
  }, [orphanItems]);

  // BOM Matrix Data
  const bomMatrixData = useMemo(() => {
    if (boms.length === 0 || articles.length === 0) return { parts: [], products: [] };
    
    const partUsage = {};
    const products = new Set();
    
    boms.forEach(b => {
      const partNo = b['Part No.'] || b['part_no'] || b['Component'] || '';
      const productNo = b['Product number'] || b['product_number'] || b['Product'] || '';
      const qty = parseFloat(b['Quantity'] || b['quantity'] || b['Qty'] || 1) || 1;
      
      if (partNo && productNo) {
        products.add(productNo);
        if (!partUsage[partNo]) partUsage[partNo] = {};
        partUsage[partNo][productNo] = qty;
      }
    });
    
    const productList = Array.from(products).sort();
    const articleMap = {};
    articles.forEach(a => {
      const pn = a['Part No.'] || a['part_no'] || '';
      articleMap[pn] = a['Part description'] || a['description'] || '';
    });
    
    const parts = Object.keys(partUsage).map(pn => ({
      pn,
      desc: (articleMap[pn] || '').substring(0, 40),
      usage: partUsage[pn],
      inBom: true
    })).sort((a, b) => a.pn.localeCompare(b.pn));
    
    // Add articles not in BOM
    articles.forEach(a => {
      const pn = a['Part No.'] || a['part_no'] || '';
      if (!partUsage[pn]) {
        parts.push({
          pn,
          desc: (a['Part description'] || a['description'] || '').substring(0, 40),
          usage: {},
          inBom: false
        });
      }
    });
    
    return { parts: parts.sort((a, b) => a.pn.localeCompare(b.pn)), products: productList };
  }, [boms, articles]);

  // Filtered BOM Matrix
  const filteredBomParts = useMemo(() => {
    let filtered = bomMatrixData.parts;
    
    if (partFilter) {
      const filterLower = partFilter.toLowerCase();
      filtered = filtered.filter(p => 
        p.pn.toLowerCase().includes(filterLower) || 
        p.desc.toLowerCase().includes(filterLower)
      );
    }
    
    if (!showUsedInBom) filtered = filtered.filter(p => !p.inBom);
    if (!showNotInBom) filtered = filtered.filter(p => p.inBom);
    
    return filtered;
  }, [bomMatrixData.parts, partFilter, showUsedInBom, showNotInBom]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const SeverityBadge = ({ level }) => {
    const colors = {
      CRITICAL: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-green-500',
      INFO: 'bg-blue-500'
    };
    return (
      <span className={`px-2 py-1 rounded text-white text-xs font-bold ${colors[level] || 'bg-gray-500'}`}>
        {level}
      </span>
    );
  };

  const ProgressBar = ({ current, total }) => {
    const percent = total > 0 ? (current / total) * 100 : 0;
    return (
      <div className="w-24 bg-gray-200 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
      </div>
    );
  };

  const FixButton = ({ category, id }) => (
    <button
      onClick={() => toggleFixed(category, id)}
      className={`px-2 py-1 rounded text-xs font-medium ${
        fixedItems[`${category}-${id}`] 
          ? 'bg-green-100 text-green-700' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {fixedItems[`${category}-${id}`] ? <Check size={14} /> : 'Fix'}
    </button>
  );

  // Navigation items
  const navItems = [
    { id: 'summary', label: 'Summary', icon: BarChart3, count: null },
    { id: 'bomMatrix', label: 'BOM Matrix', icon: Grid3X3, count: uniqueBoms.length },
    { id: 'dupParts', label: 'Dup Parts', icon: FileText, count: duplicateParts.length, color: 'text-orange-600' },
    { id: 'dupVendors', label: 'Dup Ven...', icon: Users, count: allDuplicateVendors.length, color: 'text-blue-600' },
    { id: 'currency', label: 'Currency', icon: DollarSign, count: currencyIssues.length, color: 'text-green-600' },
    { id: 'testData', label: 'Test Data', icon: Beaker, count: testData.length, color: 'text-yellow-600' },
    { id: 'zeroStock', label: 'Zero Sto...', icon: AlertTriangle, count: zeroStockBom.length, color: 'text-red-600' },
    { id: 'notInBom', label: 'Not in B...', icon: Package, count: orphanItems.length, color: 'text-gray-600' },
  ];

  const exportItems = [
    { label: 'Articles', data: articles, filename: 'articles_export.csv' },
    { label: 'Vendors', data: vendors, filename: 'vendors_export.csv' },
    { label: 'Lots', data: stockLots, filename: 'lots_export.csv' },
    { label: 'BOMs', data: boms, filename: 'boms_export.csv' },
    { label: 'Matrix', data: filteredBomParts.map(p => ({ 
      'Part No.': p.pn, 'Description': p.desc, 'In BOM': p.inBom ? 'Yes' : 'No',
      ...Object.fromEntries(bomMatrixData.products.map(prod => [prod, p.usage[prod] || '']))
    })), filename: 'bom_matrix_export.csv' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-36 bg-slate-800 text-white flex flex-col">
        <div className="p-3 bg-blue-700">
          <h1 className="text-sm font-bold">SkyFortress Data Integrity Tool</h1>
          <p className="text-xs text-blue-200">MRPeasy Data Cleanup - Jan 2026</p>
        </div>
        
        <nav className="flex-1 p-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded text-xs mb-1 ${
                activeTab === item.id ? 'bg-blue-600' : 'hover:bg-slate-700'
              }`}
            >
              <item.icon size={14} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.count !== null && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === item.id ? 'bg-blue-500' : 'bg-slate-600'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
        
        <div className="p-2 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Export</p>
          {exportItems.map(item => (
            <button
              key={item.label}
              onClick={() => downloadCSV(item.data, item.filename)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-slate-700 mb-1"
              disabled={!item.data || item.data.length === 0}
            >
              <Download size={12} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* File Upload Section */}
        {articles.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Import MRPeasy Data Files</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Articles', setter: setArticles, data: articles },
                { label: 'Vendors', setter: setVendors, data: vendors },
                { label: 'Stock Lots', setter: setStockLots, data: stockLots },
                { label: 'BOMs (Parts)', setter: setBoms, data: boms },
              ].map(item => (
                <div key={item.label} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                  <p className="text-sm font-medium mb-2">{item.label}</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload(item.setter, item.label)}
                    className="text-xs"
                  />
                  {item.data.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">✓ {item.data.length} records</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4">Executive Summary</h2>
            
            {/* Data Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Items', value: articles.length },
                { label: 'Vendors', value: vendors.length },
                { label: 'Stock Lots', value: stockLots.length },
                { label: 'BOM Entries', value: boms.length },
              ].map(m => (
                <div key={m.label} className="bg-blue-700 text-white p-4 rounded">
                  <p className="text-sm">{m.label}</p>
                  <p className="text-2xl font-bold">{m.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-600 text-white p-4 rounded">
                <p className="text-sm">Unique BOMs</p>
                <p className="text-2xl font-bold">{uniqueBoms.length}</p>
              </div>
              <div className="bg-blue-600 text-white p-4 rounded">
                <p className="text-sm">BOM Parts</p>
                <p className="text-2xl font-bold">{bomPartsSet.size.toLocaleString()}</p>
              </div>
            </div>

            {/* Issues Table */}
            <div className="bg-blue-800 text-white p-3 rounded-t font-bold">Issues</div>
            <table className="w-full bg-white shadow rounded-b">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 text-sm">Issue</th>
                  <th className="text-center p-3 text-sm">Count</th>
                  <th className="text-center p-3 text-sm">Fixed</th>
                  <th className="text-center p-3 text-sm">Progress</th>
                  <th className="text-center p-3 text-sm">Severity</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Duplicate Parts', count: duplicateParts.length, cat: 'dup-parts', sev: 'HIGH' },
                  { name: 'Dup Vendors', count: allDuplicateVendors.length, cat: 'dup-vendors', sev: 'MEDIUM' },
                  { name: 'Currency Issues', count: currencyIssues.length, cat: 'currency', sev: 'CRITICAL' },
                  { name: 'Test Data', count: testData.length, cat: 'test', sev: 'LOW' },
                  { name: 'Zero Stock BOMs', count: zeroStockBom.length, cat: 'zero', sev: 'HIGH' },
                  { name: 'Items Not in BOMs', count: orphanItems.length, cat: 'orphan', sev: 'INFO' },
                ].map(row => (
                  <tr key={row.name} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">{row.name}</td>
                    <td className="p-3 text-center">{row.count}</td>
                    <td className="p-3 text-center text-green-600">{countFixed(row.cat, row.count)}</td>
                    <td className="p-3 flex justify-center">
                      <ProgressBar current={countFixed(row.cat, row.count)} total={row.count} />
                    </td>
                    <td className="p-3 text-center"><SeverityBadge level={row.sev} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Impact */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <p className="text-sm text-gray-600">Currency Overstatement</p>
                <p className="text-2xl font-bold text-orange-600">€{totalOverstatement.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <p className="text-sm text-gray-600">Orphan Inventory</p>
                <p className="text-2xl font-bold text-orange-600">€{totalOrphanValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bomMatrix' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-700">
                BOM Matrix ({filteredBomParts.length} parts × {bomMatrixData.products.length} BOMs)
              </h2>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  placeholder="Filter parts..."
                  value={partFilter}
                  onChange={(e) => setPartFilter(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                />
                <button
                  onClick={() => downloadCSV(filteredBomParts.map(p => ({
                    'Part No.': p.pn, 'Description': p.desc, 'In BOM': p.inBom ? 'Yes' : 'No',
                    ...Object.fromEntries(bomMatrixData.products.map(prod => [prod, p.usage[prod] || '']))
                  })), 'bom_matrix.csv')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  <Download size={14} /> Export
                </button>
              </div>
            </div>
            
            <div className="overflow-auto bg-white rounded shadow" style={{ maxHeight: '70vh' }}>
              <table className="text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="p-2 border bg-blue-900 text-white text-left min-w-32">Part No.</th>
                    <th className="p-2 border bg-blue-900 text-white text-left min-w-48">Part Description</th>
                    {bomMatrixData.products.map(prod => (
                      <th key={prod} className="p-1 border bg-orange-400 text-white w-8" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', height: '140px' }}>
                        <span className="text-xs">{prod.length > 25 ? prod.substring(0, 25) + '...' : prod}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBomParts.slice(0, 500).map((part, idx) => (
                    <tr key={idx} className={`${part.inBom ? '' : 'bg-gray-100'} hover:bg-blue-50`}>
                      <td className="p-1 border text-blue-600">{part.pn}</td>
                      <td className="p-1 border truncate max-w-48">{part.desc}</td>
                      {bomMatrixData.products.map(prod => (
                        <td key={prod} className={`p-1 border text-center ${part.usage[prod] ? 'bg-green-100 font-bold' : ''}`}>
                          {part.usage[prod] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex gap-4 mt-2 items-center text-sm">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showUsedInBom} onChange={(e) => setShowUsedInBom(e.target.checked)} />
                <span className="bg-green-100 px-2 rounded">Part used in BOM (qty shown)</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showNotInBom} onChange={(e) => setShowNotInBom(e.target.checked)} />
                <span className="bg-gray-100 px-2 rounded">Part not used in BOM</span>
              </label>
              <span className="text-gray-500">Showing {Math.min(filteredBomParts.length, 500)} of {filteredBomParts.length} parts</span>
            </div>
          </div>
        )}

        {activeTab === 'dupParts' && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4">Duplicate Parts ({duplicateParts.length})</h2>
            <div className="overflow-auto bg-white rounded shadow">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="p-2 text-left">PN 1</th>
                    <th className="p-2 text-left">Desc 1</th>
                    <th className="p-2 text-center">Stk</th>
                    <th className="p-2 text-left">PN 2</th>
                    <th className="p-2 text-left">Desc 2</th>
                    <th className="p-2 text-center">Stk</th>
                    <th className="p-2 text-center">Sim</th>
                    <th className="p-2 text-center">BOM</th>
                    <th className="p-2 text-center">Act</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateParts.map((d, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-xs">{d.pn1}</td>
                      <td className="p-2 text-xs truncate max-w-40">{d.desc1}</td>
                      <td className="p-2 text-center">{d.stock1}</td>
                      <td className="p-2 font-mono text-xs">{d.pn2}</td>
                      <td className="p-2 text-xs truncate max-w-40">{d.desc2}</td>
                      <td className="p-2 text-center">{d.stock2}</td>
                      <td className="p-2 text-center font-bold">{d.similarity}%</td>
                      <td className="p-2 text-center">{d.inBom ? '✓' : ''}</td>
                      <td className="p-2 text-center text-xs">{d.action}</td>
                      <td className="p-2"><FixButton category="dup-parts" id={idx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dupVendors' && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4">Duplicate Vendors ({allDuplicateVendors.length})</h2>
            
            {/* Transliteration Matches */}
            {transliterationPairs.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-bold text-purple-700 mb-2 flex items-center gap-2">
                  <Languages size={18} /> Cyrillic-Latin Transliterations ({transliterationPairs.length})
                </h3>
                <div className="overflow-auto bg-white rounded shadow">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-700 text-white">
                      <tr>
                        <th className="p-2 text-left">V#1</th>
                        <th className="p-2 text-left">Cyrillic Name</th>
                        <th className="p-2 text-center">Cur</th>
                        <th className="p-2 text-left">V#2</th>
                        <th className="p-2 text-left">Latin Name</th>
                        <th className="p-2 text-center">Cur</th>
                        <th className="p-2 text-center">Sim</th>
                        <th className="p-2 text-center">Type</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transliterationPairs.map((v, idx) => (
                        <tr key={idx} className="border-b hover:bg-purple-50">
                          <td className="p-2 font-mono text-xs">{v.cyrNum}</td>
                          <td className="p-2 text-xs">{v.cyrName}</td>
                          <td className="p-2 text-center text-xs">{v.cyrCurrency}</td>
                          <td className="p-2 font-mono text-xs">{v.latNum}</td>
                          <td className="p-2 text-xs">{v.latName}</td>
                          <td className="p-2 text-center text-xs">{v.latCurrency}</td>
                          <td className="p-2 text-center font-bold">{v.similarity}%</td>
                          <td className="p-2 text-center text-xs text-purple-700">{v.matchType}</td>
                          <td className="p-2"><FixButton category="translit" id={idx} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Root-Based Matches */}
            {rootBasedPairs.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-bold text-green-700 mb-2 flex items-center gap-2">
                  <GitBranch size={18} /> Root-Based Matches ({rootBasedPairs.length})
                </h3>
                <div className="overflow-auto bg-white rounded shadow max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-green-700 text-white sticky top-0">
                      <tr>
                        <th className="p-2 text-left">V#1</th>
                        <th className="p-2 text-left">Name 1</th>
                        <th className="p-2 text-center">Cur</th>
                        <th className="p-2 text-left">V#2</th>
                        <th className="p-2 text-left">Name 2</th>
                        <th className="p-2 text-center">Cur</th>
                        <th className="p-2 text-left">Shared Root</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rootBasedPairs.slice(0, 50).map((v, idx) => (
                        <tr key={idx} className="border-b hover:bg-green-50">
                          <td className="p-2 font-mono text-xs">{v.num1}</td>
                          <td className="p-2 text-xs">{v.name1}</td>
                          <td className="p-2 text-center text-xs">{v.currency1}</td>
                          <td className="p-2 font-mono text-xs">{v.num2}</td>
                          <td className="p-2 text-xs">{v.name2}</td>
                          <td className="p-2 text-center text-xs">{v.currency2}</td>
                          <td className="p-2 text-xs text-green-700 font-bold">{v.sharedRoots}</td>
                          <td className="p-2"><FixButton category="root" id={idx} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rootBasedPairs.length > 50 && (
                  <p className="text-xs text-gray-500 mt-1">Showing 50 of {rootBasedPairs.length} matches</p>
                )}
              </div>
            )}

            {/* Similar Vendors */}
            {similarVendors.length > 0 && (
              <div>
                <h3 className="text-md font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <Users size={18} /> Similar Names ({similarVendors.length})
                </h3>
                <div className="overflow-auto bg-white rounded shadow">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-800 text-white">
                      <tr>
                        <th className="p-2 text-left">V#1</th>
                        <th className="p-2 text-left">Name 1</th>
                        <th className="p-2 text-center">Cur</th>
                        <th className="p-2 text-left">V#2</th>
                        <th className="p-2 text-left">Name 2</th>
                        <th className="p-2 text-center">Cur</th>
                        <th className="p-2 text-center">Sim</th>
                        <th className="p-2 text-center">Type</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {similarVendors.map((v, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-xs">{v.num1}</td>
                          <td className="p-2 text-xs">{v.name1}</td>
                          <td className="p-2 text-center text-xs">{v.currency1}</td>
                          <td className="p-2 font-mono text-xs">{v.num2}</td>
                          <td className="p-2 text-xs">{v.name2}</td>
                          <td className="p-2 text-center text-xs">{v.currency2}</td>
                          <td className="p-2 text-center font-bold">{v.similarity}%</td>
                          <td className="p-2 text-center text-xs">{v.matchType}</td>
                          <td className="p-2"><FixButton category="dup-vendors" id={idx} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'currency' && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4">Currency Issues ({currencyIssues.length})</h2>
            <div className="overflow-auto bg-white rounded shadow">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="p-2 text-left">Lot</th>
                    <th className="p-2 text-left">Part</th>
                    <th className="p-2 text-left">Desc</th>
                    <th className="p-2 text-left">Vendor</th>
                    <th className="p-2 text-center">Cur</th>
                    <th className="p-2 text-right">Current€</th>
                    <th className="p-2 text-right">Likely€</th>
                    <th className="p-2 text-right">Over€</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {currencyIssues.map((c, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-xs">{c.lot}</td>
                      <td className="p-2 font-mono text-xs">{c.partNo}</td>
                      <td className="p-2 text-xs truncate max-w-32">{c.desc}</td>
                      <td className="p-2 text-xs truncate max-w-32">{c.vendorName}</td>
                      <td className="p-2 text-center text-xs">{c.currency}</td>
                      <td className="p-2 text-right">€{c.currentCost}</td>
                      <td className="p-2 text-right text-green-600">€{c.likelyCost}</td>
                      <td className="p-2 text-right text-red-600">€{c.overstatement}</td>
                      <td className="p-2 text-center">{c.qty}</td>
                      <td className="p-2"><FixButton category="currency" id={idx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'testData' && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4">Test Data ({testData.length})</h2>
            <div className="overflow-auto bg-white rounded shadow">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="p-2 text-left">Part No.</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-center">Stock</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-center">BOM</th>
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-center">Action</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {testData.map((t, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-xs">{t.pn}</td>
                      <td className="p-2 text-xs">{t.desc}</td>
                      <td className="p-2 text-center">{t.stock}</td>
                      <td className="p-2 text-right">€{t.cost}</td>
                      <td className="p-2 text-center">{t.inBom}</td>
                      <td className="p-2 text-xs">{t.reason}</td>
                      <td className="p-2 text-center text-xs">{t.action}</td>
                      <td className="p-2"><FixButton category="test" id={idx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'zeroStock' && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4">Zero Stock BOMs ({zeroStockBom.length})</h2>
            <div className="overflow-auto bg-white rounded shadow">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="p-2 text-left">Part</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-center">Stk</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-center">Proc</th>
                    <th className="p-2 text-left">Vendor</th>
                    <th className="p-2 text-left">Used In</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {zeroStockBom.map((z, idx) => (
                    <tr key={idx} className={`border-b hover:bg-gray-50 ${z.isTemp ? 'bg-red-50' : ''}`}>
                      <td className="p-2 font-mono text-xs">{z.pn}</td>
                      <td className="p-2 text-xs truncate max-w-48">{z.desc}</td>
                      <td className="p-2 text-center text-red-600">0</td>
                      <td className="p-2 text-right">€{z.cost}</td>
                      <td className="p-2 text-center">{z.procured}</td>
                      <td className="p-2 text-xs truncate max-w-28">{z.vendor}</td>
                      <td className="p-2 text-xs truncate max-w-40">{z.usedIn}</td>
                      <td className="p-2"><FixButton category="zero" id={idx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notInBom' && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4">
              Items Not in BOMs ({orphanItems.length}) - €{totalOrphanValue.toLocaleString(undefined, {minimumFractionDigits: 3})}
            </h2>
            <div className="overflow-auto bg-white rounded shadow">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="p-2 text-left">Part</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-center">Stock</th>
                    <th className="p-2 text-right">Unit€</th>
                    <th className="p-2 text-right">Value€</th>
                    <th className="p-2 text-left">Group</th>
                    <th className="p-2 text-center">Proc</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {orphanItems.slice(0, 200).map((o, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-xs">{o.pn}</td>
                      <td className="p-2 text-xs truncate max-w-48">{o.desc}</td>
                      <td className="p-2 text-center">{o.stock}</td>
                      <td className="p-2 text-right">€{o.unitCost}</td>
                      <td className="p-2 text-right text-orange-600 font-bold">€{o.value.toLocaleString()}</td>
                      <td className="p-2 text-xs">{o.group}</td>
                      <td className="p-2 text-center">{o.procured}</td>
                      <td className="p-2"><FixButton category="orphan" id={idx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orphanItems.length > 200 && (
              <p className="text-xs text-gray-500 mt-2">Showing top 200 by value</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
