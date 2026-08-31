const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#101112");
  tg.setBackgroundColor("#0f1011");
}

const pairName = document.getElementById("pairName");
const chartLabel = document.getElementById("chartLabel");
const price = document.getElementById("price");
const bigPrice = document.getElementById("bigPrice");
const result = document.getElementById("result");
const resultText = document.getElementById("resultText");
const resultTime = document.getElementById("resultTime");
const historyList = document.getElementById("historyList");

const demoPoints = [260,240,265,220,238,205,225,180,198,175,210,190,215,160,184,150,176,130,152,125,145,110,132,105,120,98,115,88,108,94,116,82,101,74,96,69,90,62,82,58,72,65,78,52,70,45,63,54,58,39,51,44,56,34,48,30,42,26,35,22];
document.getElementById("chartLine").setAttribute("points", demoPoints.map((y,i)=>`${i*(900/(demoPoints.length-1))},${y}`).join(" "));

document.querySelectorAll("#assets button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#assets button").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    const pair = btn.dataset.pair;
    const p = btn.dataset.price;
    pairName.textContent = pair;
    chartLabel.textContent = `${pair} · ${document.querySelector("#timeframes .active")?.textContent || "5m"}`;
    price.textContent = `${p} $`;
    bigPrice.textContent = `${p} $`;
    result.hidden = true;
  });
});

document.querySelectorAll("#durations button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#durations button").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

document.querySelectorAll("#timeframes button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#timeframes button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const pair = pairName.textContent;
    chartLabel.textContent = `${pair} · ${btn.textContent}`;
  });
});

document.getElementById("signalBtn").addEventListener("click", () => {
  const pair = pairName.textContent;
  const duration = document.querySelector("#durations .selected")?.textContent || "1m";
  const now = new Date();
  const time = now.toLocaleTimeString("ru-RU", {hour:"2-digit",minute:"2-digit",second:"2-digit"});

  result.hidden = false;
  resultText.textContent = `Тестовый результат для ${pair}, период ${duration}. Направление намеренно не показывается.`;
  resultTime.textContent = `Создано: ${time}`;

  const empty = historyList.querySelector(".empty");
  if (empty) empty.remove();

  const item = document.createElement("div");
  item.className = "history-item";
  item.innerHTML = `<span>${pair} · ${duration} · ДЕМО</span><span>${time}</span>`;
  historyList.prepend(item);
});
