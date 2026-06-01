const DEFAULTS = {
  birthYear: 1964,
  currentYear: new Date().getFullYear(),
  planningAge: 95,
  lumpSumAllowance: 268275,
  taxFreeLumpSumsTaken: 0,
  taxFreeLumpSumsThisYear: 0,
  crystallisedPension: 200000,
  uncrystallisedPension: 180000,
  taxAllowance: 12570,
  higherRateThreshold: 50270,
  personalSavingsAllowance: 1000,
  basicTaxRate: 20,
  higherTaxRate: 40,
  bankBalance: 25000,
  bankInterestRate: 3.5,
  statePensionAmount: 12000,
  definedBenefitPayments: 20000,
  definedBenefitLumpSum: 0,
  targetEquivalentIncome: 80000,
  partnerWorkIncome: 0,
  partnerStatePension: 0,
  partnerWorkPension: 0,
  partnerSavings: 0,
  isaSource: 0,
  savingsSource: 0,
  premiumBondsSource: 0,
  billsAmount: 5000,
  billsFrequency: "monthly",
  holidaysAmount: 15000,
  holidaysFrequency: "annual",
  carAmount: 5000,
  carFrequency: "annual",
  growthRate: 6,
  inflationRate: 2.5,
};
const STORAGE_KEY = "retirementOptimizer.settings.v1";
const TAX_YEAR_MONTHS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];
const MAX_PROJECTION_AGE = 120;

const form = document.querySelector("#optimizerForm");
const chart = document.querySelector("#projectionChart");
const ctx = chart.getContext("2d");
const planChart = document.querySelector("#planStackedChart");
const planCtx = planChart.getContext("2d");
const moneyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 2,
});
const PLAIN_NUMBER_FIELDS = new Set(["birthYear", "currentYear", "planningAge"]);
const FIELD_ALIASES = {
  birthYear: ["birthyear", "yearofbirth", "yob", "dobyear"],
  currentYear: ["currentyear", "taxyear", "taxyearstart", "taxyearstartingapril", "year", "startyear"],
  planningAge: ["planningage", "plantillage", "plantoage", "endage"],
  lumpSumAllowance: ["lumpsumallowance", "lsa", "lsalimit", "lumpsumlimit"],
  taxFreeLumpSumsTaken: ["taxfreelumpsumstaken", "tflstaken", "tflstakentodate", "taxfreecashtaken", "tfctaken", "tfctakentodate"],
  taxFreeLumpSumsThisYear: ["taxfreelumpsumsthisyear", "tflsthisyear", "taxfreecashthisyear", "tfcthisyear", "tfls", "tfc"],
  crystallisedPension: ["crystallisedpension", "crystallised", "crystallisedpot", "crystpot", "crystallizedpension", "crystallized", "crystallizedpot", "currentsavings"],
  uncrystallisedPension: ["uncrystallisedpension", "uncrystallised", "uncrystallisedpot", "uncrystpot", "uncrystallizedpension", "uncrystallized", "uncrystallizedpot"],
  taxAllowance: ["taxallowance", "personalallowance"],
  higherRateThreshold: ["higherratethreshold", "higherthreshold", "hrthreshold", "higherbandthreshold"],
  personalSavingsAllowance: ["personalsavingsallowance", "psa", "savingsallowance", "personalsavingsallowancebasic"],
  basicTaxRate: ["basictaxrate", "basicrate"],
  higherTaxRate: ["highertaxrate", "higherrate"],
  bankBalance: ["bankbalance", "bank", "cash", "cashbalance", "savingsbalance"],
  bankInterestRate: ["bankinterestrate", "interestrate", "savingsrate"],
  statePensionAmount: ["statepensionamount", "statepension", "statepensionincome", "fixedincome"],
  definedBenefitPayments: ["definedbenefitpayments", "definedbenefit", "dbpension", "dbincome", "workpension"],
  definedBenefitLumpSum: ["definedbenefitlumpsum", "dblumpsum", "workpensionlumpsum"],
  targetEquivalentIncome: ["targetequivalentincome", "grossincomerequired", "incomedesired", "desiredincome", "incomerequired", "targetincome", "annualspending"],
  partnerWorkIncome: ["partnerworkincome", "partnerwork", "partnerincome", "partneremploymentincome"],
  partnerStatePension: ["partnerstatepension", "partnersstatepension"],
  partnerWorkPension: ["partnerworkpension", "partnerdefinedbenefit", "partnerdbpension"],
  partnerSavings: ["partnersavings", "partnercontribution"],
  isaSource: ["isasource", "sourcedfromisa", "isa"],
  savingsSource: ["savingssource", "sourcedfromsavings", "savings"],
  premiumBondsSource: ["premiumbondssource", "sourcedfrompremiumbonds", "premiumbonds"],
  billsAmount: ["billsamount", "bills", "billspend"],
  billsFrequency: ["billsfrequency", "billsperiod"],
  holidaysAmount: ["holidaysamount", "holidays", "holidayamount", "holidayspend"],
  holidaysFrequency: ["holidaysfrequency", "holidaysperiod", "holidayfrequency"],
  carAmount: ["caramount", "car", "carspend"],
  carFrequency: ["carfrequency", "carperiod"],
  growthRate: ["growthrate", "investmentgrowth", "returnrate"],
  inflationRate: ["inflationrate", "inflation"],
};
const IMPORT_HELPER_ALIASES = {
  age: ["age", "currentage", "ageattaxyearstart", "ageinyear"],
  incomeNeeded: ["incomeneeded", "totalincomeneeded"],
  totalPot: ["totalpot", "pensionpot", "totalpension", "pensiontotal", "potleft"],
};

const fields = Object.keys(DEFAULTS).reduce((all, key) => {
  all[key] = document.querySelector(`#${key}`) || document.querySelector(`[name="${key}"]`);
  return all;
}, {});
const targetEquivalentIncomeExact = document.querySelector("#targetEquivalentIncomeExact");
const importSettingsFile = document.querySelector("#importSettingsFile");
const planYearControl = document.querySelector("#planYearControl");
const planYearSlider = document.querySelector("#planYearSlider");
const planYearValue = document.querySelector("#planYearValue");
const planChartSection = document.querySelector("#planChartSection");
const planYearMetric = document.querySelector("#planYearMetric");
const planStatusBadge = document.querySelector("#planStatusBadge");
const versionTag = document.querySelector("#versionTag");
let importedPlan = null;
let selectedPlanIndex = 0;
let versionTagTimer = null;

function setupNumberInputs() {
  Object.entries(fields).forEach(([key, field]) => {
    if (!field || field.type !== "number") {
      return;
    }

    field.type = "text";
    field.inputMode = PLAIN_NUMBER_FIELDS.has(key) ? "numeric" : "decimal";
    field.addEventListener("focus", () => {
      field.value = field.value.replaceAll(",", "");
    });
    field.addEventListener("blur", () => {
      field.value = formatNumberInput(key, field.value);
    });
  });

  targetEquivalentIncomeExact.type = "text";
  targetEquivalentIncomeExact.inputMode = "decimal";
  targetEquivalentIncomeExact.addEventListener("focus", () => {
    targetEquivalentIncomeExact.value = targetEquivalentIncomeExact.value.replaceAll(",", "");
  });
  targetEquivalentIncomeExact.addEventListener("blur", () => {
    syncExactIncomeToSlider();
    targetEquivalentIncomeExact.value = formatNumberInput("targetEquivalentIncome", targetEquivalentIncomeExact.value);
  });
  targetEquivalentIncomeExact.addEventListener("input", syncExactIncomeToSlider);
  targetEquivalentIncomeExact.addEventListener("input", () => {
    render();
    saveSettings();
  });
  fields.targetEquivalentIncome.addEventListener("input", () => {
    targetEquivalentIncomeExact.value = formatNumberInput("targetEquivalentIncome", fields.targetEquivalentIncome.value);
  });
}

