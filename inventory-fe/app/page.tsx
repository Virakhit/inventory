"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Boxes, ChevronDown, CircleAlert, ClipboardList, FolderClosed, LayoutDashboard, LoaderCircle, Menu, Package, Plus, RefreshCw, Search, Trash2, X, Pencil } from "lucide-react";

type Category = { categoryId: string; categoryName: string | null };
type Product = { sku: string; categoryId: string | null; productName: string; price: string; cost: string };
type Transaction = { transactionId: string; type: string; date: string; reason: string | null; items: { idtransactionItemId: string; sku: string; categoryId: string }[] };
type View = "overview" | "products" | "categories" | "transactions";
type Dialog = "product" | "category" | "transaction" | null;

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try { const parsed = JSON.parse(text); message = parsed.message || parsed.title || parsed.detail || text; } catch { /* plain text error */ }
    throw new Error(message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

const money = (value: string | number) => {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number) : String(value);
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const shortId = (id: string) => id.slice(0, 8).toUpperCase();

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [productForm, setProductForm] = useState({ productName: "", categoryId: "", price: "", cost: "" });
  const [categoryName, setCategoryName] = useState("");
  const [transactionForm, setTransactionForm] = useState({ type: "IN", date: new Date().toISOString().slice(0, 10), reason: "", skus: [] as string[] });
  const [mobileMenu, setMobileMenu] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, t] = await Promise.all([api<Category[]>("categories"), api<Product[]>("products"), api<Transaction[]>("transactions")]);
      setCategories(c); setProducts(p); setTransactions(t); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load inventory data."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const categoryNameFor = (id: string | null) => categories.find(c => c.categoryId === id)?.categoryName || "Uncategorized";
  const productNameFor = (sku: string) => products.find(p => p.sku === sku)?.productName || shortId(sku);
  const filteredProducts = useMemo(() => products.filter(p => `${p.productName} ${p.sku} ${categoryNameFor(p.categoryId)}`.toLowerCase().includes(search.toLowerCase())), [products, categories, search]);
  const filteredCategories = categories.filter(c => `${c.categoryName || ""} ${c.categoryId}`.toLowerCase().includes(search.toLowerCase()));
  const filteredTransactions = transactions.filter(t => `${t.type} ${t.reason || ""} ${t.transactionId} ${t.items.map(i => productNameFor(i.sku)).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const stockIn = transactions.filter(t => t.type.toUpperCase() === "IN").reduce((n, t) => n + t.items.length, 0);
  const stockOut = transactions.filter(t => t.type.toUpperCase() === "OUT").reduce((n, t) => n + t.items.length, 0);

  function openProduct(product?: Product) {
    setEditingProduct(product || null);
    setProductForm(product ? { productName: product.productName, categoryId: product.categoryId || "", price: product.price, cost: product.cost } : { productName: "", categoryId: "", price: "", cost: "" });
    setError(""); setDialog("product");
  }
  function openCategory(category?: Category) {
    setEditingCategory(category || null); setCategoryName(category?.categoryName || ""); setError(""); setDialog("category");
  }
  function openTransaction() {
    setTransactionForm({ type: "IN", date: new Date().toISOString().slice(0, 10), reason: "", skus: [] }); setError(""); setDialog("transaction");
  }
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError("");
    try { await action(); setDialog(null); setNotice(success); await load(); window.setTimeout(() => setNotice(""), 4000); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    await run(() => api(`products${editingProduct ? `/${editingProduct.sku}` : ""}`, { method: editingProduct ? "PUT" : "POST", body: JSON.stringify({ ...productForm, categoryId: productForm.categoryId || null }) }), editingProduct ? "Product updated" : "Product added");
  }
  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    await run(() => api(`categories${editingCategory ? `/${editingCategory.categoryId}` : ""}`, { method: editingCategory ? "PUT" : "POST", body: JSON.stringify({ categoryName: categoryName.trim() }) }), editingCategory ? "Category updated" : "Category added");
  }
  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionForm.skus.length) { setError("Select at least one product."); return; }
    const items = transactionForm.skus.map(sku => ({ sku, categoryId: products.find(p => p.sku === sku)?.categoryId || "uncategorized" }));
    await run(() => api("transactions", { method: "POST", body: JSON.stringify({ type: transactionForm.type, date: new Date(`${transactionForm.date}T12:00:00`).toISOString(), reason: transactionForm.reason || null, items }) }), "Transaction recorded");
  }
  function remove(path: string, description: string) {
    if (!window.confirm(`Delete ${description}? This cannot be undone.`)) return;
    void run(() => api(path, { method: "DELETE" }), `${description} deleted`);
  }
  const navigate = (next: View) => { setView(next); setSearch(""); setMobileMenu(false); setError(""); };
  const title = { overview: "Overview", products: "Products", categories: "Categories", transactions: "Transactions" }[view];
  const nav = [
    { key: "overview" as View, label: "Overview", icon: LayoutDashboard },
    { key: "products" as View, label: "Products", icon: Package },
    { key: "categories" as View, label: "Categories", icon: FolderClosed },
    { key: "transactions" as View, label: "Transactions", icon: ClipboardList },
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Boxes size={24} strokeWidth={2.3} /></div><div><strong>inventory<span>.</span></strong><small>WORKSPACE</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.key} className={`nav-item ${view === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><item.icon size={19} /><span>{item.label}</span>{view === item.key && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Activity size={19} /></div><strong>Inventory, in focus.</strong><p>Keep your catalog and every movement in one place.</p></div><div className="sidebar-foot"><span className="status-dot" /> System workspace <span className="version">v1.0</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="menu-button icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><Menu size={21} /></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{title}</strong></div><div className="top-actions"><span className="today">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span><button className="icon-button refresh" onClick={() => void load()} title="Refresh data"><RefreshCw size={18} className={loading ? "spin" : ""} /></button><div className="avatar">IS</div></div></header>
      <div className="content">
        {error && !dialog && <div className="alert"><CircleAlert size={18} /><span>{error}</span><button onClick={() => void load()}>Retry</button></div>}
        {notice && <div className="notice">{notice}</div>}
        {view === "overview" && <>
          <div className="page-heading"><div><div className="eyebrow">INVENTORY DASHBOARD</div><h1>Good to see you<span className="heading-period">.</span></h1><p>Here&apos;s what&apos;s happening with your inventory today.</p></div><button className="primary-button" onClick={openTransaction}><Plus size={18} /> New transaction</button></div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-top"><span>Total products</span><div className="stat-icon violet"><Package size={20} /></div></div><strong>{loading ? "—" : products.length}</strong><div className="stat-foot">Items in your catalog <ArrowRight size={15} /></div></div>
            <div className="stat-card"><div className="stat-top"><span>Categories</span><div className="stat-icon blue"><FolderClosed size={20} /></div></div><strong>{loading ? "—" : categories.length}</strong><div className="stat-foot">Organized collections <ArrowRight size={15} /></div></div>
            <div className="stat-card"><div className="stat-top"><span>Stock movements</span><div className="stat-icon orange"><Activity size={20} /></div></div><strong>{loading ? "—" : transactions.length}</strong><div className="stat-foot">{stockIn} items in <span className="divider-dot">·</span> {stockOut} items out</div></div>
          </div>
          <div className="overview-grid"><section className="panel recent-panel"><div className="panel-header"><div><h2>Recent activity</h2><p>Latest movements across your inventory</p></div><button className="text-button" onClick={() => navigate("transactions")}>View all <ArrowRight size={16} /></button></div>{sortedTransactions.length ? <div className="activity-list">{sortedTransactions.slice(0, 5).map(t => <div className="activity-row" key={t.transactionId}><div className={`movement-icon ${t.type.toUpperCase() === "IN" ? "in" : "out"}`}>{t.type.toUpperCase() === "IN" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div><div className="activity-info"><strong>{t.type.toUpperCase() === "IN" ? "Stock received" : t.type.toUpperCase() === "OUT" ? "Stock dispatched" : t.type}</strong><span>{t.items.map(i => productNameFor(i.sku)).slice(0, 2).join(", ")}{t.items.length > 2 ? ` +${t.items.length - 2}` : ""}</span></div><div className="activity-meta"><strong>{t.items.length} item{t.items.length === 1 ? "" : "s"}</strong><span>{dateLabel(t.date)}</span></div></div>)}</div> : <Empty icon={<Activity size={24} />} title="No activity yet" subtitle="Create a transaction to see movements here." action="New transaction" onAction={openTransaction} />}</section>
          <section className="panel quick-panel"><div className="panel-header"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div></div><button className="quick-action" onClick={() => openProduct()}><div className="quick-icon purple"><Package size={20} /></div><div><strong>Add a product</strong><span>Grow your inventory catalog</span></div><ArrowRight size={18} /></button><button className="quick-action" onClick={() => openCategory()}><div className="quick-icon sky"><FolderClosed size={20} /></div><div><strong>Create a category</strong><span>Keep everything organized</span></div><ArrowRight size={18} /></button><button className="quick-action" onClick={openTransaction}><div className="quick-icon peach"><ClipboardList size={20} /></div><div><strong>Record a movement</strong><span>Track stock in or out</span></div><ArrowRight size={18} /></button></section></div>
          <div className="section-heading"><div><h2>Your products</h2><p>A quick look at your latest catalog additions</p></div><button className="text-button" onClick={() => navigate("products")}>View all products <ArrowRight size={16} /></button></div>
          <ProductTable products={products.slice(-5).reverse()} categories={categories} onEdit={openProduct} onDelete={p => remove(`products/${p.sku}`, p.productName)} emptyAction={() => openProduct()} />
        </>}
        {view !== "overview" && <>
          <div className="page-heading"><div><div className="eyebrow">INVENTORY / {title.toUpperCase()}</div><h1>{title}<span className="heading-period">.</span></h1><p>{view === "products" ? "Manage the items in your catalog." : view === "categories" ? "Organize your catalog into collections." : "A record of everything moving in and out."}</p></div><button className="primary-button" onClick={view === "products" ? () => openProduct() : view === "categories" ? () => openCategory() : openTransaction}><Plus size={18} /> {view === "products" ? "Add product" : view === "categories" ? "New category" : "New transaction"}</button></div>
          <div className="toolbar"><div className="search-box"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} /></div><span className="result-count">{view === "products" ? filteredProducts.length : view === "categories" ? filteredCategories.length : filteredTransactions.length} total</span></div>
          {view === "products" && <ProductTable products={filteredProducts} categories={categories} onEdit={openProduct} onDelete={p => remove(`products/${p.sku}`, p.productName)} emptyAction={() => openProduct()} />}
          {view === "categories" && <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>CATEGORY</th><th>PRODUCTS</th><th>IDENTIFIER</th><th className="actions-col">ACTIONS</th></tr></thead><tbody>{filteredCategories.map(c => <tr key={c.categoryId}><td><div className="name-cell"><div className="table-icon category-icon"><FolderClosed size={18} /></div><strong>{c.categoryName || "Untitled category"}</strong></div></td><td><span className="count-pill">{products.filter(p => p.categoryId === c.categoryId).length} products</span></td><td className="mono muted">{shortId(c.categoryId)}</td><td><div className="row-actions"><button title="Edit category" onClick={() => openCategory(c)}><Pencil size={16} /></button><button title="Delete category" onClick={() => remove(`categories/${c.categoryId}`, c.categoryName || "category")}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{!filteredCategories.length && <Empty icon={<FolderClosed size={24} />} title={search ? "No matching categories" : "No categories yet"} subtitle={search ? "Try another search term." : "Create your first category to organize products."} action={search ? undefined : "New category"} onAction={() => openCategory()} />}</div>}
          {view === "transactions" && <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>TYPE</th><th>PRODUCTS</th><th>DATE</th><th className="actions-col">ACTIONS</th></tr></thead><tbody>{[...filteredTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => <tr key={t.transactionId}><td><div className="transaction-title"><strong>#{shortId(t.transactionId)}</strong><span>{t.reason || "No reason provided"}</span></div></td><td><span className={`type-pill ${t.type.toUpperCase() === "IN" ? "type-in" : "type-out"}`}>{t.type.toUpperCase() === "IN" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{t.type}</span></td><td><div className="items-cell"><strong>{t.items.length} item{t.items.length === 1 ? "" : "s"}</strong><span>{t.items.map(i => productNameFor(i.sku)).join(", ")}</span></div></td><td className="muted">{dateLabel(t.date)}</td><td><div className="row-actions"><button title="Delete transaction" onClick={() => remove(`transactions/${t.transactionId}`, `transaction #${shortId(t.transactionId)}`)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{!filteredTransactions.length && <Empty icon={<ClipboardList size={24} />} title={search ? "No matching transactions" : "No transactions yet"} subtitle={search ? "Try another search term." : "Record your first inventory movement."} action={search ? undefined : "New transaction"} onAction={openTransaction} />}</div>}
        </>}
      </div>
    </main>
    {dialog && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setDialog(null); }}><div className="modal" role="dialog" aria-modal="true" aria-label={dialog}><div className="modal-head"><div><div className="eyebrow">INVENTORY / {dialog.toUpperCase()}</div><h2>{dialog === "product" ? editingProduct ? "Edit product" : "Add a product" : dialog === "category" ? editingCategory ? "Edit category" : "New category" : "New transaction"}</h2></div><button className="icon-button" onClick={() => setDialog(null)} aria-label="Close dialog"><X size={20} /></button></div>{error && <div className="alert modal-alert"><CircleAlert size={17} />{error}</div>}
      {dialog === "product" && <form onSubmit={saveProduct}><div className="form-body"><label>Product name<input autoFocus required value={productForm.productName} onChange={e => setProductForm({ ...productForm, productName: e.target.value })} placeholder="e.g. Wireless keyboard" /></label><label>Category<div className="select-wrap"><select value={productForm.categoryId} onChange={e => setProductForm({ ...productForm, categoryId: e.target.value })}><option value="">Uncategorized</option>{categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.categoryName || "Untitled category"}</option>)}</select><ChevronDown size={16} /></div></label><div className="form-grid"><label>Price<input required type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} placeholder="0.00" /></label><label>Cost<input required type="number" min="0" step="0.01" value={productForm.cost} onChange={e => setProductForm({ ...productForm, cost: e.target.value })} placeholder="0.00" /></label></div></div><div className="modal-foot"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy && <LoaderCircle size={17} className="spin" />}{editingProduct ? "Save changes" : "Add product"}</button></div></form>}
      {dialog === "category" && <form onSubmit={saveCategory}><div className="form-body"><label>Category name<input autoFocus required value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Electronics" /></label></div><div className="modal-foot"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-button" disabled={busy}>{busy && <LoaderCircle size={17} className="spin" />}{editingCategory ? "Save changes" : "Create category"}</button></div></form>}
      {dialog === "transaction" && <form onSubmit={saveTransaction}><div className="form-body"><div className="form-grid"><label>Movement type<div className="select-wrap"><select value={transactionForm.type} onChange={e => setTransactionForm({ ...transactionForm, type: e.target.value })}><option value="IN">Stock in</option><option value="OUT">Stock out</option></select><ChevronDown size={16} /></div></label><label>Date<input required type="date" value={transactionForm.date} onChange={e => setTransactionForm({ ...transactionForm, date: e.target.value })} /></label></div><label>Reason <span className="optional">(optional)</span><input value={transactionForm.reason} onChange={e => setTransactionForm({ ...transactionForm, reason: e.target.value })} placeholder="e.g. New shipment arrived" /></label><label>Products <span className="optional">(select one or more)</span></label><div className="product-picker">{products.length ? products.map(p => <label key={p.sku} className="picker-option"><input type="checkbox" checked={transactionForm.skus.includes(p.sku)} onChange={e => setTransactionForm({ ...transactionForm, skus: e.target.checked ? [...transactionForm.skus, p.sku] : transactionForm.skus.filter(s => s !== p.sku) })} /><span><strong>{p.productName}</strong><small>{categoryNameFor(p.categoryId)}</small></span></label>) : <p className="picker-empty">Add a product before recording a transaction.</p>}</div><p className="form-hint">Each selected product creates one transaction item. The API does not currently support quantities.</p></div><div className="modal-foot"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-button" disabled={busy || !products.length}>{busy && <LoaderCircle size={17} className="spin" />}Record transaction</button></div></form>}
    </div></div>}
  </div>;
}

function Empty({ icon, title, subtitle, action, onAction }: { icon: React.ReactNode; title: string; subtitle: string; action?: string; onAction: () => void }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{subtitle}</p>{action && <button className="small-button" onClick={onAction}><Plus size={15} />{action}</button>}</div>;
}

function ProductTable({ products, categories, onEdit, onDelete, emptyAction }: { products: Product[]; categories: Category[]; onEdit: (product: Product) => void; onDelete: (product: Product) => void; emptyAction: () => void }) {
  return <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>COST</th><th>SKU</th><th className="actions-col">ACTIONS</th></tr></thead><tbody>{products.map((p, i) => <tr key={p.sku}><td><div className="name-cell"><div className={`table-icon product-color-${i % 4}`}><Package size={18} /></div><strong>{p.productName}</strong></div></td><td><span className="category-pill">{categories.find(c => c.categoryId === p.categoryId)?.categoryName || "Uncategorized"}</span></td><td className="numeric strong">{money(p.price)}</td><td className="numeric muted">{money(p.cost)}</td><td className="mono muted">{shortId(p.sku)}</td><td><div className="row-actions"><button title="Edit product" onClick={() => onEdit(p)}><Pencil size={16} /></button><button title="Delete product" onClick={() => onDelete(p)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{!products.length && <Empty icon={<Package size={24} />} title="No products to show" subtitle="Add a product to start building your catalog." action="Add product" onAction={emptyAction} />}</div>;
}
