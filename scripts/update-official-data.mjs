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

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const monthEndDays = ["31", "31", "31", "31", "31", "31", "30", "30", "30", "30", "30", "29"];
const monthlySalesTrend = monthNames.map((month, index) => {
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

const latestMonthlyReport = [...latestByPeriod.values()]
  .filter((report) => report.period.startsWith("1405/"))
  .sort((a, b) => b.period.localeCompare(a.period))[0];

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