function syncExactIncomeToSlider() {
  const slider = fields.targetEquivalentIncome;
  const exactValue = clamp(
    parseNumber(targetEquivalentIncomeExact.value),
    Number(slider.min),
    Number(slider.max)
  );

  if (Number.isFinite(exactValue)) {
    slider.value = exactValue;
  }
}

function resetFields() {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    setFieldValue(key, value);
  });
}

function getExportableSettings() {
  return Object.fromEntries(
    Object.keys(DEFAULTS).map((key) => [key, getFieldValue(key)])
  );
}

function applySettings(settings) {
  migrateSavedSettings(settings);

  Object.keys(DEFAULTS).forEach((key) => {
    const numericValue = parseNumber(settings[key]);
    if (typeof DEFAULTS[key] === "number" && Number.isFinite(numericValue)) {
      setFieldValue(key, numericValue);
    }

    if (typeof DEFAULTS[key] === "string" && typeof settings[key] === "string") {
      setFieldValue(key, settings[key]);
    }
  });
}

function loadSavedSettings() {
  try {
    const saved = JSON.parse(getSavedSettings());
    if (!saved || typeof saved !== "object") {
      return;
    }

    applySettings(saved);
  } catch {
    removeSavedSettings();
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getExportableSettings()));
  } catch {
    // Some browsers block localStorage for local files or private sessions.
  }
}

