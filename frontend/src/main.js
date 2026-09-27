import "./style.css";

const pageContent = document.querySelector("#page-content");
const title = document.querySelector("#current-section");
const navItems = [...document.querySelectorAll(".nav-item")];
const statusLabel = document.querySelector("#status-label");
const statusDot = document.querySelector("#status-dot");
const toast = document.querySelector("#toast");
const sidebarName = document.querySelector("#sidebar-name");
const sidebarRole = document.querySelector("#sidebar-role");
const sidebarAvatar = document.querySelector("#sidebar-avatar");
const accountShortcut = document.querySelector("#account-shortcut");
const brandHome = document.querySelector("#brand-home");
const profileOpen = document.querySelector("#profile-open");
const signOutButton = document.querySelector("#sign-out");
const notificationsButton = document.querySelector("#notifications-button");
const notificationPopover = document.querySelector("#notification-popover");
const notificationList = document.querySelector("#notification-list");
const notificationSummary = document.querySelector("#notification-summary");
const notificationIndicator = document.querySelector("#notification-indicator");
let pendingNotifications = [];

const services = [
  { name: "Pricing agent", url: "/api/pricing/health", prefix: "/api/pricing" },
  { name: "Basket insights", url: "/api/apriori/health", prefix: "/api/apriori" },
  { name: "Mall data", url: "/api/recommender/health", prefix: "/api/recommender" },
];

const state = {
  account: null,
  accounts: [],
  dashboard: null,
  page: "overview",
};

const pageTitles = {
  overview: "Overview",
  pricing: "Pricing lab",
  insights: "Basket insights",
  recommendations: "Recommendations",
  customers: "Customers",
  products: "Products",
  transactions: "Transactions",
  accounts: "Accounts & roles",
};

const rolePages = {
  admin: ["overview", "pricing", "insights", "recommendations", "customers", "products", "transactions", "accounts"],
  manager: ["overview", "pricing", "insights", "recommendations", "customers", "products", "transactions", "accounts"],
  customer: ["overview", "products", "recommendations", "transactions", "accounts"],
};

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function activeStore() {
  return state.account?.role === "manager" ? state.account.organization : "";
}

function drawOrdersChart(dailyOrders) {
  const valuesByDay = new Map(dailyOrders.map((item) => [item.day, item.orders]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day), value: valuesByDay.get(key) || 0 };
  });
  const maxValue = Math.max(...days.map((day) => day.value), 1);
  const points = days.map((day, index) => ({
    x: index * (650 / (days.length - 1)),
    y: 165 - (day.value / maxValue) * 140,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L650,180 L0,180 Z`;
  const svg = pageContent.querySelector("#orders-chart");
  svg.innerHTML = `<defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#7563e9" stop-opacity=".22"/><stop offset="100%" stop-color="#7563e9" stop-opacity="0"/></linearGradient></defs><path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/><circle cx="${points.at(-1).x}" cy="${points.at(-1).y}" r="5"/>`;
  pageContent.querySelector(".x-axis").replaceChildren(...days.map((day) => {
    const label = document.createElement("span");
    label.textContent = day.label;
    return label;
  }));
  pageContent.querySelector("#orders-axis").replaceChildren(
    ...[1, 0.75, 0.5, 0.25, 0].map((fraction) => {
      const label = document.createElement("span");
      label.textContent = Math.round(maxValue * fraction).toLocaleString();
      return label;
    }),
  );
}

async function renderCustomers() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> CUSTOMER DIRECTORY</div><h1>Know your community</h1><p>Search customer profiles and see their purchase history at a glance.</p></section>
    <section class="panel directory-panel">
      <div class="directory-toolbar"><div class="directory-count" id="customers-count">Loading customers…</div><input class="search-field" id="customer-search" type="search" placeholder="Search name, email, or ID" aria-label="Search customers" /></div>
      <div class="table-scroll"><table><thead><tr><th>Customer</th><th>Segment</th><th>Orders</th><th>Lifetime value</th><th>Joined</th><th></th></tr></thead><tbody id="customers-body"></tbody></table></div>
      <div class="table-foot"><span>Search updates the directory as you type</span><button class="text-button" id="clear-customer-search">Clear search</button></div>
    </section>`;
  const search = pageContent.querySelector("#customer-search");
  const load = async () => {
    const data = await requestJson(`/api/recommender/customers?q=${encodeURIComponent(search.value)}&limit=200`);
    pageContent.querySelector("#customers-count").textContent = `${data.total.toLocaleString()} customers`;
    const body = pageContent.querySelector("#customers-body");
    body.replaceChildren(...data.items.map(customer => {
      const row = document.createElement("tr");
      row.innerHTML = `<td><div class="table-person"><span class="mini-avatar">${escapeHtml(initials(customer.name))}</span><span><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.email)}</small></span></div></td><td><span class="segment-chip">${escapeHtml(customer.segment)}</span></td><td>${customer.order_count}</td><td>$${Number(customer.lifetime_value).toFixed(2)}</td><td>${escapeHtml(customer.joined_on)}</td><td><button class="row-action" data-recommend-for="${escapeHtml(customer.id)}">Recommend →</button></td>`;
      return row;
    }));
    body.querySelectorAll("[data-recommend-for]").forEach(button => {
      button.addEventListener("click", () => {
        localStorage.setItem("malliq-selected-customer", button.dataset.recommendFor);
        setPage("recommendations");
      });
    });
  };
  pageContent.querySelector("#clear-customer-search").addEventListener("click", () => {
    search.value = "";
    void load();
  });
  search.addEventListener("input", debounce(() => void load(), 180));
  await load();
}

async function renderProducts() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> MALL CATALOG</div><h1>What’s in store</h1><p>Browse the product catalog, categories, stores, and sales activity.</p></section>
    <section class="panel directory-panel">
      <div class="directory-toolbar"><div class="directory-count" id="products-count">Loading catalog…</div><input class="search-field" id="product-search" type="search" placeholder="Search products or stores" aria-label="Search products" /><select class="filter-select" id="product-category" aria-label="Filter by category"><option value="">All categories</option></select></div>
      <div class="product-grid directory-products" id="products-grid"></div>
    </section>`;
  const search = pageContent.querySelector("#product-search");
  const category = pageContent.querySelector("#product-category");
  const load = async () => {
    const params = new URLSearchParams({ q: search.value, category: category.value, limit: "200" });
    if (activeStore()) params.set("store", activeStore());
    const data = await requestJson(`/api/recommender/products?${params}`);
    pageContent.querySelector("#products-count").textContent = `${data.total.toLocaleString()} products`;
    const current = category.value;
    category.replaceChildren(new Option("All categories", ""));
    data.categories.forEach(value => category.add(new Option(value, value)));
    category.value = current;
    const grid = pageContent.querySelector("#products-grid");
    grid.replaceChildren(...data.items.map((product, index) => {
      const card = document.createElement("article");
      card.className = "product-card";
      const visual = document.createElement("div");
      visual.className = `product-visual product-visual-${index % 5}`;
      visual.textContent = product.category;
      const details = document.createElement("div");
      details.className = "product-details";
      const name = document.createElement("strong");
      name.textContent = product.name;
      const store = document.createElement("span");
      store.textContent = `${product.store} · ${product.units_sold} sold`;
      details.append(name, store);
      const price = document.createElement("span");
      price.className = "product-score";
      price.textContent = `$${Number(product.price).toFixed(2)}`;
      card.append(visual, details, price);
      return card;
    }));
  };
  search.addEventListener("input", debounce(() => void load(), 180));
  category.addEventListener("change", () => void load());
  await load();
}

