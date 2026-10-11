import React, { useState, useRef, useEffect } from 'react';
import {
  Barcode,
  ShoppingCart,
  PackagePlus,
  Boxes,
  TrendingUp,
  FileSpreadsheet,
  Code2,
  Printer,
  Download,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Database,
  RotateCcw,
  Copy,
  Check,
  UserCheck,
  Truck,
  IndianRupee,
  FileText,
  ScanLine,
  ArrowUpRight,
  ArrowDownLeft,
  X
} from 'lucide-react';
import { Product, InwardEntry, SaleInvoice, SaleItem } from './types';
import { INITIAL_PRODUCTS, INITIAL_INWARD_ENTRIES, INITIAL_SALES } from './data/initialData';
import { KIRANA_MITRA_PYTHON_CODE } from './data/pythonSourceCode';

type ActiveTab = 'pos' | 'inward' | 'inventory' | 'profit' | 'gst' | 'python';

const STORAGE_KEYS = {
  PRODUCTS: 'kirana_mitra_db_products_v1',
  INWARD: 'kirana_mitra_db_inward_v1',
  SALES: 'kirana_mitra_db_sales_v1',
};

export default function App() {
  // Local Database State (persisted in localStorage)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [inwardEntries, setInwardEntries] = useState<InwardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INWARD);
      return saved ? JSON.parse(saved) : INITIAL_INWARD_ENTRIES;
    } catch {
      return INITIAL_INWARD_ENTRIES;
    }
  });

  const [salesInvoices, setSalesInvoices] = useState<SaleInvoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // Sync to local database on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INWARD, JSON.stringify(inwardEntries));
  }, [inwardEntries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(salesInvoices));
  }, [salesInvoices]);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // ============================================================================
  // 1. OUTWARD BILLING & BARCODE POS STATE (Saman Jane Ka + Purchaser Name)
  // ============================================================================
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanQty, setScanQty] = useState<number>(1);
  const [purchaserName, setPurchaserName] = useState('Walk-in Customer (नकद ग्राहक)');
  const [purchaserPhone, setPurchaserPhone] = useState('');
  const [purchaserGstin, setPurchaserGstin] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI / QR' | 'Udhaar (Credit)' | 'Card'>('Cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<SaleInvoice | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts (F1-F6 like a real Tkinter Desktop POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('inward');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('inventory');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('profit');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('gst');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('python');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const calculateSaleItem = (product: Product, qty: number): SaleItem => {
    const totalAmount = Number((product.sellingPrice * qty).toFixed(2));
    const taxableValue = Number((totalAmount / (1 + product.gstPercent / 100)).toFixed(2));
    const totalGst = Number((totalAmount - taxableValue).toFixed(2));
    const cgstAmount = Number((totalGst / 2).toFixed(2));
    const sgstAmount = Number((totalGst - cgstAmount).toFixed(2));
    const profitAmount = Number(((product.sellingPrice - product.purchasePrice) * qty).toFixed(2));

    return {
      productId: product.id,
      barcode: product.barcode,
      productName: product.name,
      unit: product.unit,
      quantity: qty,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      gstPercent: product.gstPercent,
      taxableValue,
      cgstAmount,
      sgstAmount,
      totalAmount,
      profitAmount,
    };
  };

  const addProductToCart = (product: Product, qtyToAdd: number) => {
    if (qtyToAdd <= 0) return;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.barcode === product.barcode);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = Number((updated[existingIndex].quantity + qtyToAdd).toFixed(2));
        updated[existingIndex] = calculateSaleItem(product, newQty);
        return updated;
      } else {
        return [...prevCart, calculateSaleItem(product, qtyToAdd)];
      }
    });
    showToast(`Scanned: ${product.name} (x${qtyToAdd} ${product.unit})`);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    const matchedProduct = products.find(
      (p) =>
        p.barcode === query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase() === query.toLowerCase()
    );

    if (!matchedProduct) {
      showToast(`No item found for Barcode / Name: "${query}"`, 'warning');
      return;
    }

    addProductToCart(matchedProduct, scanQty > 0 ? scanQty : 1);
    setBarcodeInput('');
    setScanQty(1);
    barcodeInputRef.current?.focus();
  };

  const updateCartItemQty = (barcode: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.barcode !== barcode));
      return;
    }
    const prod = products.find((p) => p.barcode === barcode);
    if (!prod) return;
    setCart((prev) =>
      prev.map((item) => (item.barcode === barcode ? calculateSaleItem(prod, newQty) : item))
    );
  };

  const cartTotals = cart.reduce(
    (acc, item) => {
      acc.taxable += item.taxableValue;
      acc.cgst += item.cgstAmount;
      acc.sgst += item.sgstAmount;
      acc.total += item.totalAmount;
      acc.profit += item.profitAmount;
      return acc;
    },
    { taxable: 0, cgst: 0, sgst: 0, total: 0, profit: 0 }
  );

  const finalPayable = Math.max(0, Number((cartTotals.total - discountAmount).toFixed(2)));
  const finalProfit = Number((cartTotals.profit - discountAmount).toFixed(2));

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      showToast('Cart is empty! Scan a barcode or click a product to bill.', 'warning');
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextInvNum = 101 + salesInvoices.length;
    const invoiceNo = `KM-INV-${nextInvNum}`;

    const newInvoice: SaleInvoice = {
      id: `SAL-${Date.now()}`,
      invoiceNo,
      date: todayStr,
      timestamp: timeStr,
      purchaserName: purchaserName.trim() || 'Walk-in Customer',
      purchaserPhone: purchaserPhone.trim(),
      purchaserGstin: purchaserGstin.trim().toUpperCase(),
      paymentMode,
      items: cart,
      subTotalTaxable: Number(cartTotals.taxable.toFixed(2)),
      totalCgst: Number(cartTotals.cgst.toFixed(2)),
      totalSgst: Number(cartTotals.sgst.toFixed(2)),
      totalGst: Number((cartTotals.cgst + cartTotals.sgst).toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      grandTotal: finalPayable,
      totalProfit: finalProfit,
    };

    // Deduct stock quantities in local database
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const soldItem = cart.find((c) => c.barcode === prod.barcode);
        if (soldItem) {
          return {
            ...prod,
            stockQty: Math.max(0, Number((prod.stockQty - soldItem.quantity).toFixed(2))),
          };
        }
        return prod;
      })
    );

    setSalesInvoices((prev) => [newInvoice, ...prev]);
    setLastSavedInvoice(newInvoice);
    setCart([]);
    setDiscountAmount(0);
    setPurchaserName('Walk-in Customer (नकद ग्राहक)');
    setPurchaserPhone('');
    setPurchaserGstin('');
    showToast(`Bill ${invoiceNo} saved! Grand Total: ₹${finalPayable.toFixed(2)} | Profit: ₹${finalProfit.toFixed(2)}`);
  };

  // ============================================================================
  // 2. INWARD STOCK / PURCHASE STATE (Naye Saman Aane Ka + Seller Name)
  // ============================================================================
  const [inwBillNo, setInwBillNo] = useState(() => `PUR-2026-0${92 + inwardEntries.length}`);
  const [inwSellerName, setInwSellerName] = useState('');
  const [inwSellerPhone, setInwSellerPhone] = useState('');
  const [inwSellerGstin, setInwSellerGstin] = useState('');
  const [inwBarcode, setInwBarcode] = useState('');
  const [inwProductName, setInwProductName] = useState('');
  const [inwCategory, setInwCategory] = useState('Atta, Rice & Dal');
  const [inwUnit, setInwUnit] = useState('Pkt');
  const [inwQty, setInwQty] = useState<number>(10);
  const [inwPurRate, setInwPurRate] = useState<number>(0);
  const [inwSellRate, setInwSellRate] = useState<number>(0);
  const [inwGstSlab, setInwGstSlab] = useState<0 | 5 | 12 | 18 | 28>(5);
  const [inwPaymentStatus, setInwPaymentStatus] = useState<'Paid' | 'Pending Credit'>('Paid');

  const handleInwardBarcodeLookup = (code: string) => {
    setInwBarcode(code);
    const found = products.find((p) => p.barcode === code.trim());
    if (found) {
      setInwProductName(found.name);
      setInwCategory(found.category);
      setInwUnit(found.unit);
      setInwPurRate(found.purchasePrice);
      setInwSellRate(found.sellingPrice);
      setInwGstSlab(found.gstPercent);
      if (!inwSellerName) {
        setInwSellerName(found.defaultSupplier);
      }
      showToast(`Auto-filled details for ${found.name}`);
    }
  };

  const handleSaveInwardEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwSellerName.trim() || !inwBarcode.trim() || !inwProductName.trim()) {
      showToast('Please enter Seller Name, Barcode, and Product Name.', 'warning');
      return;
    }
    if (inwQty <= 0 || inwPurRate <= 0 || inwSellRate <= 0) {
      showToast('Quantity, Purchase Rate, and Selling Rate must be greater than 0.', 'warning');
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const totalAmount = Number((inwQty * inwPurRate).toFixed(2));
    const taxableAmount = Number((totalAmount / (1 + inwGstSlab / 100)).toFixed(2));
    const gstAmount = Number((totalAmount - taxableAmount).toFixed(2));

    const newEntry: InwardEntry = {
      id: `INW-${Date.now()}`,
      invoiceNo: inwBillNo.trim() || `PUR-${Date.now()}`,
      date: todayStr,
      timestamp: timeStr,
      sellerName: inwSellerName.trim(),
      sellerPhone: inwSellerPhone.trim(),
      sellerGstin: inwSellerGstin.trim().toUpperCase(),
      barcode: inwBarcode.trim(),
      productName: inwProductName.trim(),
      unit: inwUnit,
      quantity: Number(inwQty),
      purchaseRate: Number(inwPurRate),
      sellingRate: Number(inwSellRate),
      gstPercent: inwGstSlab,
      taxableAmount,
      gstAmount,
      totalAmount,
      paymentStatus: inwPaymentStatus,
    };

    // Update or Insert Product in Local Inventory
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.barcode === inwBarcode.trim());
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          name: inwProductName.trim(),
          category: inwCategory,
          unit: inwUnit,
          purchasePrice: Number(inwPurRate),
          sellingPrice: Number(inwSellRate),
          gstPercent: inwGstSlab,
          stockQty: Number((updated[idx].stockQty + Number(inwQty)).toFixed(2)),
          defaultSupplier: inwSellerName.trim(),
        };
        return updated;
      } else {
        const newProd: Product = {
          id: `PRD-0${prev.length + 1}`,
          barcode: inwBarcode.trim(),
          name: inwProductName.trim(),
          category: inwCategory,
          unit: inwUnit,
          purchasePrice: Number(inwPurRate),
          sellingPrice: Number(inwSellRate),
          gstPercent: inwGstSlab,
          stockQty: Number(inwQty),
          minStockAlert: 10,
          defaultSupplier: inwSellerName.trim(),
        };
        return [newProd, ...prev];
      }
    });

    setInwardEntries((prev) => [newEntry, ...prev]);
    setInwBillNo(`PUR-2026-0${93 + inwardEntries.length}`);
    setInwBarcode('');
    setInwProductName('');
    setInwQty(10);
    showToast(`Added +${inwQty} ${inwUnit} of "${inwProductName}" from Seller "${inwSellerName}"`);
  };

  // ============================================================================
  // 3. INVENTORY SEARCH & FILTER STATE
  // ============================================================================
  const [invSearch, setInvSearch] = useState('');
  const [invFilterLowStock, setInvFilterLowStock] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(invSearch.toLowerCase()) ||
      p.barcode.includes(invSearch) ||
      p.defaultSupplier.toLowerCase().includes(invSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(invSearch.toLowerCase());
    const matchesStock = invFilterLowStock ? p.stockQty <= p.minStockAlert : true;
    return matchesQuery && matchesStock;
  });

  // ============================================================================
  // 4. ANALYTICS, DAILY PROFIT & GST CALCULATIONS
  // ============================================================================
  const [salesSearch, setSalesSearch] = useState('');
  const [copiedPython, setCopiedPython] = useState(false);

  const totalSalesRevenue = salesInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalNetProfit = salesInvoices.reduce((sum, inv) => sum + inv.totalProfit, 0);
  const totalOutputGst = salesInvoices.reduce((sum, inv) => sum + inv.totalGst, 0);
  const totalInwardPurchases = inwardEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
  const totalInputGst = inwardEntries.reduce((sum, entry) => sum + entry.gstAmount, 0);
  const totalInventoryValuation = products.reduce((sum, p) => sum + p.stockQty * p.purchasePrice, 0);
  const lowStockCount = products.filter((p) => p.stockQty <= p.minStockAlert).length;

  // Slab-wise GST Breakdown (0%, 5%, 12%, 18%, 28%)
  const gstSlabs: Array<0 | 5 | 12 | 18 | 28> = [0, 5, 12, 18, 28];
  const gstSlabReport = gstSlabs.map((slab) => {
    let unitsSold = 0;
    let taxableValue = 0;
    let cgst = 0;
    let sgst = 0;
    let grossTotal = 0;

    salesInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        if (item.gstPercent === slab) {
          unitsSold += item.quantity;
          taxableValue += item.taxableValue;
          cgst += item.cgstAmount;
          sgst += item.sgstAmount;
          grossTotal += item.totalAmount;
        }
      });
    });

    // Also compute inward input GST per slab
    let inwardTaxable = 0;
    let inwardGst = 0;
    inwardEntries.forEach((entry) => {
      if (entry.gstPercent === slab) {
        inwardTaxable += entry.taxableAmount;
        inwardGst += entry.gstAmount;
      }
    });

    return {
      slab,
      unitsSold: Number(unitsSold.toFixed(2)),
      taxableValue: Number(taxableValue.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      totalOutputGst: Number((cgst + sgst).toFixed(2)),
      grossTotal: Number(grossTotal.toFixed(2)),
      inwardTaxable: Number(inwardTaxable.toFixed(2)),
      inwardGst: Number(inwardGst.toFixed(2)),
      netGstPayable: Number((cgst + sgst - inwardGst).toFixed(2)),
    };
  });

  // Download Python Tkinter Script
  const handleDownloadPythonScript = () => {
    const blob = new Blob([KIRANA_MITRA_PYTHON_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kirana_mitra.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded kirana_mitra.py! Run with: python kirana_mitra.py');
  };

  // Copy Python Script
  const handleCopyPythonCode = () => {
    navigator.clipboard.writeText(KIRANA_MITRA_PYTHON_CODE);
    setCopiedPython(true);
    showToast('Copied Python Tkinter + SQLite source code to clipboard!');
    setTimeout(() => setCopiedPython(false), 2500);
  };

  // Export GST CSV
  const handleExportGstCsv = () => {
    const headers = [
      'GST Slab (%)',
      'Units Sold',
      'Output Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'Total Output GST (INR)',
      'Gross Sales Value (INR)',
      'Input Purchase GST Credit (INR)',
      'Net GST Payable (INR)',
    ];
    const rows = gstSlabReport.map((r) => [
      `${r.slab}%`,
      r.unitsSold,
      r.taxableValue.toFixed(2),
      r.cgst.toFixed(2),
      r.sgst.toFixed(2),
      r.totalOutputGst.toFixed(2),
      r.grossTotal.toFixed(2),
      r.inwardGst.toFixed(2),
      r.netGstPayable.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kirana_Mitra_GST_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported GST Report CSV for Excel / Tally filing!');
  };

  // Reset Local Demo Database
  const handleResetDatabase = () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.INWARD);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    setProducts(INITIAL_PRODUCTS);
    setInwardEntries(INITIAL_INWARD_ENTRIES);
    setSalesInvoices(INITIAL_SALES);
    setCart([]);
    showToast('Local Database reset to default sample Kirana data.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Desktop Application Bar (Follows 3-Zone Contract) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 bg-slate-900 text-white border-b border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#pos"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('pos');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Kirana Mitra (किराना मित्र)
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('pos')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'pos' ? 'text-white underline underline-offset-8 decoration-2 decoration-blue-400' : ''
            }`}
          >
            [F1] Barcode Billing (जाने का)
          </button>
          <button
            onClick={() => setActiveTab('inward')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'inward' ? 'text-white underline underline-offset-8 decoration-2 decoration-blue-400' : ''
            }`}
          >
            [F2] Stock Inward (आने का)
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'inventory' ? 'text-white underline underline-offset-8 decoration-2 decoration-blue-400' : ''
            }`}
          >
            [F3] Stock Master ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'profit' ? 'text-white underline underline-offset-8 decoration-2 decoration-blue-400' : ''
            }`}
          >
            [F4] Sales & Profit
          </button>
          <button
            onClick={() => setActiveTab('gst')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'gst' ? 'text-white underline underline-offset-8 decoration-2 decoration-blue-400' : ''
            }`}
          >
            [F5] GST Report
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('python')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <Code2 className="w-4 h-4" />
            Download Python Tkinter (.py)
          </button>
        </div>
      </header>

      {/* Desktop Sub-Toolbar: Tkinter Notebook Style Switcher + Quick Summary Strip */}
      <div className="bg-slate-200 border-b border-slate-300 px-6 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-white border border-slate-300'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            1. Outward Billing & Barcode POS (सामान जाने का)
          </button>
          <button
            onClick={() => setActiveTab('inward')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'inward'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-white border border-slate-300'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5" />
            2. Inward Stock / Purchase (नए सामान आने का)
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-white border border-slate-300'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            3. Stock & Inventory ({products.length} Items)
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profit'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-white border border-slate-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            4. Daily Sales & Profit (बिक्री और मुनाफा)
          </button>
          <button
            onClick={() => setActiveTab('gst')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gst'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-white border border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            5. GST Report (GSTR-1/3B)
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'python'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            6. Python Tkinter + SQLite Code (kirana_mitra.py)
          </button>
        </div>

        {/* Unboxed Clean Metadata Status */}
        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
          <span>Local DB: kirana_mitra.db</span>
          <span aria-hidden="true">·</span>
          <span>Today Sales: ₹{totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-700 font-semibold">
            Net Profit: +₹{totalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Notification Banner */}
      {toastMessage && (
        <div
          className={`px-6 py-2 text-xs font-medium flex items-center justify-between border-b ${
            toastMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-slate-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Desktop Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-6">
        {/* ===================================================================
            TAB 1: OUTWARD BILLING & BARCODE POS (SAMAN JANE KA + PURCHASER)
           =================================================================== */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Purchaser Details, Barcode Scanner & Active Bill Table */}
            <div className="lg:col-span-8 space-y-5">
              {/* Purchaser (Grahak) & Barcode Scanner Frame */}
              <section className="bg-white border border-slate-300 rounded-md p-5">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Outward Billing & Barcode Scanner (सामान जाने का बिल एवं ग्राहक विवरण)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enter Purchaser (Grahak) name and scan product barcode using USB/Laser scanner or select from quick bar below.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    Next Bill: KM-INV-{101 + salesInvoices.length}
                  </span>
                </div>

                {/* Purchaser Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Purchaser Name (खरीदार / ग्राहक का नाम) *
                    </label>
                    <input
                      type="text"
                      value={purchaserName}
                      onChange={(e) => setPurchaserName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar Verma / Walk-in Customer"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Purchaser Mobile No.
                    </label>
                    <input
                      type="text"
                      value={purchaserPhone}
                      onChange={(e) => setPurchaserPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Mode (भुगतान)
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    >
                      <option value="Cash">Cash (नकद)</option>
                      <option value="UPI / QR">UPI / PhonePe / GPay</option>
                      <option value="Udhaar (Credit)">Udhaar / Khata (उधार)</option>
                      <option value="Card">Debit / Credit Card</option>
                    </select>
                  </div>
                </div>

                {/* Barcode Scanner Input Bar */}
                <form onSubmit={handleBarcodeSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      SCAN BARCODE OR TYPE ITEM NAME (बारकोड स्कैन करें - Press Enter)
                    </label>
                    <div className="relative">
                      <ScanLine className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan EAN-13 Barcode (e.g. 8901058851245) or type 'Maggi', 'Atta'..."
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono font-semibold bg-amber-50/70 border-2 border-blue-600 rounded text-slate-900 focus:outline-none focus:bg-yellow-50"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity (मात्रा)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={scanQty}
                      onChange={(e) => setScanQty( parseFloat(e.target.value) || 1 )}
                      className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Barcode className="w-4 h-4" />
                      Scan / Add [Enter]
                    </button>
                  </div>
                </form>
              </section>

              {/* POS Bill Items Table */}
              <section className="bg-white border border-slate-300 rounded-md overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-blue-700" />
                    Current Outward Bill Items (जाने वाले सामान की सूची)
                  </h3>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All Items
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                        <th className="py-2.5 px-3">Barcode</th>
                        <th className="py-2.5 px-3">Product Name (सामान)</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">MRP Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">CGST+SGST</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        <th className="py-2.5 px-3 text-right">Profit (₹)</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-slate-500">
                            No items in current bill. Scan a barcode above or click any product on the right panel to add immediately.
                          </td>
                        </tr>
                      ) : (
                        cart.map((item) => (
                          <tr key={item.barcode} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-slate-600">{item.barcode}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">{item.productName}</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center border border-slate-300 rounded bg-white">
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQty(item.barcode, item.quantity - 1)}
                                  className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2.5 py-0.5 font-mono font-semibold text-slate-900">
                                  {item.quantity} {item.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQty(item.barcode, item.quantity + 1)}
                                  className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">₹{item.sellingPrice.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">{item.gstPercent}%</td>
                            <td className="py-2.5 px-3 text-right font-mono">₹{item.taxableValue.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              ₹{(item.cgstAmount + item.sgstAmount).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ₹{item.totalAmount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                              +₹{item.profitAmount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => updateCartItemQty(item.barcode, 0)}
                                className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bill Checkout Totals Footer */}
                <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-slate-300">
                      Taxable Value: ₹{cartTotals.taxable.toFixed(2)} · CGST: ₹{cartTotals.cgst.toFixed(2)} · SGST: ₹{cartTotals.sgst.toFixed(2)}
                    </div>
                    <div className="text-emerald-400 font-semibold">
                      Estimated Margin / Profit on this Bill: +₹{finalProfit.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-400">GRAND TOTAL (कुल देय राशि)</div>
                      <div className="text-2xl font-bold text-white">₹{finalPayable.toFixed(2)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCompleteSale}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Save GST Bill & Deduct Stock
                    </button>
                  </div>
                </div>
              </section>

              {/* Printable Receipt Preview if a bill was just generated */}
              {lastSavedInvoice && (
                <section id="printable-invoice" className="bg-white border border-slate-300 rounded-md p-5">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Tax Invoice Receipt: {lastSavedInvoice.invoiceNo}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Purchaser: {lastSavedInvoice.purchaserName} · Date: {lastSavedInvoice.date} ({lastSavedInvoice.timestamp}) · Mode: {lastSavedInvoice.paymentMode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Receipt
                      </button>
                      <button
                        onClick={() => setLastSavedInvoice(null)}
                        className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-mono space-y-1 text-slate-700">
                    {lastSavedInvoice.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-dashed border-slate-200">
                        <span>
                          {idx + 1}. {it.productName} ({it.quantity} {it.unit} x ₹{it.sellingPrice}) [GST {it.gstPercent}%]
                        </span>
                        <span className="font-semibold">₹{it.totalAmount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between font-bold text-sm text-slate-900">
                      <span>Total Paid (Incl. GST ₹{lastSavedInvoice.totalGst.toFixed(2)}):</span>
                      <span>₹{lastSavedInvoice.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Right 4 Cols: One-Click Barcode Scanner Simulator Pad */}
            <aside className="lg:col-span-4 bg-white border border-slate-300 rounded-md p-5">
              <div className="pb-3 mb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-blue-700" />
                  Quick Barcode Scan Pad (तुरंत स्कैन करें)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any Kirana item below to simulate an instant laser barcode scan into the bill.
                </p>
              </div>

              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {products.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addProductToCart(prod, 1)}
                    className="w-full text-left p-2.5 rounded border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-800">
                        {prod.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        Barcode: {prod.barcode} · Stock: {prod.stockQty} {prod.unit} · GST {prod.gstPercent}%
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <div className="text-xs font-bold text-slate-900">₹{prod.sellingPrice.toFixed(2)}</div>
                      <div className="text-[10px] text-emerald-700">
                        Profit +₹{(prod.sellingPrice - prod.purchasePrice).toFixed(1)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* ===================================================================
            TAB 2: INWARD STOCK / PURCHASE ENTRY (NAYE SAMAN AANE KA + SELLER)
           =================================================================== */}
        {activeTab === 'inward' && (
          <div className="space-y-6">
            {/* Inward Purchase Entry Form */}
            <section className="bg-white border border-slate-300 rounded-md p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Inward Stock / Purchase Entry (नए सामान आने का विवरण एवं विक्रेता/महाजन का नाम)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Record new stock arriving at the Kirana shop. Automatically increases product stock quantity and logs Seller (Supplier) details.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-600">
                  Total Purchase Value: ₹{totalInwardPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <form onSubmit={handleSaveInwardEntry} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Invoice / Bill No *
                  </label>
                  <input
                    type="text"
                    value={inwBillNo}
                    onChange={(e) => setInwBillNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seller / Supplier Name (विक्रेता / महाजन का नाम) *
                  </label>
                  <input
                    type="text"
                    value={inwSellerName}
                    onChange={(e) => setInwSellerName(e.target.value)}
                    placeholder="e.g. Gupta Traders / ITC Wholesale Hub"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seller Mobile No.
                  </label>
                  <input
                    type="text"
                    value={inwSellerPhone}
                    onChange={(e) => setInwSellerPhone(e.target.value)}
                    placeholder="9829011223"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seller GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={inwSellerGstin}
                    onChange={(e) => setInwSellerGstin(e.target.value)}
                    placeholder="08AABCI1234F1Z5"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={inwPaymentStatus}
                    onChange={(e) => setInwPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                  >
                    <option value="Paid">Paid (भुगतान हो गया)</option>
                    <option value="Pending Credit">Pending Credit (बाकी खाता)</option>
                  </select>
                </div>

                {/* Row 2: Product & Pricing */}
                <div>
                  <label className="block text-xs font-bold text-blue-800 mb-1">
                    Scan / Enter Barcode *
                  </label>
                  <input
                    type="text"
                    value={inwBarcode}
                    onChange={(e) => handleInwardBarcodeLookup(e.target.value)}
                    placeholder="8901725121440"
                    className="w-full px-3 py-2 text-sm font-mono bg-amber-50 border border-blue-500 rounded focus:outline-none"
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Name (नए सामान का नाम) *
                  </label>
                  <input
                    type="text"
                    value={inwProductName}
                    onChange={(e) => setInwProductName(e.target.value)}
                    placeholder="e.g. Aashirvaad Chakki Atta (5 Kg)"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Incoming Qty (मात्रा) *
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={inwQty}
                      onChange={(e) => setInwQty(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                      required
                    />
                    <select
                      value={inwUnit}
                      onChange={(e) => setInwUnit(e.target.value)}
                      className="px-2 py-2 text-xs bg-slate-100 border border-slate-300 rounded"
                    >
                      <option value="Pkt">Pkt</option>
                      <option value="Kg">Kg</option>
                      <option value="Bag">Bag</option>
                      <option value="Pouch">Pouch</option>
                      <option value="Tin">Tin</option>
                      <option value="Box">Box</option>
                      <option value="Pack">Pack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Rate (खरीद रेट ₹) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={inwPurRate || ''}
                    onChange={(e) => setInwPurRate(parseFloat(e.target.value) || 0)}
                    placeholder="215.00"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling MRP (बिक्री रेट ₹) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={inwSellRate || ''}
                    onChange={(e) => setInwSellRate(parseFloat(e.target.value) || 0)}
                    placeholder="245.00"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                {/* Row 3: GST Slab & Submit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GST Slab (%)
                  </label>
                  <select
                    value={inwGstSlab}
                    onChange={(e) => setInwGstSlab(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                  >
                    <option value={0}>0% (Exempt / Unbranded Grain)</option>
                    <option value={5}>5% (Essential Kirana / Oil / Tea)</option>
                    <option value={12}>12% (Ghee / Snacks / Noodles)</option>
                    <option value={18}>18% (Soaps / Detergents / Biscuits)</option>
                    <option value={28}>28% (Aerated Drinks / Luxury)</option>
                  </select>
                </div>

                <div className="lg:col-span-3 flex items-end">
                  <div className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200 w-full">
                    Total Purchase Cost: <strong className="text-slate-900">₹{(inwQty * inwPurRate).toFixed(2)}</strong> · Expected Margin per Unit:{' '}
                    <strong className="text-emerald-700">
                      +₹{Math.max(0, inwSellRate - inwPurRate).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="lg:col-span-2 flex items-end justify-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Save Inward Entry & Add Stock (स्टॉक जोड़ें)
                  </button>
                </div>
              </form>
            </section>

            {/* Inward Purchase Register Table */}
            <section className="bg-white border border-slate-300 rounded-md overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-700" />
                  Inward Stock Register — Saman Aane Ka Record ({inwardEntries.length} Entries)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Input GST Credit Available: ₹{totalInputGst.toFixed(2)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Supplier Bill No</th>
                      <th className="py-2.5 px-3">Seller / Supplier Name (विक्रेता)</th>
                      <th className="py-2.5 px-3">Seller GSTIN</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Product Name (सामान)</th>
                      <th className="py-2.5 px-3 text-right">Qty Added</th>
                      <th className="py-2.5 px-3 text-right">Pur. Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-3 text-right">Total Cost (₹)</th>
                      <th className="py-2.5 px-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {inwardEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {entry.date} · {entry.timestamp}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                          {entry.invoiceNo}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{entry.sellerName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {entry.sellerGstin || 'Unregistered'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{entry.barcode}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{entry.productName}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          +{entry.quantity} {entry.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{entry.purchaseRate.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{entry.gstPercent}%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{entry.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{entry.paymentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            TAB 3: STOCK & INVENTORY MASTER (QUANTITY, SELLER, BARCODE)
           =================================================================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-300 rounded-md p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder="Search by Product Name, Barcode, Category, or Seller..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setInvFilterLowStock(!invFilterLowStock)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                    invFilterLowStock
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Low Stock Alert ({lowStockCount})
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span>Total SKUs: {products.length}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Stock Value (Cost):{' '}
                  <strong className="text-slate-900">
                    ₹{totalInventoryValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </span>
                <button
                  onClick={() => setActiveTab('inward')}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-sans font-semibold rounded cursor-pointer"
                >
                  + Add New Stock
                </button>
              </div>
            </div>

            <section className="bg-white border border-slate-300 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                      <th className="py-2.5 px-3">Barcode (EAN)</th>
                      <th className="py-2.5 px-3">Product Name (सामान का नाम)</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Purchase Cost (₹)</th>
                      <th className="py-2.5 px-3 text-right">Selling MRP (₹)</th>
                      <th className="py-2.5 px-3 text-right">Profit / Unit (₹)</th>
                      <th className="py-2.5 px-3 text-right">GST Slab</th>
                      <th className="py-2.5 px-3 text-right">Available Qty</th>
                      <th className="py-2.5 px-3">Primary Seller / Mahajan</th>
                      <th className="py-2.5 px-3 text-center">Quick Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredProducts.map((prod) => {
                      const unitProfit = prod.sellingPrice - prod.purchasePrice;
                      const isLow = prod.stockQty <= prod.minStockAlert;
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-600">{prod.barcode}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{prod.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{prod.category}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{prod.purchasePrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{prod.sellingPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                            +₹{unitProfit.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{prod.gstPercent}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={isLow ? 'text-amber-700' : 'text-slate-900'}>
                              {prod.stockQty} {prod.unit} {isLow ? '(Low)' : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{prod.defaultSupplier}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => {
                                addProductToCart(prod, 1);
                                setActiveTab('pos');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer"
                            >
                              + Bill
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            TAB 4: DAILY SALES & PROFIT TRACKING (BIKRI AUR MUNAFA HISAB)
           =================================================================== */}
        {activeTab === 'profit' && (
          <div className="space-y-6">
            {/* 4-Column Financial KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-300 rounded-md p-4">
                <div className="text-xs font-semibold text-slate-500">Total Outward Sales (कुल बिक्री)</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  ₹{totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  Across {salesInvoices.length} Customer Bills
                </div>
              </div>

              <div className="bg-white border border-slate-300 rounded-md p-4">
                <div className="text-xs font-semibold text-emerald-800">Net Profit Earned (शुद्ध मुनाफा)</div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  +₹{totalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  Avg Margin:{' '}
                  {totalSalesRevenue > 0 ? ((totalNetProfit / totalSalesRevenue) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>

              <div className="bg-white border border-slate-300 rounded-md p-4">
                <div className="text-xs font-semibold text-slate-500">Inward Stock Purchases (कुल खरीद)</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  ₹{totalInwardPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  {inwardEntries.length} Supplier Invoices Logged
                </div>
              </div>

              <div className="bg-white border border-slate-300 rounded-md p-4">
                <div className="text-xs font-semibold text-slate-500">Total Output GST Collected</div>
                <div className="text-2xl font-bold font-mono text-blue-800 mt-1">
                  ₹{totalOutputGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  CGST: ₹{(totalOutputGst / 2).toFixed(2)} · SGST: ₹{(totalOutputGst / 2).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Outward Sales & Profit Ledger Table */}
            <section className="bg-white border border-slate-300 rounded-md overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Daily Sales & Customer Profit Ledger (जाने वाले सामान और मुनाफे का पूरा हिसाब)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shows every outward bill, Purchaser Name (खरीदार का नाम), items sold, GST collected, and exact net profit.
                  </p>
                </div>
                <input
                  type="text"
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  placeholder="Filter by Purchaser Name or Invoice No..."
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded w-64 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Purchaser Name (खरीदार / ग्राहक)</th>
                      <th className="py-2.5 px-3">Items Sold (जाने वाला सामान)</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total GST (₹)</th>
                      <th className="py-2.5 px-3 text-right">Bill Amount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net Profit / मुनाफा (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {salesInvoices
                      .filter(
                        (inv) =>
                          inv.purchaserName.toLowerCase().includes(salesSearch.toLowerCase()) ||
                          inv.invoiceNo.toLowerCase().includes(salesSearch.toLowerCase())
                      )
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-800">{inv.invoiceNo}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {inv.date} · {inv.timestamp}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {inv.purchaserName}
                            {inv.purchaserPhone && (
                              <span className="block text-[11px] font-mono text-slate-500">
                                Ph: {inv.purchaserPhone}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                            {inv.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{inv.paymentMode}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{inv.subTotalTaxable.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{inv.totalGst.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{inv.grandTotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            +₹{inv.totalProfit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            TAB 5: GST REPORT GENERATOR (SLAB-WISE CGST / SGST & ITC SUMMARY)
           =================================================================== */}
        {activeTab === 'gst' && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-300 rounded-md p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    GST Report Generator — GSTR-1 (Outward Sales) & GSTR-3B (Tax & Input Credit Summary)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Automatic slab-wise bifurcation (0%, 5%, 12%, 18%, 28%) into Central GST (CGST) and State GST (SGST) along with Seller Input Tax Credit (ITC).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportGstCsv}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download GST Report (.CSV for Excel)
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print GST Statement
                  </button>
                </div>
              </div>

              {/* Slab-wise Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                      <th className="py-2.5 px-3">GST Tax Slab</th>
                      <th className="py-2.5 px-3 text-right">Units Sold</th>
                      <th className="py-2.5 px-3 text-right">Taxable Sales Value (₹)</th>
                      <th className="py-2.5 px-3 text-right">CGST Output (₹)</th>
                      <th className="py-2.5 px-3 text-right">SGST Output (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Output GST (₹)</th>
                      <th className="py-2.5 px-3 text-right">Gross Invoice Total (₹)</th>
                      <th className="py-2.5 px-3 text-right">Inward Purchase ITC (₹)</th>
                      <th className="py-2.5 px-3 text-right">Net GST Liability (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-mono">
                    {gstSlabReport.map((row) => (
                      <tr key={row.slab} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">
                          GST {row.slab}%{' '}
                          <span className="font-normal text-slate-500">
                            ({row.slab / 2}% CGST + {row.slab / 2}% SGST)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">{row.unitsSold}</td>
                        <td className="py-3 px-3 text-right">₹{row.taxableValue.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right">₹{row.cgst.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right">₹{row.sgst.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-bold text-blue-800">
                          ₹{row.totalOutputGst.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          ₹{row.grossTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700">
                          ₹{row.inwardGst.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          ₹{row.netGstPayable.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-mono text-xs font-bold">
                      <td className="py-3 px-3 font-sans">TOTAL GST SUMMARY</td>
                      <td className="py-3 px-3 text-right">
                        {gstSlabReport.reduce((s, r) => s + r.unitsSold, 0)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ₹{gstSlabReport.reduce((s, r) => s + r.taxableValue, 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ₹{gstSlabReport.reduce((s, r) => s + r.cgst, 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ₹{gstSlabReport.reduce((s, r) => s + r.sgst, 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-300">
                        ₹{totalOutputGst.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ₹{totalSalesRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-300">
                        ₹{totalInputGst.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ₹{(totalOutputGst - totalInputGst).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            TAB 6: PYTHON TKINTER + SQLITE3 SOURCE CODE EXPORT (kirana_mitra.py)
           =================================================================== */}
        {activeTab === 'python' && (
          <div className="space-y-5">
            <section className="bg-white border border-slate-300 rounded-md p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Complete Python Tkinter + SQLite3 Desktop Software Code (`kirana_mitra.py`)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    100% pure Python 3 desktop software using standard <code className="font-mono bg-slate-100 px-1 rounded">tkinter</code> GUI and <code className="font-mono bg-slate-100 px-1 rounded">sqlite3</code> local database (<code className="font-mono bg-slate-100 px-1 rounded">kirana_mitra.db</code>). Zero external pip packages required!
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyPythonCode}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded flex items-center gap-2 cursor-pointer"
                  >
                    {copiedPython ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedPython ? 'Copied to Clipboard!' : 'Copy Python Code'}
                  </button>
                  <button
                    onClick={handleDownloadPythonScript}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download kirana_mitra.py
                  </button>
                </div>
              </div>

              {/* How to run instructions on PC */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 mb-1">Step 1: Download File</div>
                  <p className="text-slate-600">
                    Click <strong>Download kirana_mitra.py</strong> above and save it on your Windows, Linux, or Mac computer.
                  </p>
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-1">Step 2: Run with Python (No pip needed)</div>
                  <p className="text-slate-600 font-mono">
                    python kirana_mitra.py
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    Uses built-in <code className="font-mono">tkinter</code>, <code className="font-mono">sqlite3</code>, and <code className="font-mono">csv</code> modules.
                  </p>
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-1">Step 3: Local Database Auto-Created</div>
                  <p className="text-slate-600">
                    Automatically creates <code className="font-mono">kirana_mitra.db</code> in the same folder to store all stock, sellers, purchasers, bills, and GST data offline.
                  </p>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="bg-slate-950 text-slate-100 rounded-md p-4 overflow-x-auto max-h-[540px] border border-slate-800">
                <pre className="text-xs font-mono leading-relaxed select-all">
                  <code>{KIRANA_MITRA_PYTHON_CODE}</code>
                </pre>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Quiet Desktop Footer */}
      <footer className="mt-auto border-t border-slate-300 bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          Kirana Mitra Desktop Billing & Inventory Suite · Local Database Persistence Active
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleResetDatabase}
            className="text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Sample Database
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={handleDownloadPythonScript}
            className="text-blue-700 hover:underline font-medium cursor-pointer"
          >
            Download kirana_mitra.py (Tkinter + SQLite3)
          </button>
        </div>
      </footer>
    </div>
  );
}