function exportSettings() {
  const settings = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getExportableSettings(),
  };
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `retirement-optimizer-${getFieldValue("currentYear")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importSettings(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = parseImportPackage(String(reader.result), file.name);
      if (imported.plan) {
        importedPlan = imported.plan;
        selectedPlanIndex = imported.plan.selectedIndex;
        updatePlanControls();
      } else {
        importedPlan = null;
        selectedPlanIndex = 0;
        updatePlanControls();
      }
      applySettings(imported.settings);
      render();
      saveSettings();
    } catch {
      window.alert("Could not import that file. Try a settings JSON export or a single-row CSV with headers.");
    } finally {
      importSettingsFile.value = "";
    }
  });
  reader.readAsText(file);
}

function parseImportPackage(text, sourceName = "") {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty import");
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (isForecasterPlanExport(parsed)) {
      const plan = getForecasterPlan(parsed);
      return {
        settings: coerceImportedSettings(getForecasterPlanRowSettings(parsed, plan.rows[plan.selectedIndex]), sourceName),
        plan,
      };
    }

    return {
      settings: coerceImportedSettings(getImportSource(parsed), sourceName),
      plan: null,
    };
  } catch (error) {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      throw error;
    }
    const rows = parseCsv(trimmed);
    if (!rows.length) {
      throw new Error("No CSV rows");
    }
    return {
      settings: coerceImportedSettings(rows[0], sourceName),
      plan: null,
    };
  }
}

function parseImportedSettings(text, sourceName = "") {
  return parseImportPackage(text, sourceName).settings;
}

function getImportSource(parsed) {
  if (isForecasterYearExport(parsed)) {
    return {
      ...parsed.settings,
      ...getForecasterYearSettings(parsed),
    };
  }

  if (parsed.settings && typeof parsed.settings === "object") {
    return parsed.settings;
  }

  return Array.isArray(parsed) ? parsed[0] : parsed;
}

function isForecasterYearExport(parsed) {
  return parsed
    && typeof parsed === "object"
    && parsed.schema === "pension-forecaster-year-export"
    && parsed.projection
    && parsed.projection.year;
}

function isForecasterPlanExport(parsed) {
  return parsed
    && typeof parsed === "object"
    && parsed.schema === "pension-forecaster-plan-export"
    && parsed.projection
    && Array.isArray(parsed.projection.rows);
}

function getForecasterPlan(parsed) {
  return {
    assumptions: parsed.assumptions || {},
    name: getImportedPlanName(parsed),
    rows: parsed.projection.rows,
    selectedIndex: 0,
  };
}

function getImportedPlanName(parsed) {
  return [
    parsed.planName,
    parsed.name,
    parsed.title,
    parsed.meta?.planName,
    parsed.meta?.name,
    parsed.meta?.title,
    parsed.assumptions?.plan?.planName,
    parsed.assumptions?.plan?.name,
    parsed.assumptions?.sourceState?.planName,
    parsed.assumptions?.sourceState?.name,
  ].find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function getForecasterYearSettings(parsed) {
  return getForecasterPlanRowSettings(parsed, parsed.projection.year);
}

function getForecasterPlanRowSettings(parsed, year) {
  const standardLsa = parsed.assumptions?.taxRules?.standardLumpSumAllowance || DEFAULTS.lumpSumAllowance;
  const tflsTakenAtStart = Math.max(
    0,
    standardLsa - ((year.remainingLumpSumAllowance || 0) + (year.taxFreeCash || 0))
  );
  const taxRules = parsed.assumptions?.taxRules || {};
  const annualSpendTarget = Math.max(
    year.totalIncomeRequired || year.incomeRequired || 0,
    (year.householdBills || 0) + (year.holidays || 0) + (year.carCost || 0) + (year.estimatedTax || 0)
  );
  const settings = {
    optimizerTargetPrecalculated: true,
    birthYear: parsed.assumptions?.plan?.yearOfBirth || parsed.assumptions?.sourceState?.yearOfBirth,
    currentYear: year.calendarYear,
    planningAge: parsed.assumptions?.plan?.planEndAge,
    lumpSumAllowance: standardLsa,
    taxFreeLumpSumsTaken: tflsTakenAtStart,
    taxFreeLumpSumsThisYear: year.taxFreeCash,
    crystallisedPension: year.openingCrystallisedFund,
    uncrystallisedPension: year.openingUncrystallisedPot,
    taxAllowance: year.assumedTaxAllowance,
    higherRateThreshold: taxRules.basicRateLimit,
    personalSavingsAllowance: year.personalSavingsAllowance,
    basicTaxRate: Number.isFinite(taxRules.basicRate) ? taxRules.basicRate * 100 : undefined,
    higherTaxRate: Number.isFinite(taxRules.higherRate) ? taxRules.higherRate * 100 : undefined,
    bankBalance: year.openingBankSavings,
    bankInterestRate: (parsed.assumptions?.sourceState?.personalBankInterestRate || 0) * 100,
    statePensionAmount: year.ownStatePension,
    definedBenefitPayments: year.definedBenefitIncome,
    definedBenefitLumpSum: year.definedBenefitLumpSum,
    targetEquivalentIncome: Math.max(0, annualSpendTarget - (year.carCost || 0)),
    partnerWorkIncome: year.partnerIncome,
    partnerStatePension: year.partnerStatePension,
    partnerWorkPension: year.partnerWorkPension,
    partnerSavings: year.partnerSavingsPlannedUse,
    isaSource: year.isaSavingsUsed,
    savingsSource: year.bankSavingsUsed,
    premiumBondsSource: year.premiumBondsUsed,
    billsAmount: year.householdBills,
    billsFrequency: "annual",
    holidaysAmount: year.holidays,
    holidaysFrequency: "annual",
    carAmount: year.carCost,
    carFrequency: "annual",
    growthRate: (parsed.assumptions?.growthAndInflation?.postRetirementGrowthRateUsed || 0) * 100,
    inflationRate: (parsed.assumptions?.growthAndInflation?.cpiRate || 0) * 100,
  };

  return Object.fromEntries(
    Object.entries(settings).filter(([, value]) => value !== undefined && value !== null)
  );
}

function coerceImportedSettings(source, sourceName = "") {
  if (!source || typeof source !== "object") {
    throw new Error("Import source is not an object");
  }

  const normalizedValues = new Map(
    Object.entries(source).map(([key, value]) => [normalizeImportKey(key), value])
  );
  const settings = {};

  Object.entries(DEFAULTS).forEach(([key, defaultValue]) => {
    const value = source[key] !== undefined
      ? source[key]
      : findImportedValue(normalizedValues, FIELD_ALIASES[key] || []);

    if (value === undefined || value === "") {
      return;
    }

    if (typeof defaultValue === "number") {
      const number = parseNumber(value);
      if (Number.isFinite(number)) {
        settings[key] = number;
      }
      return;
    }

    if (typeof defaultValue === "string") {
      const frequency = normalizeFrequency(value);
      if (frequency) {
        settings[key] = frequency;
      }
    }
  });

  const importedAge = parseNumber(findImportedValue(normalizedValues, IMPORT_HELPER_ALIASES.age));
  if (settings.birthYear === undefined && Number.isFinite(importedAge)) {
    const year = Number.isFinite(settings.currentYear) ? settings.currentYear : DEFAULTS.currentYear;
    settings.birthYear = year - importedAge;
  }

  const totalPot = parseNumber(findImportedValue(normalizedValues, IMPORT_HELPER_ALIASES.totalPot));
  if (
    Number.isFinite(totalPot)
      && settings.crystallisedPension === undefined
      && settings.uncrystallisedPension === undefined
  ) {
    settings.crystallisedPension = totalPot;
    settings.uncrystallisedPension = 0;
  }

  const incomeNeeded = parseNumber(findImportedValue(normalizedValues, IMPORT_HELPER_ALIASES.incomeNeeded));
  if (!source.optimizerTargetPrecalculated && Number.isFinite(incomeNeeded)) {
    settings.targetEquivalentIncome = Math.max(0, incomeNeeded - (settings.carAmount || 0));
  } else if (
    !source.optimizerTargetPrecalculated
      && normalizeImportKey(sourceName).includes("pensionforecaster")
      && Number.isFinite(settings.targetEquivalentIncome)
      && Number.isFinite(settings.carAmount)
  ) {
    settings.targetEquivalentIncome = Math.max(0, settings.targetEquivalentIncome - settings.carAmount);
  }

  return settings;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  const headers = rows.shift();
  if (!headers) {
    return [];
  }

  return rows.map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] || ""])
  ));
}

function findImportedValue(normalizedValues, aliases) {
  return aliases.reduce((found, alias) => {
    if (found !== undefined) {
      return found;
    }
    return normalizedValues.get(normalizeImportKey(alias));
  }, undefined);
}

function normalizeImportKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeFrequency(value) {
  const normalized = normalizeImportKey(value);
  if (["monthly", "month", "mo", "m"].includes(normalized)) {
    return "monthly";
  }
  if (["annual", "annually", "yearly", "year", "yr", "y"].includes(normalized)) {
    return "annual";
  }
  return null;
}

function updatePlanControls() {
  const hasPlan = importedPlan && importedPlan.rows.length > 0;
  planYearControl.hidden = !hasPlan;
  planChartSection.hidden = !hasPlan;
  planYearMetric.hidden = !hasPlan;
  planStatusBadge.textContent = hasPlan
    ? `Plan Loaded${importedPlan.name ? `: ${importedPlan.name}` : ""}`
    : "No Plan Loaded";
  planStatusBadge.classList.toggle("loaded", hasPlan);

  if (!hasPlan) {
    return;
  }

  planYearSlider.min = "0";
  planYearSlider.max = String(importedPlan.rows.length - 1);
  planYearSlider.value = String(selectedPlanIndex);
  updatePlanYearLabel();
  drawPlanStackedChart();
}

function updatePlanYearLabel() {
  if (!importedPlan) {
    planYearValue.textContent = "-";
    document.querySelector("#selectedPlanYearNumber").textContent = "-";
    document.querySelector("#selectedPlanYearDetail").textContent = "Year - · Age -";
    return;
  }

  const row = importedPlan.rows[selectedPlanIndex];
  planYearValue.textContent = `${row.calendarYear} (age ${row.age})`;
  document.querySelector("#selectedPlanYearNumber").textContent = String(row.yearIndex);
  document.querySelector("#selectedPlanYearDetail").textContent = `${row.calendarYear} · Age ${row.age}`;
}

function getTodayMoneyValue(value) {
  if (!importedPlan) {
    return null;
  }

  const row = importedPlan.rows[selectedPlanIndex];
  const baseYear = importedPlan.assumptions?.plan?.currentYear
    || importedPlan.assumptions?.sourceState?.currentYear
    || row.calendarYear;
  const cpiRate = importedPlan.assumptions?.growthAndInflation?.cpiRate
    ?? importedPlan.assumptions?.sourceState?.cpiRate
    ?? 0;
  const yearsFromBase = Math.max(0, row.calendarYear - baseYear);
  const inflationFactor = Math.pow(1 + cpiRate, yearsFromBase);

  if (!Number.isFinite(inflationFactor) || inflationFactor <= 0) {
    return null;
  }

  return value / inflationFactor;
}

function applySelectedPlanYear() {
  if (!importedPlan) {
    return;
  }

  const source = {
    schema: "pension-forecaster-plan-export",
    assumptions: importedPlan.assumptions,
    projection: { rows: importedPlan.rows },
  };
  const settings = coerceImportedSettings(
    getForecasterPlanRowSettings(source, importedPlan.rows[selectedPlanIndex]),
    "pension-forecaster-plan"
  );
  applySettings(settings);
  updatePlanYearLabel();
  render();
  saveSettings();
}

function getActiveImportedYearRow(currentYear) {
  if (!importedPlan?.rows?.length) {
    return null;
  }

  const selectedRow = importedPlan.rows[selectedPlanIndex];
  if (selectedRow?.calendarYear === currentYear) {
    return selectedRow;
  }

  return importedPlan.rows.find((row) => row.calendarYear === currentYear) || null;
}

function getSavedSettings() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function removeSavedSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // If storage is blocked, there is nothing to clean up.
  }
}

function migrateSavedSettings(saved) {
  if (Number.isFinite(Number(saved.currentSavings)) && saved.crystallisedPension === undefined) {
    saved.crystallisedPension = saved.currentSavings;
    saved.uncrystallisedPension = 0;
  }

  if (Number.isFinite(Number(saved.fixedIncome)) && saved.statePensionAmount === undefined) {
    saved.statePensionAmount = saved.fixedIncome;
    saved.definedBenefitPayments = 0;
  }

  if (Number.isFinite(Number(saved.annualSpending)) && saved.billsAmount === undefined) {
    saved.billsAmount = saved.annualSpending;
    saved.billsFrequency = "annual";
    saved.holidaysAmount = 0;
    saved.carAmount = 0;
  }

  if (Number.isFinite(Number(saved.annualSpending)) && saved.targetEquivalentIncome === undefined) {
    saved.targetEquivalentIncome = saved.annualSpending;
  }

  if (Number.isFinite(Number(saved.partnerContribution)) && saved.partnerSavings === undefined) {
    saved.partnerSavings = saved.partnerContribution;
  }
}

function getFieldValue(key) {
  if (typeof DEFAULTS[key] === "string") {
    return document.querySelector(`[name="${key}"]:checked`)?.value || DEFAULTS[key];
  }

  if (key === "targetEquivalentIncome") {
    return parseNumber(targetEquivalentIncomeExact.value);
  }

  return parseNumber(fields[key].value);
}

function setFieldValue(key, value) {
  if (typeof DEFAULTS[key] === "string") {
    const option = document.querySelector(`[name="${key}"][value="${value}"]`);
    if (option) {
      option.checked = true;
    }
    return;
  }

  if (key === "targetEquivalentIncome") {
    const number = parseNumber(value);
    fields[key].value = clamp(number, Number(fields[key].min), Number(fields[key].max));
    targetEquivalentIncomeExact.value = formatNumberInput(key, number);
    return;
  }

  fields[key].value = fields[key].type === "range" ? value : formatNumberInput(key, value);
}

function currency(value) {
  return moneyFormatter.format(Math.round(value));
}

function annualMonthlyCurrency(value) {
  return `${currency(value)}/Yr ${currency(value / 12)}/Mth`;
}

function lastChangedLabel() {
  const changedAt = new Date(document.lastModified);

  if (Number.isNaN(changedAt.getTime())) {
    return "Changed: unknown";
  }

  return `Changed ${changedAt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function showLastChanged() {
  const version = versionTag.dataset.version || versionTag.textContent;
  versionTag.dataset.version = version;
  versionTag.textContent = lastChangedLabel();

  window.clearTimeout(versionTagTimer);
  versionTagTimer = window.setTimeout(() => {
    versionTag.textContent = versionTag.dataset.version;
  }, 5000);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return value;
  }

  return Math.min(max, Math.max(min, value));
}