async function renderTransactions() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> ORDER OPERATIONS</div><h1>Every order, accounted for</h1><p>Review completed purchases and move pending transactions forward.</p></section>
    <section class="panel directory-panel">
      <div class="directory-toolbar"><div class="directory-count" id="transactions-count">Loading transactions…</div><input class="search-field" id="transaction-search" type="search" placeholder="Search customer or transaction ID" aria-label="Search transactions" /><select class="filter-select" id="transaction-status" aria-label="Filter transaction status"><option value="all">All statuses</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
      <div class="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Status / action</th></tr></thead><tbody id="transactions-body"></tbody></table></div>
    </section>`;
  const search = pageContent.querySelector("#transaction-search");
  const status = pageContent.querySelector("#transaction-status");
  if (state.transactionStatus) {
    status.value = state.transactionStatus;
    state.transactionStatus = "";
  }
  if (state.transactionSearch) {
    search.value = state.transactionSearch;
    state.transactionSearch = "";
  }
  const load = async () => {
    const params = new URLSearchParams({ q: search.value, status: status.value, limit: "200" });
    if (state.account?.role === "customer") params.set("customer_id", state.account.id);
    if (activeStore()) params.set("store", activeStore());
    const data = await requestJson(`/api/recommender/transactions?${params}`);
    pageContent.querySelector("#transactions-count").textContent = `${data.total.toLocaleString()} transactions`;
    const body = pageContent.querySelector("#transactions-body");
    body.replaceChildren(...data.items.map(transaction => {
      const row = document.createElement("tr");
      const itemSummary = transaction.items.map(item => `${item.name} ×${item.quantity}`).join(", ");
      const actions = state.account?.role !== "customer" && transaction.status === "pending"
        ? `<button class="row-action" data-order-id="${escapeHtml(transaction.id)}" data-next-status="completed">Complete</button><button class="row-action danger-action" data-order-id="${escapeHtml(transaction.id)}" data-next-status="cancelled">Cancel</button>`
        : `<span class="segment-chip ${transaction.status === "completed" ? "complete-chip" : "cancelled-chip"}">${escapeHtml(transaction.status)}</span>`;
      row.innerHTML = `<td><strong>${escapeHtml(transaction.id)}</strong></td><td>${escapeHtml(transaction.customer_name)}</td><td class="transaction-items" title="${escapeHtml(itemSummary)}">${escapeHtml(itemSummary)}</td><td>$${Number(transaction.total).toFixed(2)}</td><td>${escapeHtml(transaction.created_at.slice(0, 10))}</td><td class="transaction-actions">${actions}</td>`;
      return row;
    }));
    body.querySelectorAll("[data-order-id]").forEach(button => {
      button.addEventListener("click", async () => {
        try {
          await requestJson(`/api/recommender/transactions/${encodeURIComponent(button.dataset.orderId)}`, {
            method: "PATCH",
            body: JSON.stringify({ status: button.dataset.nextStatus }),
          });
          showToast(`Order ${button.dataset.orderId} marked ${button.dataset.nextStatus}.`);
          await load();
        } catch (error) {
          showToast(error.message, true);
        }
      });
    });
  };
  search.addEventListener("input", debounce(() => void load(), 180));
  status.addEventListener("change", () => void load());
  await load();
}

async function renderAccounts() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> ACCOUNT WORKSPACE</div><h1>Choose your workspace</h1><p>Preview the app as a mall administrator, store manager, or customer.</p></section>
    <div class="role-warning"><strong>Demo role preview</strong><span>This selector is for local UI testing only. It does not authenticate users or enforce backend permissions.</span></div>
    <section class="panel directory-panel">
      <div class="directory-toolbar"><div class="directory-count" id="accounts-count">Loading accounts…</div><input class="search-field" id="account-search" type="search" placeholder="Search accounts" aria-label="Search accounts" /><select class="filter-select" id="account-role" aria-label="Filter accounts"><option value="">All roles</option><option value="admin">Administrator</option><option value="manager">Store manager</option><option value="customer">Customer</option></select><button class="row-action" id="account-page-signout">Sign out ↗</button></div>
      <div class="account-grid" id="account-grid"></div>
    </section>`;
  const search = pageContent.querySelector("#account-search");
  const role = pageContent.querySelector("#account-role");
  pageContent.querySelector("#account-page-signout").addEventListener("click", () => signOutButton.click());
  const load = async () => {
    if (!state.accounts.length) await loadAccounts();
    const filtered = state.accounts.filter(account =>
      (role.value === "" || account.role === role.value)
      && `${account.name} ${account.email} ${account.organization}`.toLowerCase().includes(search.value.toLowerCase()),
    );
    pageContent.querySelector("#accounts-count").textContent = `${filtered.length.toLocaleString()} available demo accounts`;
    const grid = pageContent.querySelector("#account-grid");
    grid.replaceChildren(...filtered.slice(0, 120).map(account => {
      const card = document.createElement("article");
      card.className = `account-card ${state.account?.id === account.id ? "selected-account" : ""}`;
      const roleClass = account.role === "admin" ? "role-admin" : account.role === "manager" ? "role-manager" : "role-customer";
      card.innerHTML = `<div class="account-card-top"><span class="mini-avatar">${escapeHtml(initials(account.name))}</span><span class="role-badge ${roleClass}">${escapeHtml(account.role_label)}</span></div><strong>${escapeHtml(account.name)}</strong><span>${escapeHtml(account.email)}</span><small>${escapeHtml(account.organization)}</small><button class="row-action account-switch" data-account-id="${escapeHtml(account.id)}">${state.account?.id === account.id ? "Current workspace" : "Switch workspace →"}</button>`;
      card.querySelector("button").disabled = state.account?.id === account.id;
      card.querySelector("button").addEventListener("click", () => {
        state.account = account;
        localStorage.setItem("malliq-demo-account", account.id);
        updateAccountIdentity();
        showToast(`Switched to ${account.role_label.toLowerCase()} preview.`);
        renderAccounts();
      });
      return card;
    }));
  };
  search.addEventListener("input", debounce(() => void load(), 180));
  role.addEventListener("change", () => void load());
  await load();
}

