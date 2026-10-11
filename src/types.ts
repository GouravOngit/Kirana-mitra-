export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number; // Base cost price (excluding GST or landed cost)
  sellingPrice: number;  // MRP / Customer price (inclusive of GST or taxable + GST)
  gstPercent: 0 | 5 | 12 | 18 | 28;
  stockQty: number;
  minStockAlert: number;
  defaultSupplier: string;
}

export interface InwardEntry {
  id: string;
  invoiceNo: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  sellerName: string;
  sellerPhone: string;
  sellerGstin: string;
  barcode: string;
  productName: string;
  unit: string;
  quantity: number;
  purchaseRate: number;
  sellingRate: number;
  gstPercent: 0 | 5 | 12 | 18 | 28;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Pending Credit';
}

export interface SaleItem {
  productId: string;
  barcode: string;
  productName: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  gstPercent: 0 | 5 | 12 | 18 | 28;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  profitAmount: number;
}

export interface SaleInvoice {
  id: string;
  invoiceNo: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  purchaserName: string;
  purchaserPhone: string;
  purchaserGstin: string;
  paymentMode: 'Cash' | 'UPI / QR' | 'Udhaar (Credit)' | 'Card';
  items: SaleItem[];
  subTotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalGst: number;
  discount: number;
  grandTotal: number;
  totalProfit: number;
}

export interface PartyRecord {
  id: string;
  name: string;
  type: 'Seller (Mahajan/Supplier)' | 'Purchaser (Grahak/Customer)';
  phone: string;
  gstin: string;
  address: string;
}