function formatNumberInput(key, value) {
  const number = parseNumber(value);
  if (!Number.isFinite(number)) {
    return "";
  }

  return PLAIN_NUMBER_FIELDS.has(key) ? String(Math.round(number)) : numberFormatter.format(number);
}

function parseNumber(value) {
  const normalized = String(value)
    .trim()
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/[£$€,\s%]/g, "");
  return Number(normalized);
}

function readInputs() {
  const inputs = Object.fromEntries(
    Object.entries(DEFAULTS).map(([key, defaultValue]) => [
      key,
      typeof defaultValue === "number" ? Number(getFieldValue(key)) : getFieldValue(key),
    ])
  );

  const annualBillsCost = annualize(inputs.billsAmount, inputs.billsFrequency);
  const annualHolidaysCost = annualize(inputs.holidaysAmount, inputs.holidaysFrequency);
  const annualCarCost = annualize(inputs.carAmount, inputs.carFrequency);
  const categorySpending = annualBillsCost + annualHolidaysCost + annualCarCost;
  inputs.annualBillsCost = annualBillsCost;
  inputs.annualHolidaysCost = annualHolidaysCost;
  inputs.categorySpending = categorySpending;
  inputs.annualCarCost = annualCarCost;
  inputs.annualSpending = inputs.targetEquivalentIncome + annualCarCost;
  inputs.spendingScale = categorySpending > 0 ? inputs.annualSpending / categorySpending : 0;
  inputs.startingAssets = inputs.crystallisedPension + inputs.uncrystallisedPension;
  inputs.startCrystallisedToDate = Math.max(
    inputs.crystallisedPension,
    inputs.taxFreeLumpSumsTaken / 0.25
  );
  const startingLsaRemaining = Math.max(0, inputs.lumpSumAllowance - inputs.taxFreeLumpSumsTaken);
  inputs.effectiveTaxFreeCashThisYear = Math.min(
    inputs.taxFreeLumpSumsThisYear,
    startingLsaRemaining,
    inputs.uncrystallisedPension * 0.25
  );
  inputs.lsaRemaining = Math.max(0, startingLsaRemaining - inputs.effectiveTaxFreeCashThisYear);
  inputs.availableTaxFreeCash = Math.min(
    inputs.lsaRemaining,
    Math.max(0, inputs.uncrystallisedPension - inputs.effectiveTaxFreeCashThisYear / 0.25) * 0.25
  );
  inputs.annualSavingsInterest = inputs.bankBalance * (inputs.bankInterestRate / 100);
  inputs.annualTaxableIncome = inputs.statePensionAmount
    + inputs.definedBenefitPayments;
  inputs.annualGrossIncome = inputs.annualTaxableIncome
    + inputs.definedBenefitLumpSum;
  inputs.partnerContribution = inputs.partnerWorkIncome
    + inputs.partnerStatePension
    + inputs.partnerWorkPension
    + inputs.partnerSavings;
  inputs.cashPartnerContribution = inputs.partnerContribution;
  inputs.taxNeutralFunding = inputs.partnerContribution
    + inputs.effectiveTaxFreeCashThisYear
    + inputs.isaSource
    + inputs.savingsSource
    + inputs.premiumBondsSource;
  inputs.portfolioDraw = Math.max(
    0,
    inputs.annualSpending
      - inputs.taxNeutralFunding
      - inputs.annualGrossIncome
  );
  inputs.taxEstimate = estimateTaxWithSavings(
    inputs.annualTaxableIncome + inputs.portfolioDraw,
    inputs.annualSavingsInterest,
    inputs.taxAllowance,
    inputs.higherRateThreshold,
    inputs.personalSavingsAllowance,
    inputs.basicTaxRate,
    inputs.higherTaxRate
  );
  inputs.annualNetIncome = Math.max(
    0,
    inputs.annualGrossIncome
      + inputs.portfolioDraw
      + inputs.cashPartnerContribution
      + inputs.effectiveTaxFreeCashThisYear
      + inputs.isaSource
      + inputs.savingsSource
      + inputs.premiumBondsSource
      - inputs.taxEstimate
  );

  const importedYear = getActiveImportedYearRow(inputs.currentYear);
  if (importedYear) {
    inputs.portfolioDraw = Math.max(0, importedYear.taxableWithdrawal || inputs.portfolioDraw);
    inputs.taxEstimate = Math.max(0, importedYear.estimatedTax || inputs.taxEstimate);
    inputs.importedFreeCash = Number.isFinite(importedYear.excessNet)
      ? importedYear.excessNet
      : null;
    inputs.cashPartnerContribution = Math.max(
      0,
      (importedYear.incomeTotal || 0)
        - inputs.annualGrossIncome
        - inputs.effectiveTaxFreeCashThisYear
    );
    inputs.annualNetIncome = Math.max(
      0,
      inputs.annualGrossIncome
        + inputs.portfolioDraw
        + inputs.cashPartnerContribution
        + inputs.effectiveTaxFreeCashThisYear
        + inputs.isaSource
        + inputs.savingsSource
        + inputs.premiumBondsSource
        - inputs.taxEstimate
    );
  }

  return inputs;
}