function renderRecentTransactions(target, transactions) {
  target.replaceChildren(...transactions.map(transaction => {
    const row = document.createElement("div");
    row.className = "activity-row";
    const mark = document.createElement("span");
    mark.className = `activity-mark ${transaction.status === "pending" ? "mark-purple" : "mark-green"}`;
    mark.textContent = transaction.status === "pending" ? "◷" : "↗";
    const detail = document.createElement("span");
    detail.className = "activity-description";
    const order = document.createElement("strong");
    order.textContent = `${transaction.id} · ${transaction.customer_name}`;
    const items = document.createElement("span");
    items.textContent = transaction.items.map(item => item.name).join(", ");
    detail.append(order, items);
    const total = document.createElement("span");
    total.className = "activity-time";
    total.textContent = `$${Number(transaction.total).toFixed(2)}`;
    const chip = document.createElement("span");
    chip.className = `activity-status ${transaction.status === "pending" ? "status-live" : "status-done"}`;
    chip.textContent = transaction.status;
    row.append(mark, detail, total, chip);
    return row;
  }));
}

async function refreshNotifications() {
  const params = new URLSearchParams({ status: "pending", limit: "6" });
  if (state.account?.role === "customer") params.set("customer_id", state.account.id);
  if (activeStore()) params.set("store", activeStore());
  try {
    const response = await requestJson(`/api/recommender/transactions?${params}`);
    pendingNotifications = response.items;
    const seenIds = new Set(
      (localStorage.getItem(`malliq-seen-notifications-${state.account?.id || "guest"}`) || "")
        .split(",")
        .filter(Boolean),
    );
    const unread = pendingNotifications.filter((item) => !seenIds.has(item.id)).length;
    notificationIndicator.hidden = unread === 0;
    notificationSummary.textContent = response.total
      ? `${response.total.toLocaleString()} pending order${response.total === 1 ? "" : "s"}`
      : "You’re all caught up";
    notificationList.replaceChildren();
    if (!response.items.length) {
      const empty = document.createElement("p");
      empty.className = "notification-empty";
      empty.textContent = "No pending orders need your attention.";
      notificationList.append(empty);
      return;
    }
    response.items.forEach((transaction) => {
      const item = document.createElement("article");
      item.className = "notification-item";
      const copy = document.createElement("span");
      copy.innerHTML = `<strong>${escapeHtml(transaction.id)} · ${escapeHtml(transaction.customer_name)}</strong><small>${escapeHtml(transaction.items.map((product) => product.name).join(", "))}</small>`;
      const review = document.createElement("button");
      review.className = "row-action";
      review.textContent = "Review";
      review.addEventListener("click", () => {
        state.transactionStatus = "pending";
        state.transactionSearch = transaction.id;
        closeNotifications();
        setPage("transactions");
      });
      item.append(copy, review);
      notificationList.append(item);
    });
  } catch (error) {
    notificationSummary.textContent = "Could not load notifications";
    notificationList.replaceChildren();
    const errorMessage = document.createElement("p");
    errorMessage.className = "notification-empty notification-error";
    errorMessage.textContent = error.message;
    notificationList.append(errorMessage);
  }
}

