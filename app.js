(() => {
  "use strict";

  const STORAGE = {
    trades: "maetrade_trades_v1",
    cashflow: "maetrade_cashflow_v1",
    settings: "maetrade_settings_v1",
    analysis: "maetrade_analysis_v1",
    theme: "maetrade_theme_v1"
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  const defaultSettings = { accountName: "Demo Account", currency: "USD", balance: 10000, riskPct: 1 };
  const demoTrades = [
    {id:"t_001",symbol:"XAUUSD",direction:"BUY",volume:.01,account:"Demo Account",entry:3500,sl:3490,tp:3520,entryTime:"2026-09-28T10:15",exit:3513,exitTime:"2026-09-28T11:40",strategy:"SMC",timeframe:"15m",bias:"Bullish",setup:"BOS + FVG",session:"London",emotion:"Calm",confidence:4,reason:"Bullish displacement after liquidity sweep.",notes:"Waited for confirmation. Clean execution.",screenshot:"",status:"CLOSED",createdAt:"2026-09-28T11:40:00Z"},
    {id:"t_002",symbol:"XAUUSD",direction:"SELL",volume:.01,account:"Demo Account",entry:3518,sl:3527,tp:3500,entryTime:"2026-09-29T14:20",exit:3526,exitTime:"2026-09-29T15:05",strategy:"SMC",timeframe:"15m",bias:"Bearish",setup:"CHoCH",session:"New York",emotion:"FOMO",confidence:3,reason:"Entered before full confirmation.",notes:"Lesson: no chase after impulse.",screenshot:"",status:"CLOSED",createdAt:"2026-09-29T15:05:00Z"},
    {id:"t_003",symbol:"EURUSD",direction:"BUY",volume:.02,account:"Demo Account",entry:1.171,sl:1.169,tp:1.175,entryTime:"2026-10-03T09:35",strategy:"Structure",timeframe:"1H",bias:"Bullish",setup:"Demand retest",session:"London",emotion:"Confident",confidence:4,reason:"Retest into higher-timeframe demand.",notes:"Currently open; monitor invalidation.",screenshot:"",status:"OPEN",createdAt:"2026-10-03T09:35:00Z"}
  ];
  const demoCash = [
    {id:"c_001",date:"2026-09-01",type:"IN",amount:10000,category:"Initial Capital",description:"Starting balance"},
    {id:"c_002",date:"2026-09-30",type:"IN",amount:500,category:"Deposit",description:"Additional trading capital"}
  ];

  let state = {
    trades: readJSON(STORAGE.trades, demoTrades),
    cashflow: readJSON(STORAGE.cashflow, demoCash),
    settings: readJSON(STORAGE.settings, defaultSettings),
    analysis: readJSON(STORAGE.analysis, null),
    theme: localStorage.getItem(STORAGE.theme) || "dark"
  };
  let currentStep = 1;
  let editingTradeId = null;
  let pendingScreenshot = "";

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return structuredClone ? structuredClone(fallback) : JSON.parse(JSON.stringify(fallback));
      return JSON.parse(raw);
    } catch { return fallback; }
  }
  function saveState() {
    localStorage.setItem(STORAGE.trades, JSON.stringify(state.trades));
    localStorage.setItem(STORAGE.cashflow, JSON.stringify(state.cashflow));
    localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE.analysis, JSON.stringify(state.analysis));
    localStorage.setItem(STORAGE.theme, state.theme);
  }
  function uid(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
  function money(value) {
    const n = Number(value || 0);
    const sign = n < 0 ? "-" : "";
    return `${sign}$${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  }
  function shortMoney(value) {
    const n = Number(value||0), a = Math.abs(n);
    if (a >= 1000000) return `${n<0?"-":""}$${(a/1e6).toFixed(2)}m`;
    if (a >= 1000) return `${n<0?"-":""}$${(a/1000).toFixed(2)}k`;
    return money(n);
  }
  function esc(v="") {
    return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function fmtDate(v) {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v).slice(0,10);
    return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
  }
  function directionBadge(direction) {
    return direction === "BUY"
      ? '<span class="badge green">BUY</span>'
      : '<span class="badge red">SELL</span>';
  }
  function statusBadge(status) {
    const cls = status === "CLOSED" ? "neutral" : status === "OPEN" ? "gold" : "red";
    return `<span class="badge ${cls}">${esc(status)}</span>`;
  }
  function calcTradePnl(t) {
    if (t.status !== "CLOSED" || t.exit === "" || t.exit == null) return 0;
    const diff = Number(t.exit) - Number(t.entry);
    const sign = t.direction === "SELL" ? -1 : 1;
    // Educational frontend placeholder: price differential * volume * 100.
    return diff * sign * Number(t.volume || 0) * 100;
  }
  function calcRisk(t) {
    if (t.entry === "" || t.sl === "" || t.entry == null || t.sl == null) return 0;
    return Math.abs(Number(t.entry)-Number(t.sl)) * Number(t.volume || 0) * 100;
  }
  function calcReward(t) {
    if (t.entry === "" || t.tp === "" || t.entry == null || t.tp == null) return 0;
    return Math.abs(Number(t.tp)-Number(t.entry)) * Number(t.volume || 0) * 100;
  }
  function calcR(t) {
    const risk = calcRisk(t), pnl = calcTradePnl(t);
    return risk ? pnl/risk : 0;
  }
  function metrics() {
    const closed = state.trades.filter(t => t.status === "CLOSED");
    const pnls = closed.map(calcTradePnl);
    const wins = pnls.filter(v=>v>0), losses = pnls.filter(v=>v<0);
    const grossProfit = wins.reduce((a,b)=>a+b,0);
    const grossLoss = Math.abs(losses.reduce((a,b)=>a+b,0));
    const net = pnls.reduce((a,b)=>a+b,0);
    const avgWin = wins.length ? grossProfit/wins.length : 0;
    const avgLoss = losses.length ? -grossLoss/losses.length : 0;
    const winRate = closed.length ? wins.length/closed.length : 0;
    const expectancy = (winRate*avgWin) - ((1-winRate)*Math.abs(avgLoss));
    const avgR = closed.length ? closed.map(calcR).reduce((a,b)=>a+b,0)/closed.length : 0;

    let equity = 0, peak = 0, maxDD = 0;
    [...closed].sort((a,b)=>new Date(a.exitTime||a.createdAt)-new Date(b.exitTime||b.createdAt)).forEach(t=>{
      equity += calcTradePnl(t);
      peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak-equity);
    });
    return {closed,wins,losses,grossProfit,grossLoss,net,avgWin,avgLoss,winRate,expectancy,avgR,maxDD,pf:grossLoss?grossProfit/grossLoss:null};
  }

  function renderDashboard() {
    const m = metrics();
    $("kpiNetPnl").textContent = money(m.net);
    $("kpiNetPnl").className = "kpi-value " + (m.net > 0 ? "pnl pos" : m.net < 0 ? "pnl neg" : "");
    $("kpiNetPnlFoot").textContent = m.closed.length ? `${m.wins.length} winning · ${m.losses.length} losing` : "No closed trades yet";
    $("kpiWinRate").textContent = `${(m.winRate*100).toFixed(1)}%`;
    $("kpiWinRateFoot").textContent = `${m.wins.length} wins / ${m.closed.length} closed`;
    $("kpiProfitFactor").textContent = m.pf == null ? "—" : m.pf.toFixed(2);
    $("kpiTotalTrades").textContent = state.trades.length;
    $("kpiTotalTradesFoot").textContent = `Open ${state.trades.filter(t=>t.status==="OPEN").length} · Closed ${m.closed.length}`;
    $("statAvgWin").textContent = money(m.avgWin);
    $("statAvgLoss").textContent = money(m.avgLoss);
    $("statExpectancy").textContent = money(m.expectancy);
    $("statAvgR").textContent = `${m.avgR.toFixed(2)}R`;
    $("statDrawdown").textContent = money(m.maxDD);
    $("winsCount").textContent = m.wins.length;
    $("lossesCount").textContent = m.losses.length;
    const total = Math.max(1, m.wins.length+m.losses.length);
    $("winBar").style.width = `${m.wins.length/total*100}%`;
    $("lossBar").style.width = `${m.losses.length/total*100}%`;
    renderRecentTrades();
    renderEquityChart();
    renderCashflow();
    renderHistory();
    renderJournal();
    renderSideBalance();
  }

  function renderRecentTrades() {
    const body = $("recentTradesBody"), empty = $("recentEmpty");
    const arr = [...state.trades].sort((a,b)=>new Date(b.createdAt||b.entryTime)-new Date(a.createdAt||a.entryTime)).slice(0,7);
    body.innerHTML = arr.map(t => {
      const pnl = calcTradePnl(t);
      return `<tr>
        <td><strong>${esc(t.symbol)}</strong></td>
        <td>${directionBadge(t.direction)}</td>
        <td>${esc(t.entry)}</td>
        <td>${t.status==="CLOSED"?esc(t.exit):"—"}</td>
        <td class="pnl ${pnl>=0?"pos":"neg"}">${t.status==="CLOSED"?money(pnl):"Open"}</td>
        <td>${statusBadge(t.status)}</td>
        <td><button class="text-btn" data-action="edit" data-id="${esc(t.id)}">Open</button></td>
      </tr>`;
    }).join("");
    empty.classList.toggle("hidden", arr.length>0);
  }

  function renderHistory() {
    const search = ($("historySearch")?.value || "").toLowerCase().trim();
    const status = $("historyStatus")?.value || "all";
    const direction = $("historyDirection")?.value || "all";
    const arr = state.trades.filter(t => {
      const hay = [t.symbol,t.strategy,t.setup,t.account].join(" ").toLowerCase();
      return (!search || hay.includes(search)) && (status==="all" || t.status===status) && (direction==="all" || t.direction===direction);
    }).sort((a,b)=>new Date(b.createdAt||b.entryTime)-new Date(a.createdAt||a.entryTime));
    const body = $("historyBody"), empty = $("historyEmpty");
    body.innerHTML = arr.map(t=>{
      const pnl=calcTradePnl(t);
      return `<tr>
        <td>${fmtDate(t.exitTime||t.entryTime)}</td><td><strong>${esc(t.symbol)}</strong></td><td>${directionBadge(t.direction)}</td>
        <td>${esc(t.entry)}</td><td>${esc(t.sl)}</td><td>${esc(t.tp)}</td>
        <td class="pnl ${pnl>=0?"pos":"neg"}">${t.status==="CLOSED"?money(pnl):"—"}</td><td>${statusBadge(t.status)}</td>
        <td><button class="text-btn" data-action="edit" data-id="${esc(t.id)}">Edit</button></td>
      </tr>`;
    }).join("");
    empty.classList.toggle("hidden", arr.length>0);
  }

  function renderJournal() {
    const grid = $("journalGrid"), empty = $("journalEmpty");
    const arr = [...state.trades].filter(t=>t.reason || t.notes).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    grid.innerHTML = arr.map(t=>{
      const pnl=calcTradePnl(t);
      return `<article class="journal-card">
        <div class="journal-tags">${directionBadge(t.direction)} ${statusBadge(t.status)} <span class="badge neutral">${esc(t.timeframe||"—")}</span></div>
        <h3>${esc(t.symbol)} · ${esc(t.setup||"Unspecified setup")}</h3>
        <div class="muted">${esc(t.strategy||"No strategy")} · ${esc(t.session||"No session")} · Confidence ${esc(t.confidence||"—")}/5</div>
        <p class="journal-note">${esc(t.notes || t.reason || "No journal notes.")}</p>
        <div class="journal-note"><strong class="${pnl>=0?"pnl pos":"pnl neg"}">${t.status==="CLOSED"?money(pnl):"OPEN"}</strong> · ${fmtDate(t.createdAt||t.entryTime)}</div>
      </article>`;
    }).join("");
    empty.classList.toggle("hidden", arr.length>0);
  }

  function renderCashflow() {
    const arr = [...state.cashflow].sort((a,b)=>new Date(b.date)-new Date(a.date));
    $("cashflowBody").innerHTML = arr.map(c => `<tr>
      <td>${fmtDate(c.date)}</td>
      <td><span class="badge ${c.type==="IN"?"green":"red"}">${esc(c.type)}</span></td>
      <td class="pnl ${c.type==="IN"?"pos":"neg"}">${money(c.amount)}</td>
      <td>${esc(c.category)}</td><td>${esc(c.description)}</td>
      <td><button class="text-btn" data-cash-action="delete" data-id="${esc(c.id)}">Delete</button></td>
    </tr>`).join("");
    $("cashflowEmpty").classList.toggle("hidden", arr.length>0);
    const initial = state.cashflow.filter(c=>c.category==="Initial Capital" && c.type==="IN").reduce((a,c)=>a+Number(c.amount||0),0);
    const ins = state.cashflow.filter(c=>c.type==="IN").reduce((a,c)=>a+Number(c.amount||0),0);
    const outs = state.cashflow.filter(c=>c.type==="OUT").reduce((a,c)=>a+Number(c.amount||0),0);
    $("cashInitial").textContent = money(initial);
    $("cashIn").textContent = money(ins);
    $("cashOut").textContent = money(outs);
    $("cashNet").textContent = money(ins-outs);
  }

  function renderSideBalance() {
    const m=metrics();
    const ins=state.cashflow.filter(c=>c.type==="IN").reduce((a,c)=>a+Number(c.amount||0),0);
    const outs=state.cashflow.filter(c=>c.type==="OUT").reduce((a,c)=>a+Number(c.amount||0),0);
    $("sideBalance").textContent = money(ins-outs+m.net);
  }

  function renderEquityChart() {
    const svg=$("equityChart"), empty=$("equityEmpty");
    const closed=[...state.trades].filter(t=>t.status==="CLOSED").sort((a,b)=>new Date(a.exitTime||a.createdAt)-new Date(b.exitTime||b.createdAt));
    if(!closed.length){
      svg.innerHTML=""; empty.classList.remove("hidden"); return;
    }
    empty.classList.add("hidden");
    let running=0, values=[0];
    closed.forEach(t=>{running += calcTradePnl(t); values.push(running)});
    const min=Math.min(...values), max=Math.max(...values), range=Math.max(1,max-min);
    const pad=26, w=800, h=300;
    const pts=values.map((v,i)=>{
      const x=pad+(i/(values.length-1||1))*(w-pad*2);
      const y=pad+(1-(v-min)/range)*(h-pad*2);
      return `${x},${y}`;
    }).join(" ");
    const area=`${pad},${h-pad} ${pts} ${w-pad},${h-pad}`;
    svg.innerHTML=`
      <defs>
        <linearGradient id="fillGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#91a8ff" stop-opacity=".22"/>
          <stop offset="100%" stop-color="#91a8ff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="${pad}" y1="${h/2}" x2="${w-pad}" y2="${h/2}" stroke="currentColor" opacity=".12"/>
      <polygon points="${area}" fill="url(#fillGrad)"/>
      <polyline points="${pts}" fill="none" stroke="#91a8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${values.map((v,i)=>{
        const [x,y]=pts.split(" ")[i].split(",");
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="#121923" stroke="#91a8ff" stroke-width="2"/>`;
      }).join("")}
      <text x="${pad}" y="${h-5}" fill="currentColor" opacity=".45" font-size="10">0</text>
      <text x="${w-pad}" y="${h-5}" text-anchor="end" fill="currentColor" opacity=".45" font-size="10">Closed trades</text>`;
  }

  function go(route) {
    $$(".route").forEach(s=>s.classList.toggle("hidden",s.dataset.page!==route));
    $$(".nav-item,[data-route]").forEach(b=>{
      if(b.dataset.route) b.classList.toggle("active",b.dataset.route===route);
    });
    const labels={dashboard:"Dashboard",technical:"Technical Analysis",journal:"Trading Journal",history:"Trade History",cashflow:"Cashflow",reports:"Reports",settings:"Settings"};
    $("pageTitle").textContent=labels[route]||"Dashboard";
    $$(".mobile-nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===route));
    closeSidebar();
    window.scrollTo({top:0,behavior:"smooth"});
    renderDashboard();
  }

  function openTradeModal(id=null) {
    editingTradeId=id;
    $("tradeModalTitle").textContent=id?"Edit Trade":"New Trade";
    $("tradeForm").reset();
    pendingScreenshot="";
    $("tradeId").value="";
    $("tradeAccount").value=state.settings.accountName || "Demo Account";
    $("tradeConfidence").value=3;
    $("screenshotPreview").innerHTML="";
    $("screenshotPreview").classList.add("hidden");
    $("formStatus").textContent="";
    currentStep=1; updateStepUI();
    if(id){
      const t=state.trades.find(x=>x.id===id);
      if(!t)return;
      $("tradeId").value=t.id;
      [["tradeSymbol","symbol"],["tradeDirection","direction"],["tradeVolume","volume"],["tradeAccount","account"],["tradeEntry","entry"],["tradeSL","sl"],["tradeTP","tp"],["tradeExit","exit"],["tradeEntryTime","entryTime"],["tradeExitTime","exitTime"],["tradeStrategy","strategy"],["tradeTimeframe","timeframe"],["tradeBias","bias"],["tradeSetup","setup"],["tradeSession","session"],["tradeEmotion","emotion"],["tradeConfidence","confidence"],["tradeReason","reason"],["tradeNotes","notes"]].forEach(([a,b])=>{
        if(t[b]!=null && $(a)) $(a).value=t[b];
      });
      if(t.screenshot){
        pendingScreenshot=t.screenshot;
        $("screenshotPreview").innerHTML=`<img src="${t.screenshot}" alt="Trade screenshot preview">`;
        $("screenshotPreview").classList.remove("hidden");
      }
    }
    updateRiskPreview();
    $("modalBackdrop").classList.remove("hidden");
    setTimeout(()=>$("tradeSymbol").focus(),50);
  }
  function closeTradeModal(){ $("modalBackdrop").classList.add("hidden"); editingTradeId=null; }
  function updateStepUI(){
    $$(".step").forEach(b=>b.classList.toggle("active",Number(b.dataset.step)===currentStep));
    $$(".trade-step").forEach(s=>s.classList.toggle("active",Number(s.dataset.stepPanel)===currentStep));
    $("prevStepBtn").disabled=currentStep===1;
    $("nextStepBtn").classList.toggle("hidden",currentStep===4);
    $("saveTradeBtn").classList.toggle("hidden",currentStep!==4);
    $("formStatus").textContent=`Step ${currentStep} of 4`;
  }
  function validateStep(step){
    const requiredByStep={
      1:["tradeSymbol","tradeVolume","tradeAccount","tradeEntry","tradeEntryTime"],
      2:["tradeSL","tradeTP"],
      3:[]
    };
    for(const id of requiredByStep[step]||[]){
      const el=$(id);
      if(!el.value){el.focus();$("formStatus").textContent=`Please complete ${el.previousElementSibling?.textContent || id}.`;return false;}
    }
    if(step===2){
      const dir=$("tradeDirection").value, entry=Number($("tradeEntry").value), sl=Number($("tradeSL").value), tp=Number($("tradeTP").value);
      if(dir==="BUY" && !(sl<entry && tp>entry)){ $("formStatus").textContent="For BUY: SL must be below entry and TP above entry."; return false; }
      if(dir==="SELL" && !(sl>entry && tp<entry)){ $("formStatus").textContent="For SELL: SL must be above entry and TP below entry."; return false; }
    }
    return true;
  }
  function collectTrade(){
    const exitVal=$("tradeExit").value;
    const t={
      id:editingTradeId || uid("t"),
      symbol:$("tradeSymbol").value.trim().toUpperCase(),
      direction:$("tradeDirection").value,
      volume:Number($("tradeVolume").value),
      account:$("tradeAccount").value.trim(),
      entry:Number($("tradeEntry").value),
      sl:Number($("tradeSL").value),
      tp:Number($("tradeTP").value),
      exit:exitVal===""?"":Number(exitVal),
      entryTime:$("tradeEntryTime").value,
      exitTime:$("tradeExitTime").value || "",
      strategy:$("tradeStrategy").value.trim(),
      timeframe:$("tradeTimeframe").value,
      bias:$("tradeBias").value,
      setup:$("tradeSetup").value.trim(),
      session:$("tradeSession").value,
      emotion:$("tradeEmotion").value,
      confidence:Number($("tradeConfidence").value||3),
      reason:$("tradeReason").value.trim(),
      notes:$("tradeNotes").value.trim(),
      screenshot:pendingScreenshot,
      status:exitVal!=="" ? "CLOSED" : "OPEN",
      createdAt:editingTradeId ? (state.trades.find(x=>x.id===editingTradeId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };
    return t;
  }

  function saveTrade(e){
    e.preventDefault();
    if(!validateStep(4) || !validateStep(2) || !validateStep(1)) return;
    const trade=collectTrade();
    if(editingTradeId) state.trades=state.trades.map(t=>t.id===editingTradeId?trade:t);
    else state.trades.unshift(trade);
    saveState();
    closeTradeModal();
    renderDashboard();
    toast(editingTradeId?"Trade updated":"Trade saved successfully");
    go("dashboard");
  }

  function updateRiskPreview(){
    const entry=Number($("tradeEntry").value||0), sl=Number($("tradeSL").value||0), tp=Number($("tradeTP").value||0), vol=Number($("tradeVolume").value||0);
    const risk=Math.abs(entry-sl)*vol*100, reward=Math.abs(tp-entry)*vol*100;
    $("riskAmount").textContent=money(risk);$("rewardAmount").textContent=money(reward);
    $("plannedRR").textContent=risk?(reward/risk).toFixed(2):"0.00";
  }

  function attachScreenshot(file){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{pendingScreenshot=reader.result;$("screenshotPreview").innerHTML=`<img src="${reader.result}" alt="Trade screenshot preview">`;$("screenshotPreview").classList.remove("hidden");toast("Screenshot attached locally");};
    reader.readAsDataURL(file);
  }

  function addCashflow(){
    const date=prompt("Date (YYYY-MM-DD):",new Date().toISOString().slice(0,10)); if(!date)return;
    const type=(prompt("Type: IN or OUT","IN")||"").toUpperCase(); if(!["IN","OUT"].includes(type)){toast("Use IN or OUT");return;}
    const amount=Number(prompt("Amount:","500")); if(!Number.isFinite(amount)||amount<=0){toast("Invalid amount");return;}
    const category=prompt("Category:","Deposit")||"General";
    const description=prompt("Description:","")||"";
    state.cashflow.unshift({id:uid("c"),date,type,amount,category,description});
    saveState();renderDashboard();toast("Cashflow added");
  }

  function deleteCashflow(id){
    if(!confirm("Delete this cashflow record?"))return;
    state.cashflow=state.cashflow.filter(c=>c.id!==id);saveState();renderDashboard();toast("Cashflow deleted");
  }

  function generateReport(type){
    const m=metrics();
    const closed=m.closed;
    let title="", body="";
    if(type==="monthly") title="Monthly Review";
    if(type==="strategy"){
      const map={};closed.forEach(t=>{const k=t.strategy||"Unspecified";map[k]??=[];map[k].push(calcTradePnl(t));});
      body=Object.entries(map).sort((a,b)=>b[1].reduce((x,y)=>x+y,0)-a[1].reduce((x,y)=>x+y,0)).map(([k,v])=>`<div class="stat-list"><div><span>${esc(k)}</span><strong>${money(v.reduce((a,b)=>a+b,0))} · ${v.length} trades</strong></div></div>`).join("")||"<p class='muted'>No closed trades yet.</p>";
    } else if(type==="symbol"){
      const map={};closed.forEach(t=>{const k=t.symbol;map[k]??=[];map[k].push(calcTradePnl(t));});
      body=Object.entries(map).map(([k,v])=>`<div class="stat-list"><div><span>${esc(k)}</span><strong>${money(v.reduce((a,b)=>a+b,0))} · ${v.length} trades</strong></div></div>`).join("")||"<p class='muted'>No closed trades yet.</p>";
    } else if(type==="psychology"){
      const map={};closed.forEach(t=>{const k=t.emotion||"Unspecified";map[k]??=[];map[k].push(calcTradePnl(t));});
      body=Object.entries(map).sort((a,b)=>b[1].reduce((x,y)=>x+y,0)-a[1].reduce((x,y)=>x+y,0)).map(([k,v])=>`<div class="stat-list"><div><span>${esc(k)}</span><strong>${money(v.reduce((a,b)=>a+b,0))}</strong></div></div>`).join("")||"<p class='muted'>No psychology data yet.</p>";
    } else {
      body=`<div class="stat-list">
        <div><span>Net P&amp;L</span><strong>${money(m.net)}</strong></div>
        <div><span>Win Rate</span><strong>${(m.winRate*100).toFixed(1)}%</strong></div>
        <div><span>Profit Factor</span><strong>${m.pf==null?"—":m.pf.toFixed(2)}</strong></div>
        <div><span>Max Drawdown</span><strong>${money(m.maxDD)}</strong></div>
      </div>`;
    }
    $("reportOutput").innerHTML=`<div><div class="eyebrow">${esc(type)} report</div><h2>${esc(title||type)}</h2>${body}</div>`;
  }

  function exportData(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`maetrade-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup exported");
  }
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2200);}
  function openSidebar(){$("sidebar").classList.add("open");$("mobileBackdrop").classList.add("show")}
  function closeSidebar(){$("sidebar").classList.remove("open");$("mobileBackdrop").classList.remove("show")}
  function applyTheme(){
    document.documentElement.classList.toggle("light",state.theme==="light");
  }

  // navigation
  $$("[data-route]").forEach(btn=>btn.addEventListener("click",()=>go(btn.dataset.route)));
  $$("[data-route-jump]").forEach(btn=>btn.addEventListener("click",()=>go(btn.dataset.routeJump)));
  $("mobileMenuBtn").addEventListener("click",openSidebar);
  $("mobileBackdrop").addEventListener("click",closeSidebar);
  $("themeBtn").addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme();});
  $("notifyBtn").addEventListener("click",()=>toast("No new notifications"));
  $("profileBtn").addEventListener("click",()=>go("settings"));
  $("newTradeBtn").addEventListener("click",()=>openTradeModal());
  $("historyNewTradeBtn").addEventListener("click",()=>openTradeModal());
  $("mobileNewTrade").addEventListener("click",()=>openTradeModal());
  $("closeModalBtn").addEventListener("click",closeTradeModal);
  $("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeTradeModal();});
  $("prevStepBtn").addEventListener("click",()=>{if(currentStep>1){currentStep--;updateStepUI();}});
  $("nextStepBtn").addEventListener("click",()=>{if(validateStep(currentStep)){currentStep++;updateStepUI();}});
  $("tradeForm").addEventListener("submit",saveTrade);
  ["tradeEntry","tradeSL","tradeTP","tradeVolume"].forEach(id=>$(id).addEventListener("input",updateRiskPreview));
  $$(".step").forEach(btn=>btn.addEventListener("click",()=>{const target=Number(btn.dataset.step); if(target<currentStep){currentStep=target;updateStepUI();}}));

  $("screenshotBtn").addEventListener("click",()=>$("tradeScreenshot").click());
  $("screenshotDrop").addEventListener("click",e=>{if(e.target.id!=="screenshotBtn")$("tradeScreenshot").click();});
  $("tradeScreenshot").addEventListener("change",e=>attachScreenshot(e.target.files[0]));

  $("historySearch").addEventListener("input",renderHistory);
  $("historyStatus").addEventListener("change",renderHistory);
  $("historyDirection").addEventListener("change",renderHistory);

  $("cashflowAddBtn").addEventListener("click",addCashflow);
  $("exportBtn").addEventListener("click",exportData);
  $("resetDataBtn").addEventListener("click",()=>{
    if(!confirm("Reset all local MAETRADE demo data?"))return;
    Object.values(STORAGE).forEach(k=>localStorage.removeItem(k));
    location.reload();
  });
  $("saveSettingsBtn").addEventListener("click",()=>{
    state.settings.accountName=$("settingAccountName").value.trim()||"Demo Account";
    state.settings.currency=$("settingCurrency").value;
    state.settings.balance=Number($("settingBalance").value||0);
    state.settings.riskPct=Number($("settingRisk").value||1);
    saveState();$("tradeAccount").value=state.settings.accountName;renderDashboard();toast("Settings saved");
  });

  $("saveAnalysisBtn").addEventListener("click",()=>{
    state.analysis={
      symbol:$("taSymbol").value.trim().toUpperCase(),
      timeframe:$("taTimeframe").value,
      bias:$("taBias").value,
      session:$("taSession").value,
      setup:$("taSetup").value.trim(),
      notes:$("taNotes").value.trim(),
      updatedAt:new Date().toISOString()
    };
    saveState();toast("Technical analysis saved");
  });
  const continueToTrade=()=>{openTradeModal();if(state.analysis){$("tradeSymbol").value=state.analysis.symbol||"";$("tradeTimeframe").value=state.analysis.timeframe||"15m";$("tradeBias").value=state.analysis.bias||"Neutral";$("tradeSession").value=state.analysis.session||"London";$("tradeSetup").value=state.analysis.setup||"";$("tradeNotes").value=state.analysis.notes||"";}};
  $("analysisToTradeBtn").addEventListener("click",continueToTrade);
  $("analysisToTradeBtn2").addEventListener("click",continueToTrade);

  $("journalQuickBtn").addEventListener("click",()=>{
    const latest=[...state.trades].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
    if(latest)openTradeModal(latest.id); else openTradeModal();
  });

  $("globalSearch").addEventListener("input",e=>{
    const term=e.target.value.toLowerCase().trim();
    if(!term){return;}
    go("history");$("historySearch").value=term;renderHistory();
  });

  $$("[data-report]").forEach(btn=>btn.addEventListener("click",()=>generateReport(btn.dataset.report)));

  document.addEventListener("click",e=>{
    const btn=e.target.closest("[data-action='edit']");
    if(btn){openTradeModal(btn.dataset.id);}
    const c=e.target.closest("[data-cash-action='delete']");
    if(c){deleteCashflow(c.dataset.id);}
  });

  // Settings hydrate
  $("settingAccountName").value=state.settings.accountName;
  $("settingCurrency").value=state.settings.currency;
  $("settingBalance").value=state.settings.balance;
  $("settingRisk").value=state.settings.riskPct;
  if(state.analysis){
    $("taSymbol").value=state.analysis.symbol||"";
    $("taTimeframe").value=state.analysis.timeframe||"15m";
    $("taBias").value=state.analysis.bias||"Neutral";
    $("taSession").value=state.analysis.session||"London";
    $("taSetup").value=state.analysis.setup||"";
    $("taNotes").value=state.analysis.notes||"";
  }

  applyTheme();
  renderDashboard();
})();