function availableTaxFreeCashLimit(inputs) {
  const startingLsaRemaining = Math.max(0, inputs.lumpSumAllowance - inputs.taxFreeLumpSumsTaken);
  return Math.min(startingLsaRemaining, inputs.uncrystallisedPension * 0.25);
}

function updateTaxFreeCashControl(inputs) {
  const availableTfc = availableTaxFreeCashLimit(inputs);
  const control = fields.taxFreeLumpSumsThisYear;
  control.max = String(Math.max(0, availableTfc));
  control.disabled = availableTfc <= 0;

  if (Number(control.value) > availableTfc) {
    control.value = availableTfc;
  }

  document.querySelector("#taxFreeLumpSumsThisYearNote").textContent = `Available TFC: ${currency(availableTfc)}`;
}

function annualize(amount, frequency) {
  return amount * (frequency === "monthly" ? 12 : 1);
}

function estimateTax(grossIncome, allowance, higherRateThreshold, basicRate, higherRate) {
  const taxableIncome = Math.max(0, grossIncome - allowance);
  return estimateTaxableIncomeTax(taxableIncome, allowance, higherRateThreshold, basicRate, higherRate);
}

function estimateTaxWithSavings(
  nonSavingsIncome,
  savingsInterest,
  allowance,
  higherRateThreshold,
  personalSavingsAllowance,
  basicRate,
  higherRate
) {
  const taxableNonSavings = Math.max(0, nonSavingsIncome - allowance);
  const remainingAllowance = Math.max(0, allowance - nonSavingsIncome);
  const savingsAfterAllowance = Math.max(0, savingsInterest - remainingAllowance);
  const taxableSavings = Math.max(0, savingsAfterAllowance - personalSavingsAllowance);
  return estimateTaxableIncomeTax(
    taxableNonSavings + taxableSavings,
    allowance,
    higherRateThreshold,
    basicRate,
    higherRate
  );
}

function estimateTaxableIncomeTax(taxableIncome, allowance, higherRateThreshold, basicRate, higherRate) {
  const basicBand = Math.max(0, higherRateThreshold - allowance);
  const basicTax = Math.min(taxableIncome, basicBand) * (basicRate / 100);
  const higherTax = Math.max(0, taxableIncome - basicBand) * (higherRate / 100);
  return basicTax + higherTax;
}

function solvePortfolioDraw(spending, grossIncome, allowance, higherRateThreshold, basicRate, higherRate) {
  if (
    grossIncome - estimateTax(grossIncome, allowance, higherRateThreshold, basicRate, higherRate)
      >= spending
  ) {
    return 0;
  }

  let low = 0;
  let high = Math.max(spending, 1);

  while (
    grossIncome + high - estimateTax(grossIncome + high, allowance, higherRateThreshold, basicRate, higherRate)
      < spending
  ) {
    high *= 2;
  }

  for (let i = 0; i < 32; i += 1) {
    const midpoint = (low + high) / 2;
    const netIncome = grossIncome
      + midpoint
      - estimateTax(grossIncome + midpoint, allowance, higherRateThreshold, basicRate, higherRate);
    if (netIncome >= spending) {
      high = midpoint;
    } else {
      low = midpoint;
    }
  }

  return high;
}

function buildTaxYearPlan(inputs) {
  const monthlySpend = inputs.annualSpending / 12;
  const monthlyBills = inputs.annualBillsCost / 12;
  const monthlyHolidays = inputs.annualHolidaysCost / 12;
  const monthlyIncome = inputs.annualGrossIncome / 12;
  const monthlyTax = inputs.taxEstimate / 12;
  const monthlyDraw = inputs.portfolioDraw / 12;
  const monthlyTaxFreeCash = inputs.effectiveTaxFreeCashThisYear / 12;
  const monthlyPartnerContribution = inputs.cashPartnerContribution / 12;
  const monthlyIsaSource = inputs.isaSource / 12;
  const monthlySavingsSource = inputs.savingsSource / 12;
  const monthlyPremiumBondsSource = inputs.premiumBondsSource / 12;
  const monthlyImportedFreeCash = Number.isFinite(inputs.importedFreeCash)
    ? inputs.importedFreeCash / 12
    : null;
  const monthlyBillsAndHolidays = (inputs.annualBillsCost + inputs.annualHolidaysCost) / 12;
  const monthlyPensionGrowth = Math.pow(1 + inputs.growthRate / 100, 1 / 12) - 1;
  let crystallised = inputs.crystallisedPension;
  let uncrystallised = inputs.uncrystallisedPension;
  const bank = inputs.bankBalance;
  let actualPortfolioDraw = 0;
  let fundsCrystallisedThisYear = 0;

  const months = TAX_YEAR_MONTHS.map((name, index) => {
    const year = index <= 8 ? inputs.currentYear : inputs.currentYear + 1;
    crystallised *= 1 + monthlyPensionGrowth;
    uncrystallised *= 1 + monthlyPensionGrowth;

    const requestedTaxFreeCash = Math.min(monthlyTaxFreeCash, uncrystallised * 0.25);
    const fundsCrystallisedForTaxFreeCash = requestedTaxFreeCash / 0.25;
    const taxFreeCash = fundsCrystallisedForTaxFreeCash * 0.25;
    fundsCrystallisedThisYear += fundsCrystallisedForTaxFreeCash;
    uncrystallised -= fundsCrystallisedForTaxFreeCash;
    crystallised += fundsCrystallisedForTaxFreeCash * 0.75;

    const crystallisedDraw = Math.min(crystallised, monthlyDraw);
    crystallised -= crystallisedDraw;
    actualPortfolioDraw += crystallisedDraw;

    return {
      label: `${name} ${year}`,
      spend: monthlySpend,
      income: monthlyIncome,
      bills: monthlyBills,
      holidays: monthlyHolidays,
      tax: monthlyTax,
      draw: crystallisedDraw,
      taxFreeCash,
      partnerContribution: monthlyPartnerContribution,
      isaSource: monthlyIsaSource,
      savingsSource: monthlySavingsSource,
      premiumBondsSource: monthlyPremiumBondsSource,
      freeCash: monthlyImportedFreeCash ?? (
        monthlyIncome
          + taxFreeCash
          + monthlyPartnerContribution
          + monthlyIsaSource
          + monthlySavingsSource
          + monthlyPremiumBondsSource
          + crystallisedDraw
          - monthlyBillsAndHolidays
          - monthlyTax
      ),
      potLeft: crystallised + uncrystallised,
    };
  });

  const endTflsTaken = inputs.taxFreeLumpSumsTaken + inputs.effectiveTaxFreeCashThisYear;
  const endLsa = Math.max(0, inputs.lumpSumAllowance - endTflsTaken);
  return {
    months,
    monthlySpend,
    yearSpend: inputs.annualSpending,
    yearBills: inputs.annualBillsCost,
    yearHolidays: inputs.annualHolidaysCost,
    taxEstimate: inputs.taxEstimate,
    portfolioDraw: actualPortfolioDraw,
    freeCash: Number.isFinite(inputs.importedFreeCash)
      ? inputs.importedFreeCash
      : inputs.annualGrossIncome
        + inputs.effectiveTaxFreeCashThisYear
        + inputs.cashPartnerContribution
        + inputs.isaSource
        + inputs.savingsSource
        + inputs.premiumBondsSource
        + actualPortfolioDraw
        - inputs.annualBillsCost
        - inputs.annualHolidaysCost
        - inputs.taxEstimate,
    endCrystallised: crystallised,
    endCrystallisedToDate: inputs.startCrystallisedToDate + fundsCrystallisedThisYear,
    endUncrystallised: uncrystallised,
    endBankBalance: bank,
    endPot: crystallised + uncrystallised,
    endTflsTaken,
    endLsa,
    endTaxFreeCash: Math.min(endLsa, uncrystallised * 0.25),
  };
}