function closeNotifications() {
  notificationPopover.hidden = true;
  notificationsButton.setAttribute("aria-expanded", "false");
}

async function toggleNotifications() {
  const opening = notificationPopover.hidden;
  if (!opening) {
    closeNotifications();
    return;
  }
  notificationPopover.hidden = false;
  notificationsButton.setAttribute("aria-expanded", "true");
  await refreshNotifications();
}

function markNotificationsRead() {
  const key = `malliq-seen-notifications-${state.account?.id || "guest"}`;
  const previous = (localStorage.getItem(key) || "").split(",").filter(Boolean);
  const seen = new Set([...previous, ...pendingNotifications.map((item) => item.id)]);
  localStorage.setItem(key, [...seen].join(","));
  void refreshNotifications();
  showToast("Pending-order notifications marked as read.");
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}

async function loadAccounts() {
  const { items } = await requestJson("/api/recommender/accounts");
  state.accounts = items;
  const savedId = localStorage.getItem("malliq-demo-account");
  state.account = items.find((account) => account.id === savedId)
    || items.find((account) => account.role === "admin")
    || items[0];
  updateAccountIdentity();
}

function updateAccountIdentity() {
  if (!state.account) return;
  const avatar = initials(state.account.name);
  sidebarName.textContent = state.account.name;
  sidebarRole.textContent = state.account.role_label;
  sidebarAvatar.textContent = avatar;
  accountShortcut.textContent = avatar;
  navItems.forEach((item) => {
    item.hidden = !rolePages[state.account.role]?.includes(item.dataset.page);
  });
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

async function requestJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Could not reach the service. Check that the backend is running.");
  }
  const data = await response.json();
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).join(", ")
      : data.detail;
    throw new Error(detail || `Request failed (${response.status}).`);
  }
  return data;
}

function setPage(page) {
  if (page === "login") {
    state.page = page;
    document.querySelector(".app-shell").classList.add("login-mode");
    navItems.forEach((item) => item.classList.remove("active"));
    title.textContent = "Choose account";
    renderLogin();
    return;
  }
  if (!rolePages[state.account?.role]?.includes(page)) {
    page = "overview";
  }
  document.querySelector(".app-shell").classList.remove("login-mode");
  state.page = page;
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  title.textContent = pageTitles[page];
  const renderers = {
    overview: renderOverview,
    pricing: renderPricing,
    insights: renderInsights,
    recommendations: renderRecommendations,
    customers: renderCustomers,
    products: renderProducts,
    transactions: renderTransactions,
    accounts: renderAccounts,
  };
  renderers[page]();
}

function renderLogin() {
  pageContent.innerHTML = `
    <section class="login-page">
      <img class="login-wordmark" src="/images/CortexMallText.png" alt="CortexMall" />
      <div class="eyebrow"><span class="eyebrow-line"></span> LOCAL DEMO WORKSPACE</div>
      <h1>Welcome to CortexMall</h1>
      <p>Choose a demo workspace to continue. No password or real account is used.</p>
      <div class="login-cards" id="login-cards"><div class="loading-card">Loading demo workspaces…</div></div>
      <div class="role-warning"><strong>Demo access only</strong><span>This account picker does not authenticate users or protect data. Do not use it for production access.</span></div>
    </section>`;
  const cards = pageContent.querySelector("#login-cards");
  const roles = [
    { key: "admin", title: "Mall administrator", detail: "Mall-wide operations and account workspace" },
    { key: "manager", title: "Store manager", detail: "Store operations, products, and transactions" },
    { key: "customer", title: "Customer", detail: "Personal orders and product discovery" },
  ];
  cards.replaceChildren(...roles.map((role) => {
    const candidates = state.accounts.filter((account) => account.role === role.key);
    const card = document.createElement("form");
    card.className = "login-card";
    card.innerHTML = `<span class="role-badge role-${role.key}">${escapeHtml(role.title)}</span><strong>${escapeHtml(role.detail)}</strong>`;
    const select = document.createElement("select");
    select.name = "account";
    select.setAttribute("aria-label", `Choose ${role.title.toLowerCase()} account`);
    candidates.forEach((account) => select.add(new Option(`${account.name} · ${account.organization}`, account.id)));
    const button = document.createElement("button");
    button.className = "primary-button";
    button.type = "submit";
    button.textContent = `Continue as ${role.key === "admin" ? "admin" : role.key}`;
    card.append(select, button);
    card.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = state.accounts.find((account) => account.id === select.value);
      if (!selected) {
        showToast("No demo account is available for this role.", true);
        return;
      }
      state.account = selected;
      localStorage.setItem("malliq-demo-account", selected.id);
      updateAccountIdentity();
      showToast(`Signed in to ${selected.role_label.toLowerCase()} preview.`);
      setPage("overview");
    });
    return card;
  }));
}

