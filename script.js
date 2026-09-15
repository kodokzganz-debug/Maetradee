"use strict";

/* =========================================================
   MAETRADE — SIMPLE TRADING WORKSPACE
   Storage: localStorage
========================================================= */

const STORAGE_KEY = "maetrade_trades_v1";

let trades = [];


// =========================================================
// STORAGE
// =========================================================

function loadTrades() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      trades = [];
      return;
    }

    const parsed = JSON.parse(saved);

    trades = Array.isArray(parsed) ? parsed : [];

  } catch (error) {
    console.error("Failed to load trades:", error);
    trades = [];
  }
}


function saveTrades() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(trades)
    );
  } catch (error) {
    console.error("Failed to save trades:", error);
  }
}


// =========================================================
// HELPERS
// =========================================================

function money(value) {

  const number = Number(value) || 0;

  const sign = number < 0 ? "-" : "";

  return (
    sign +
    "$" +
    Math.abs(number).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function generateId() {

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}


function calculateWinRate() {

  const closed = trades.filter(
    trade => trade.status === "CLOSED"
  );

  if (!closed.length) {
    return 0;
  }

  const wins = closed.filter(
    trade => Number(trade.profit) > 0
  ).length;

  return Math.round(
    (wins / closed.length) * 100
  );
}


function getTotalPL() {

  return trades
    .filter(trade => trade.status === "CLOSED")
    .reduce(
      (total, trade) =>
        total + (Number(trade.profit) || 0),
      0
    );
}


// =========================================================
// NAVIGATION
// =========================================================

const navItems =
  document.querySelectorAll(".nav-item");

const pages =
  document.querySelectorAll(".page");

const pageTitle =
  document.getElementById("pageTitle");


const pageNames = {
  dashboard: "Dashboard",
  analysis: "Technical Analysis",
  journal: "Trading Journal",
  cashflow: "Cashflow",
  settings: "Settings"
};


function showPage(pageName) {

  pages.forEach(page => {

    page.classList.remove("active");

  });


  const target =
    document.getElementById(pageName);

  if (target) {
    target.classList.add("active");
  }


  navItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.page === pageName
    );

  });


  if (pageTitle) {

    pageTitle.textContent =
      pageNames[pageName] || "Dashboard";

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


navItems.forEach(item => {

  item.addEventListener("click", () => {

    const page =
      item.dataset.page;

    showPage(page);

  });

});


// =========================================================
// DASHBOARD
// =========================================================

function updateDashboard() {

  const totalBalance =
    document.getElementById("totalBalance");

  const totalPL =
    document.getElementById("totalPL");

  const winRate =
    document.getElementById("winRate");

  const tradeCount =
    document.getElementById("tradeCount");

  const plMeta =
    document.getElementById("plMeta");


  const pl =
    getTotalPL();

  const wins =
    calculateWinRate();


  /*
    Tidak ada starting balance
    di versi ini, jadi Total Balance
    tetap $0 agar tidak menyesatkan.
  */

  if (totalBalance) {
    totalBalance.textContent = "$0.00";
  }


  if (totalPL) {

    totalPL.textContent =
      money(pl);

    totalPL.style.color =
      pl > 0
        ? "var(--green)"
        : pl < 0
          ? "var(--red)"
          : "var(--text)";
  }


  if (winRate) {

    winRate.textContent =
      `${wins}%`;
  }


  if (tradeCount) {

    tradeCount.textContent =
      trades.length;
  }


  if (plMeta) {

    const closed =
      trades.filter(
        trade => trade.status === "CLOSED"
      ).length;

    plMeta.textContent =
      closed
        ? `${closed} closed trade${closed > 1 ? "s" : ""}`
        : "No closed trades";
  }


  renderRecentTrades();

  renderJournal();

}


// =========================================================
// RECENT TRADES
// =========================================================

function renderRecentTrades() {

  const container =
    document.getElementById(
      "recentTradesList"
    );

  if (!container) {
    return;
  }


  if (!trades.length) {

    container.innerHTML = `

      <div class="empty">

        <div class="empty-icon">
          ◇
        </div>

        <strong>
          No trades yet
        </strong>

        <span>
          Add your first trade to start tracking.
        </span>

        <button
          class="secondary"
          id="emptyNewTradeButton"
          type="button"
        >
          Add first trade
        </button>

      </div>

    `;


    const button =
      document.getElementById(
        "emptyNewTradeButton"
      );

    if (button) {
      button.addEventListener(
        "click",
        openTradeModal
      );
    }

    return;
  }


  const recent =
    [...trades]
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(0, 5);


  container.innerHTML = `

    <div class="trade-table-wrapper">

      <table class="trade-table">

        <thead>

          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Volume</th>
            <th>Status</th>
            <th>P/L</th>
          </tr>

        </thead>

        <tbody>

          ${recent.map(trade => {

            const profit =
              Number(trade.profit) || 0;

            const profitClass =
              profit > 0
                ? "trade-positive"
                : profit < 0
                  ? "trade-negative"
                  : "";

            const sideClass =
              trade.side === "BUY"
                ? "side-buy"
                : "side-sell";


            return `

              <tr>

                <td>
                  <strong>
                    ${escapeHTML(trade.symbol)}
                  </strong>
                </td>

                <td class="${sideClass}">
                  ${escapeHTML(trade.side)}
                </td>

                <td>
                  ${escapeHTML(trade.volume)}
                </td>

                <td>
                  ${escapeHTML(trade.status)}
                </td>

                <td class="${profitClass}">
                  ${money(profit)}
                </td>

              </tr>

            `;

          }).join("")}

        </tbody>

      </table>

    </div>

  `;
}


// =========================================================
// JOURNAL
// =========================================================

function renderJournal() {

  const container =
    document.getElementById(
      "journalTableContainer"
    );

  if (!container) {
    return;
  }


  if (!trades.length) {

    container.innerHTML = `

      <div class="empty">

        <div class="empty-icon">
          ✦
        </div>

        <strong>
          Your journal is empty
        </strong>

        <span>
          Your trades will appear here.
        </span>

      </div>

    `;

    return;
  }


  const sorted =
    [...trades].sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );


  container.innerHTML = `

    <div class="trade-table-wrapper">

      <table class="trade-table">

        <thead>

          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Close</th>
            <th>Status</th>
            <th>P/L</th>
            <th>Action</th>
          </tr>

        </thead>

        <tbody>

          ${sorted.map(trade => {

            const profit =
              Number(trade.profit) || 0;

            const profitClass =
              profit > 0
                ? "trade-positive"
                : profit < 0
                  ? "trade-negative"
                  : "";

            const sideClass =
              trade.side === "BUY"
                ? "side-buy"
                : "side-sell";


            return `

              <tr>

                <td>
                  <strong>
                    ${escapeHTML(trade.symbol)}
                  </strong>
                </td>

                <td class="${sideClass}">
                  ${escapeHTML(trade.side)}
                </td>

                <td>
                  ${escapeHTML(trade.entry)}
                </td>

                <td>
                  ${escapeHTML(trade.close || "-")}
                </td>

                <td>
                  ${escapeHTML(trade.status)}
                </td>

                <td class="${profitClass}">
                  ${money(profit)}
                </td>

                <td>

                  <button
                    class="delete-trade"
                    data-id="${escapeHTML(trade.id)}"
                    type="button"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `;

          }).join("")}

        </tbody>

      </table>

    </div>

  `;


  document
    .querySelectorAll(".delete-trade")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteTrade(
            button.dataset.id
          );

        }
      );

    });

}