function project(inputs) {
  if (importedPlan?.rows?.length) {
    return projectImportedPlan();
  }

  const years = [];
  let balance = inputs.startingAssets;
  const growth = inputs.growthRate / 100;
  const inflation = inputs.inflationRate / 100;
  const currentAge = inputs.currentYear - inputs.birthYear;
  const startingBalance = balance;
  let nextYearPortfolioNeed = 0;
  let exhaustedYear = null;

  for (let age = currentAge; age <= MAX_PROJECTION_AGE; age += 1) {
    const yearsFromNow = age - currentAge;
    const year = inputs.currentYear + yearsFromNow;
    const spending = inputs.annualSpending * Math.pow(1 + inflation, yearsFromNow);
    const grossIncome = inputs.annualTaxableIncome * Math.pow(1 + inflation * 0.45, yearsFromNow);
    const allowance = inputs.taxAllowance * Math.pow(1 + inflation * 0.45, yearsFromNow);
    const higherRateThreshold = inputs.higherRateThreshold * Math.pow(1 + inflation * 0.45, yearsFromNow);
    const portfolioNeed = solvePortfolioDraw(
      spending,
      grossIncome,
      allowance,
      higherRateThreshold,
      inputs.basicTaxRate,
      inputs.higherTaxRate
    );

    if (age === currentAge) {
      nextYearPortfolioNeed = portfolioNeed;
    }

    years.push({
      age,
      year,
      balance: Math.max(0, balance),
      spendingDraw: portfolioNeed,
    });

    balance = (balance - portfolioNeed) * (1 + growth);

    if (balance <= 0) {
      exhaustedYear = { age: age + 1, year: year + 1 };
      years.push({
        age: exhaustedYear.age,
        year: exhaustedYear.year,
        balance: 0,
        spendingDraw: portfolioNeed,
      });
      break;
    }
  }

  return {
    years,
    currentAge,
    startingBalance,
    nextYearPortfolioNeed,
    finalBalance: years.at(-1).balance,
    exhaustedYear,
    maxProjectionAge: MAX_PROJECTION_AGE,
    withdrawalRate: startingBalance > 0 ? nextYearPortfolioNeed / startingBalance : 0,
  };
}

function projectImportedPlan() {
  const rows = importedPlan.rows;
  const firstRow = rows[0];
  const years = rows.map((row) => ({
    age: row.age,
    year: row.calendarYear,
    balance: Math.max(0, row.openingPot || row.openingCrystallisedFund + row.openingUncrystallisedPot || 0),
    spendingDraw: Math.max(0, row.taxableWithdrawal || 0),
  }));
  const exhaustionRow = rows.find((row) => (
    Number.isFinite(row.totalPotAfterGrowth) && row.totalPotAfterGrowth <= 0
  ) || (
    Number.isFinite(row.uncrystallisedPot) && Number.isFinite(row.crystallisedFundLeft)
      && row.uncrystallisedPot + row.crystallisedFundLeft <= 0
  ));

  if (exhaustionRow && years.at(-1).balance > 0) {
    years.push({
      age: exhaustionRow.age + 1,
      year: exhaustionRow.calendarYear + 1,
      balance: 0,
      spendingDraw: Math.max(0, exhaustionRow.taxableWithdrawal || 0),
    });
  }

  const nextYearPortfolioNeed = Math.max(0, firstRow.taxableWithdrawal || 0);
  const startingBalance = years[0]?.balance || 0;

  return {
    years,
    currentAge: firstRow.age,
    startingBalance,
    nextYearPortfolioNeed,
    finalBalance: years.at(-1)?.balance || 0,
    exhaustedYear: exhaustionRow
      ? { age: exhaustionRow.age, year: exhaustionRow.calendarYear }
      : null,
    maxProjectionAge: rows.at(-1)?.age || MAX_PROJECTION_AGE,
    withdrawalRate: startingBalance > 0 ? nextYearPortfolioNeed / startingBalance : 0,
  };
}

function getChartScale(maxValue, tickCount = 4) {
  const paddedMax = Math.max(maxValue, 1) * 1.08;
  const rawStep = paddedMax / tickCount;
  const quantum = rawStep <= 50000
    ? 5000
    : rawStep <= 150000
      ? 10000
      : rawStep <= 500000
        ? 25000
        : 50000;
  const step = Math.max(quantum, Math.ceil(rawStep / quantum) * quantum);

  return {
    step,
    yMax: step * tickCount,
  };
}

