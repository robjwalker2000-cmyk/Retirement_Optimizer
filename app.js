const DEFAULTS = {
  currentAge: 42,
  retirementAge: 62,
  planningAge: 95,
  currentSavings: 380000,
  annualContribution: 24000,
  employerMatch: 6000,
  annualSpending: 85000,
  fixedIncome: 32000,
  growthRate: 6,
  inflationRate: 2.5,
  taxRate: 18,
};

const form = document.querySelector("#optimizerForm");
const chart = document.querySelector("#projectionChart");
const ctx = chart.getContext("2d");
const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const fields = Object.keys(DEFAULTS).reduce((all, key) => {
  all[key] = document.querySelector(`#${key}`);
  return all;
}, {});

function currency(value) {
  return moneyFormatter.format(Math.round(value));
}

function readInputs() {
  return Object.fromEntries(
    Object.keys(DEFAULTS).map((key) => [key, Number(fields[key].value)])
  );
}

function project(inputs) {
  const years = [];
  let balance = inputs.currentSavings;
  const growth = inputs.growthRate / 100;
  const inflation = inputs.inflationRate / 100;
  const taxMultiplier = 1 - inputs.taxRate / 100;
  let retirementBalance = 0;
  let firstPortfolioNeed = 0;

  for (let age = inputs.currentAge; age <= inputs.planningAge; age += 1) {
    const retired = age >= inputs.retirementAge;
    const yearsFromNow = age - inputs.currentAge;
    const spending = inputs.annualSpending * Math.pow(1 + inflation, yearsFromNow);
    const fixedIncome = retired
      ? inputs.fixedIncome * Math.pow(1 + inflation * 0.45, Math.max(0, age - inputs.retirementAge))
      : 0;
    const portfolioNeed = retired ? Math.max(0, (spending - fixedIncome) / taxMultiplier) : 0;
    const contribution = retired ? 0 : inputs.annualContribution + inputs.employerMatch;

    if (age === inputs.retirementAge) {
      retirementBalance = balance;
      firstPortfolioNeed = portfolioNeed;
    }

    years.push({
      age,
      balance: Math.max(0, balance),
      spendingDraw: portfolioNeed,
      retired,
    });

    balance = retired ? (balance - portfolioNeed) * (1 + growth) : (balance + contribution) * (1 + growth);
  }

  return {
    years,
    retirementBalance,
    firstPortfolioNeed,
    finalBalance: years.at(-1).balance,
    withdrawalRate: retirementBalance > 0 ? firstPortfolioNeed / retirementBalance : 0,
  };
}

function drawChart(data) {
  const width = chart.width;
  const height = chart.height;
  const pad = { top: 24, right: 28, bottom: 44, left: 72 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const maxValue = Math.max(...data.years.map((year) => Math.max(year.balance, year.spendingDraw)), 100000);
  const yMax = maxValue * 1.12;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#d8ded8";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#65706c";
  ctx.font = "20px Inter, system-ui, sans-serif";

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (plotHeight / 4) * i;
    const value = yMax - (yMax / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(currency(value).replace(".00", ""), 10, y + 7);
  }

  const point = (year, value) => {
    const x = pad.left + ((year.age - data.years[0].age) / (data.years.at(-1).age - data.years[0].age)) * plotWidth;
    const y = pad.top + plotHeight - (value / yMax) * plotHeight;
    return { x, y };
  };

  ctx.strokeStyle = "#2f6f88";
  ctx.lineWidth = 5;
  ctx.beginPath();
  data.years.forEach((year, index) => {
    const { x, y } = point(year, year.balance);
    index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = "#c9832e";
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  data.years.forEach((year, index) => {
    const { x, y } = point(year, year.spendingDraw);
    index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#65706c";
  ctx.font = "22px Inter, system-ui, sans-serif";
  const tickAges = [data.years[0].age, Math.floor((data.years[0].age + data.years.at(-1).age) / 2), data.years.at(-1).age];
  tickAges.forEach((age) => {
    const { x } = point({ age }, 0);
    ctx.fillText(String(age), x - 10, height - 15);
  });
}

function updateInsights(data, inputs) {
  const pill = document.querySelector("#readinessPill");
  const message = document.querySelector("#optimizerMessage");
  const levers = document.querySelector("#leversList");
  const rate = data.withdrawalRate;
  const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
  const shortfall = data.finalBalance <= 0;

  pill.classList.remove("warning", "danger");
  if (rate <= 0.04 && !shortfall) {
    pill.textContent = "On track";
    message.textContent = `Your plan reaches retirement with ${currency(data.retirementBalance)} and keeps a positive balance through age ${inputs.planningAge}. The starting withdrawal rate is within a commonly used planning range.`;
  } else if (rate <= 0.055 && !shortfall) {
    pill.textContent = "Watch closely";
    pill.classList.add("warning");
    message.textContent = `The projection survives the planning window, but the initial withdrawal rate is ${Math.round(rate * 1000) / 10}%. A small improvement now could create a much wider margin later.`;
  } else {
    pill.textContent = "Needs adjustment";
    pill.classList.add("danger");
    message.textContent = `The plan is under pressure. The first retirement year needs ${currency(data.firstPortfolioNeed)} from the portfolio, which is high relative to the projected balance.`;
  }

  const extraContribution = Math.max(0, Math.ceil((data.firstPortfolioNeed / 0.04 - data.retirementBalance) / Math.max(1, yearsToRetirement) / 500) * 500);
  const spendReduction = Math.max(0, Math.ceil((data.firstPortfolioNeed - data.retirementBalance * 0.04) * (1 - inputs.taxRate / 100) / 1000) * 1000);

  levers.innerHTML = "";
  [
    `Retire at ${inputs.retirementAge + 1} to add one more year of contributions and one fewer year of withdrawals.`,
    extraContribution > 0
      ? `Add about ${currency(extraContribution)} per year before retirement to target a 4% starting withdrawal.`
      : "Current contributions are doing useful work; protect them before adding new spending.",
    spendReduction > 0
      ? `Trim desired retirement spending by roughly ${currency(spendReduction)} per year to reduce portfolio pressure.`
      : "Spending is already aligned with the projected portfolio range.",
  ].forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    levers.appendChild(li);
  });
}

function render() {
  const inputs = readInputs();
  fields.retirementAge.value = Math.max(inputs.currentAge + 1, inputs.retirementAge);
  fields.planningAge.value = Math.max(Number(fields.retirementAge.value) + 1, inputs.planningAge);
  const cleanInputs = readInputs();
  const data = project(cleanInputs);

  document.querySelector("#growthRateValue").textContent = `${cleanInputs.growthRate.toFixed(1)}%`;
  document.querySelector("#inflationRateValue").textContent = `${cleanInputs.inflationRate.toFixed(1)}%`;
  document.querySelector("#taxRateValue").textContent = `${cleanInputs.taxRate}%`;
  document.querySelector("#retirementBalance").textContent = currency(data.retirementBalance);
  document.querySelector("#portfolioNeed").textContent = currency(data.firstPortfolioNeed);
  document.querySelector("#withdrawalRate").textContent = `${(data.withdrawalRate * 100).toFixed(1)}%`;
  document.querySelector("#finalBalance").textContent = currency(data.finalBalance);

  drawChart(data);
  updateInsights(data, cleanInputs);
}

form.addEventListener("input", render);
document.querySelector("#resetButton").addEventListener("click", () => {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    fields[key].value = value;
  });
  render();
});

render();