// =========================================================
// DELETE TRADE
// =========================================================

function deleteTrade(id) {

  const trade =
    trades.find(
      item => item.id === id
    );

  if (!trade) {
    return;
  }


  const confirmed =
    window.confirm(
      `Delete ${trade.symbol} trade?`
    );


  if (!confirmed) {
    return;
  }


  trades =
    trades.filter(
      item => item.id !== id
    );


  saveTrades();

  updateDashboard();

}


// =========================================================
// NEW TRADE MODAL
// =========================================================

function openTradeModal() {

  closeTradeModal();


  const backdrop =
    document.createElement("div");

  backdrop.className =
    "trade-modal-backdrop";

  backdrop.id =
    "tradeModal";


  backdrop.innerHTML = `

    <div
      class="trade-modal"
      role="dialog"
      aria-modal="true"
    >

      <div class="trade-modal-header">

        <div>

          <span class="eyebrow">
            TRADE RECORD
          </span>

          <h2>
            New Trade
          </h2>

        </div>

        <button
          class="modal-close"
          id="closeTradeModal"
          type="button"
        >
          ×
        </button>

      </div>


      <form id="tradeForm">


        <div class="form-grid">


          <label>

            <span>Symbol</span>

            <input
              name="symbol"
              type="text"
              value="XAUUSD"
              placeholder="XAUUSD"
              required
            >

          </label>


          <label>

            <span>Side</span>

            <select name="side">

              <option value="BUY">
                BUY
              </option>

              <option value="SELL">
                SELL
              </option>

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
            >

          </label>


          <label>

            <span>Status</span>

            <select name="status">

              <option value="OPEN">
                OPEN
              </option>

              <option value="CLOSED">
                CLOSED
              </option>

            </select>

          </label>


          <label>

            <span>Entry Price</span>

            <input
              name="entry"
              type="number"
              step="any"
              placeholder="3500.00"
              required
            >

          </label>


          <label>

            <span>Close Price</span>

            <input
              name="close"
              type="number"
              step="any"
              placeholder="3520.00"
            >

          </label>


          <label>

            <span>Stop Loss</span>

            <input
              name="sl"
              type="number"
              step="any"
              placeholder="3490.00"
            >

          </label>


          <label>

            <span>Take Profit</span>

            <input
              name="tp"
              type="number"
              step="any"
              placeholder="3520.00"
            >

          </label>


          <label>

            <span>P/L</span>

            <input
              name="profit"
              type="number"
              step="any"
              value="0"
              placeholder="0"
            >

          </label>


          <label>

            <span>Open Time</span>

            <input
              name="openTime"
              type="datetime-local"
            >

          </label>


          <label class="full">

            <span>Notes</span>

            <textarea
              name="notes"
              rows="3"
              placeholder="Trade setup, psychology, execution..."
            ></textarea>

          </label>


        </div>


        <div class="modal-actions">

          <button
            type="button"
            class="secondary"
            id="cancelTrade"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="primary"
          >
            Save Trade
          </button>

        </div>


      </form>

    </div>

  `;


  document.body.appendChild(
    backdrop
  );


  const form =
    document.getElementById(
      "tradeForm"
    );


  const closeButton =
    document.getElementById(
      "closeTradeModal"
    );


  const cancelButton =
    document.getElementById(
      "cancelTrade"
    );


  closeButton.addEventListener(
    "click",
    closeTradeModal
  );


  cancelButton.addEventListener(
    "click",
    closeTradeModal
  );


  backdrop.addEventListener(
    "click",
    event => {

      if (event.target === backdrop) {
        closeTradeModal();
      }

    }
  );


  form.addEventListener(
    "submit",
    handleTradeSubmit
  );


  document.body.style.overflow =
    "hidden";
}


