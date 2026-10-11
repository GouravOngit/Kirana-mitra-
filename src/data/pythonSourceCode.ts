export const KIRANA_MITRA_PYTHON_CODE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=========================================================================================
  KIRANA MITRA (किराना मित्र) - Desktop Kirana Shop Billing, Inventory & GST Software
  Language : Python 3 (Standard Library Only - Zero External Dependencies)
  GUI      : tkinter & tkinter.ttk
  Database : sqlite3 (Local file: kirana_mitra.db)
=========================================================================================
  Features Included:
  1. Barcode Scanning & Fast POS Billing (Outward / Jane ka saman + Purchaser Name)
  2. Stock Inward Entry (Naye saman aane ka + Seller/Supplier Name + Purchase Rate)
  3. Complete Inventory & Stock Alert Management (Quantity, Purchase/Sale Rate, GST %)
  4. Daily Sales & Real-time Profit Tracking (Bikri aur Munafa Hisab)
  5. GST Report Generator (Slab-wise 0%, 5%, 12%, 18%, 28% CGST/SGST & CSV Export)
=========================================================================================
"""

import sqlite3
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime
import csv
import os

DB_FILE = "kirana_mitra.db"


class KiranaMitraDB:
    """Handles all local SQLite3 database operations for Kirana Mitra."""

    def __init__(self, db_path=DB_FILE):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.create_tables()
        self.seed_initial_data()

    def create_tables(self):
        cur = self.conn.cursor()
        # 1. Products / Inventory Master Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS products (
                barcode TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'General',
                unit TEXT DEFAULT 'Pkt',
                purchase_price REAL NOT NULL,
                selling_price REAL NOT NULL,
                gst_percent REAL DEFAULT 5.0,
                stock_qty REAL DEFAULT 0.0,
                default_supplier TEXT DEFAULT ''
            )
        """)

        # 2. Inward Stock (Naye Saman Aane Ka / Purchase from Seller)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS inward_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_no TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                seller_name TEXT NOT NULL,
                seller_phone TEXT DEFAULT '',
                seller_gstin TEXT DEFAULT '',
                barcode TEXT NOT NULL,
                product_name TEXT NOT NULL,
                unit TEXT DEFAULT 'Pkt',
                quantity REAL NOT NULL,
                purchase_rate REAL NOT NULL,
                selling_rate REAL NOT NULL,
                gst_percent REAL NOT NULL,
                taxable_amount REAL NOT NULL,
                gst_amount REAL NOT NULL,
                total_amount REAL NOT NULL
            )
        """)

        # 3. Outward Sales Invoices (Saman Jane Ka / Billing to Purchaser)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sales_invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_no TEXT UNIQUE NOT NULL,
                sale_date TEXT NOT NULL,
                sale_time TEXT NOT NULL,
                purchaser_name TEXT NOT NULL,
                purchaser_phone TEXT DEFAULT '',
                payment_mode TEXT DEFAULT 'Cash',
                taxable_subtotal REAL NOT NULL,
                cgst_total REAL NOT NULL,
                sgst_total REAL NOT NULL,
                gst_total REAL NOT NULL,
                grand_total REAL NOT NULL,
                total_profit REAL NOT NULL
            )
        """)

        # 4. Outward Sale Line Items
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_no TEXT NOT NULL,
                sale_date TEXT NOT NULL,
                purchaser_name TEXT NOT NULL,
                barcode TEXT NOT NULL,
                product_name TEXT NOT NULL,
                unit TEXT DEFAULT 'Pkt',
                quantity REAL NOT NULL,
                purchase_price REAL NOT NULL,
                selling_price REAL NOT NULL,
                gst_percent REAL NOT NULL,
                taxable_value REAL NOT NULL,
                cgst_amount REAL NOT NULL,
                sgst_amount REAL NOT NULL,
                total_amount REAL NOT NULL,
                profit_amount REAL NOT NULL
            )
        """)
        self.conn.commit()

    def seed_initial_data(self):
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) as cnt FROM products")
        if cur.fetchone()["cnt"] == 0:
            sample_products = [
                ("8901058851245", "Maggi 2-Min Masala Noodles (70g)", "Snacks", "Pkt", 11.50, 14.00, 12.0, 85, "Nestle Distributors"),
                ("8901725121440", "Aashirvaad Shudh Chakki Atta (5Kg)", "Atta & Grain", "Bag", 215.00, 245.00, 5.0, 24, "ITC Wholesale Hub"),
                ("8901063142124", "Parle-G Gluco Biscuits Family (800g)", "Biscuits", "Pkt", 76.00, 90.00, 18.0, 40, "Laxmi Confectionery"),
                ("8901030865211", "Tata Tea Gold Assam Leaves (500g)", "Beverages", "Pkt", 235.00, 270.00, 5.0, 18, "Bharat Beverages"),
                ("8901396315209", "Fortune Refined Sunflower Oil (1L)", "Edible Oil", "Pouch", 122.00, 140.00, 5.0, 32, "Adani Wilmar Depot"),
                ("8901262010016", "Amul Pure Milk Ghee Tin (1L)", "Dairy & Ghee", "Tin", 565.00, 615.00, 12.0, 12, "Anand Dairy Dist."),
                ("8901030794513", "Surf Excel Easy Wash (1.5Kg)", "Household", "Pkt", 162.00, 190.00, 18.0, 19, "HUL Super Stockist"),
                ("8901491101837", "Haldiram Bhujia Sev (400g)", "Snacks", "Pkt", 88.00, 105.00, 12.0, 28, "Bikaner Namkeen"),
                ("8901012110023", "Tata Salt Vacuum Evaporated (1Kg)", "Spices & Salt", "Pkt", 22.00, 28.00, 0.0, 60, "Bharat Beverages"),
                ("8901138501211", "Toor Dal / Arhar Dal Unpolished (1Kg)", "Pulses", "Kg", 138.00, 160.00, 0.0, 15, "Mandi Grain Merchants"),
            ]
            cur.executemany("""
                INSERT INTO products (barcode, name, category, unit, purchase_price, selling_price, gst_percent, stock_qty, default_supplier)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sample_products)
            self.conn.commit()


