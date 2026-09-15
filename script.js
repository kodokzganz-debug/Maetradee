/* =========================================================
   MAETRADE — V1 APPLICATION LOGIC
   Navigation / Trade CRUD / Journal / Dashboard
   LocalStorage version
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =======================================================
     STORAGE
  ======================================================= */

  const STORAGE_KEY = "maetrade_trades_v1";

  function getTrades() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("MAETRADE storage error:", error);
      return [];
    }
  }

  function saveTrades(trades) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  function showPage(pageId) {
    pages.forEach((page) => {
      page.classList.toggle(
        "active-page",
        page.id === pageId
      );
    });

    navItems.forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.page === pageId
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    history.replaceState(
      null,
      "",
      `#${pageId}`
    );
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const pageId = item.dataset.page;

      if (pageId) {
        showPage(pageId);
      }
    });
  });

  function loadInitialPage() {
    const hash = window.location.hash.replace("#", "");

    const validPages = [
      "dashboard",
      "analysis",
      "journal",
      "cashflow",
      "settings"
    ];

    showPage(
      validPages.includes(hash)
        ? hash
        : "dashboard"
    );
  }

  loadInitialPage();

  /* =======================================================
     HELPERS
  ======================================================= */

  function formatMoney(value) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }).format(number);
  }

  function formatNumber(value, digits = 2) {
    const number = Number(value) || 0;

    return number.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function generateId() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function calculateTradePL(trade) {
    if (
      trade.status === "CLOSED" &&
      trade.profit !== undefined &&
      trade.profit !== ""
    ) {
      return Number(trade.profit) || 0;
    }

    return 0;
  }

  /* =======================================================
     CREATE TRADE MODAL
  ======================================================= */

  function createTradeModal() {
    if (document.getElementById("trade-modal")) {
      return;
    }

    const modal = document.createElement("div");

    modal.id = "trade-modal";

    modal.innerHTML = `
      <div class="modal-backdrop"></div>

      <div class="trade-modal-card">

        <div class="trade-modal-header">
          <div>
            <span class="eyebrow">TRADE ENTRY</span>
            <h2>New Trade</h2>
          </div>

          <button
            type="button"
            class="modal-close"
            id="close-trade-modal"
          >
            ×
          </button>
        </div>

        <form id="trade-form">

          <div class="form-grid">

            <label>
              <span>Symbol</span>
              <input
                name="symbol"
                type="text"
                placeholder="XAUUSD"
                value="XAUUSD"
                required
              />
            </label>

            <label>
              <span>Side</span>
              <select name="side">
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </label>

            <label>
              <span>Volume</span>
              <input
                name="volume"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.01"
                required
              />
            </label>

            <label>
              <span>Status</span>
              <select name="status">
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </label>

            <label>
              <span>Entry Price</span>
              <input
                name="entry_price"
                type="number"
                step="any"
                placeholder="3500.00"
                required
              />
            </label>

            <label>
              <span>Close Price</span>
              <input
                name="close_price"
                type="number"
                step="any"
                placeholder="Optional"
              />
            </label>

            <label>
              <span>Stop Loss</span>
              <input
                name="sl"
                type="number"
                step="any"
                placeholder="3490.00"
              />
            </label>

            <label>
              <span>Take Profit</span>
              <input
                name="tp"
                type="number"
                step="any"
                placeholder="3520.00"
              />
            </label>

            <label>
              <span>P/L USD</span>
              <input
                name="profit"
                type="number"
                step="any"
                placeholder="0.00"
              />
            </label>

            <label>
              <span>Open Time</span>
              <input
                name="open_time"
                type="datetime-local"
                required
              />
            </label>

          </div>

          <label class="form-full">
            <span>Notes</span>
            <textarea
              name="notes"
              rows="4"
              placeholder="Trade reasoning, setup, psychology..."
            ></textarea>
          </label>

          <div class="modal-actions">

            <button
              type="button"
              class="secondary-button"
              id="cancel-trade"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="primary-button"
            >
              Save Trade
            </button>

          </div>

        </form>

      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById("close-trade-modal")
      ?.addEventListener("click", closeTradeModal);

    document
      .getElementById("cancel-trade")
      ?.addEventListener("click", closeTradeModal);

    modal
      .querySelector(".modal-backdrop")
      ?.addEventListener("click", closeTradeModal);

    document
      .getElementById("trade-form")
      ?.addEventListener("submit", handleTradeSubmit);
  }

  function openTradeModal() {
    createTradeModal();

    const modal =
      document.getElementById("trade-modal");

    if (!modal) return;

    const form =
      document.getElementById("trade-form");

    if (form) {
      form.reset();

      const symbol =
        form.querySelector('[name="symbol"]');

      const status =
        form.querySelector('[name="status"]');

      if (symbol) symbol.value = "XAUUSD";
      if (status) status.value = "OPEN";

      const openTime =
        form.querySelector('[name="open_time"]');

      if (openTime) {
        const now = new Date();

        const local =
          new Date(
            now.getTime() -
            now.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16);

        openTime.value = local;
      }
    }

    modal.classList.add("show");
    document.body.classList.add("modal-open");
  }

  function closeTradeModal() {
    const modal =
      document.getElementById("trade-modal");

    if (!modal) return;

    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
  }

  /* =======================================================
     TRADE SUBMIT
  ======================================================= */

  function handleTradeSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    const trade = {
      id: generateId(),

      ticket:
        "MAE-" +
        Date.now().toString().slice(-6),

      account_id:
        "personal",

      symbol:
        String(data.get("symbol") || "")
          .trim()
          .toUpperCase(),

      side:
        data.get("side") || "BUY",

      volume:
        Number(data.get("volume")) || 0,

      entry_price:
        Number(data.get("entry_price")) || 0,

      sl:
        Number(data.get("sl")) || 0,

      tp:
        Number(data.get("tp")) || 0,

      open_time:
        data.get("open_time") || "",

      close_price:
        data.get("close_price") || "",

      close_time:
        data.get("status") === "CLOSED"
          ? new Date().toISOString()
          : "",

      profit:
        Number(data.get("profit")) || 0,

      swap: 0,

      commission: 0,

      status:
        data.get("status") || "OPEN",

      notes:
        String(data.get("notes") || "").trim(),

      created_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString()
    };

    if (!trade.symbol) {
      alert("Symbol wajib diisi.");
      return;
    }

    if (trade.volume <= 0) {
      alert("Volume harus lebih besar dari 0.");
      return;
    }

    if (trade.entry_price <= 0) {
      alert("Entry price wajib diisi.");
      return;
    }

    const trades = getTrades();

    trades.unshift(trade);

    saveTrades(trades);

    closeTradeModal();

    renderApplication();

    showPage("journal");

    alert("Trade berhasil disimpan.");
  }

  /* =======================================================
     NEW TRADE BUTTONS
  ======================================================= */

  function bindNewTradeButtons() {
    document
      .querySelectorAll(".primary-button")
      .forEach((button) => {

        const text =
          button.textContent
            .trim()
            .toLowerCase();

        if (
          text.includes("new trade") &&
          !button.dataset.tradeBound
        ) {
          button.dataset.tradeBound = "true";

          button.addEventListener(
            "click",
            openTradeModal
          );
        }
      });

    document
      .querySelectorAll(".secondary-button")
      .forEach((button) => {

        const text =
          button.textContent
            .trim()
            .toLowerCase();

        if (
          text.includes("first trade") &&
          !button.dataset.tradeBound
        ) {
          button.dataset.tradeBound = "true";

          button.addEventListener(
            "click",
            openTradeModal
          );
        }
      });
  }

  /* =======================================================
     DASHBOARD
  ======================================================= */

  function updateDashboard() {
    const trades = getTrades();

    const closedTrades =
      trades.filter(
        (trade) =>
          trade.status === "CLOSED"
      );

    const totalPL =
      closedTrades.reduce(
        (sum, trade) =>
          sum + calculateTradePL(trade),
        0
      );

    const wins =
      closedTrades.filter(
        (trade) =>
          calculateTradePL(trade) > 0
      ).length;

    const winRate =
      closedTrades.length
        ? (wins / closedTrades.length) * 100
        : 0;

    const stats =
      document.querySelectorAll(
        ".stat-card"
      );

    if (stats.length >= 4) {

      const values =
        stats[0].querySelector(
          ".stat-value"
        );

      const pl =
        stats[1].querySelector(
          ".stat-value"
        );

      const rate =
        stats[2].querySelector(
          ".stat-value"
        );

      const count =
        stats[3].querySelector(
          ".stat-value"
        );

      if (values) {
        values.textContent =
          formatMoney(totalPL);
      }

      if (pl) {
        pl.textContent =
          formatMoney(totalPL);
      }

      if (rate) {
        rate.textContent =
          `${formatNumber(winRate)}%`;
      }

      if (count) {
        count.textContent =
          trades.length;
      }
    }

    renderRecentTrades();
  }

  /* =======================================================
     RECENT TRADES
  ======================================================= */

  function renderRecentTrades() {
    const panel =
      document.querySelector(
        ".trades-panel"
      );

    if (!panel) return;

    const trades = getTrades();

    const empty =
      panel.querySelector(
        ".empty-trades"
      );

    if (!trades.length) {

      if (empty) {
        empty.style.display = "flex";
      }

      return;
    }

    if (empty) {
      empty.style.display = "none";
    }

    let container =
      panel.querySelector(
        ".recent-trades-list"
      );

    if (!container) {

      container =
        document.createElement("div");

      container.className =
        "recent-trades-list";

      panel.appendChild(container);
    }

    container.innerHTML =
      trades
        .slice(0, 5)
        .map((trade) => {

          const pl =
            calculateTradePL(trade);

          const plClass =
            pl > 0
              ? "trade-positive"
              : pl < 0
                ? "trade-negative"
                : "trade-neutral";

          return `
            <div class="recent-trade-row">

              <div class="recent-symbol">
                <strong>
                  ${escapeHTML(trade.symbol)}
                </strong>

                <span>
                  ${escapeHTML(trade.side)}
                  · ${escapeHTML(trade.status)}
                </span>
              </div>

              <div class="recent-trade-price">
                <strong>
                  ${formatNumber(
                    trade.entry_price,
                    2
                  )}
                </strong>

                <span
                  class="${plClass}"
                >
                  ${pl >= 0 ? "+" : ""}
                  ${formatMoney(pl)}
                </span>
              </div>

            </div>
          `;
        })
        .join("");
  }

  /* =======================================================
     JOURNAL
  ======================================================= */

  function renderJournal() {
    const journal =
      document.getElementById(
        "journal"
      );

    if (!journal) return;

    const trades =
      getTrades();

    const panel =
      journal.querySelector(
        ".coming-soon-panel"
      );

    if (!panel) return;

    if (!trades.length) {
      return;
    }

    panel.innerHTML = `
      <div class="journal-toolbar">

        <div>
          <span class="panel-eyebrow">
            TRADE LOG
          </span>

          <h2>
            ${trades.length} Trade${trades.length > 1 ? "s" : ""}
          </h2>
        </div>

        <button
          class="primary-button"
          id="journal-new-trade"
        >
          + New Trade
        </button>

      </div>

      <div class="journal-table-wrap">

        <table class="journal-table">

          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th>Entry</th>
              <th>SL</th>
              <th>TP</th>
              <th>Status</th>
              <th>P/L</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            ${trades
              .map((trade) => {

                const pl =
                  calculateTradePL(
                    trade
                  );

                const plClass =
                  pl > 0
                    ? "trade-positive"
                    : pl < 0
                      ? "trade-negative"
                      : "trade-neutral";

                return `
                  <tr>

                    <td>
                      <strong>
                        ${escapeHTML(
                          trade.symbol
                        )}
                      </strong>
                    </td>

                    <td>
                      <span class="side-badge ${trade.side === "BUY" ? "buy" : "sell"}">
                        ${escapeHTML(
                          trade.side
                        )}
                      </span>
                    </td>

                    <td>
                      ${formatNumber(
                        trade.entry_price
                      )}
                    </td>

                    <td>
                      ${trade.sl
                        ? formatNumber(trade.sl)
                        : "—"}
                    </td>

                    <td>
                      ${trade.tp
                        ? formatNumber(trade.tp)
                        : "—"}
                    </td>

                    <td>
                      ${escapeHTML(
                        trade.status
                      )}
                    </td>

                    <td
                      class="${plClass}"
                    >
                      ${pl >= 0 ? "+" : ""}
                      ${formatMoney(pl)}
                    </td>

                    <td>
                      <button
                        class="delete-trade"
                        data-id="${trade.id}"
                      >
                        Delete
                      </button>
                    </td>

                  </tr>
                `;
              })
              .join("")}

          </tbody>

        </table>

      </div>
    `;

    document
      .getElementById(
        "journal-new-trade"
      )
      ?.addEventListener(
        "click",
        openTradeModal
      );

    journal
      .querySelectorAll(
        ".delete-trade"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;

            deleteTrade(id);
          }
        );
      });
  }

  /* =======================================================
     DELETE TRADE
  ======================================================= */

  function deleteTrade(id) {
    const confirmed =
      confirm(
        "Delete trade ini?"
      );

    if (!confirmed) return;

    const trades =
      getTrades().filter(
        (trade) =>
          String(trade.id) !==
          String(id)
      );

    saveTrades(trades);

    renderApplication();
  }

  /* =======================================================
     VIEW ALL
  ======================================================= */

  document
    .querySelectorAll(".text-button")
    .forEach((button) => {

      const text =
        button.textContent
          .trim()
          .toLowerCase();

      if (
        text.includes("view all")
      ) {
        button.addEventListener(
          "click",
          () => showPage("journal")
        );
      }
    });

  /* =======================================================
     WATCHLIST
  ======================================================= */

  document
    .querySelectorAll(".watch-item")
    .forEach((item) => {

      item.addEventListener(
        "click",
        () => {

          const symbol =
            item.querySelector(
              ".asset strong"
            )?.textContent ||
            "Asset";

          showPage("analysis");

          console.log(
            `Selected market: ${symbol}`
          );
        }
      );
    });

  /* =======================================================
     PERIOD SELECTOR
  ======================================================= */

  const periodButton =
    document.querySelector(
      ".period-button"
    );

  if (periodButton) {

    periodButton.addEventListener(
      "click",
      () => {

        const periods = [
          "7 Days",
          "30 Days",
          "90 Days",
          "1 Year"
        ];

        const current =
          periodButton.textContent
            .replace(" ▾", "")
            .trim();

        const index =
          periods.indexOf(current);

        const next =
          index === -1
            ? 0
            : (index + 1) %
              periods.length;

        periodButton.textContent =
          `${periods[next]} ▾`;
      }
    );
  }

  /* =======================================================
     NOTIFICATION
  ======================================================= */

  const notificationButton =
    document.querySelector(
      ".icon-button"
    );

  if (notificationButton) {

    notificationButton.addEventListener(
      "click",
      () => {

        alert(
          "Notifications\n\n" +
          "No new notifications."
        );
      }
    );
  }

  /* =======================================================
     PROFILE
  ======================================================= */

  const profileButton =
    document.querySelector(
      ".profile-button"
    );

  if (profileButton) {

    profileButton.addEventListener(
      "click",
      () => {

        showPage("settings");
      }
    );
  }

  /* =======================================================
     KEYBOARD SHORTCUTS
  ======================================================= */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.tagName === "SELECT"
      ) {
        return;
      }

      const pages = {
        "1": "dashboard",
        "2": "analysis",
        "3": "journal",
        "4": "cashflow",
        "5": "settings"
      };

      if (pages[event.key]) {
        showPage(
          pages[event.key]
        );
      }

      if (
        event.key === "Escape"
      ) {
        closeTradeModal();
      }
    }
  );

  /* =======================================================
     RENDER APPLICATION
  ======================================================= */

  function renderApplication() {
    updateDashboard();
    renderJournal();
    bindNewTradeButtons();
  }

  renderApplication();

  /* =======================================================
     CONSOLE
  ======================================================= */

  console.log(
    "%cMAETRADE",
    "font-size:20px;font-weight:bold;color:#91a8ff;"
  );

  console.log(
    "%cTrading workspace initialized.",
    "color:#8c96aa;"
  );

});
