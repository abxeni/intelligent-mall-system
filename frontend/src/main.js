import "./style.css";

const pageContent = document.querySelector("#page-content");
const title = document.querySelector("#current-section");
const navItems = [...document.querySelectorAll(".nav-item")];
const statusLabel = document.querySelector("#status-label");
const statusDot = document.querySelector("#status-dot");
const toast = document.querySelector("#toast");

const services = [
  { name: "Pricing agent", url: "/api/pricing/health" },
  { name: "Basket insights", url: "/api/apriori/health" },
  { name: "Recommendations", url: "/api/recommender/health" },
];

const pageTitles = {
  overview: "Overview",
  pricing: "Pricing lab",
  insights: "Basket insights",
  recommendations: "Recommendations",
};

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
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  title.textContent = pageTitles[page];
  const renderers = {
    overview: renderOverview,
    pricing: renderPricing,
    insights: renderInsights,
    recommendations: renderRecommendations,
  };
  renderers[page]();
}

function renderOverview() {
  pageContent.innerHTML = `
    <section class="welcome-row">
      <div>
        <div class="eyebrow"><span class="eyebrow-line"></span> <span id="current-date"></span></div>
        <h1>Good morning, Alex <span class="wave">✦</span></h1>
        <p class="welcome-subtitle">Here’s what’s happening across your mall today.</p>
      </div>
      <button class="date-button" id="today-button"><span>▦</span> Today <span class="chevron">⌄</span></button>
    </section>

    <section class="metric-grid" aria-label="Mall performance summary">
      <article class="metric-card">
        <div class="metric-top"><span class="metric-label">Active stores</span><span class="metric-icon lavender">▧</span></div>
        <div class="metric-value">128 <span class="metric-change positive">↗ 8.2%</span></div>
        <div class="metric-caption">vs. last month</div>
        <div class="mini-bars bars-purple" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </article>
      <article class="metric-card">
        <div class="metric-top"><span class="metric-label">Today’s footfall</span><span class="metric-icon mint">♧</span></div>
        <div class="metric-value">8,642 <span class="metric-change positive">↗ 12.6%</span></div>
        <div class="metric-caption">vs. same day last week</div>
        <div class="mini-bars bars-green" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </article>
      <article class="metric-card">
        <div class="metric-top"><span class="metric-label">Active promotions</span><span class="metric-icon peach">✦</span></div>
        <div class="metric-value">24 <span class="metric-change positive">+ 3 new</span></div>
        <div class="metric-caption">across 18 stores</div>
        <div class="metric-progress"><span></span></div>
      </article>
      <article class="metric-card">
        <div class="metric-top"><span class="metric-label">Avg. basket value</span><span class="metric-icon blue">⌑</span></div>
        <div class="metric-value">$64.80 <span class="metric-change positive">↗ 4.3%</span></div>
        <div class="metric-caption">vs. last month</div>
        <div class="metric-sparkline" aria-hidden="true"><svg viewBox="0 0 160 32" preserveAspectRatio="none"><path d="M0 25 C16 22 17 27 31 19 S50 21 61 14 S78 22 94 11 S110 15 123 8 S145 14 160 3" /></svg></div>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel performance-panel">
        <div class="panel-heading"><div><h2>Mall performance</h2><p>Visitor trends throughout the week</p></div><button class="select-button">This week <span>⌄</span></button></div>
        <div class="chart-summary"><strong>42,891</strong><span class="chart-up">↗ 8.4%</span><span class="chart-summary-copy">visitors this week</span></div>
        <div class="chart-wrap">
          <div class="y-axis"><span>10k</span><span>7.5k</span><span>5k</span><span>2.5k</span><span>0</span></div>
          <div class="chart">
            <div class="grid-lines"><i></i><i></i><i></i><i></i><i></i></div>
            <svg viewBox="0 0 650 190" preserveAspectRatio="none" role="img" aria-label="Weekly visitor trend chart">
              <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#7563e9" stop-opacity=".22"/><stop offset="100%" stop-color="#7563e9" stop-opacity="0"/></linearGradient></defs>
              <path class="chart-area" d="M0 145 C30 140 47 118 88 126 S143 90 180 103 S231 127 270 88 S324 105 358 70 S414 93 450 62 S506 81 540 42 S601 66 650 24 L650 190 L0 190 Z"/>
              <path class="chart-line" d="M0 145 C30 140 47 118 88 126 S143 90 180 103 S231 127 270 88 S324 105 358 70 S414 93 450 62 S506 81 540 42 S601 66 650 24"/>
              <circle cx="540" cy="42" r="5"/>
            </svg>
            <div class="x-axis"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          </div>
        </div>
        <div class="chart-legend"><span><i class="legend-purple"></i> This week</span><span><i class="legend-gray"></i> Last week</span></div>
      </article>
      <article class="panel services-panel">
        <div class="panel-heading"><div><h2>Intelligence hub</h2><p>Your mall’s AI-powered tools</p></div><span class="hub-spark">✦</span></div>
        <button class="tool-card" data-tool="pricing"><span class="tool-icon tool-purple">↗</span><span class="tool-copy"><strong>Smart pricing</strong><small>Optimize your discount schemes</small></span><span class="tool-arrow">↗</span></button>
        <button class="tool-card" data-tool="insights"><span class="tool-icon tool-orange">▦</span><span class="tool-copy"><strong>Basket insights</strong><small>Discover products shoppers pair</small></span><span class="tool-arrow">↗</span></button>
        <button class="tool-card" data-tool="recommendations"><span class="tool-icon tool-blue">✳</span><span class="tool-copy"><strong>Personalized picks</strong><small>Find the right products for shoppers</small></span><span class="tool-arrow">↗</span></button>
        <div class="hub-footer"><span class="status-dot"></span> AI services are <strong>ready to help</strong></div>
      </article>
    </section>

    <section class="panel activity-panel">
      <div class="panel-heading"><div><h2>Recent activity</h2><p>A pulse on what’s moving across your mall</p></div><button class="text-button">View all <span>→</span></button></div>
      <div class="activity-list">
        <div class="activity-row"><span class="activity-mark mark-purple">✦</span><span class="activity-description"><strong>Summer kickoff sale</strong><span>Promotion published by Fashion Avenue</span></span><span class="activity-time">12 min ago</span><span class="activity-status status-live">Live</span></div>
        <div class="activity-row"><span class="activity-mark mark-green">↗</span><span class="activity-description"><strong>Pricing scheme optimized</strong><span>Smart pricing updated 6 store recommendations</span></span><span class="activity-time">48 min ago</span><span class="activity-status status-done">Complete</span></div>
        <div class="activity-row"><span class="activity-mark mark-blue">▧</span><span class="activity-description"><strong>New store onboarded</strong><span>Bloom &amp; Wild · Level 2, East Wing</span></span><span class="activity-time">2 hours ago</span><span class="activity-status status-new">New</span></div>
      </div>
    </section>
    <div class="demo-note"><span>✦</span> Sample dashboard figures are illustrative. Try the intelligence tools to query the live local APIs.</div>
  `;
  pageContent.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.tool));
  });
  pageContent.querySelector("#today-button").addEventListener("click", () => showToast("Showing today’s mall overview."));
  pageContent.querySelector("#current-date").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date()).toUpperCase();
}