function closeTradeModal() {

  const modal =
    document.getElementById(
      "tradeModal"
    );

  if (modal) {
    modal.remove();
  }

  document.body.style.overflow =
    "";
}


// =========================================================
// SAVE TRADE
// =========================================================

function handleTradeSubmit(event) {

  event.preventDefault();


  const form =
    event.currentTarget;

  const data =
    new FormData(form);


  const status =
    data.get("status") ||
    "OPEN";


  const trade = {

    id: generateId(),

    symbol:
      String(data.get("symbol") || "XAUUSD")
        .trim()
        .toUpperCase(),

    side:
      String(data.get("side") || "BUY"),

    volume:
      Number(data.get("volume")) || 0,

    status:
      status,

    entry:
      Number(data.get("entry")) || 0,

    close:
      Number(data.get("close")) || 0,

    sl:
      Number(data.get("sl")) || 0,

    tp:
      Number(data.get("tp")) || 0,

    profit:
      Number(data.get("profit")) || 0,

    openTime:
      String(data.get("openTime") || ""),

    notes:
      String(data.get("notes") || "").trim(),

    createdAt:
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


  if (trade.entry <= 0) {

    alert("Entry price wajib diisi.");

    return;
  }


  trades.push(trade);

  saveTrades();

  closeTradeModal();

  updateDashboard();

  alert(
    `${trade.symbol} ${trade.side} berhasil disimpan.`
  );

}


// =========================================================
// BUTTONS
// =========================================================

const newTradeButton =
  document.getElementById(
    "newTradeButton"
  );

if (newTradeButton) {

  newTradeButton.addEventListener(
    "click",
    openTradeModal
  );

}


const emptyNewTradeButton =
  document.getElementById(
    "emptyNewTradeButton"
  );

if (emptyNewTradeButton) {

  emptyNewTradeButton.addEventListener(
    "click",
    openTradeModal
  );

}


const viewAllTrades =
  document.getElementById(
    "viewAllTrades"
  );

if (viewAllTrades) {

  viewAllTrades.addEventListener(
    "click",
    () => {

      showPage("journal");

    }
  );

}


const newJournalButton =
  document.getElementById(
    "newJournalButton"
  );

if (newJournalButton) {

  newJournalButton.addEventListener(
    "click",
    openTradeModal
  );

}


const journalTableContainer =
  document.getElementById(
    "journalTableContainer"
  );


// =========================================================
// WATCHLIST
// =========================================================

document
  .querySelectorAll(".watch")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const symbol =
          button.dataset.symbol;

        const analysisSymbol =
          document.getElementById(
            "analysisSymbol"
          );

        if (analysisSymbol) {
          analysisSymbol.textContent =
            symbol;
        }

        showPage("analysis");

      }
    );

  });