async function renderOverview() {
  pageContent.innerHTML = `
    <section class="welcome-row">
      <div>
        <div class="eyebrow"><span class="eyebrow-line"></span> <span id="current-date"></span></div>
        <h1 id="greeting"></h1>
        <p class="welcome-subtitle">Here’s what’s happening across your mall today.</p>
      </div>
      <button class="date-button" id="today-button"><span>▦</span> Today <span class="chevron">⌄</span></button>
    </section>

    <section class="metric-grid" id="live-metrics" aria-label="Live mall performance summary"><div class="loading-card">Loading live mall data…</div></section>

    <section class="content-grid">
      <article class="panel performance-panel">
        <div class="panel-heading"><div><h2>Mall performance</h2><p>Completed order activity over the last seven days</p></div><span class="select-button">Last 7 days</span></div>
        <div class="chart-summary"><strong id="weekly-orders">—</strong><span class="chart-summary-copy">completed orders in the last 7 days</span></div>
        <div class="chart-wrap">
          <div class="y-axis" id="orders-axis"><span>—</span><span>—</span><span>—</span><span>—</span><span>0</span></div>
          <div class="chart">
            <div class="grid-lines"><i></i><i></i><i></i><i></i><i></i></div>
            <svg id="orders-chart" viewBox="0 0 650 190" preserveAspectRatio="none" role="img" aria-label="Weekly completed order trend"></svg>
            <div class="x-axis"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          </div>
        </div>
        <div class="chart-legend"><span><i class="legend-purple"></i> Completed orders</span></div>
      </article>
      <article class="panel services-panel">
        <div class="panel-heading"><div><h2>Intelligence hub</h2><p>Your mall’s AI-powered tools</p></div>        <img class="hub-illustration" src="/images/brainImage.png" alt="" /></div>
        <button class="tool-card" data-tool="pricing"><span class="tool-icon tool-purple">↗</span><span class="tool-copy"><strong>Smart pricing</strong><small>Optimize your discount schemes</small></span><span class="tool-arrow">↗</span></button>
        <button class="tool-card" data-tool="insights"><span class="tool-icon tool-orange">▦</span><span class="tool-copy"><strong>Basket insights</strong><small>Discover products shoppers pair</small></span><span class="tool-arrow">↗</span></button>
        <button class="tool-card" data-tool="recommendations"><span class="tool-icon tool-blue">✳</span><span class="tool-copy"><strong>Personalized picks</strong><small>Find the right products for shoppers</small></span><span class="tool-arrow">↗</span></button>
        <div class="hub-footer"><span class="status-dot"></span> AI services are <strong>ready to help</strong></div>
      </article>
    </section>

    <section class="panel activity-panel">
      <div class="panel-heading"><div><h2>Recent activity</h2><p>A pulse on what’s moving across your mall</p></div><button class="text-button" id="recent-activity-all">View all <span>→</span></button></div>
      <div class="activity-list" id="recent-transactions"><div class="loading-card">Loading recent activity…</div></div>
    </section>
    <div class="demo-note"><span>✦</span> Dashboard totals and activity below are loaded from the local mall data store.</div>
  `;
  pageContent.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.tool));
  });
  pageContent.querySelector("#today-button").addEventListener("click", () => void loadOverviewData());
  pageContent.querySelector("#recent-activity-all").addEventListener("click", () => setPage("transactions"));
  pageContent.querySelector("#current-date").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date()).toUpperCase();
  pageContent.querySelector("#greeting").replaceChildren(
    document.createTextNode(`Good morning, ${state.account?.name || "there"} `),
    Object.assign(document.createElement("span"), { className: "wave", textContent: "✦" }),
  );
  try {
    const customerId = state.account?.role === "customer" ? state.account.id : "";
    const store = activeStore();
    const dashboardUrl = customerId
      ? `/api/recommender/dashboard?customer_id=${encodeURIComponent(customerId)}`
      : store
        ? `/api/recommender/dashboard?store=${encodeURIComponent(store)}`
        : "/api/recommender/dashboard";
    const activityUrl = customerId
      ? `/api/recommender/transactions?customer_id=${encodeURIComponent(customerId)}&limit=4`
      : `/api/recommender/transactions?limit=4${store ? `&store=${encodeURIComponent(store)}` : ""}`;
    const [dashboard, recent] = await Promise.all([
      requestJson(dashboardUrl),
      requestJson(activityUrl),
    ]);
    state.dashboard = dashboard;
    const metrics = pageContent.querySelector("#live-metrics");
    const cards = state.account?.role === "customer"
      ? [
        metricCard("Your purchases", dashboard.completed, "completed transactions", "lavender", "↗"),
        metricCard("Products in mall", dashboard.products, "available to explore", "blue", "▤"),
        metricCard("Your pending orders", dashboard.pending, "awaiting completion", "peach", "◷"),
        metricCard("Your lifetime spend", `$${Number(dashboard.lifetime_value).toFixed(2)}`, `${dashboard.stores} stores shopped`, "mint", "⌑"),
      ]
      : state.account?.role === "manager"
        ? [
          metricCard("Customers at your store", dashboard.customers, "who have shopped here", "lavender", "♙"),
          metricCard("Your products", dashboard.products, "in the mall catalog", "blue", "▤"),
          metricCard("Pending orders", dashboard.pending, "including your products", "peach", "◷"),
          metricCard("Average basket", `$${Number(dashboard.average_order_value).toFixed(2)}`, `${dashboard.completed} orders with your products`, "mint", "⌑"),
        ]
        : [
        metricCard("Customers", dashboard.customers, "in the customer directory", "lavender", "♙"),
        metricCard("Products", dashboard.products, "available across mall stores", "blue", "▤"),
        metricCard("Pending orders", dashboard.pending, "awaiting a status update", "peach", "◷"),
        metricCard("Average basket", `$${Number(dashboard.average_order_value).toFixed(2)}`, `${dashboard.completed} completed orders`, "mint", "⌑"),
      ];
    metrics.replaceChildren(
      ...cards,
    );
    pageContent.querySelector("#weekly-orders").textContent = Number(dashboard.recent_orders).toLocaleString();
    drawOrdersChart(dashboard.daily_orders);
    renderRecentTransactions(pageContent.querySelector("#recent-transactions"), recent.items);
  } catch (error) {
    pageContent.querySelector("#live-metrics").innerHTML = `<div class="error-result"><strong>Could not load live mall data</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function metricCard(label, value, caption, color, icon) {
  const article = document.createElement("article");
  article.className = "metric-card";
  const top = document.createElement("div");
  top.className = "metric-top";
  const name = document.createElement("span");
  name.className = "metric-label";
  name.textContent = label;
  const mark = document.createElement("span");
  mark.className = `metric-icon ${color}`;
  mark.textContent = icon;
  top.append(name, mark);
  const count = document.createElement("div");
  count.className = "metric-value";
  count.textContent = typeof value === "number" ? value.toLocaleString() : value;
  const detail = document.createElement("div");
  detail.className = "metric-caption";
  detail.textContent = caption;
  article.append(top, count, detail);
  return article;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderPricing() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> PRICING INTELLIGENCE</div><h1>Find your next best offer</h1><p>Give the pricing agent recent sales and it’ll suggest a discount scheme with an estimated reward.</p></section>
    <section class="tool-layout">
      <article class="panel form-panel">
        <div class="form-panel-heading"><span class="large-tool-icon tool-purple">↗</span><div><h2>Generate a pricing scheme</h2><p>Share a little context to get a tailored suggestion.</p></div></div>
        <form id="pricing-form" class="tool-form">
          <label>Shop ID <input name="shop_id" placeholder="Enter a shop identifier" required minlength="1" /></label>
          <label>Recent sales <span class="field-hint">Enter at least two values, separated by commas</span><input name="recent_sales" placeholder="e.g. 100, 110, 125, 140" required /></label>
          <label>Current discount <span class="input-suffix"><input name="current_discount" type="number" min="0" max="100" step="1" placeholder="0" required /><i>%</i></span></label>
          <button class="primary-button" type="submit"><span>✦</span> Generate scheme <span class="button-arrow">→</span></button>
        </form>
        <div class="form-footnote"><span>◈</span> Recommendations are estimates based on the supplied sales history.</div>
      </article>
      <article class="panel result-panel" id="pricing-result"><div class="empty-result"><div class="empty-illustration">↗</div><h2>Your next move, made smarter.</h2><p>Submit sales data to see a recommended discount and expected reward.</p><div class="result-decoration">✦ &nbsp; powered by the pricing agent</div></div></article>
    </section>
  `;
  pageContent.querySelector("#pricing-form").addEventListener("submit", submitPricing);
}

