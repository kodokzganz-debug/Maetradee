document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "maetrade_v1_trades";
  let trades = loadTrades();
  let currentFilter = "ALL";
  let currentPeriod = 30;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const pages = $$(".page");
  const navItems = $$(".nav-item");
  const modal = $("#tradeModal");
  const form = $("#tradeForm");
  const toast = $("#toast");

  function loadTrades() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTrades() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }

  function uid() {
    return "MT-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function money(value) {
    const n = Number(value) || 0;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
  }

  function number(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[ch]));
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(date);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function showPage(pageId) {
    const target = document.getElementById(pageId);
    if (!target) return;
    pages.forEach(page => page.classList.toggle("active-page", page.id === pageId));
    navItems.forEach(item => item.classList.toggle("active", item.dataset.page === pageId));
    history.replaceState(null, "", "#" + pageId);
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("#sidebar")?.classList.remove("open");
  }

  function loadInitialPage() {
    const hash = window.location.hash.replace("#", "");
    const valid = ["dashboard", "analysis", "journal", "cashflow", "settings"];
    showPage(valid.includes(hash) ? hash : "dashboard");
  }

  navItems.forEach(item => item.addEventListener("click", () => showPage(item.dataset.page)));
  $$("[data-page-link]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.pageLink)));

  $("#mobileMenu")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));

  document.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === "new-trade") openTradeModal();
      if (action === "add-transaction") showToast("Cashflow module is planned for the next build.");
    }

    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) closeTradeModal();

    const editButton = event.target.closest("[data-edit]");
    if (editButton) openTradeModal(editButton.dataset.edit);

    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) deleteTrade(deleteButton.dataset.delete);
  });

  function nowLocalInput() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function openTradeModal(id = null) {
    form.reset();
    $("#tradeId").value = "";
    $("#symbol").value = "XAUUSD";
    $("#side").value = "BUY";
    setSide("BUY");
    $("#status").value = "OPEN";
    $("#openTime").value = nowLocalInput();
    $("#tradeModalTitle").textContent = id ? "Edit Trade" : "New Trade";
    $("#saveTradeButton").textContent = id ? "Update Trade" : "Save Trade";

    if (id) {
      const trade = trades.find(t => t.id === id);
      if (!trade) return;
      $("#tradeId").value = trade.id;
      $("#symbol").value = trade.symbol;
      $("#volume").value = trade.volume ?? "";
      $("#entry").value = trade.entry ?? "";
      $("#sl").value = trade.sl ?? "";
      $("#tp").value = trade.tp ?? "";
      $("#openTime").value = toDateTimeLocal(trade.openTime);
      $("#status").value = trade.status;
      $("#closePrice").value = trade.closePrice ?? "";
      $("#profit").value = trade.profit ?? "";
      $("#notes").value = trade.notes ?? "";
      setSide(trade.side);
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => $("#symbol")?.focus(), 50);
  }

  function closeTradeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function toDateTimeLocal(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value || nowLocalInput();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function setSide(side) {
    $("#side").value = side;
    $$(".side-option").forEach(button => button.classList.toggle("active", button.dataset.side === side));
  }

  $$(".side-option").forEach(button => button.addEventListener("click", () => setSide(button.dataset.side)));

  $("#status").addEventListener("change", () => {
    if ($("#status").value === "OPEN") {
      $("#closePrice").value = "";
      $("#profit").value = "";
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    const id = $("#tradeId").value || uid();
    const existing = trades.find(t => t.id === id);

    const trade = {
      id,
      symbol: $("#symbol").value.trim().toUpperCase(),
      side: $("#side").value,
      volume: Number($("#volume").value),
      entry: Number($("#entry").value),
      sl: $("#sl").value === "" ? null : Number($("#sl").value),
      tp: $("#tp").value === "" ? null : Number($("#tp").value),
      openTime: $("#openTime").value,
      status: $("#status").value,
      closePrice: $("#closePrice").value === "" ? null : Number($("#closePrice").value),
      profit: $("#profit").value === "" ? 0 : Number($("#profit").value),
      notes: $("#notes").value.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    if (!trade.symbol || !Number.isFinite(trade.volume) || trade.volume <= 0 || !Number.isFinite(trade.entry)) {
      showToast("Check symbol, volume and entry price.");
      return;
    }

    if (trade.status === "OPEN") {
      trade.closePrice = null;
      trade.profit = 0;
    }

    if (existing) {
      trades = trades.map(t => t.id === id ? trade : t);
      showToast("Trade updated.");
    } else {
      trades.unshift(trade);
      showToast("Trade saved.");
    }

    saveTrades();
    closeTradeModal();
    renderAll();
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) closeTradeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeTradeModal();
    if (event.key === "1") showPage("dashboard");
    if (event.key === "2") showPage("analysis");
    if (event.key === "3") showPage("journal");
    if (event.key === "4") showPage("cashflow");
    if (event.key === "5") showPage("settings");
  });

  function deleteTrade(id) {
    const trade = trades.find(t => t.id === id);
    if (!trade) return;
    if (!confirm(`Delete ${trade.symbol} ${trade.side} trade?`)) return;
    trades = trades.filter(t => t.id !== id);
    saveTrades();
    renderAll();
    showToast("Trade deleted.");
  }

  function filteredTrades() {
    return trades.filter(trade => {
      if (currentFilter === "ALL") return true;
      if (currentFilter === "OPEN" || currentFilter === "CLOSED") return trade.status === currentFilter;
      return trade.side === currentFilter;
    });
  }

  $$(".filter-button").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      $$(".filter-button").forEach(b => b.classList.toggle("active", b === button));
      renderJournal();
    });
  });

  $$(".period-button").forEach(button => {
    button.addEventListener("click", () => {
      currentPeriod = Number(button.dataset.period);
      $$(".period-button").forEach(b => b.classList.toggle("active", b === button));
      drawChart();
    });
  });

  function renderStats() {
    const closed = trades.filter(t => t.status === "CLOSED");
    const totalProfit = closed.reduce((sum, t) => sum + (Number(t.profit) || 0), 0);
    const wins = closed.filter(t => Number(t.profit) > 0).length;
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;

    $("#balanceValue").textContent = money(totalProfit);
    $("#profitValue").textContent = money(totalProfit);
    $("#winRateValue").textContent = winRate.toFixed(2) + "%";
    $("#tradesValue").textContent = trades.length;

    $("#balanceValue").classList.toggle("positive", totalProfit > 0);
    $("#balanceValue").classList.toggle("negative", totalProfit < 0);
    $("#profitValue").classList.toggle("positive", totalProfit > 0);
    $("#profitValue").classList.toggle("negative", totalProfit < 0);

    $("#balanceMeta").textContent = closed.length ? `${closed.length} closed trade${closed.length > 1 ? "s" : ""}` : "No closed trades";
    $("#profitMeta").textContent = closed.length ? (totalProfit >= 0 ? "Net positive" : "Net negative") : "No data yet";
    $("#winMeta").textContent = closed.length ? `${wins} winning trade${wins !== 1 ? "s" : ""}` : "No closed trades";
    $("#tradesMeta").textContent = trades.length ? `${trades.filter(t => t.status === "OPEN").length} open` : "No activity";
  }

  function renderRecent() {
    const container = $("#recentTrades");
    const recent = trades.slice(0, 5);

    if (!recent.length) {
      container.innerHTML = `<div class="empty-state compact"><div class="empty-circle">⌁</div><strong>No trades yet</strong><p>Your recent trading activity will appear here.</p><button class="secondary-button" data-action="new-trade">Add your first trade</button></div>`;
      return;
    }

    container.innerHTML = recent.map(t => {
      const pnl = Number(t.profit) || 0;
      return `<div class="recent-trade">
        <div class="trade-main">
          <div class="trade-dot ${t.side.toLowerCase()}">${escapeHTML(t.side)}</div>
          <div class="trade-info"><strong>${escapeHTML(t.symbol)}</strong><span>${escapeHTML(t.status)} · ${formatDate(t.openTime)}</span></div>
        </div>
        <div class="trade-result"><strong class="${pnl > 0 ? "positive" : pnl < 0 ? "negative" : ""}">${t.status === "OPEN" ? "OPEN" : money(pnl)}</strong><small>${number(t.volume, 2)} lot</small></div>
      </div>`;
    }).join("");
  }

  function renderJournal() {
    const body = $("#tradeTableBody");
    const visible = filteredTrades();
    $("#journalCount").textContent = `${visible.length} trade${visible.length !== 1 ? "s" : ""}`;

    if (!visible.length) {
      body.innerHTML = "";
      $("#journalEmpty").classList.add("visible");
      return;
    }

    $("#journalEmpty").classList.remove("visible");

    body.innerHTML = visible.map(t => {
      const pnl = Number(t.profit) || 0;
      return `<tr>
        <td><div class="symbol-cell"><strong>${escapeHTML(t.symbol)}</strong><small>${escapeHTML(t.id)}</small></div></td>
        <td><span class="side-badge ${t.side.toLowerCase()}">${escapeHTML(t.side)}</span></td>
        <td>${number(t.entry, 2)}</td>
        <td>${number(t.sl, 2)} / ${number(t.tp, 2)}</td>
        <td>${escapeHTML(formatDate(t.openTime))}</td>
        <td><span class="status-badge ${t.status.toLowerCase()}">${escapeHTML(t.status)}</span></td>
        <td class="${pnl > 0 ? "positive" : pnl < 0 ? "negative" : ""}">${t.status === "OPEN" ? "—" : money(pnl)}</td>
        <td><div class="action-buttons"><button class="table-action" data-edit="${escapeHTML(t.id)}">Edit</button><button class="table-action delete" data-delete="${escapeHTML(t.id)}">Delete</button></div></td>
      </tr>`;
    }).join("");
  }

  function drawChart() {
    const canvas = $("#performanceChart");
    const empty = $("#chartEmpty");
    if (!canvas) return;

    const closed = trades.filter(t => t.status === "CLOSED").sort((a,b) => new Date(a.openTime) - new Date(b.openTime));
    const recent = closed.slice(-currentPeriod);

    if (!recent.length) {
      empty.classList.remove("hidden");
      canvas.style.display = "none";
      return;
    }

    empty.classList.add("hidden");
    canvas.style.display = "block";

    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const w = rect.width, h = rect.height;
    const pad = { left: 26, right: 18, top: 22, bottom: 25 };
    const values = [];
    let cumulative = 0;
    recent.forEach(t => { cumulative += Number(t.profit) || 0; values.push(cumulative); });

    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    const x = i => pad.left + (i / Math.max(1, values.length - 1)) * (w - pad.left - pad.right);
    const y = value => pad.top + (max - value) / range * (h - pad.top - pad.bottom);

    ctx.strokeStyle = "rgba(255,255,255,.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const gy = pad.top + i * (h - pad.top - pad.bottom) / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w-pad.right, gy); ctx.stroke();
    }

    ctx.beginPath();
    values.forEach((value, i) => i ? ctx.lineTo(x(i), y(value)) : ctx.moveTo(x(i), y(value)));
    ctx.lineTo(x(values.length - 1), h - pad.bottom);
    ctx.lineTo(x(0), h - pad.bottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, pad.top, 0, h);
    gradient.addColorStop(0, "rgba(145,168,255,.18)");
    gradient.addColorStop(1, "rgba(145,168,255,0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    values.forEach((value, i) => i ? ctx.lineTo(x(i), y(value)) : ctx.moveTo(x(i), y(value)));
    ctx.strokeStyle = "#91a8ff";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(145,168,255,.3)";
    ctx.stroke();
    ctx.shadowBlur = 0;

    values.forEach((value, i) => {
      if (i !== values.length - 1) return;
      ctx.beginPath();
      ctx.arc(x(i), y(value), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#b9c6ff";
      ctx.fill();
    });

    ctx.fillStyle = "#5e687b";
    ctx.font = "7px Lexend, sans-serif";
    ctx.fillText("P/L", 8, 15);
    ctx.fillText(money(values[values.length - 1]), Math.max(pad.left, w - 80), 15);
  }

  function renderAll() {
    renderStats();
    renderRecent();
    renderJournal();
    drawChart();
  }

  window.addEventListener("resize", () => {
    if (document.getElementById("dashboard")?.classList.contains("active-page")) drawChart();
  });

  $("#notificationButton")?.addEventListener("click", () => {
    showToast(trades.length ? `${trades.length} trade record${trades.length > 1 ? "s" : ""} stored locally.` : "No new notifications.");
  });

  $("#profileButton")?.addEventListener("click", () => showPage("settings"));

  $$(".watch-item").forEach(item => {
    item.addEventListener("click", () => {
      showPage("analysis");
      showToast(`${item.dataset.symbol} selected for analysis.`);
    });
  });

  loadInitialPage();
  renderAll();

  console.log("%cMAETRADE V1", "font-size:18px;font-weight:bold;color:#91a8ff");
  console.log("%cFunctional trading journal initialized.", "color:#8c96aa");
});