function drawChart(data) {
  const width = chart.width;
  const height = chart.height;
  const pad = { top: 24, right: 28, bottom: 64, left: 72 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const maxValue = Math.max(...data.years.map((year) => Math.max(year.balance, year.spendingDraw)), 100000);
  const { step, yMax } = getChartScale(maxValue);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#d8ded8";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#65706c";
  ctx.font = "15px Inter, system-ui, sans-serif";

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (plotHeight / 4) * i;
    const value = yMax - step * i;
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
  ctx.font = "14px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  const tickIndexes = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => Math.round((data.years.length - 1) * ratio))
    .filter((index, position, indexes) => indexes.indexOf(index) === position);
  tickIndexes.forEach((index) => {
    const year = data.years[index];
    const { x } = point(year, 0);
    ctx.fillText(String(year.year), x, height - 32);
    ctx.fillText(`age ${year.age}`, x, height - 12);
  });
  ctx.textAlign = "start";
}

function drawPlanStackedChart() {
  if (!importedPlan) {
    return;
  }

  const width = planChart.width;
  const height = planChart.height;
  const pad = { top: 24, right: 28, bottom: 58, left: 72 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const rows = importedPlan.rows;
  const series = [
    { key: "partnerIncome", color: "#2f6f88" },
    { key: "partnerStatePension", color: "#159947" },
    { key: "partnerWorkPension", color: "#79a60d" },
    { key: "ownStatePension", color: "#16a6c9" },
    { key: "definedBenefitIncome", color: "#0e8da8" },
    { key: "definedBenefitLumpSum", color: "#43c3d5" },
    { key: "taxFreeCash", color: "#f2a100" },
    { key: "taxableWithdrawal", color: "#7c3aed" },
    { key: "sourcedFromSavings", color: "#d62d7f" },
  ];
  const maxValue = Math.max(
    ...rows.map((row) => Math.max(
      row.totalIncomeRequired || 0,
      series.reduce((total, item) => total + Math.max(0, row[item.key] || 0), 0)
    )),
    100000
  );
  const { step, yMax } = getChartScale(maxValue);
  const barGap = 8;
  const barWidth = Math.max(12, (plotWidth - barGap * (rows.length - 1)) / rows.length);

  planCtx.clearRect(0, 0, width, height);
  planCtx.fillStyle = "#fbfcfb";
  planCtx.fillRect(0, 0, width, height);

  planCtx.strokeStyle = "#d8ded8";
  planCtx.lineWidth = 1;
  planCtx.fillStyle = "#65706c";
  planCtx.font = "15px Inter, system-ui, sans-serif";

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (plotHeight / 4) * i;
    const value = yMax - step * i;
    planCtx.beginPath();
    planCtx.moveTo(pad.left, y);
    planCtx.lineTo(width - pad.right, y);
    planCtx.stroke();
    planCtx.fillText(currency(value).replace(".00", ""), 10, y + 7);
  }

  const xForIndex = (index) => pad.left + index * (barWidth + barGap);
  const yForValue = (value) => pad.top + plotHeight - (value / yMax) * plotHeight;

  rows.forEach((row, index) => {
    const x = xForIndex(index);
    let running = 0;
    series.forEach((item) => {
      const value = Math.max(0, row[item.key] || 0);
      if (value <= 0) {
        return;
      }
      const y = yForValue(running + value);
      const segmentHeight = yForValue(running) - y;
      planCtx.fillStyle = item.color;
      planCtx.fillRect(x, y, barWidth, segmentHeight);
      running += value;
    });

    if (index === selectedPlanIndex) {
      planCtx.strokeStyle = "#c9493d";
      planCtx.lineWidth = 4;
      [x - 3, x + barWidth + 3].forEach((lineX) => {
        planCtx.beginPath();
        planCtx.moveTo(lineX, pad.top);
        planCtx.lineTo(lineX, pad.top + plotHeight);
        planCtx.stroke();
      });
    }
  });

  planCtx.strokeStyle = "#d06d17";
  planCtx.lineWidth = 4;
  planCtx.setLineDash([8, 7]);
  planCtx.beginPath();
  rows.forEach((row, index) => {
    const x = xForIndex(index) + barWidth / 2;
    const y = yForValue(row.totalIncomeRequired || row.incomeRequired || 0);
    index === 0 ? planCtx.moveTo(x, y) : planCtx.lineTo(x, y);
  });
  planCtx.stroke();
  planCtx.setLineDash([]);

  planCtx.fillStyle = "#65706c";
  planCtx.font = "14px Inter, system-ui, sans-serif";
  const tickIndexes = [0, Math.floor((rows.length - 1) / 2), rows.length - 1];
  tickIndexes.forEach((index) => {
    const row = rows[index];
    const x = xForIndex(index);
    planCtx.fillText(String(row.calendarYear), x - 8, height - 30);
    planCtx.fillText(`age ${row.age}`, x - 10, height - 10);
  });
}

function updateInsights(data, inputs) {
  const pill = document.querySelector("#readinessPill");
  const message = document.querySelector("#optimizerMessage");
  const levers = document.querySelector("#leversList");
  const rate = data.withdrawalRate;
  const shortfall = Boolean(data.exhaustedYear);

  pill.classList.remove("warning", "danger");
  if (rate <= 0.04 && !shortfall) {
    pill.textContent = "On track";
    message.textContent = `The ${inputs.currentYear} plan starts at age ${data.currentAge}, has a pension pot of ${currency(inputs.startingAssets)}, needs ${currency(data.nextYearPortfolioNeed)} from the portfolio, and does not exhaust before age ${data.maxProjectionAge}.`;
  } else if (rate <= 0.055 && !shortfall) {
    pill.textContent = "Watch closely";
    pill.classList.add("warning");
    message.textContent = `The projection does not exhaust before age ${data.maxProjectionAge}, but the ${inputs.currentYear} withdrawal rate is ${Math.round(rate * 1000) / 10}%. A small adjustment to next year's plan could create a wider margin later.`;
  } else {
    pill.textContent = "Needs adjustment";
    pill.classList.add("danger");
    message.textContent = data.exhaustedYear
      ? `The pot is projected to exhaust in ${data.exhaustedYear.year}, around age ${data.exhaustedYear.age}. The ${inputs.currentYear} plan needs ${currency(data.nextYearPortfolioNeed)} from the portfolio.`
      : `The plan is under pressure. The ${inputs.currentYear} plan needs ${currency(data.nextYearPortfolioNeed)} from the portfolio, which is high relative to the current balance.`;
  }

  const spendReduction = Math.max(0, Math.ceil((inputs.portfolioDraw - data.startingBalance * 0.04) / 1000) * 1000);
  const incomeGap = Math.max(0, Math.ceil((inputs.portfolioDraw - data.startingBalance * 0.04) / 1000) * 1000);

  levers.innerHTML = "";
  [
    `Use ${inputs.currentYear} as the March planning baseline, then adjust it to replay future or past retirement years.`,
    `Remaining LSA is ${currency(inputs.lsaRemaining)}, with up to ${currency(inputs.availableTaxFreeCash)} currently available from uncrystallised pension funds before other scheme limits.`,
    incomeGap > 0
      ? `Add roughly ${currency(incomeGap)} of reliable income for the year to target a 4% starting withdrawal.`
      : "Reliable income covers enough of the year that portfolio withdrawals stay within range.",
    spendReduction > 0
      ? `Trim planned spending by roughly ${currency(spendReduction)} for the year to reduce portfolio pressure.`
      : "Planned spending is aligned with the current portfolio range.",
  ].forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    levers.appendChild(li);
  });
}