class KiranaMitraApp(tk.Tk):
    """Main Tkinter Desktop Window for Kirana Mitra."""

    def __init__(self):
        super().__init__()
        self.title("Kirana Mitra (किराना मित्र) - Billing, Stock, Barcode & GST Software [Local SQLite DB]")
        self.geometry("1280x780")
        self.minsize(1100, 680)
        self.configure(bg="#F1F5F9")

        self.db = KiranaMitraDB()
        self.cart_items = []  # Holds current POS billing cart items

        self._setup_styles()
        self._build_header()
        self._build_notebook()
        self.refresh_all_views()

    def _setup_styles(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure("TFrame", background="#F1F5F9")
        style.configure("Card.TFrame", background="#FFFFFF", relief="solid", borderwidth=1)
        style.configure("TLabel", background="#F1F5F9", foreground="#0F172A", font=("Segoe UI", 10))
        style.configure("Card.TLabel", background="#FFFFFF", foreground="#0F172A", font=("Segoe UI", 10))
        style.configure("Header.TLabel", background="#0F172A", foreground="#FFFFFF", font=("Segoe UI", 15, "bold"))
        style.configure("SubHeader.TLabel", background="#0F172A", foreground="#94A3B8", font=("Segoe UI", 9))

        style.configure("TNotebook", background="#E2E8F0", borderwidth=0)
        style.configure("TNotebook.Tab", font=("Segoe UI", 10, "bold"), padding=[16, 8], background="#CBD5E1", foreground="#1E293B")
        style.map("TNotebook.Tab", background=[("selected", "#1E40AF")], foreground=[("selected", "#FFFFFF")])

        style.configure("Primary.TButton", font=("Segoe UI", 10, "bold"), background="#1E40AF", foreground="#FFFFFF", padding=[12, 6])
        style.map("Primary.TButton", background=[("active", "#1D4ED8")])

        style.configure("Success.TButton", font=("Segoe UI", 10, "bold"), background="#15803D", foreground="#FFFFFF", padding=[12, 6])
        style.map("Success.TButton", background=[("active", "#166534")])

        style.configure("Danger.TButton", font=("Segoe UI", 10), background="#B91C1C", foreground="#FFFFFF", padding=[10, 5])
        style.map("Danger.TButton", background=[("active", "#991B1B")])

        style.configure("Treeview", font=("Segoe UI", 10), rowheight=28, background="#FFFFFF", fieldbackground="#FFFFFF")
        style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"), background="#E2E8F0", foreground="#0F172A", padding=6)

    def _build_header(self):
        header_frame = tk.Frame(self, bg="#0F172A", height=60, padx=18, pady=10)
        header_frame.pack(fill=tk.X, side=tk.TOP)

        title_lbl = ttk.Label(
            header_frame,
            text="KIRANA MITRA (किराना मित्र) — POS Billing, Stock, Profit & GST System",
            style="Header.TLabel"
        )
        title_lbl.pack(side=tk.LEFT)

        db_status = ttk.Label(
            header_frame,
            text=f"Local Database: {os.path.abspath(DB_FILE)} | Barcode Ready",
            style="SubHeader.TLabel"
        )
        db_status.pack(side=tk.RIGHT)

    def _build_notebook(self):
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=12, pady=10)

        # Create 5 Main Desktop Tabs
        self.tab_pos = ttk.Frame(self.notebook)
        self.tab_inward = ttk.Frame(self.notebook)
        self.tab_inventory = ttk.Frame(self.notebook)
        self.tab_sales_profit = ttk.Frame(self.notebook)
        self.tab_gst = ttk.Frame(self.notebook)

        self.notebook.add(self.tab_pos, text=" [F1] Outward Billing & Barcode POS (सामान जाने का) ")
        self.notebook.add(self.tab_inward, text=" [F2] Inward Stock / Purchase (नए सामान आने का) ")
        self.notebook.add(self.tab_inventory, text=" [F3] Stock & Inventory Master (स्टॉक सूची) ")
        self.notebook.add(self.tab_sales_profit, text=" [F4] Daily Sales & Profit (बिक्री और मुनाफा) ")
        self.notebook.add(self.tab_gst, text=" [F5] GST Report & Tax Filing (GST रिपोर्ट) ")

        self._init_pos_tab()
        self._init_inward_tab()
        self._init_inventory_tab()
        self._init_sales_profit_tab()
        self._init_gst_tab()

    # =========================================================================
    # TAB 1: OUTWARD BILLING & BARCODE POS (SAMAN JANE KA + PURCHASER NAME)
    # =========================================================================
    def _init_pos_tab(self):
        top_frame = tk.LabelFrame(
            self.tab_pos, text=" Purchaser Details & Barcode Scanner (ग्राहक एवं बारकोड स्कैनर) ",
            font=("Segoe UI", 10, "bold"), bg="#FFFFFF", fg="#1E40AF", padx=12, pady=10
        )
        top_frame.pack(fill=tk.X, padx=8, pady=6)

        # Row 0: Purchaser Info
        tk.Label(top_frame, text="Purchaser Name (खरीदार का नाम):", bg="#FFFFFF", font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w", padx=5, pady=4)
        self.pos_purchaser_var = tk.StringVar(value="Walk-in Customer (नकद ग्राहक)")
        tk.Entry(top_frame, textvariable=self.pos_purchaser_var, width=28, font=("Segoe UI", 10)).grid(row=0, column=1, padx=5, pady=4)

        tk.Label(top_frame, text="Mobile No:", bg="#FFFFFF", font=("Segoe UI", 10)).grid(row=0, column=2, sticky="w", padx=5, pady=4)
        self.pos_phone_var = tk.StringVar()
        tk.Entry(top_frame, textvariable=self.pos_phone_var, width=16, font=("Segoe UI", 10)).grid(row=0, column=3, padx=5, pady=4)

        tk.Label(top_frame, text="Payment Mode:", bg="#FFFFFF", font=("Segoe UI", 10)).grid(row=0, column=4, sticky="w", padx=5, pady=4)
        self.pos_paymode_var = tk.StringVar(value="Cash")
        ttk.Combobox(top_frame, textvariable=self.pos_paymode_var, values=["Cash", "UPI / QR", "Udhaar (Credit)", "Card"], width=15, state="readonly").grid(row=0, column=5, padx=5, pady=4)

        # Row 1: Barcode Scanner Input (Auto-trigger on Enter)
        tk.Label(top_frame, text="SCAN BARCODE (बारकोड स्कैन करें):", bg="#FFFFFF", fg="#15803D", font=("Segoe UI", 11, "bold")).grid(row=1, column=0, sticky="w", padx=5, pady=8)
        self.pos_barcode_var = tk.StringVar()
        self.barcode_entry = tk.Entry(top_frame, textvariable=self.pos_barcode_var, width=28, font=("Consolas", 12, "bold"), bg="#FEFCE8", fg="#0F172A")
        self.barcode_entry.grid(row=1, column=1, padx=5, pady=8)
        self.barcode_entry.bind("<Return>", self.on_barcode_scanned)

        tk.Label(top_frame, text="Qty (मात्रा):", bg="#FFFFFF", font=("Segoe UI", 10, "bold")).grid(row=1, column=2, sticky="w", padx=5, pady=8)
        self.pos_qty_var = tk.StringVar(value="1")
        tk.Entry(top_frame, textvariable=self.pos_qty_var, width=10, font=("Segoe UI", 11, "bold")).grid(row=1, column=3, sticky="w", padx=5, pady=8)

        ttk.Button(top_frame, text="Add by Barcode [Enter]", style="Primary.TButton", command=self.on_barcode_scanned).grid(row=1, column=4, padx=5, pady=8)
        ttk.Button(top_frame, text="Clear Bill", style="Danger.TButton", command=self.clear_pos_cart).grid(row=1, column=5, padx=5, pady=8)

        # Cart Table
        cart_frame = ttk.Frame(self.tab_pos)
        cart_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)

        cols = ("barcode", "name", "unit", "qty", "rate", "gst_pct", "taxable", "gst_amt", "total", "profit")
        self.cart_tree = ttk.Treeview(cart_frame, columns=cols, show="headings", height=12)
        headers = {
            "barcode": ("Barcode", 120),
            "name": ("Product Name (सामान का नाम)", 250),
            "unit": ("Unit", 60),
            "qty": ("Qty", 65),
            "rate": ("Sale Price (₹)", 95),
            "gst_pct": ("GST %", 65),
            "taxable": ("Taxable (₹)", 95),
            "gst_amt": ("GST Amt (₹)", 90),
            "total": ("Total (₹)", 100),
            "profit": ("Profit/मुनाफा (₹)", 100),
        }
        for col, (text, width) in headers.items():
            self.cart_tree.heading(col, text=text)
            self.cart_tree.column(col, width=width, anchor="center" if col not in ("name",) else "w")

        scrollbar = ttk.Scrollbar(cart_frame, orient=tk.VERTICAL, command=self.cart_tree.yview)
        self.cart_tree.configure(yscroll=scrollbar.set)
        self.cart_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Bottom Checkout Bar
        bottom_frame = tk.Frame(self.tab_pos, bg="#0F172A", padx=16, pady=12)
        bottom_frame.pack(fill=tk.X, padx=8, pady=6)

        self.pos_summary_var = tk.StringVar(value="Items: 0  |  Taxable: ₹0.00  |  Total GST: ₹0.00  |  GRAND TOTAL: ₹0.00")
        tk.Label(bottom_frame, textvariable=self.pos_summary_var, bg="#0F172A", fg="#FFFFFF", font=("Consolas", 13, "bold")).pack(side=tk.LEFT)

        ttk.Button(bottom_frame, text="GENERATE GST BILL & SAVE SALE (बिल सेव करें)", style="Success.TButton", command=self.complete_pos_sale).pack(side=tk.RIGHT, padx=6)
        ttk.Button(bottom_frame, text="Remove Selected Item", style="Danger.TButton", command=self.remove_selected_cart_item).pack(side=tk.RIGHT, padx=6)

    def on_barcode_scanned(self, event=None):
        barcode = self.pos_barcode_var.get().strip()
        if not barcode:
            messagebox.showwarning("Barcode Empty", "Please scan or enter a product barcode!")
            return
        try:
            qty = float(self.pos_qty_var.get())
            if qty <= 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("Invalid Quantity", "Please enter a valid positive quantity.")
            return

        cur = self.db.conn.cursor()
        cur.execute("SELECT * FROM products WHERE barcode = ? OR LOWER(name) LIKE ?", (barcode, f"%{barcode.lower()}%"))
        prod = cur.fetchone()
        if not prod:
            messagebox.showerror("Not Found", f"No product found with Barcode or Name: '{barcode}'")
            return

        if prod["stock_qty"] < qty:
            if not messagebox.askyesno("Low Stock Warning", f"Available stock for '{prod['name']}' is {prod['stock_qty']} {prod['unit']}. Continue billing anyway?"):
                return

        # Check if already in cart
        for item in self.cart_items:
            if item["barcode"] == prod["barcode"]:
                item["qty"] += qty
                self._recalculate_cart()
                self.pos_barcode_var.set("")
                self.pos_qty_var.set("1")
                self.barcode_entry.focus_set()
                return

        self.cart_items.append({
            "barcode": prod["barcode"],
            "name": prod["name"],
            "unit": prod["unit"],
            "qty": qty,
            "purchase_price": float(prod["purchase_price"]),
            "selling_price": float(prod["selling_price"]),
            "gst_percent": float(prod["gst_percent"]),
        })
        self._recalculate_cart()
        self.pos_barcode_var.set("")
        self.pos_qty_var.set("1")
        self.barcode_entry.focus_set()

    def _recalculate_cart(self):
        for row in self.cart_tree.get_children():
            self.cart_tree.delete(row)

        total_taxable = 0.0
        total_gst = 0.0
        grand_total = 0.0

        for item in self.cart_items:
            qty = item["qty"]
            rate = item["selling_price"]
            cost = item["purchase_price"]
            gst_pct = item["gst_percent"]

            line_total = round(qty * rate, 2)
            taxable = round(line_total / (1.0 + (gst_pct / 100.0)), 2)
            gst_amt = round(line_total - taxable, 2)
            profit = round((rate - cost) * qty, 2)

            item["taxable"] = taxable
            item["gst_amt"] = gst_amt
            item["total"] = line_total
            item["profit"] = profit

            total_taxable += taxable
            total_gst += gst_amt
            grand_total += line_total

            self.cart_tree.insert("", tk.END, values=(
                item["barcode"], item["name"], item["unit"], f"{qty:g}",
                f"{rate:.2f}", f"{gst_pct:g}%", f"{taxable:.2f}",
                f"{gst_amt:.2f}", f"{line_total:.2f}", f"{profit:.2f}"
            ))

        self.pos_summary_var.set(
            f"Items: {len(self.cart_items)}  |  Taxable: ₹{total_taxable:.2f}  |  Total GST: ₹{total_gst:.2f}  |  GRAND TOTAL: ₹{grand_total:.2f}"
        )

    def remove_selected_cart_item(self):
        selected = self.cart_tree.selection()
        if not selected:
            return
        idx = self.cart_tree.index(selected[0])
        if 0 <= idx < len(self.cart_items):
            self.cart_items.pop(idx)
            self._recalculate_cart()

    def clear_pos_cart(self):
        self.cart_items.clear()
        self._recalculate_cart()

    def complete_pos_sale(self):
        if not self.cart_items:
            messagebox.showwarning("Empty Bill", "Please scan or add at least 1 item to generate a bill.")
            return

        purchaser_name = self.pos_purchaser_var.get().strip() or "Walk-in Customer"
        purchaser_phone = self.pos_phone_var.get().strip()
        pay_mode = self.pos_paymode_var.get()

        now = datetime.now()
        sale_date = now.strftime("%Y-%m-%d")
        sale_time = now.strftime("%I:%M %p")
        invoice_no = f"KM-{now.strftime('%Y%m%d-%H%M%S')}"

        taxable_subtotal = sum(i["taxable"] for i in self.cart_items)
        gst_total = sum(i["gst_amt"] for i in self.cart_items)
        cgst_total = round(gst_total / 2.0, 2)
        sgst_total = round(gst_total - cgst_total, 2)
        grand_total = sum(i["total"] for i in self.cart_items)
        total_profit = sum(i["profit"] for i in self.cart_items)

        cur = self.db.conn.cursor()
        cur.execute("""
            INSERT INTO sales_invoices (
                invoice_no, sale_date, sale_time, purchaser_name, purchaser_phone,
                payment_mode, taxable_subtotal, cgst_total, sgst_total, gst_total,
                grand_total, total_profit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            invoice_no, sale_date, sale_time, purchaser_name, purchaser_phone,
            pay_mode, taxable_subtotal, cgst_total, sgst_total, gst_total,
            grand_total, total_profit
        ))

        for item in self.cart_items:
            cgst_i = round(item["gst_amt"] / 2.0, 2)
            sgst_i = round(item["gst_amt"] - cgst_i, 2)
            cur.execute("""
                INSERT INTO sale_items (
                    invoice_no, sale_date, purchaser_name, barcode, product_name,
                    unit, quantity, purchase_price, selling_price, gst_percent,
                    taxable_value, cgst_amount, sgst_amount, total_amount, profit_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                invoice_no, sale_date, purchaser_name, item["barcode"], item["name"],
                item["unit"], item["qty"], item["purchase_price"], item["selling_price"],
                item["gst_percent"], item["taxable"], cgst_i, sgst_i, item["total"], item["profit"]
            ))
            # Deduct Stock
            cur.execute("""
                UPDATE products SET stock_qty = stock_qty - ? WHERE barcode = ?
            """, (item["qty"], item["barcode"]))

        self.db.conn.commit()
        messagebox.showinfo(
            "Bill Saved Successfully",
            f"Invoice No: {invoice_no}\\nPurchaser: {purchaser_name}\\nGrand Total: ₹{grand_total:.2f}\\nNet Profit: ₹{total_profit:.2f}"
        )
        self.clear_pos_cart()
        self.refresh_all_views()

    # =========================================================================
    # TAB 2: INWARD STOCK / PURCHASE ENTRY (NAYE SAMAN AANE KA + SELLER NAME)
    # =========================================================================
    def _init_inward_tab(self):
        form_frame = tk.LabelFrame(
            self.tab_inward, text=" Add Incoming Stock / Purchase from Seller (नए सामान आने की एंट्री - विक्रेता/महाजन) ",
            font=("Segoe UI", 10, "bold"), bg="#FFFFFF", fg="#1E40AF", padx=14, pady=12
        )
        form_frame.pack(fill=tk.X, padx=8, pady=6)

        self.inw_invoice_var = tk.StringVar(value=f"PUR-{datetime.now().strftime('%m%d-%H%M')}")
        self.inw_seller_var = tk.StringVar()
        self.inw_phone_var = tk.StringVar()
        self.inw_gstin_var = tk.StringVar()
        self.inw_barcode_var = tk.StringVar()
        self.inw_name_var = tk.StringVar()
        self.inw_unit_var = tk.StringVar(value="Pkt")
        self.inw_qty_var = tk.StringVar(value="10")
        self.inw_pur_rate_var = tk.StringVar(value="0.00")
        self.inw_sell_rate_var = tk.StringVar(value="0.00")
        self.inw_gst_var = tk.StringVar(value="5")

        # Grid Form
        tk.Label(form_frame, text="Supplier Bill No:", bg="#FFFFFF").grid(row=0, column=0, sticky="w", padx=5, pady=4)
        tk.Entry(form_frame, textvariable=self.inw_invoice_var, width=18).grid(row=0, column=1, padx=5, pady=4)

        tk.Label(form_frame, text="Seller/Supplier Name (विक्रेता का नाम)*:", bg="#FFFFFF", font=("Segoe UI", 9, "bold")).grid(row=0, column=2, sticky="w", padx=5, pady=4)
        tk.Entry(form_frame, textvariable=self.inw_seller_var, width=28).grid(row=0, column=3, padx=5, pady=4)

        tk.Label(form_frame, text="Seller GSTIN:", bg="#FFFFFF").grid(row=0, column=4, sticky="w", padx=5, pady=4)
        tk.Entry(form_frame, textvariable=self.inw_gstin_var, width=18).grid(row=0, column=5, padx=5, pady=4)

        tk.Label(form_frame, text="Barcode (बारकोड)*:", bg="#FFFFFF", font=("Segoe UI", 9, "bold")).grid(row=1, column=0, sticky="w", padx=5, pady=4)
        bc_entry = tk.Entry(form_frame, textvariable=self.inw_barcode_var, width=18, bg="#FEFCE8")
        bc_entry.grid(row=1, column=1, padx=5, pady=4)
        bc_entry.bind("<Return>", self._autofill_inward_product)

        tk.Label(form_frame, text="Product Name (सामान का नाम)*:", bg="#FFFFFF", font=("Segoe UI", 9, "bold")).grid(row=1, column=2, sticky="w", padx=5, pady=4)
        tk.Entry(form_frame, textvariable=self.inw_name_var, width=28).grid(row=1, column=3, padx=5, pady=4)

        tk.Label(form_frame, text="Unit:", bg="#FFFFFF").grid(row=1, column=4, sticky="w", padx=5, pady=4)
        ttk.Combobox(form_frame, textvariable=self.inw_unit_var, values=["Pkt", "Kg", "Bag", "Ltr", "Box", "Tin", "Pouch", "Pc"], width=15).grid(row=1, column=5, padx=5, pady=4)

        tk.Label(form_frame, text="Incoming Qty (आने वाली मात्रा)*:", bg="#FFFFFF", font=("Segoe UI", 9, "bold")).grid(row=2, column=0, sticky="w", padx=5, pady=6)
        tk.Entry(form_frame, textvariable=self.inw_qty_var, width=18).grid(row=2, column=1, padx=5, pady=6)

        tk.Label(form_frame, text="Purchase Rate (खरीद रेट ₹)*:", bg="#FFFFFF", font=("Segoe UI", 9, "bold")).grid(row=2, column=2, sticky="w", padx=5, pady=6)
        tk.Entry(form_frame, textvariable=self.inw_pur_rate_var, width=18).grid(row=2, column=3, sticky="w", padx=5, pady=6)

        tk.Label(form_frame, text="Selling Price (बिक्री रेट ₹)*:", bg="#FFFFFF", font=("Segoe UI", 9, "bold")).grid(row=2, column=4, sticky="w", padx=5, pady=6)
        tk.Entry(form_frame, textvariable=self.inw_sell_rate_var, width=18).grid(row=2, column=5, sticky="w", padx=5, pady=6)

        tk.Label(form_frame, text="GST Slab (%):", bg="#FFFFFF").grid(row=3, column=0, sticky="w", padx=5, pady=6)
        ttk.Combobox(form_frame, textvariable=self.inw_gst_var, values=["0", "5", "12", "18", "28"], width=15, state="readonly").grid(row=3, column=1, padx=5, pady=6)

        ttk.Button(form_frame, text="Auto-Fill by Barcode", command=self._autofill_inward_product).grid(row=3, column=2, padx=5, pady=6)
        ttk.Button(form_frame, text="SAVE INWARD ENTRY & ADD STOCK (स्टॉक जोड़ें)", style="Success.TButton", command=self.save_inward_entry).grid(row=3, column=3, columnspan=3, sticky="e", padx=5, pady=6)

        # Inward History Treeview
        list_frame = ttk.Frame(self.tab_inward)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=6)

        cols = ("date", "inv", "seller", "gstin", "barcode", "product", "qty", "pur_rate", "gst_pct", "total")
        self.inward_tree = ttk.Treeview(list_frame, columns=cols, show="headings")
        headers = {
            "date": ("Date", 95),
            "inv": ("Bill No", 110),
            "seller": ("Seller / Supplier Name (विक्रेता)", 210),
            "gstin": ("Seller GSTIN", 130),
            "barcode": ("Barcode", 120),
            "product": ("Product Name (सामान)", 220),
            "qty": ("Qty In", 70),
            "pur_rate": ("Pur. Rate (₹)", 95),
            "gst_pct": ("GST %", 65),
            "total": ("Total Purchase (₹)", 120),
        }
        for col, (txt, w) in headers.items():
            self.inward_tree.heading(col, text=txt)
            self.inward_tree.column(col, width=w, anchor="center" if col not in ("seller", "product") else "w")

        sb = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.inward_tree.yview)
        self.inward_tree.configure(yscroll=sb.set)
        self.inward_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

    def _autofill_inward_product(self, event=None):
        bc = self.inw_barcode_var.get().strip()
        if not bc:
            return
        cur = self.db.conn.cursor()
        cur.execute("SELECT * FROM products WHERE barcode = ?", (bc,))
        row = cur.fetchone()
        if row:
            self.inw_name_var.set(row["name"])
            self.inw_unit_var.set(row["unit"])
            self.inw_pur_rate_var.set(str(row["purchase_price"]))
            self.inw_sell_rate_var.set(str(row["selling_price"]))
            self.inw_gst_var.set(str(int(row["gst_percent"])))
            if not self.inw_seller_var.get().strip():
                self.inw_seller_var.set(row["default_supplier"])

    def save_inward_entry(self):
        seller = self.inw_seller_var.get().strip()
        barcode = self.inw_barcode_var.get().strip()
        name = self.inw_name_var.get().strip()
        if not seller or not barcode or not name:
            messagebox.showwarning("Missing Details", "Seller Name, Barcode, and Product Name are mandatory!")
            return

        try:
            qty = float(self.inw_qty_var.get())
            pur_rate = float(self.inw_pur_rate_var.get())
            sell_rate = float(self.inw_sell_rate_var.get())
            gst_pct = float(self.inw_gst_var.get())
        except ValueError:
            messagebox.showerror("Invalid Numbers", "Please enter valid numeric values for Quantity and Rates.")
            return

        total_amt = round(qty * pur_rate, 2)
        taxable_amt = round(total_amt / (1.0 + (gst_pct / 100.0)), 2)
        gst_amt = round(total_amt - taxable_amt, 2)
        today = datetime.now().strftime("%Y-%m-%d")

        cur = self.db.conn.cursor()
        cur.execute("""
            INSERT INTO inward_entries (
                invoice_no, entry_date, seller_name, seller_phone, seller_gstin,
                barcode, product_name, unit, quantity, purchase_rate, selling_rate,
                gst_percent, taxable_amount, gst_amount, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            self.inw_invoice_var.get().strip(), today, seller,
            self.inw_phone_var.get().strip(), self.inw_gstin_var.get().strip(),
            barcode, name, self.inw_unit_var.get(), qty, pur_rate, sell_rate,
            gst_pct, taxable_amt, gst_amt, total_amt
        ))

        # Upsert into products master
        cur.execute("SELECT * FROM products WHERE barcode = ?", (barcode,))
        existing = cur.fetchone()
        if existing:
            cur.execute("""
                UPDATE products
                SET name = ?, unit = ?, purchase_price = ?, selling_price = ?,
                    gst_percent = ?, stock_qty = stock_qty + ?, default_supplier = ?
                WHERE barcode = ?
            """, (name, self.inw_unit_var.get(), pur_rate, sell_rate, gst_pct, qty, seller, barcode))
        else:
            cur.execute("""
                INSERT INTO products (barcode, name, category, unit, purchase_price, selling_price, gst_percent, stock_qty, default_supplier)
                VALUES (?, ?, 'General', ?, ?, ?, ?, ?, ?)
            """, (barcode, name, self.inw_unit_var.get(), pur_rate, sell_rate, gst_pct, qty, seller))

        self.db.conn.commit()
        messagebox.showinfo("Stock Updated", f"Added {qty:g} {self.inw_unit_var.get()} of '{name}' from Seller '{seller}'.")
        self.inw_barcode_var.set("")
        self.inw_name_var.set("")
        self.refresh_all_views()

    # =========================================================================
    # TAB 3: STOCK & INVENTORY MASTER
    # =========================================================================
    def _init_inventory_tab(self):
        top_bar = ttk.Frame(self.tab_inventory)
        top_bar.pack(fill=tk.X, padx=8, pady=6)

        tk.Label(top_bar, text="Search Product / Barcode:", font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT, padx=4)
        self.inv_search_var = tk.StringVar()
        search_entry = tk.Entry(top_bar, textvariable=self.inv_search_var, width=35, font=("Segoe UI", 10))
        search_entry.pack(side=tk.LEFT, padx=6)
        search_entry.bind("<KeyRelease>", lambda e: self.refresh_inventory_tree())

        self.inv_stats_var = tk.StringVar(value="")
        tk.Label(top_bar, textvariable=self.inv_stats_var, font=("Segoe UI", 10, "bold"), fg="#1E40AF").pack(side=tk.RIGHT, padx=8)

        tree_frame = ttk.Frame(self.tab_inventory)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)

        cols = ("barcode", "name", "unit", "pur_price", "sell_price", "margin", "gst", "stock", "supplier")
        self.inv_tree = ttk.Treeview(tree_frame, columns=cols, show="headings")
        headers = {
            "barcode": ("Barcode", 130),
            "name": ("Product Name (सामान का नाम)", 260),
            "unit": ("Unit", 65),
            "pur_price": ("Cost Price (₹)", 100),
            "sell_price": ("MRP / Sale (₹)", 100),
            "margin": ("Unit Profit (₹)", 100),
            "gst": ("GST %", 65),
            "stock": ("Available Qty", 100),
            "supplier": ("Default Seller / Mahajan", 200),
        }
        for col, (txt, w) in headers.items():
            self.inv_tree.heading(col, text=txt)
            self.inv_tree.column(col, width=w, anchor="center" if col not in ("name", "supplier") else "w")

        sb = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.inv_tree.yview)
        self.inv_tree.configure(yscroll=sb.set)
        self.inv_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

    # =========================================================================
    # TAB 4: DAILY SALES & PROFIT TRACKING (BIKRI AUR MUNAFA)
    # =========================================================================
    def _init_sales_profit_tab(self):
        kpi_frame = tk.Frame(self.tab_sales_profit, bg="#0F172A", padx=14, pady=12)
        kpi_frame.pack(fill=tk.X, padx=8, pady=6)

        self.sales_kpi_var = tk.StringVar(value="Total Sales: ₹0.00  |  Total Profit (कुल मुनाफा): ₹0.00")
        tk.Label(kpi_frame, textvariable=self.sales_kpi_var, bg="#0F172A", fg="#4ADE80", font=("Consolas", 13, "bold")).pack(side=tk.LEFT)

        tree_frame = ttk.Frame(self.tab_sales_profit)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)

        cols = ("inv", "date", "time", "purchaser", "paymode", "taxable", "gst", "grand_total", "profit")
        self.sales_tree = ttk.Treeview(tree_frame, columns=cols, show="headings")
        headers = {
            "inv": ("Invoice No", 140),
            "date": ("Date", 95),
            "time": ("Time", 85),
            "purchaser": ("Purchaser Name (खरीदार का नाम)", 230),
            "paymode": ("Payment Mode", 110),
            "taxable": ("Taxable (₹)", 105),
            "gst": ("Total GST (₹)", 100),
            "grand_total": ("Bill Total (₹)", 115),
            "profit": ("Net Profit / मुनाफा (₹)", 130),
        }
        for col, (txt, w) in headers.items():
            self.sales_tree.heading(col, text=txt)
            self.sales_tree.column(col, width=w, anchor="center" if col != "purchaser" else "w")

        sb = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.sales_tree.yview)
        self.sales_tree.configure(yscroll=sb.set)
        self.sales_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

    # =========================================================================
    # TAB 5: GST REPORT & CSV EXPORT
    # =========================================================================
    def _init_gst_tab(self):
        top_bar = tk.Frame(self.tab_gst, bg="#FFFFFF", padx=12, pady=10)
        top_bar.pack(fill=tk.X, padx=8, pady=6)

        self.gst_summary_var = tk.StringVar(value="Output GST Summary (GSTR-1 / GSTR-3B Ready)")
        tk.Label(top_bar, textvariable=self.gst_summary_var, bg="#FFFFFF", fg="#0F172A", font=("Segoe UI", 11, "bold")).pack(side=tk.LEFT)

        ttk.Button(top_bar, text="Export GST Report to CSV (Excel)", style="Primary.TButton", command=self.export_gst_csv).pack(side=tk.RIGHT, padx=6)

        tree_frame = ttk.Frame(self.tab_gst)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)

        cols = ("slab", "qty_sold", "taxable_val", "cgst", "sgst", "total_gst", "gross_sales")
        self.gst_tree = ttk.Treeview(tree_frame, columns=cols, show="headings", height=10)
        headers = {
            "slab": ("GST Slab (%)", 130),
            "qty_sold": ("Total Units Sold", 130),
            "taxable_val": ("Taxable Value (₹)", 160),
            "cgst": ("Central GST - CGST (₹)", 160),
            "sgst": ("State GST - SGST (₹)", 160),
            "total_gst": ("Total GST Tax (₹)", 160),
            "gross_sales": ("Gross Invoice Value (₹)", 170),
        }
        for col, (txt, w) in headers.items():
            self.gst_tree.heading(col, text=txt)
            self.gst_tree.column(col, width=w, anchor="center")

        self.gst_tree.pack(fill=tk.BOTH, expand=True)

    def export_gst_csv(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".csv",
            initialfile=f"Kirana_Mitra_GST_Report_{datetime.now().strftime('%Y%m%d')}.csv",
            filetypes=[("CSV Files", "*.csv")]
        )
        if not file_path:
            return
        with open(file_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["GST Slab", "Units Sold", "Taxable Value (INR)", "CGST (INR)", "SGST (INR)", "Total GST (INR)", "Gross Value (INR)"])
            for row_id in self.gst_tree.get_children():
                writer.writerow(self.gst_tree.item(row_id)["values"])
        messagebox.showinfo("Export Complete", f"GST Report saved successfully to:\\n{file_path}")

    # =========================================================================
    # REFRESH ALL DATA TABLES FROM LOCAL SQLITE DB
    # =========================================================================
    def refresh_all_views(self):
        self.refresh_inventory_tree()
        self.refresh_inward_tree()
        self.refresh_sales_tree()
        self.refresh_gst_tree()

    def refresh_inventory_tree(self):
        for r in self.inv_tree.get_children():
            self.inv_tree.delete(r)
        q = self.inv_search_var.get().strip().lower()
        cur = self.db.conn.cursor()
        if q:
            cur.execute("SELECT * FROM products WHERE LOWER(name) LIKE ? OR barcode LIKE ? ORDER BY name", (f"%{q}%", f"%{q}%"))
        else:
            cur.execute("SELECT * FROM products ORDER BY name")
        rows = cur.fetchall()
        total_stock_val = 0.0
        for r in rows:
            margin = r["selling_price"] - r["purchase_price"]
            total_stock_val += r["stock_qty"] * r["purchase_price"]
            self.inv_tree.insert("", tk.END, values=(
                r["barcode"], r["name"], r["unit"],
                f"{r['purchase_price']:.2f}", f"{r['selling_price']:.2f}",
                f"+{margin:.2f}", f"{r['gst_percent']:g}%",
                f"{r['stock_qty']:g}", r["default_supplier"]
            ))
        self.inv_stats_var.set(f"Total Products: {len(rows)}  |  Inventory Valuation (Cost): ₹{total_stock_val:,.2f}")

    def refresh_inward_tree(self):
        for r in self.inward_tree.get_children():
            self.inward_tree.delete(r)
        cur = self.db.conn.cursor()
        cur.execute("SELECT * FROM inward_entries ORDER BY id DESC")
        for r in cur.fetchall():
            self.inward_tree.insert("", tk.END, values=(
                r["entry_date"], r["invoice_no"], r["seller_name"], r["seller_gstin"],
                r["barcode"], r["product_name"], f"{r['quantity']:g} {r['unit']}",
                f"{r['purchase_rate']:.2f}", f"{r['gst_percent']:g}%", f"{r['total_amount']:.2f}"
            ))

    def refresh_sales_tree(self):
        for r in self.sales_tree.get_children():
            self.sales_tree.delete(r)
        cur = self.db.conn.cursor()
        cur.execute("SELECT * FROM sales_invoices ORDER BY id DESC")
        rows = cur.fetchall()
        tot_sales = sum(r["grand_total"] for r in rows)
        tot_profit = sum(r["total_profit"] for r in rows)
        tot_gst = sum(r["gst_total"] for r in rows)
        for r in rows:
            self.sales_tree.insert("", tk.END, values=(
                r["invoice_no"], r["sale_date"], r["sale_time"], r["purchaser_name"],
                r["payment_mode"], f"{r['taxable_subtotal']:.2f}", f"{r['gst_total']:.2f}",
                f"{r['grand_total']:.2f}", f"+{r['total_profit']:.2f}"
            ))
        self.sales_kpi_var.set(
            f"Bills: {len(rows)}  |  Total Sales (कुल बिक्री): ₹{tot_sales:,.2f}  |  GST Collected: ₹{tot_gst:,.2f}  |  NET PROFIT (शुद्ध मुनाफा): ₹{tot_profit:,.2f}"
        )

    def refresh_gst_tree(self):
        for r in self.gst_tree.get_children():
            self.gst_tree.delete(r)
        cur = self.db.conn.cursor()
        cur.execute("""
            SELECT gst_percent,
                   SUM(quantity) as qty_sold,
                   SUM(taxable_value) as taxable,
                   SUM(cgst_amount) as cgst,
                   SUM(sgst_amount) as sgst,
                   SUM(cgst_amount + sgst_amount) as total_gst,
                   SUM(total_amount) as gross
            FROM sale_items
            GROUP BY gst_percent
            ORDER BY gst_percent ASC
        """)
        rows = cur.fetchall()
        grand_taxable = 0.0
        grand_gst = 0.0
        for r in rows:
            grand_taxable += r["taxable"] or 0
            grand_gst += r["total_gst"] or 0
            self.gst_tree.insert("", tk.END, values=(
                f"GST {r['gst_percent']:g}% ({r['gst_percent']/2:g}% CGST + {r['gst_percent']/2:g}% SGST)",
                f"{r['qty_sold']:g}",
                f"{r['taxable']:.2f}",
                f"{r['cgst']:.2f}",
                f"{r['sgst']:.2f}",
                f"{r['total_gst']:.2f}",
                f"{r['gross']:.2f}"
            ))
        self.gst_summary_var.set(
            f"GST Tax Summary — Total Taxable Sales: ₹{grand_taxable:,.2f}  |  Total Output GST (CGST+SGST): ₹{grand_gst:,.2f}"
        )


if __name__ == "__main__":
    app = KiranaMitraApp()
    app.mainloop()
`;
