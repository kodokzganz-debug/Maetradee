/* =========================================================
MAETRADE — V1 APPLICATION LOGIC
Navigation / UI interactions
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

/* =======================================================
PAGE NAVIGATION
======================================================= */

function showPage(pageId) {

pages.forEach((page) => {
  page.classList.remove("active-page");
});

navItems.forEach((item) => {
  item.classList.remove("active");
});

const targetPage = document.getElementById(pageId);
const targetNav = document.querySelector(
  `.nav-item[data-page="${pageId}"]`
);

if (targetPage) {
  targetPage.classList.add("active-page");
}

if (targetNav) {
  targetNav.classList.add("active");
}

window.scrollTo({
  top: 0,
  behavior: "smooth"
});

history.replaceState(null, "", `#${pageId}`);

}

/* =======================================================
NAVIGATION EVENTS
======================================================= */

navItems.forEach((item) => {

item.addEventListener("click", () => {

  const pageId = item.dataset.page;

  if (!pageId) return;

  showPage(pageId);

});

});

/* =======================================================
LOAD PAGE FROM URL HASH
======================================================= */

function loadInitialPage() {

const hash = window.location.hash.replace("#", "");

const validPages = [
  "dashboard",
  "analysis",
  "journal",
  "cashflow",
  "settings"
];

if (validPages.includes(hash)) {
  showPage(hash);
} else {
  showPage("dashboard");
}

}

loadInitialPage();

/* =======================================================
NEW TRADE BUTTON
======================================================= */

const newTradeButtons = document.querySelectorAll(
".primary-button"
);

newTradeButtons.forEach((button) => {

button.addEventListener("click", () => {

  const text = button.textContent.trim();

  if (
    text.includes("New Trade") ||
    text.includes("New Journal") ||
    text.includes("Add Transaction")
  ) {

    alert(
      "MAETRADE V1\n\n" +
      "This feature will be connected to the database in the next version."
    );

  }

});

});

/* =======================================================
SECONDARY BUTTONS
======================================================= */

const secondaryButtons =
document.querySelectorAll(".secondary-button");

secondaryButtons.forEach((button) => {

button.addEventListener("click", () => {

  alert(
    "MAETRADE\n\n" +
    "Configuration module is coming soon."
  );

});

});

/* =======================================================
WATCHLIST INTERACTION
======================================================= */

const watchItems =
document.querySelectorAll(".watch-item");

watchItems.forEach((item) => {

item.addEventListener("click", () => {

  const symbol =
    item.querySelector("strong")?.textContent || "Asset";

  alert(
    `${symbol}\n\n` +
    "Live market data will be connected in the Technical Analysis module."
  );

});

});

/* =======================================================
PERIOD BUTTON
======================================================= */

const periodButton =
document.querySelector(".period-button");

if (periodButton) {

periodButton.addEventListener("click", () => {

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

  const currentIndex =
    periods.indexOf(current);

  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + 1) % periods.length;

  periodButton.textContent =
    `${periods[nextIndex]} ▾`;

});

}

/* =======================================================
VIEW ALL
======================================================= */

const viewAllButton =
document.querySelector(".text-button");

if (viewAllButton) {

viewAllButton.addEventListener("click", () => {

  const panel =
    viewAllButton.closest(".panel");

  if (
    panel &&
    panel.querySelector(".trades-panel")
  ) {
    showPage("journal");
  }

});

}

/* =======================================================
MANAGE WATCHLIST
======================================================= */

const manageButtons =
document.querySelectorAll(".text-button");

manageButtons.forEach((button) => {

if (button.textContent.includes("Manage")) {

  button.addEventListener("click", () => {

    alert(
      "Watchlist management will be available in a future version."
    );

  });

}

});

/* =======================================================
PROFILE
======================================================= */

const profileButton =
document.querySelector(".profile-button");

if (profileButton) {

profileButton.addEventListener("click", () => {

  alert(
    "MAETRADE\n\n" +
    "Personal Trading Workspace"
  );

});

}

/* =======================================================
NOTIFICATION
======================================================= */

const notificationButton =
document.querySelector(".icon-button");

if (notificationButton) {

notificationButton.addEventListener("click", () => {

  alert(
    "Notifications\n\n" +
    "No new notifications."
  );

});

}

/* =======================================================
KEYBOARD SHORTCUTS
======================================================= */

document.addEventListener("keydown", (event) => {

if (event.key === "1") {
  showPage("dashboard");
}

if (event.key === "2") {
  showPage("analysis");
}

if (event.key === "3") {
  showPage("journal");
}

if (event.key === "4") {
  showPage("cashflow");
}

if (event.key === "5") {
  showPage("settings");
}

});

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