// =========================================================
// CLEAR DATA
// =========================================================

const clearTradesButton =
  document.getElementById(
    "clearTradesButton"
  );

if (clearTradesButton) {

  clearTradesButton.addEventListener(
    "click",
    () => {

      if (!trades.length) {

        alert("Belum ada trade.");

        return;
      }


      const confirmed =
        window.confirm(
          "Hapus SEMUA data trade?"
        );


      if (!confirmed) {
        return;
      }


      trades = [];

      saveTrades();

      updateDashboard();

      alert(
        "Semua data trade sudah dihapus."
      );

    }
  );

}


// =========================================================
// OTHER BUTTONS
// =========================================================

const addTransactionButton =
  document.getElementById(
    "addTransactionButton"
  );

if (addTransactionButton) {

  addTransactionButton.addEventListener(
    "click",
    () => {

      alert(
        "Cashflow module akan ditambahkan setelah trade tracker stabil."
      );

    }
  );

}


const profileButton =
  document.getElementById(
    "profileButton"
  );

if (profileButton) {

  profileButton.addEventListener(
    "click",
    () => {

      showPage("settings");

    }
  );

}


// =========================================================
// KEYBOARD
// =========================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      closeTradeModal();

    }


    if (
      event.ctrlKey &&
      event.key.toLowerCase() === "n"
    ) {

      event.preventDefault();

      openTradeModal();

    }

  }
);


// =========================================================
// INIT
// =========================================================

loadTrades();

updateDashboard();

console.log(
  "MAETRADE initialized.",
  trades.length,
  "trades loaded."
);
