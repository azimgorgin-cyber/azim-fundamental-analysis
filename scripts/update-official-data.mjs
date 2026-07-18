import { readFile, writeFile } from "node:fs/promises";

const outputUrl = new URL("../app/data/dezagros-official.json", import.meta.url);
const current = JSON.parse(await readFile(outputUrl, "utf8"));
const symbol = current.symbol;
const instrumentId = current.instrumentId;
const codalSearchUrl = new URL("https://search.codal.ir/api/search/v2/q");

for (const [key, value] of Object.entries({
  PageNumber: "1",
  Symbol: symbol,
  LetterType: "58",
  Audited: "true",
  NotAudited: "true",
  Mains: "true",
  Childs: "true",
  Publisher: "false",
  CompanyState: "0",
  Category: "-1",
  CompanyType: "-1",
  Consolidatable: "true",
  NotConsolidatable: "true",
  Length: "-1",
})) codalSearchUrl.searchParams.set(key, value);

async function fetchWithRetry(url, kind = "json") {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "AzimFundamentalDataBot/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return kind === "text" ? response.text() : response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

function parseMonthlyReport(html, url, tracingNo) {
  const match = html.match(/var datasource\s*=\s*(\{.*?\});\s*<\/script>/s);
  if (!match) throw new Error(`Codal datasource was not found for ${tracingNo}`);
  const data = JSON.parse(match[1]);
  const table = data.sheets?.flatMap((sheet) => sheet.tables ?? []).find((item) => item.aliasName === "ProductionAndSales");
  if (!table) throw new Error(`ProductionAndSales table was not found for ${tracingNo}`);
  const totalLabel = table.cells.find((cell) => /^A\d+$/.test(cell.address) && cell.value === "جمع");
  if (!totalLabel) throw new Error(`Monthly total row was not found for ${tracingNo}`);
  const row = totalLabel.address.slice(1);
  const amountCell = table.cells.find((cell) => cell.address === `Q${row}`);
  const millionRial = Number(amountCell?.value);
  if (!Number.isFinite(millionRial)) throw new Error(`Monthly sales amount was not found for ${tracingNo}`);
  return {
    period: data.periodEndToDate,
    publishedAt: data.publishDateTime,
    tracingNo: Number(tracingNo),
    salesBillionToman: Math.round((millionRial / 10_000) * 10) / 10,
    url,
  };
}

function parseCodalDatasource(html, sheetName) {
  const match = html.match(/var datasource\s*=\s*(\{.*?\});\s*<\/script>/s);
  if (!match) throw new Error(`Codal datasource was not found for ${sheetName}`);
  return JSON.parse(match[1]);
}

function normalizeLabel(value) {
  return String(value ?? "")
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(/[­‌ـ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function statementTable(data, aliasName) {
  const table = data.sheets?.flatMap((sheet) => sheet.tables ?? []).find((item) => item.aliasName === aliasName);
  if (!table) throw new Error(`${aliasName} table was not found`);
  return table;
}

function statementColumn(table, period) {
  const header = table.cells.find((cell) => /^[A-Z]1$/.test(cell.address) && String(cell.value).includes(period));
  if (!header) throw new Error(`Statement column for ${period} was not found`);
  return header.address[0];
}

function statementValue(table, column, labelFragment) {
  const label = table.cells.find((cell) => /^A\d+$/.test(cell.address) && normalizeLabel(cell.value).includes(normalizeLabel(labelFragment)));
  if (!label) throw new Error(`Statement row ${labelFragment} was not found`);
  const row = label.address.slice(1);
  const value = Number(table.cells.find((cell) => cell.address === `${column}${row}`)?.value);
  if (!Number.isFinite(value)) throw new Error(`Statement value ${labelFragment} was not found`);
  return value / 10_000;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizePersianName(value) {
  return value.replace(/^BFM/, "").replaceAll("ي", "ی").replaceAll("ك", "ک").replace(/\s+/g, " ").trim();
}

async function mapLimited(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
}

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const monthEndDays = ["31", "31", "31", "31", "31", "31", "30", "30", "30", "30", "30", "29"];
let monthlySalesTrend = current.monthlySalesTrend;
let cashQuality = current.cashQuality;
let latestMonthlyReport = {
  period: current.sources.codalMonthly.asOf,
  publishedAt: current.sources.codalMonthly.publishedAt,
  url: current.sources.codalMonthly.url,
};

try {
  const search = await fetchWithRetry(codalSearchUrl);
  const monthlyLetters = search.Letters
    .filter((letter) => letter.Title.startsWith("گزارش فعالیت ماهانه"))
    .filter((letter) => /۱۴۰۴|۱۴۰۵/.test(letter.Title));

  const reports = await mapLimited(monthlyLetters, 4, async (letter) => {
    const url = new URL(letter.Url, "https://www.codal.ir").href;
    const html = await fetchWithRetry(url, "text");
    return parseMonthlyReport(html, url, letter.TracingNo);
  });

  const latestByPeriod = new Map();
  for (const report of reports) {
    const existing = latestByPeriod.get(report.period);
    if (!existing || report.tracingNo > existing.tracingNo) latestByPeriod.set(report.period, report);
  }

  monthlySalesTrend = monthNames.map((month, index) => {
    const suffix = `${String(index + 1).padStart(2, "0")}/${monthEndDays[index]}`;
    const report1404 = latestByPeriod.get(`1404/${suffix}`);
    const report1405 = [...latestByPeriod.values()].find((report) => report.period.startsWith(`1405/${String(index + 1).padStart(2, "0")}/`));
    if (!report1404) throw new Error(`Missing official monthly report for 1404/${suffix}`);
    return {
      month,
      sales1404: report1404.salesBillionToman,
      sales1405: report1405?.salesBillionToman ?? null,
      source1404: report1404.url,
      source1405: report1405?.url ?? null,
    };
  });

  latestMonthlyReport = [...latestByPeriod.values()]
    .filter((report) => report.period.startsWith("1405/"))
    .sort((a, b) => b.period.localeCompare(a.period))[0] ?? latestMonthlyReport;
} catch (error) {
  console.warn(`Codal refresh failed; keeping the last official monthly dataset: ${error.message}`);
}

try {
  const annualUrl = current.sources.codalAnnual.url;
  const [cashFlowHtml, balanceSheetHtml] = await Promise.all([
    fetchWithRetry(`${annualUrl}&sheetId=9`, "text"),
    fetchWithRetry(`${annualUrl}&sheetId=0`, "text"),
  ]);
  const cashFlow = statementTable(parseCodalDatasource(cashFlowHtml, "cash flow"), "CashFlow");
  const balanceSheet = statementTable(parseCodalDatasource(balanceSheetHtml, "balance sheet"), "BalanceSheet");
  const cashCurrentColumn = statementColumn(cashFlow, "1404/12/29");
  const cashPriorColumn = statementColumn(cashFlow, "1403/12/30");
  const balanceCurrentColumn = statementColumn(balanceSheet, "1404/12/29");
  const balancePriorColumn = statementColumn(balanceSheet, "1403/12/30");
  const profitCurrent = current.yearlyTrend.find((row) => row.year === "۱۴۰۴").netProfit;
  const profitPrior = current.yearlyTrend.find((row) => row.year === "۱۴۰۳").netProfit;
  const salesCurrent = current.yearlyTrend.find((row) => row.year === "۱۴۰۴").sales;
  const salesPrior = current.yearlyTrend.find((row) => row.year === "۱۴۰۳").sales;
  const buildCashYear = (year, column, netProfit) => {
    const operatingCashFlow = statementValue(cashFlow, column, "جریان خالص ورود (خروج) نقد حاصل از فعالیت های عملیاتی");
    const tangibleCapex = Math.abs(statementValue(cashFlow, column, "پرداخت های نقدی برای خرید دارایی های ثابت مشهود"));
    const intangibleCapex = Math.abs(statementValue(cashFlow, column, "پرداخت های نقدی برای خرید دارایی های نامشهود"));
    const capitalExpenditure = tangibleCapex + intangibleCapex;
    return {
      year,
      netProfit,
      operatingCashFlow: round(operatingCashFlow),
      capitalExpenditure: round(capitalExpenditure),
      freeCashFlow: round(operatingCashFlow - capitalExpenditure),
      cashConversionPercent: round((operatingCashFlow / netProfit) * 100),
    };
  };
  const balancePair = (label) => ({
    current: statementValue(balanceSheet, balanceCurrentColumn, label),
    prior: statementValue(balanceSheet, balancePriorColumn, label),
  });
  const receivables = balancePair("دریافتنی های تجاری و سایر دریافتنی ها");
  const inventory = balancePair("موجودی مواد و کالا");
  const tradePayables = balancePair("پرداختنی های تجاری و سایر پرداختنی ها");
  const currentAssets = balancePair("جمع دارایی های جاری");
  const currentLiabilities = balancePair("جمع بدهی های جاری");
  const withGrowth = (pair) => ({ current: round(pair.current), prior: round(pair.prior), growthPercent: round(((pair.current / pair.prior) - 1) * 100) });
  cashQuality = {
    status: "official_and_derived",
    unit: "billion_toman",
    annual: [buildCashYear("۱۴۰۳", cashPriorColumn, profitPrior), buildCashYear("۱۴۰۴", cashCurrentColumn, profitCurrent)],
    endingCash: round(statementValue(balanceSheet, balanceCurrentColumn, "موجودی نقد")),
    workingCapital: {
      salesGrowthPercent: round(((salesCurrent / salesPrior) - 1) * 100),
      receivables: withGrowth(receivables),
      inventory: withGrowth(inventory),
      tradePayables: withGrowth(tradePayables),
      currentRatio: { current: round(currentAssets.current / currentLiabilities.current, 2), prior: round(currentAssets.prior / currentLiabilities.prior, 2) },
    },
    assessment: current.cashQuality.assessment,
  };
} catch (error) {
  console.warn(`Codal statement refresh failed; keeping the last audited cash-quality dataset: ${error.message}`);
}

let marketSnapshot = current.marketSnapshot;
let shareholders = current.shareholders;
let tsetmcAsOf = current.sources.tsetmc.asOf;

try {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
  const base = "https://cdn.tsetmc.com/api";
  const [priceData, instrumentData, shareholderData] = await Promise.all([
    fetchWithRetry(`${base}/ClosingPrice/GetClosingPriceInfo/${instrumentId}`),
    fetchWithRetry(`${base}/Instrument/GetInstrumentInfo/${instrumentId}`),
    fetchWithRetry(`${base}/Shareholder/${instrumentId}/${tomorrow}`),
  ]);
  const price = priceData.closingPriceInfo;
  const instrument = instrumentData.instrumentInfo;
  marketSnapshot = {
    lastPrice: price.pDrCotVal,
    closingPrice: price.pClosing,
    yesterdayPrice: price.priceYesterday,
    date: price.dEven,
    time: price.lastHEven,
    shares: instrument.zTitad,
    eps: Number(instrument.eps.estimatedEPS),
    sectorPe: Number(instrument.eps.sectorPE),
  };
  if (shareholderData.shareShareholder?.length) {
    shareholders = shareholderData.shareShareholder
      .map((item) => ({ name: normalizePersianName(item.shareHolderName), shares: item.numberOfShares, percent: item.perOfShares, date: Math.min(item.dEven, price.dEven) }))
      .sort((a, b) => b.percent - a.percent);
  }
  tsetmcAsOf = `${String(price.dEven).slice(0, 4)}-${String(price.dEven).slice(4, 6)}-${String(price.dEven).slice(6, 8)}`;
} catch (error) {
  console.warn(`TSETMC refresh failed; keeping the last official snapshot: ${error.message}`);
}

const monthlyTotal = Math.round(monthlySalesTrend.reduce((sum, row) => sum + row.sales1404, 0) * 10) / 10;
const annualTotal = current.yearlyTrend.find((row) => row.year === "۱۴۰۴").sales;
const difference = Math.round((monthlyTotal - annualTotal) * 10) / 10;
const differencePercent = Math.round((Math.abs(difference) / annualTotal) * 10_000) / 100;

const next = {
  ...current,
  sources: {
    ...current.sources,
    tsetmc: { ...current.sources.tsetmc, asOf: tsetmcAsOf },
    codalMonthly: {
      status: "official",
      asOf: latestMonthlyReport.period,
      publishedAt: latestMonthlyReport.publishedAt,
      url: latestMonthlyReport.url,
    },
  },
  marketSnapshot,
  shareholders,
  monthlySalesTrend,
  cashQuality,
  validation: {
    ...current.validation,
    monthlyToAnnualSales1404: {
      status: differencePercent <= 1 ? "matched_with_difference" : "needs_review",
      monthlyTotal,
      annualTotal,
      difference,
      differencePercent,
      note: differencePercent <= 1
        ? `جمع گزارش‌های ماهانه با فروش حسابرسی‌شده سالانه ${differencePercent.toFixed(2)}٪ اختلاف دارد؛ رقم سالانه برای تحلیل صورت مالی مرجع است.`
        : `اختلاف جمع گزارش‌های ماهانه و فروش حسابرسی‌شده سالانه ${differencePercent.toFixed(2)}٪ است و نیاز به بررسی دارد.`,
    },
  },
};

await writeFile(outputUrl, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Official data updated through ${latestMonthlyReport.period}; TSETMC snapshot ${marketSnapshot.date}.`);
