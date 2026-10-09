(() => {
  "use strict";
  const STORAGE_KEY = "maetrade.trades.v1";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  let trades = loadTrades();
  let activeFilter = "ALL";
  let chartPeriod = "all";
  let selectedSide = "BUY";
  let toastTimer;

  function loadTrades() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(t => t && t.id) : [];
    } catch (err) { console.warn("MAETRADE storage read failed", err); return []; }
  }
  function saveTrades() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trades)); }
    catch (err) { toast("Gagal menyimpan. Storage browser mungkin penuh."); }
  }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function money(value, signed = false) {
    const n = Number(value) || 0;
    const prefix = signed && n > 0 ? "+" : "";
    return prefix + new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
  }
  function dateLabel(value) {
    if (!value) return "No date";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "No date" : d.toLocaleString("id-ID", {day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"});
  }
  function closed() { return trades.filter(t => t.status === "CLOSED"); }
  function stats() {
    const c = closed(), wins = c.filter(t => Number(t.pl) > 0), losses = c.filter(t => Number(t.pl) < 0);
    const grossProfit = wins.reduce((s,t) => s + Number(t.pl), 0);
    const grossLoss = Math.abs(losses.reduce((s,t) => s + Number(t.pl), 0));
    const net = c.reduce((s,t) => s + Number(t.pl || 0), 0);
    return {c,wins,losses,grossProfit,grossLoss,net,winRate:c.length ? wins.length/c.length*100 : 0,
      pf:grossLoss ? grossProfit/grossLoss : (grossProfit ? Infinity : 0),
      avgWin:wins.length ? grossProfit/wins.length : 0,
      avgLoss:losses.length ? losses.reduce((s,t) => s + Number(t.pl),0)/losses.length : 0,
      expectancy:c.length ? net/c.length : 0};
  }
  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message; node.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
  }
  function showPage(name) {
    const target = $("#page-" + name);
    if (!target) return;
    $$(".page").forEach(p => p.classList.toggle("active-page", p === target));
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === name));
    $("#sidebar").classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
    if (name === "dashboard") drawChart();
  }
  function openModal() {
    const form = $("#tradeForm");
    form.reset();
    form.elements.symbol.value = "XAUUSD";
    form.elements.status.value = "OPEN";
    form.elements.date.value = toLocalDateTime(new Date());
    selectedSide = "BUY";
    form.elements.side.value = selectedSide;
    $$(".side-option").forEach(b => b.classList.toggle("active", b.dataset.side === selectedSide));
    $("#modalTitle").textContent = "Create new trade";
    $("#tradeModal").classList.add("open");
    setTimeout(() => form.elements.entry.focus(), 80);
  }
  function closeModal() { $("#tradeModal").classList.remove("open"); }
  function toLocalDateTime(d) {
    const local = new Date(d.getTime() - d.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }
  function render() {
    const s = stats();
    $("#statNet").textContent = money(s.net, true);
    $("#statNet").className = "stat-value " + (s.net > 0 ? "positive" : s.net < 0 ? "negative" : "");
    $("#statClosed").textContent = `${s.c.length} trades`;
    $("#statWinRate").textContent = `${s.winRate.toFixed(1)}%`;
    $("#statWins").textContent = `${s.wins.length} wins`;
    $("#statTotal").textContent = String(trades.length);
    $("#statOpen").textContent = `${trades.filter(t => t.status === "OPEN").length} open`;
    $("#statPF").textContent = s.pf === Infinity ? "∞" : s.pf ? s.pf.toFixed(2) : "—";
    $("#cashNet").textContent = money(s.net, true);
    $("#cashNet").className = s.net > 0 ? "positive" : s.net < 0 ? "negative" : "";
    $("#cashGross").textContent = money(s.grossProfit);
    $("#cashLoss").textContent = money(-s.grossLoss);
    $("#avgWin").textContent = money(s.avgWin);
    $("#avgLoss").textContent = money(s.avgLoss);
    $("#expectancy").textContent = money(s.expectancy, true);
    $("#bestTrade").textContent = money(s.c.length ? Math.max(...s.c.map(t => Number(t.pl) || 0)) : 0, true);
    $("#journalCount").textContent = `${trades.length} records`;
    $("#historyCount").textContent = `${trades.length} records`;
    renderRows("#tradeRows", activeFilter);
    renderRows("#historyRows", "ALL");
    renderRecent();
    drawChart();
  }
  function renderRows(selector, filter) {
    const tbody = $(selector);
    const list = trades.filter(t => filter === "ALL" || t.status === filter).slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    tbody.innerHTML = list.map(t => `<tr>
      <td><div class="symbol-cell"><strong>${esc(t.symbol)}</strong><small>${esc(dateLabel(t.date))}</small></div></td>
      <td><span class="side-badge ${t.side === "BUY" ? "buy" : "sell"}">${esc(t.side)}</span></td>
      <td>${formatPrice(t.entry)}</td><td>${formatPrice(t.sl)}</td><td>${formatPrice(t.tp)}</td>
      <td><span class="status-badge ${t.status.toLowerCase()}">${t.status === "OPEN" ? "OPEN" : "CLOSED"}</span></td>
      <td class="${Number(t.pl)>0?"positive":Number(t.pl)<0?"negative":""}">${t.status === "CLOSED" ? money(t.pl,true) : "—"}</td>
      <td><div class="action-buttons">${t.status === "OPEN" ? `<button class="table-action" data-close="${esc(t.id)}">Close</button>` : ""}<button class="table-action delete" data-delete="${esc(t.id)}">Delete</button></div></td>
    </tr>`).join("");
    const empty = selector === "#tradeRows" ? $("#journalEmpty") : $("#historyEmpty");
    empty.classList.toggle("visible", list.length === 0);
  }
  function formatPrice(value) {
    if (value === "" || value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return new Intl.NumberFormat("en-US",{maximumFractionDigits:5}).format(Number(value));
  }
  function renderRecent() {
    const node = $("#recentList");
    const list = trades.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
    if (!list.length) {
      node.innerHTML = `<div class="empty-state compact"><div class="empty-circle">◷</div><strong>Belum ada transaksi</strong><p>Catat trade pertama lu untuk mulai tracking.</p><button class="secondary-button" data-action="new-trade">＋ Add trade</button></div>`;
      return;
    }
    node.innerHTML = list.map(t => `<div class="recent-trade"><div class="trade-main"><div class="trade-dot ${t.side.toLowerCase()}">${t.side}</div><div class="trade-info"><strong>${esc(t.symbol)} · ${esc(t.status)}</strong><span>${esc(dateLabel(t.date))}</span></div></div><div class="trade-result"><strong class="${Number(t.pl)>0?"positive":Number(t.pl)<0?"negative":""}">${t.status === "CLOSED" ? money(t.pl,true) : "OPEN"}</strong><small>${t.side} · Entry ${formatPrice(t.entry)}</small></div></div>`).join("");
  }
  function drawChart() {
    const canvas = $("#equityChart"), empty = $("#chartEmpty");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width*dpr)); canvas.height = Math.max(1, Math.round(rect.height*dpr));
    const ctx = canvas.getContext("2d"); ctx.scale(dpr,dpr);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0,0,w,h);
    let data = closed().slice().sort((a,b) => new Date(a.date)-new Date(b.date));
    if (chartPeriod !== "all") {
      const days = Number(chartPeriod), cutoff = Date.now() - days*86400000;
      data = data.filter(t => new Date(t.date).getTime() >= cutoff);
    }
    empty.classList.toggle("hidden", data.length > 0);
    if (!data.length || w < 10 || h < 10) return;
    const vals = [0]; data.forEach(t => vals.push(vals[vals.length-1] + Number(t.pl || 0)));
    const min = Math.min(...vals), max = Math.max(...vals), span = max-min || 1;
    const pad = {l:18,r:18,t:24,b:25}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
    ctx.strokeStyle="rgba(255,255,255,.07)";ctx.lineWidth=1;
    for(let i=0;i<4;i++){const y=pad.t+ch*i/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();}
    const points=vals.map((v,i)=>({x:pad.l+cw*(i/Math.max(1,vals.length-1)),y:pad.t+ch-(v-min)/span*ch}));
    const grad=ctx.createLinearGradient(0,pad.t,0,h-pad.b);grad.addColorStop(0,"rgba(91,146,152,.30)");grad.addColorStop(1,"rgba(91,146,152,0)");
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(points[points.length-1].x,h-pad.b);ctx.lineTo(points[0].x,h-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle="#8fc4c8";ctx.lineWidth=2;ctx.lineJoin="round";ctx.stroke();
    const last=points[points.length-1];ctx.beginPath();ctx.arc(last.x,last.y,3.5,0,Math.PI*2);ctx.fillStyle="#F0EDEE";ctx.fill();
    ctx.font="10px Lexend, sans-serif";ctx.fillStyle="#8994a9";ctx.fillText(money(max),pad.l,pad.t-8);ctx.fillText(money(min),pad.l,h-6);
  }
  function exportJSON() {
    downloadFile("maetrade-backup.json", JSON.stringify({app:"MAETRADE",version:1,exportedAt:new Date().toISOString(),trades},null,2), "application/json");
    toast("Backup JSON berhasil diunduh.");
  }
  function exportCSV() {
    const headers=["id","symbol","side","entry","sl","tp","status","pl","date","notes"];
    const lines=[headers.join(","),...trades.map(t=>headers.map(k=>`"${String(t[k] ?? "").replace(/"/g,'""')}"`).join(","))];
    downloadFile("maetrade-trades.csv", "\uFEFF"+lines.join("\r\n"), "text/csv;charset=utf-8");
    toast("CSV berhasil diunduh.");
  }
  function downloadFile(name, content, type) {
    const blob = new Blob([content],{type}), url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  function handleSubmit(event) {
    event.preventDefault();
    const f = event.currentTarget, fd = new FormData(f);
    const symbol = String(fd.get("symbol")||"").trim().toUpperCase();
    const entry = Number(fd.get("entry"));
    const status = String(fd.get("status"));
    const plRaw = String(fd.get("pl") ?? "").trim();
    const pl = plRaw === "" ? 0 : Number(plRaw);
    if (!symbol || !Number.isFinite(entry) || entry <= 0) { toast("Isi symbol dan entry price yang valid."); return; }
    if (status === "CLOSED" && plRaw !== "" && !Number.isFinite(pl)) { toast("Nilai P/L tidak valid."); return; }
    const t = {id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),symbol,side:selectedSide,entry,sl:fd.get("sl") ? Number(fd.get("sl")) : "",tp:fd.get("tp") ? Number(fd.get("tp")) : "",status,pl:status==="CLOSED"?pl:0,date:new Date(String(fd.get("date"))).toISOString(),notes:String(fd.get("notes")||"").trim(),createdAt:new Date().toISOString()};
    trades.push(t);saveTrades();render();closeModal();toast("Trade berhasil disimpan.");
  }
  function deleteTrade(id) {
    const t = trades.find(x=>x.id===id);
    if (!t || !confirm(`Hapus trade ${t.symbol} (${t.side})? Tindakan ini tidak bisa dibatalkan.`)) return;
    trades=trades.filter(x=>x.id!==id);saveTrades();render();toast("Trade dihapus.");
  }
  function closeTrade(id) {
    const t=trades.find(x=>x.id===id);if(!t)return;
    const raw=prompt(`Masukkan net P/L dalam Rupiah untuk ${t.symbol} (contoh: 15000 atau -10000):`);if(raw===null)return;
    const pl=Number(raw);if(raw.trim()===""||!Number.isFinite(pl)){toast("Masukkan angka P/L yang valid.");return;}
    t.pl=pl;t.status="CLOSED";t.closedAt=new Date().toISOString();saveTrades();render();toast("Trade ditutup dan P/L disimpan.");
  }

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-page]");
    if (nav) { showPage(nav.dataset.page); return; }
    const action = event.target.closest("[data-action]");
    if (action?.dataset.action === "new-trade") { openModal(); return; }
    const goto = event.target.closest("[data-goto]");
    if (goto) { showPage(goto.dataset.goto); return; }
    const side = event.target.closest("[data-side]");
    if (side) { selectedSide=side.dataset.side;$("#tradeForm").elements.side.value=selectedSide;$$(".side-option").forEach(b=>b.classList.toggle("active",b===side));return; }
    const del = event.target.closest("[data-delete]");
    if (del) { deleteTrade(del.dataset.delete);return; }
    const close = event.target.closest("[data-close]");
    if (close) { closeTrade(close.dataset.close);return; }
    const filter = event.target.closest("[data-filter]");
    if (filter) {activeFilter=filter.dataset.filter;$$("[data-filter]").forEach(b=>b.classList.toggle("active",b===filter));renderRows("#tradeRows",activeFilter);return;}
    const period = event.target.closest("[data-period]");
    if (period) {chartPeriod=period.dataset.period;$$("[data-period]").forEach(b=>b.classList.toggle("active",b===period));drawChart();return;}
    const symbol = event.target.closest("[data-symbol]");
    if (symbol) {openModal();$("#tradeForm").elements.symbol.value=symbol.dataset.symbol;return;}
  });
  $("#tradeForm").addEventListener("submit",handleSubmit);
  $("#closeModal").addEventListener("click",closeModal);
  $("#cancelModal").addEventListener("click",closeModal);
  $("#tradeModal").addEventListener("click",e=>{if(e.target.id==="tradeModal")closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="n"){e.preventDefault();openModal();}});
  $("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#exportBtn").addEventListener("click",exportJSON);
  $("#historyExport").addEventListener("click",exportCSV);
  $("#reportExport").addEventListener("click",exportJSON);
  $("#settingsExport").addEventListener("click",exportJSON);
  $("#clearData").addEventListener("click",()=>{if(confirm("Yakin hapus SEMUA data trade yang tersimpan di browser ini? Export backup dulu jika diperlukan.")){trades=[];saveTrades();render();toast("Semua data lokal telah dihapus.");}});
  $("#themeInfo").addEventListener("click",()=>toast("Data disimpan lokal di browser ini, bukan di server."));
  window.addEventListener("resize",()=>{if($("#page-dashboard").classList.contains("active-page"))drawChart();});
  render();
})();