function renderPricing() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> PRICING INTELLIGENCE</div><h1>Find your next best offer</h1><p>Give the pricing agent recent sales and it’ll suggest a discount scheme with an estimated reward.</p></section>
    <section class="tool-layout">
      <article class="panel form-panel">
        <div class="form-panel-heading"><span class="large-tool-icon tool-purple">↗</span><div><h2>Generate a pricing scheme</h2><p>Share a little context to get a tailored suggestion.</p></div></div>
        <form id="pricing-form" class="tool-form">
          <label>Shop ID <input name="shop_id" value="shop-101" required minlength="1" /></label>
          <label>Recent sales <span class="field-hint">Enter at least two values, separated by commas</span><input name="recent_sales" value="100, 110, 125, 140" required /></label>
          <label>Current discount <span class="input-suffix"><input name="current_discount" type="number" min="0" max="100" step="1" value="10" required /><i>%</i></span></label>
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
          <label>Transactions <textarea name="transactions" rows="7" required>coffee, cake
coffee, cake, tea
coffee, tea
cake, tea
coffee, cake</textarea></label>
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

function renderRecommendations() {
  pageContent.innerHTML = `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-line"></span> PERSONALIZED DISCOVERY</div><h1>A little more of what they love</h1><p>Explore product suggestions for a customer using the recommender service.</p></section>
    <section class="panel recommendation-panel">
      <form id="recommend-form" class="recommend-form"><label>Customer ID<input name="customer_id" value="customer-001" required minlength="1" /></label><label>How many?<select name="limit"><option>5</option><option>3</option><option>10</option></select></label><button class="primary-button blue-button" type="submit"><span>✳</span> Get recommendations <span class="button-arrow">→</span></button></form>
      <div class="recommendation-results" id="recommendation-results"><div class="empty-recommendations"><span>✳</span><strong>Thoughtful picks, just for them.</strong><p>Enter a customer ID to explore a set of personalized product picks.</p></div></div>
    </section>
    <div class="demo-note"><span>ⓘ</span> The current service uses example product scores; customer-specific embeddings will be added with database integration.</div>
  `;
  pageContent.querySelector("#recommend-form").addEventListener("submit", submitRecommendations);
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
}

navItems.forEach((item) => item.addEventListener("click", () => setPage(item.dataset.page)));
setPage("overview");
checkServices();
window.setInterval(checkServices, 30000);
