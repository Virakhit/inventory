"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  FolderClosed,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  Pencil,
} from "lucide-react";

type Category = { categoryId: string; categoryName: string | null };
type Product = {
  sku: string;
  categoryId: string | null;
  productName: string;
  price: string;
  cost: string;
};
type Transaction = {
  transactionId: string;
  type: string;
  date: string;
  reason: string | null;
  items: {
    idtransactionItemId: string;
    sku: string;
    categoryId: string;
    qty: number;
    price: number;
  }[];
};
type View = "overview" | "products" | "categories" | "transactions";
type Dialog = "product" | "category" | "transaction" | null;

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.title || parsed.detail || text;
    } catch {
      /* plain text error */
    }
    throw new Error(message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

const money = (value: string | number) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 2,
      }).format(number)
    : String(value);
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
const shortId = (id: string) => id.slice(0, 8).toUpperCase();

export default function Home() {
  const pathname = usePathname();
  const router = useRouter();
  const view: View =
    pathname === "/products"
      ? "products"
      : pathname === "/categories"
        ? "categories"
        : pathname === "/transactions"
          ? "transactions"
          : "overview";
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
  const [productForm, setProductForm] = useState({
    productName: "",
    categoryId: "",
    price: "",
    cost: "",
  });
  const [categoryName, setCategoryName] = useState("");
  const [transactionForm, setTransactionForm] = useState({
    type: "IN",
    date: new Date().toISOString().slice(0, 10),
    reason: "",
    items: [] as { sku: string; qty: string; price: string }[],
  });
  const [mobileMenu, setMobileMenu] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, t] = await Promise.all([
        api<Category[]>("categories"),
        api<Product[]>("products"),
        api<Transaction[]>("transactions"),
      ]);
      setCategories(c);
      setProducts(p);
      setTransactions(t);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const categoryNameFor = (id: string | null) =>
    categories.find((c) => c.categoryId === id)?.categoryName ||
    "ไม่ระบุหมวดหมู่";
  const productNameFor = (sku: string) =>
    products.find((p) => p.sku === sku)?.productName || shortId(sku);
  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        `${p.productName} ${p.sku} ${categoryNameFor(p.categoryId)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [products, categories, search],
  );
  const filteredCategories = categories.filter((c) =>
    `${c.categoryName || ""} ${c.categoryId}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filteredTransactions = transactions.filter((t) =>
    `${t.type} ${t.reason || ""} ${t.transactionId} ${t.items.map((i) => productNameFor(i.sku)).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const stockIn = transactions
    .filter((t) => t.type.toUpperCase() === "IN")
    .reduce((n, t) => n + t.items.reduce((sum, item) => sum + item.qty, 0), 0);
  const stockOut = transactions
    .filter((t) => t.type.toUpperCase() === "OUT")
    .reduce((n, t) => n + t.items.reduce((sum, item) => sum + item.qty, 0), 0);

  function openProduct(product?: Product) {
    setEditingProduct(product || null);
    setProductForm(
      product
        ? {
            productName: product.productName,
            categoryId: product.categoryId || "",
            price: product.price,
            cost: product.cost,
          }
        : { productName: "", categoryId: "", price: "", cost: "" },
    );
    setError("");
    setDialog("product");
  }
  function openCategory(category?: Category) {
    setEditingCategory(category || null);
    setCategoryName(category?.categoryName || "");
    setError("");
    setDialog("category");
  }
  function openTransaction() {
    setTransactionForm({
      type: "IN",
      date: new Date().toISOString().slice(0, 10),
      reason: "",
      items: [],
    });
    setError("");
    setDialog("transaction");
  }
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      setDialog(null);
      setNotice(success);
      await load();
      window.setTimeout(() => setNotice(""), 4000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        api(`products${editingProduct ? `/${editingProduct.sku}` : ""}`, {
          method: editingProduct ? "PUT" : "POST",
          body: JSON.stringify({
            ...productForm,
            categoryId: productForm.categoryId || null,
          }),
        }),
      editingProduct ? "แก้ไขสินค้าแล้ว" : "เพิ่มสินค้าแล้ว",
    );
  }
  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        api(
          `categories${editingCategory ? `/${editingCategory.categoryId}` : ""}`,
          {
            method: editingCategory ? "PUT" : "POST",
            body: JSON.stringify({ categoryName: categoryName.trim() }),
          },
        ),
      editingCategory ? "แก้ไขหมวดหมู่แล้ว" : "เพิ่มหมวดหมู่แล้ว",
    );
  }
  async function saveTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionForm.items.length) {
      setError("เลือกสินค้าอย่างน้อยหนึ่งรายการ");
      return;
    }
    if (
      transactionForm.items.some(
        (item) =>
          !Number.isInteger(Number(item.qty)) ||
          Number(item.qty) <= 0 ||
          !/^\d+(\.\d{1,2})?$/.test(item.price) ||
          Number(item.price) > 99999999.99,
      )
    ) {
      setError(
        "จำนวนต้องเป็นจำนวนเต็มมากกว่า 0 และราคาต้องอยู่ระหว่าง 0 ถึง 99,999,999.99",
      );
      return;
    }
    const items = transactionForm.items.map((item) => ({
      sku: item.sku,
      categoryId:
        products.find((p) => p.sku === item.sku)?.categoryId || "uncategorized",
      qty: Number(item.qty),
      price: Number(item.price),
    }));
    await run(
      () =>
        api("transactions", {
          method: "POST",
          body: JSON.stringify({
            type: transactionForm.type,
            date: new Date(`${transactionForm.date}T12:00:00`).toISOString(),
            reason: transactionForm.reason || null,
            items,
          }),
        }),
      "บันทึกรายการแล้ว",
    );
  }
  function remove(path: string, description: string) {
    if (
      !window.confirm(
        `ต้องการลบ ${description} หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`,
      )
    )
      return;
    void run(() => api(path, { method: "DELETE" }), `ลบ ${description} แล้ว`);
  }
  const navigate = (next: View) => {
    router.push(next === "overview" ? "/" : `/${next}`);
    setSearch("");
    setMobileMenu(false);
    setError("");
  };
  const title = {
    overview: "ภาพรวม",
    products: "สินค้า",
    categories: "หมวดหมู่",
    transactions: "รายการเคลื่อนไหว",
  }[view];
  const nav = [
    { key: "overview" as View, label: "ภาพรวม", icon: LayoutDashboard },
    { key: "products" as View, label: "สินค้า", icon: Package },
    { key: "categories" as View, label: "หมวดหมู่", icon: FolderClosed },
    {
      key: "transactions" as View,
      label: "รายการเคลื่อนไหว",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Boxes size={24} strokeWidth={2.3} />
          </div>
          <div>
            <strong>
              inventory<span>.</span>
            </strong>
            <small>CONTROL CENTER</small>
          </div>
        </div>
        <div className="side-label">เมนูหลัก / MENU</div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? "active" : ""}`}
              onClick={() => navigate(item.key)}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {view === item.key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="menu-button icon-button"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="เปิดเมนู"
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            INVENTORY <span>/</span> <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <span className="today">
              {new Intl.DateTimeFormat("th-TH", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(new Date())}
            </span>
            <button
              className="icon-button refresh"
              onClick={() => void load()}
              title="รีเฟรชข้อมูล"
              aria-label="รีเฟรชข้อมูล"
            >
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <div className="avatar">IN</div>
          </div>
        </header>
        <div className="content">
          {error && !dialog && (
            <div className="alert">
              <CircleAlert size={18} />
              <span>{error}</span>
              <button onClick={() => void load()}>Retry</button>
            </div>
          )}
          {notice && <div className="notice">{notice}</div>}
          {view === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ภาพรวม / DASHBOARD</div>
                  <h1>
                    จัดการสต็อกอย่างมั่นใจ
                    <span className="heading-period">.</span>
                  </h1>
                  <p>ภาพรวมสินค้าและความเคลื่อนไหวล่าสุดในคลังของคุณ</p>
                </div>
                <button className="primary-button" onClick={openTransaction}>
                  <Plus size={18} /> บันทึกรายการ
                </button>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>สินค้าทั้งหมด</span>
                    <div className="stat-icon violet">
                      <Package size={20} />
                    </div>
                  </div>
                  <strong>{loading ? "—" : products.length}</strong>
                  <div className="stat-foot">
                    รายการสินค้าในระบบ <ArrowRight size={15} />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>หมวดหมู่</span>
                    <div className="stat-icon blue">
                      <FolderClosed size={20} />
                    </div>
                  </div>
                  <strong>{loading ? "—" : categories.length}</strong>
                  <div className="stat-foot">
                    จัดสินค้าให้ค้นหาได้ง่าย <ArrowRight size={15} />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>รายการเคลื่อนไหว</span>
                    <div className="stat-icon orange">
                      <Activity size={20} />
                    </div>
                  </div>
                  <strong>{loading ? "—" : transactions.length}</strong>
                  <div className="stat-foot">
                    {stockIn} ชิ้นรับเข้า <span className="divider-dot">·</span>{" "}
                    {stockOut} ชิ้นจ่ายออก
                  </div>
                </div>
              </div>
              <div className="overview-grid">
                <section className="panel recent-panel">
                  <div className="panel-header">
                    <div>
                      <h2>ความเคลื่อนไหวล่าสุด</h2>
                      <p>ติดตามการรับเข้าและจ่ายออก</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("transactions")}
                    >
                      ดูทั้งหมด <ArrowRight size={16} />
                    </button>
                  </div>
                  {sortedTransactions.length ? (
                    <div className="activity-list">
                      {sortedTransactions.slice(0, 5).map((t) => (
                        <div className="activity-row" key={t.transactionId}>
                          <div
                            className={`movement-icon ${t.type.toUpperCase() === "IN" ? "in" : "out"}`}
                          >
                            {t.type.toUpperCase() === "IN" ? (
                              <ArrowDownLeft size={18} />
                            ) : (
                              <ArrowUpRight size={18} />
                            )}
                          </div>
                          <div className="activity-info">
                            <strong>
                              {t.type.toUpperCase() === "IN"
                                ? "รับสินค้าเข้า"
                                : t.type.toUpperCase() === "OUT"
                                  ? "จ่ายสินค้าออก"
                                  : t.type}
                            </strong>
                            <span>
                              {t.items
                                .map((i) => productNameFor(i.sku))
                                .slice(0, 2)
                                .join(", ")}
                              {t.items.length > 2
                                ? ` +${t.items.length - 2}`
                                : ""}
                            </span>
                          </div>
                          <div className="activity-meta">
                            <strong>
                              {t.items.reduce((sum, item) => sum + item.qty, 0)}{" "}
                              ชิ้น
                            </strong>
                            <span>{dateLabel(t.date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={<Activity size={24} />}
                      title="ยังไม่มีความเคลื่อนไหว"
                      subtitle="เริ่มบันทึกรายการเพื่อดูประวัติที่นี่"
                      action="บันทึกรายการ"
                      onAction={openTransaction}
                    />
                  )}
                </section>
                <section className="panel quick-panel">
                  <div className="panel-header">
                    <div>
                      <h2>เริ่มทำรายการ</h2>
                      <p>งานที่ใช้บ่อย เข้าถึงได้ทันที</p>
                    </div>
                  </div>
                  <button
                    className="quick-action"
                    onClick={() => openProduct()}
                  >
                    <div className="quick-icon purple">
                      <Package size={20} />
                    </div>
                    <div>
                      <strong>เพิ่มสินค้า</strong>
                      <span>บันทึกสินค้าใหม่เข้าระบบ</span>
                    </div>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="quick-action"
                    onClick={() => openCategory()}
                  >
                    <div className="quick-icon sky">
                      <FolderClosed size={20} />
                    </div>
                    <div>
                      <strong>เพิ่มหมวดหมู่</strong>
                      <span>จัดกลุ่มสินค้าให้เป็นระเบียบ</span>
                    </div>
                    <ArrowRight size={18} />
                  </button>
                  <button className="quick-action" onClick={openTransaction}>
                    <div className="quick-icon peach">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <strong>บันทึกความเคลื่อนไหว</strong>
                      <span>รับเข้าหรือจ่ายออก</span>
                    </div>
                    <ArrowRight size={18} />
                  </button>
                </section>
              </div>
              <div className="section-heading">
                <div>
                  <h2>สินค้าในคลัง</h2>
                  <p>รายการสินค้าล่าสุดของคุณ</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("products")}
                >
                  ดูสินค้าทั้งหมด <ArrowRight size={16} />
                </button>
              </div>
              <ProductTable
                products={products.slice(-5).reverse()}
                categories={categories}
                onEdit={openProduct}
                onDelete={(p) => remove(`products/${p.sku}`, p.productName)}
                emptyAction={() => openProduct()}
              />
            </>
          )}
          {view !== "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    INVENTORY / {title.toUpperCase()}
                  </div>
                  <h1>
                    {title}
                    <span className="heading-period">.</span>
                  </h1>
                  <p>
                    {view === "products"
                      ? "ดูและจัดการรายการสินค้าในคลัง"
                      : view === "categories"
                        ? "จัดกลุ่มสินค้าเพื่อให้ค้นหาได้ง่าย"
                        : "ประวัติการรับเข้าและจ่ายออกทั้งหมด"}
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={
                    view === "products"
                      ? () => openProduct()
                      : view === "categories"
                        ? () => openCategory()
                        : openTransaction
                  }
                >
                  <Plus size={18} />{" "}
                  {view === "products"
                    ? "เพิ่มสินค้า"
                    : view === "categories"
                      ? "เพิ่มหมวดหมู่"
                      : "บันทึกรายการ"}
                </button>
              </div>
              <div className="toolbar">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`ค้นหา${title}...`}
                  />
                </div>
                <span className="result-count">
                  {view === "products"
                    ? filteredProducts.length
                    : view === "categories"
                      ? filteredCategories.length
                      : filteredTransactions.length}{" "}
                  รายการ
                </span>
              </div>
              {view === "products" && (
                <ProductTable
                  products={filteredProducts}
                  categories={categories}
                  onEdit={openProduct}
                  onDelete={(p) => remove(`products/${p.sku}`, p.productName)}
                  emptyAction={() => openProduct()}
                />
              )}
              {view === "categories" && (
                <div className="table-panel">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>หมวดหมู่</th>
                          <th>สินค้า</th>
                          <th>รหัส</th>
                          <th className="actions-col">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCategories.map((c) => (
                          <tr key={c.categoryId}>
                            <td>
                              <div className="name-cell">
                                <div className="table-icon category-icon">
                                  <FolderClosed size={18} />
                                </div>
                                <strong>
                                  {c.categoryName || "หมวดหมู่ไม่มีชื่อ"}
                                </strong>
                              </div>
                            </td>
                            <td>
                              <span className="count-pill">
                                {
                                  products.filter(
                                    (p) => p.categoryId === c.categoryId,
                                  ).length
                                }{" "}
                                สินค้า
                              </span>
                            </td>
                            <td className="mono muted">
                              {shortId(c.categoryId)}
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  title="แก้ไขหมวดหมู่"
                                  onClick={() => openCategory(c)}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  title="ลบหมวดหมู่"
                                  onClick={() =>
                                    remove(
                                      `categories/${c.categoryId}`,
                                      c.categoryName || "category",
                                    )
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!filteredCategories.length && (
                    <Empty
                      icon={<FolderClosed size={24} />}
                      title={
                        search ? "ไม่พบหมวดหมู่ที่ค้นหา" : "ยังไม่มีหมวดหมู่"
                      }
                      subtitle={
                        search
                          ? "ลองใช้คำค้นหาอื่น"
                          : "เพิ่มหมวดหมู่แรกเพื่อจัดกลุ่มสินค้า"
                      }
                      action={search ? undefined : "เพิ่มหมวดหมู่"}
                      onAction={() => openCategory()}
                    />
                  )}
                </div>
              )}
              {view === "transactions" && (
                <div className="table-panel">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>รายการ</th>
                          <th>ประเภท</th>
                          <th>สินค้า</th>
                          <th>วันที่</th>
                          <th className="actions-col">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredTransactions]
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime(),
                          )
                          .map((t) => (
                            <tr key={t.transactionId}>
                              <td>
                                <div className="transaction-title">
                                  <strong>#{shortId(t.transactionId)}</strong>
                                  <span>{t.reason || "ไม่มีหมายเหตุ"}</span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`type-pill ${t.type.toUpperCase() === "IN" ? "type-in" : "type-out"}`}
                                >
                                  {t.type.toUpperCase() === "IN" ? (
                                    <ArrowDownLeft size={14} />
                                  ) : (
                                    <ArrowUpRight size={14} />
                                  )}
                                  {t.type}
                                </span>
                              </td>
                              <td>
                                <div className="items-cell">
                                  <strong>
                                    {t.items.reduce(
                                      (sum, item) => sum + item.qty,
                                      0,
                                    )}{" "}
                                    ชิ้น
                                  </strong>
                                  <span>
                                    {t.items
                                      .map(
                                        (i) =>
                                          `${productNameFor(i.sku)} × ${i.qty} (${money(i.price)})`,
                                      )
                                      .join(", ")}
                                  </span>
                                </div>
                              </td>
                              <td className="muted">{dateLabel(t.date)}</td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    title="ลบรายการ"
                                    onClick={() =>
                                      remove(
                                        `transactions/${t.transactionId}`,
                                        `transaction #${shortId(t.transactionId)}`,
                                      )
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {!filteredTransactions.length && (
                    <Empty
                      icon={<ClipboardList size={24} />}
                      title={
                        search
                          ? "ไม่พบรายการที่ค้นหา"
                          : "ยังไม่มีรายการเคลื่อนไหว"
                      }
                      subtitle={
                        search
                          ? "ลองใช้คำค้นหาอื่น"
                          : "เริ่มบันทึกการรับเข้าหรือจ่ายออก"
                      }
                      action={search ? undefined : "บันทึกรายการ"}
                      onAction={openTransaction}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {dialog && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDialog(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={dialog}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">
                  INVENTORY / {dialog.toUpperCase()}
                </div>
                <h2>
                  {dialog === "product"
                    ? editingProduct
                      ? "แก้ไขสินค้า"
                      : "เพิ่มสินค้า"
                    : dialog === "category"
                      ? editingCategory
                        ? "แก้ไขหมวดหมู่"
                        : "เพิ่มหมวดหมู่"
                      : "บันทึกรายการ"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setDialog(null)}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={20} />
              </button>
            </div>
            {error && (
              <div className="alert modal-alert">
                <CircleAlert size={17} />
                {error}
              </div>
            )}
            {dialog === "product" && (
              <form onSubmit={saveProduct}>
                <div className="form-body">
                  <label>
                    ชื่อสินค้า
                    <input
                      autoFocus
                      required
                      value={productForm.productName}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          productName: e.target.value,
                        })
                      }
                      placeholder="เช่น คีย์บอร์ดไร้สาย"
                    />
                  </label>
                  <label>
                    หมวดหมู่
                    <div className="select-wrap">
                      <select
                        value={productForm.categoryId}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            categoryId: e.target.value,
                          })
                        }
                      >
                        <option value="">ไม่ระบุหมวดหมู่</option>
                        {categories.map((c) => (
                          <option key={c.categoryId} value={c.categoryId}>
                            {c.categoryName || "หมวดหมู่ไม่มีชื่อ"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </label>
                  <div className="form-grid">
                    <label>
                      ราคาขาย
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            price: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                    <label>
                      ต้นทุน
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.cost}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            cost: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                </div>
                <div className="modal-foot">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDialog(null)}
                  >
                    ยกเลิก
                  </button>
                  <button className="primary-button" disabled={busy}>
                    {busy && <LoaderCircle size={17} className="spin" />}
                    {editingProduct ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
                  </button>
                </div>
              </form>
            )}
            {dialog === "category" && (
              <form onSubmit={saveCategory}>
                <div className="form-body">
                  <label>
                    ชื่อหมวดหมู่
                    <input
                      autoFocus
                      required
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="เช่น อุปกรณ์อิเล็กทรอนิกส์"
                    />
                  </label>
                </div>
                <div className="modal-foot">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDialog(null)}
                  >
                    ยกเลิก
                  </button>
                  <button className="primary-button" disabled={busy}>
                    {busy && <LoaderCircle size={17} className="spin" />}
                    {editingCategory ? "บันทึกการแก้ไข" : "เพิ่มหมวดหมู่"}
                  </button>
                </div>
              </form>
            )}
            {dialog === "transaction" && (
              <form onSubmit={saveTransaction}>
                <div className="form-body">
                  <div className="form-grid">
                    <label>
                      ประเภทรายการ
                      <div className="select-wrap">
                        <select
                          value={transactionForm.type}
                          onChange={(e) =>
                            setTransactionForm({
                              ...transactionForm,
                              type: e.target.value,
                            })
                          }
                        >
                          <option value="IN">IN</option>
                          <option value="OUT">OUT</option>
                        </select>
                        <ChevronDown size={16} />
                      </div>
                    </label>
                    <label>
                      วันที่
                      <input
                        required
                        type="date"
                        value={transactionForm.date}
                        onChange={(e) =>
                          setTransactionForm({
                            ...transactionForm,
                            date: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    หมายเหตุ <span className="optional">(ไม่บังคับ)</span>
                    <input
                      value={transactionForm.reason}
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          reason: e.target.value,
                        })
                      }
                      placeholder="เช่น รับสินค้าจากผู้จัดจำหน่าย"
                    />
                  </label>
                  <label>
                    สินค้า{" "}
                    <span className="optional">(เลือกได้หลายรายการ)</span>
                  </label>
                  <div className="product-picker">
                    {products.length ? (
                      products.map((p) => (
                        <label key={p.sku} className="picker-option">
                          <input
                            type="checkbox"
                            checked={transactionForm.items.some(
                              (item) => item.sku === p.sku,
                            )}
                            onChange={(e) =>
                              setTransactionForm({
                                ...transactionForm,
                                items: e.target.checked
                                  ? [
                                      ...transactionForm.items,
                                      { sku: p.sku, qty: "1", price: p.price },
                                    ]
                                  : transactionForm.items.filter(
                                      (item) => item.sku !== p.sku,
                                    ),
                              })
                            }
                          />
                          <span>
                            <strong>{p.productName}</strong>
                            <small>{categoryNameFor(p.categoryId)}</small>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="picker-empty">
                        เพิ่มสินค้าก่อนบันทึกรายการ
                      </p>
                    )}
                  </div>
                  {transactionForm.items.map((item) => (
                    <div className="form-grid" key={item.sku}>
                      <label>
                        {productNameFor(item.sku)} — จำนวน
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={item.qty}
                          onChange={(e) =>
                            setTransactionForm({
                              ...transactionForm,
                              items: transactionForm.items.map((current) =>
                                current.sku === item.sku
                                  ? { ...current, qty: e.target.value }
                                  : current,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        ราคาต่อชิ้น
                        <input
                          required
                          type="number"
                          min="0"
                          max="99999999.99"
                          step="0.01"
                          value={item.price}
                          onChange={(e) =>
                            setTransactionForm({
                              ...transactionForm,
                              items: transactionForm.items.map((current) =>
                                current.sku === item.sku
                                  ? { ...current, price: e.target.value }
                                  : current,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="modal-foot">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDialog(null)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="primary-button"
                    disabled={busy || !products.length}
                  >
                    {busy && <LoaderCircle size={17} className="spin" />}
                    บันทึกรายการ
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: string;
  onAction: () => void;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{subtitle}</p>
      {action && (
        <button className="small-button" onClick={onAction}>
          <Plus size={15} />
          {action}
        </button>
      )}
    </div>
  );
}

function ProductTable({
  products,
  categories,
  onEdit,
  onDelete,
  emptyAction,
}: {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  emptyAction: () => void;
}) {
  return (
    <div className="table-panel">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>สินค้า</th>
              <th>หมวดหมู่</th>
              <th>ราคาขาย</th>
              <th>ต้นทุน</th>
              <th>SKU</th>
              <th className="actions-col">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p.sku}>
                <td>
                  <div className="name-cell">
                    <div className={`table-icon product-color-${i % 4}`}>
                      <Package size={18} />
                    </div>
                    <strong>{p.productName}</strong>
                  </div>
                </td>
                <td>
                  <span className="category-pill">
                    {categories.find((c) => c.categoryId === p.categoryId)
                      ?.categoryName || "ไม่ระบุหมวดหมู่"}
                  </span>
                </td>
                <td className="numeric strong">{money(p.price)}</td>
                <td className="numeric muted">{money(p.cost)}</td>
                <td className="mono muted">{shortId(p.sku)}</td>
                <td>
                  <div className="row-actions">
                    <button title="แก้ไขสินค้า" onClick={() => onEdit(p)}>
                      <Pencil size={16} />
                    </button>
                    <button title="ลบสินค้า" onClick={() => onDelete(p)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!products.length && (
        <Empty
          icon={<Package size={24} />}
          title="ยังไม่มีสินค้า"
          subtitle="เพิ่มสินค้าชิ้นแรกเพื่อเริ่มจัดการคลัง"
          action="เพิ่มสินค้า"
          onAction={emptyAction}
        />
      )}
    </div>
  );
}