async function submitPricing(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const result = pageContent.querySelector("#pricing-result");
  const sales = form.elements.recent_sales.value.split(",").map((value) => Number(value.trim()));
  if (sales.length < 2 || sales.some((value) => !Number.isFinite(value) || value < 0)) {
    showToast("Enter at least two non-negative sales values.", true);
    return;
  }
  button.disabled = true;
  button.classList.add("loading");
  button.querySelector(".button-arrow").textContent = "…";
  try {
    const data = await requestJson("/api/pricing/generate-scheme", {
      method: "POST",
      body: JSON.stringify({
        shop_id: form.elements.shop_id.value.trim(),
        recent_sales: sales,
        current_discount: Number(form.elements.current_discount.value),
      }),
    });
    result.innerHTML = `<div class="result-success"><span class="result-eyebrow"><i></i> RECOMMENDATION READY</span><div class="result-discount"><strong class="discount-value"></strong><span>recommended<br/>discount</span></div><div class="reward-box"><span>Estimated profit delta</span><strong class="reward-value"></strong></div><div class="result-shop"></div><p class="result-explainer">A data-informed starting point. Monitor real-world results before applying changes.</p></div>`;
    result.querySelector(".discount-value").textContent = `${data.recommended_discount}%`;
    result.querySelector(".reward-value").textContent = `${data.expected_reward >= 0 ? "+" : ""}$${data.expected_reward.toFixed(2)}`;
    result.querySelector(".result-shop").textContent = `Prepared for ${data.shop_id}`;
  } catch (error) {
    renderError(result, error.message);
  } finally {
    button.disabled = false;
    button.classList.remove("loading");
    button.querySelector(".button-arrow").textContent = "→";
  }
}