function updateTaxYearView(taxYearPlan, inputs) {
  const startLsa = Math.max(0, inputs.lumpSumAllowance - inputs.taxFreeLumpSumsTaken);
  const startTaxFreeCash = Math.min(startLsa, inputs.uncrystallisedPension * 0.25);
  document.querySelector("#taxYearHeading").textContent = `${inputs.currentYear}/${String(inputs.currentYear + 1).slice(2)} Tax Year`;
  document.querySelector("#monthlySpend").textContent = currency(taxYearPlan.monthlySpend);
  document.querySelector("#yearSpend").textContent = currency(taxYearPlan.yearSpend);
  document.querySelector("#taxEstimate").textContent = currency(taxYearPlan.taxEstimate);
  document.querySelector("#monthlyTaxEstimate").textContent = `(${currency(taxYearPlan.taxEstimate / 12)}/month)`;
  document.querySelector("#billsHolidaysTotal").textContent = currency(taxYearPlan.yearBills + taxYearPlan.yearHolidays);
  document.querySelector("#freeCashTile").textContent = annualMonthlyCurrency(taxYearPlan.freeCash);
  document.querySelector("#startPot").textContent = currency(inputs.startingAssets);
  document.querySelector("#startCrystallised").textContent = currency(inputs.crystallisedPension);
  document.querySelector("#startCrystallisedToDate").textContent = currency(inputs.startCrystallisedToDate);
  document.querySelector("#startUncrystallised").textContent = currency(inputs.uncrystallisedPension);
  document.querySelector("#startBankBalance").textContent = currency(inputs.bankBalance);
  document.querySelector("#startTflsTaken").textContent = currency(inputs.taxFreeLumpSumsTaken);
  document.querySelector("#startLsa").textContent = currency(startLsa);
  document.querySelector("#startTaxFreeCash").textContent = currency(startTaxFreeCash);
  document.querySelector("#endPot").textContent = currency(taxYearPlan.endPot);
  document.querySelector("#endCrystallised").textContent = currency(taxYearPlan.endCrystallised);
  document.querySelector("#endCrystallisedToDate").textContent = currency(taxYearPlan.endCrystallisedToDate);
  document.querySelector("#endUncrystallised").textContent = currency(taxYearPlan.endUncrystallised);
  document.querySelector("#endBankBalance").textContent = currency(taxYearPlan.endBankBalance);
  document.querySelector("#endTflsTaken").textContent = currency(taxYearPlan.endTflsTaken);
  document.querySelector("#endLsa").textContent = currency(taxYearPlan.endLsa);
  document.querySelector("#endTaxFreeCash").textContent = currency(taxYearPlan.endTaxFreeCash);
  document.querySelector("#changePot").textContent = currency(taxYearPlan.endPot - inputs.startingAssets);
  document.querySelector("#changeCrystallised").textContent = currency(taxYearPlan.endCrystallised - inputs.crystallisedPension);
  document.querySelector("#changeCrystallisedToDate").textContent = currency(taxYearPlan.endCrystallisedToDate - inputs.startCrystallisedToDate);
  document.querySelector("#changeUncrystallised").textContent = currency(taxYearPlan.endUncrystallised - inputs.uncrystallisedPension);
  document.querySelector("#changeBankBalance").textContent = currency(taxYearPlan.endBankBalance - inputs.bankBalance);
  document.querySelector("#changeTflsTaken").textContent = currency(taxYearPlan.endTflsTaken - inputs.taxFreeLumpSumsTaken);
  document.querySelector("#changeLsa").textContent = currency(taxYearPlan.endLsa - startLsa);
  document.querySelector("#changeTaxFreeCash").textContent = currency(taxYearPlan.endTaxFreeCash - startTaxFreeCash);

  const timeline = document.querySelector("#taxYearTimeline");
  timeline.innerHTML = "";
  taxYearPlan.months.forEach((month) => {
    const row = document.createElement("tr");
    [
      month.label,
      month.spend,
      month.income,
      month.bills,
      month.holidays,
      month.tax,
      month.taxFreeCash,
      month.partnerContribution,
      month.isaSource,
      month.savingsSource,
      month.premiumBondsSource,
      month.draw,
      month.freeCash,
      month.potLeft,
    ].forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      cell.textContent = index === 0 ? value : currency(value);
      row.appendChild(cell);
    });
    timeline.appendChild(row);
  });

  const totalsRow = document.createElement("tr");
  totalsRow.className = "totals-row";
  [
    "Total",
    taxYearPlan.yearSpend,
    inputs.annualGrossIncome,
    taxYearPlan.yearBills,
    taxYearPlan.yearHolidays,
    taxYearPlan.taxEstimate,
    inputs.effectiveTaxFreeCashThisYear,
    inputs.cashPartnerContribution,
    inputs.isaSource,
    inputs.savingsSource,
    inputs.premiumBondsSource,
    taxYearPlan.portfolioDraw,
    taxYearPlan.freeCash,
    taxYearPlan.endPot,
  ].forEach((value, index) => {
    const cell = document.createElement(index === 0 ? "th" : "td");
    cell.textContent = index === 0 ? value : currency(value);
    totalsRow.appendChild(cell);
  });
  timeline.appendChild(totalsRow);
}

function render() {
  const inputs = readInputs();
  fields.currentYear.value = Math.max(inputs.birthYear, inputs.currentYear);
  const currentAge = Number(fields.currentYear.value) - inputs.birthYear;
  fields.planningAge.value = Math.max(currentAge + 1, inputs.planningAge);
  updateTaxFreeCashControl(readInputs());
  const cleanInputs = readInputs();
  const data = project(cleanInputs);
  const taxYearPlan = buildTaxYearPlan(cleanInputs);
  const todayMoneyYearSpend = getTodayMoneyValue(taxYearPlan.yearSpend);
  const todayMoneyMonthlySpend = getTodayMoneyValue(taxYearPlan.monthlySpend);
  const todayMoneyTaxEstimate = getTodayMoneyValue(taxYearPlan.taxEstimate);
  const todayMoneyBillsHolidays = getTodayMoneyValue(taxYearPlan.yearBills + taxYearPlan.yearHolidays);
  const todayMoneyFreeCash = getTodayMoneyValue(taxYearPlan.freeCash);

  document.querySelector("#growthRateValue").textContent = `${cleanInputs.growthRate.toFixed(1)}%`;
  document.querySelector("#inflationRateValue").textContent = `${cleanInputs.inflationRate.toFixed(1)}%`;
  document.querySelector("#targetEquivalentIncomeValue").textContent = currency(cleanInputs.targetEquivalentIncome);
  targetEquivalentIncomeExact.value = document.activeElement === targetEquivalentIncomeExact
    ? targetEquivalentIncomeExact.value
    : formatNumberInput("targetEquivalentIncome", cleanInputs.targetEquivalentIncome);
  document.querySelector("#taxFreeLumpSumsThisYearValue").textContent = currency(cleanInputs.taxFreeLumpSumsThisYear);
  document.querySelector("#yearSpendToday").textContent = todayMoneyYearSpend === null
    ? "-"
    : currency(todayMoneyYearSpend);
  document.querySelector("#monthlySpendToday").textContent = todayMoneyMonthlySpend === null
    ? "-"
    : currency(todayMoneyMonthlySpend);
  document.querySelector("#taxEstimateToday").textContent = todayMoneyTaxEstimate === null
    ? "-"
    : currency(todayMoneyTaxEstimate);
  document.querySelector("#billsHolidaysToday").textContent = todayMoneyBillsHolidays === null
    ? "-"
    : currency(todayMoneyBillsHolidays);
  document.querySelector("#freeCashToday").textContent = todayMoneyFreeCash === null
    ? "-"
    : annualMonthlyCurrency(todayMoneyFreeCash);
  document.querySelector("#lsaRemaining").textContent = `${currency(cleanInputs.lsaRemaining)} LSA left`;
  document.querySelector("#annualSpendingTotal").textContent = `${currency(cleanInputs.annualSpending)}/yr`;
  updateTaxYearView(taxYearPlan, cleanInputs);

  drawChart(data);
  drawPlanStackedChart();
  updateInsights(data, cleanInputs);
}

form.addEventListener("input", () => {
  render();
  saveSettings();
});
document.querySelector("#resetButton").addEventListener("click", () => {
  resetFields();
  render();
  saveSettings();
});
document.querySelector("#exportSettingsButton").addEventListener("click", exportSettings);
document.querySelector("#importSettingsButton").addEventListener("click", () => {
  importSettingsFile.click();
});
importSettingsFile.addEventListener("change", () => {
  importSettings(importSettingsFile.files[0]);
});
planYearSlider.addEventListener("input", () => {
  selectedPlanIndex = Number(planYearSlider.value);
  applySelectedPlanYear();
});
document.querySelector("#assumptionsToggle").addEventListener("click", () => {
  const content = document.querySelector("#assumptionsContent");
  const toggle = document.querySelector("#assumptionsToggle");
  const collapsed = content.hidden;
  content.hidden = !collapsed;
  toggle.textContent = collapsed ? "Hide" : "Show";
  toggle.setAttribute("aria-expanded", String(collapsed));
});
versionTag.addEventListener("click", showLastChanged);

setupNumberInputs();
resetFields();
loadSavedSettings();
render();