function renderInsights() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> SHOPPER BEHAVIOR</div><h1>See what goes together</h1><p>Mine transaction baskets for product combinations and useful association rules.</p></section>
    <section class="tool-layout">
      <article class="panel form-panel">
        <div class="form-panel-heading"><span class="large-tool-icon tool-orange">▦</span><div><h2>Analyze shopping baskets</h2><p>Put one transaction on each line. Separate products with commas.</p></div></div>
        <form id="insights-form" class="tool-form">
          <label>Transactions <textarea name="transactions" rows="7" placeholder="One basket per line, comma-separated&#10;Example: coffee, cake" required></textarea></label>
          <div class="two-fields"><label>Minimum support<input name="min_support" type="number" min="0.01" max="1" step="0.01" value="0.2" required /></label><label>Minimum confidence<input name="min_confidence" type="number" min="0.01" max="1" step="0.01" value="0.5" required /></label></div>
          <button class="primary-button orange-button" type="submit"><span>▦</span> Find basket patterns <span class="button-arrow">→</span></button>
        </form>
        <div class="form-footnote"><span>◈</span> Items that appear together can inform bundles and promotions.</div>
      </article>
      <article class="panel result-panel" id="insights-result"><div class="empty-result orange-empty"><div class="empty-illustration">▦</div><h2>Uncover the unexpected.</h2><p>Analyze baskets to discover frequent items and association rules.</p><div class="result-decoration">▦ &nbsp; powered by Apriori mining</div></div></article>
    </section>
  `;
  pageContent.querySelector("#insights-form").addEventListener("submit", submitInsights);
}

async function submitInsights(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const result = pageContent.querySelector("#insights-result");
  const transactions = form.elements.transactions.value
    .split(/\r?\n/)
    .map((line) => line.split(",").map((item) => item.trim()).filter(Boolean))
    .filter((basket) => basket.length);
  if (!transactions.length) {
    showToast("Add at least one transaction.", true);
    return;
  }
  setFormLoading(form, true);
  try {
    const data = await requestJson("/api/apriori/mine-rules", {
      method: "POST",
      body: JSON.stringify({
        transactions,
        min_support: Number(form.elements.min_support.value),
        min_confidence: Number(form.elements.min_confidence.value),
      }),
    });
    const wrapper = document.createElement("div");
    wrapper.className = "analysis-results";
    const heading = document.createElement("div");
    heading.className = "analysis-heading";
    heading.innerHTML = `<span class="result-eyebrow"><i></i> ANALYSIS COMPLETE</span><strong class="analysis-count"></strong>`;
    heading.querySelector(".analysis-count").textContent = `${data.frequent_itemsets.length} itemsets · ${data.rules.length} rules`;
    wrapper.append(heading);
    addResultSection(wrapper, "Frequent itemsets", data.frequent_itemsets.map((itemset) => ({
      title: itemset.items.join(" + "),
      detail: `${(itemset.support * 100).toFixed(0)}% support`,
    })));
    addResultSection(wrapper, "Association rules", data.rules.map((rule) => ({
      title: `${rule.antecedent.join(" + ")}  →  ${rule.consequent.join(" + ")}`,
      detail: `${(rule.confidence * 100).toFixed(0)}% confidence · ${(rule.support * 100).toFixed(0)}% support`,
    })));
    result.replaceChildren(wrapper);
  } catch (error) {
    renderError(result, error.message);
  } finally {
    setFormLoading(form, false);
  }
}

function addResultSection(parent, title, rows) {
  const section = document.createElement("section");
  section.className = "analysis-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "no-rules";
    empty.textContent = "No results at these thresholds. Try lowering support or confidence.";
    section.append(empty);
  } else {
    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "analysis-row";
      const name = document.createElement("strong");
      name.textContent = row.title;
      const detail = document.createElement("span");
      detail.textContent = row.detail;
      item.append(name, detail);
      section.append(item);
    });
  }
  parent.append(section);
}

async function renderRecommendations() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> PERSONALIZED DISCOVERY</div><h1>A little more of what they love</h1><p>Explore product suggestions for a customer using the recommender service.</p></section>
    <section class="panel recommendation-panel">
      <form id="recommend-form" class="recommend-form"><label>Customer<select name="customer_id" required><option>Loading customers…</option></select></label><label>How many?<select name="limit"></select></label><button class="primary-button blue-button" type="submit"><span>✳</span> Get recommendations <span class="button-arrow">→</span></button></form>
      <div class="recommendation-results" id="recommendation-results"><div class="empty-recommendations"><span>✳</span><strong>Thoughtful picks, just for them.</strong><p>Enter a customer ID to explore a set of personalized product picks.</p></div></div>
    </section>
    <div class="demo-note"><span>ⓘ</span> Suggestions are calculated from this customer’s purchase categories and completed transactions.</div>
  `;
  pageContent.querySelector("#recommend-form").addEventListener("submit", submitRecommendations);
  const limitSelect = pageContent.querySelector("#recommend-form [name=limit]");
  [3, 5, 10].forEach((limit) => limitSelect.add(new Option(String(limit), String(limit))));
  limitSelect.value = "5";
  try {
    const { items } = await requestJson("/api/recommender/customers?limit=200");
    const select = pageContent.querySelector("#recommend-form [name=customer_id]");
    select.replaceChildren(...items.map((customer) => {
      const option = document.createElement("option");
      option.value = customer.id;
      option.textContent = `${customer.name} · ${customer.id}`;
      return option;
    }));
    const ownCustomer = state.account?.role === "customer" ? state.account.id : null;
    const selectedCustomer = localStorage.getItem("malliq-selected-customer");
    const customerId = ownCustomer || selectedCustomer;
    if (customerId && items.some((customer) => customer.id === customerId)) {
      select.value = customerId;
    }
  } catch (error) {
    pageContent.querySelector("#recommendation-results").innerHTML = `<div class="error-result"><strong>Could not load customers</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function submitRecommendations(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const target = pageContent.querySelector("#recommendation-results");
  setFormLoading(form, true);
  try {
    const data = await requestJson("/api/recommender/recommend", {
      method: "POST",
      body: JSON.stringify({
        customer_id: form.elements.customer_id.value.trim(),
        limit: Number(form.elements.limit.value),
      }),
    });
    const grid = document.createElement("div");
    grid.className = "product-grid";
    data.recommendations.forEach((product, index) => {
      const card = document.createElement("article");
      card.className = "product-card";
      const visual = document.createElement("div");
      visual.className = `product-visual product-visual-${index % 5}`;
      visual.textContent = ["☕", "◉", "♫", "✿", "▱"][index % 5];
      const details = document.createElement("div");
      details.className = "product-details";
      const name = document.createElement("strong");
      name.textContent = product.name;
      const id = document.createElement("span");
      id.textContent = product.product_id;
      details.append(name, id);
      const score = document.createElement("span");
      score.className = "product-score";
      score.textContent = `${Math.round(product.score * 100)}% match`;
      card.append(visual, details, score);
      grid.append(card);
    });
    target.replaceChildren(grid);
  } catch (error) {
    renderError(target, error.message);
  } finally {
    setFormLoading(form, false);
  }
}

function setFormLoading(form, loading) {
  const button = form.querySelector("button[type=submit]");
  if (!button) return;
  button.disabled = loading;
  button.classList.toggle("loading", loading);
  const arrow = button.querySelector(".button-arrow");
  if (arrow) arrow.textContent = loading ? "…" : "→";
}

function renderError(target, message) {
  const panel = document.createElement("div");
  panel.className = "error-result";
  const heading = document.createElement("strong");
  heading.textContent = "Couldn’t complete that request";
  const detail = document.createElement("p");
  detail.textContent = message;
  panel.append(heading, detail);
  target.replaceChildren(panel);
  showToast(message, true);
}

async function checkServices() {
  const results = await Promise.all(services.map(async (service) => {
    try {
      const response = await fetch(service.url);
      return response.ok;
    } catch {
      return false;
    }
  }));
  const available = results.filter(Boolean).length;
  statusLabel.textContent = `${available} of 3 services online`;
  statusDot.classList.toggle("offline", available !== services.length);
  await refreshNotifications();
}

navItems.forEach((item) => item.addEventListener("click", () => setPage(item.dataset.page)));
brandHome.addEventListener("click", (event) => {
  event.preventDefault();
  setPage("overview");
});
accountShortcut.addEventListener("click", () => setPage("accounts"));
profileOpen.addEventListener("click", () => setPage("accounts"));
notificationsButton.addEventListener("click", () => void toggleNotifications());
document.querySelector("#mark-notifications-read").addEventListener("click", markNotificationsRead);
document.querySelector("#notification-view-all").addEventListener("click", () => {
  state.transactionStatus = "pending";
  closeNotifications();
  setPage("transactions");
});
document.addEventListener("click", (event) => {
  if (!notificationPopover.hidden
      && !notificationPopover.contains(event.target)
      && !notificationsButton.contains(event.target)) {
    closeNotifications();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNotifications();
});
signOutButton.addEventListener("click", () => {
  localStorage.removeItem("malliq-demo-account");
  state.account = null;
  setPage("login");
});
void (async () => {
  try {
    await loadAccounts();
  } catch (error) {
    showToast(`Could not load demo account data: ${error.message}`, true);
    state.account = {
      id: "local-preview",
      name: "Local preview",
      role: "admin",
      role_label: "Administrator preview",
    };
    updateAccountIdentity();
  }
  setPage("overview");
  await checkServices();
})();
window.setInterval(checkServices, 30000);
