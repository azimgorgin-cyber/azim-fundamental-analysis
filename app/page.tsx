"use client";

import { useEffect, useState } from "react";
import officialData from "./data/dezagros-official.json";

type View = "overview" | "financials" | "valuation";

const TSETMC_INSTRUMENT_ID = officialData.instrumentId;
const TSETMC_URL = `https://www.tsetmc.com/instInfo/${TSETMC_INSTRUMENT_ID}`;
const CODAL_URL = officialData.sources.codalAnnual.url;
const MONTHLY_CODAL_URL = officialData.sources.codalMonthly.url;

type MarketSnapshot = {
  lastPrice: number;
  closingPrice: number;
  yesterdayPrice: number;
  date: number;
  time: number;
  shares: number;
  eps: number;
  sectorPe: number;
};

type Shareholder = {
  name: string;
  shares: number;
  percent: number;
  date: number;
};

const officialSnapshot: MarketSnapshot = officialData.marketSnapshot;
const officialShareholders: Shareholder[] = officialData.shareholders;
const yearlyTrend = officialData.yearlyTrend;
const seasonalTrend = officialData.seasonalTrend;
const monthlySalesTrend = officialData.monthlySalesTrend;
const publishedMonthlySalesTrend = monthlySalesTrend.filter((row) => row.sales1405 !== null);
const seasonalPerformance = seasonalTrend.map((row, index) => {
  const months = monthlySalesTrend.slice(index * 3, index * 3 + 3);
  const hasComplete1405Quarter = months.length === 3 && months.every((month) => month.sales1405 !== null);
  const sales1404 = Math.round(months.reduce((sum, month) => sum + month.sales1404, 0) * 10) / 10;
  return {
    ...row,
    sales1404,
    margin1404: (row.profit1404 / sales1404) * 100,
    sales1405: hasComplete1405Quarter
      ? Math.round(months.reduce((sum, month) => sum + (month.sales1405 ?? 0), 0) * 10) / 10
      : null,
  };
});
const dataSources = officialData.sources;
const salesReconciliation = officialData.validation.monthlyToAnnualSales1404;

const financialRows = yearlyTrend.map((row) => ({
  ...row,
  margin: (row.netProfit / row.sales) * 100,
}));

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const faPercent = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

function toFaDigits(value: string) {
  return value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function formatMarketDate(value: number) {
  const raw = String(value);
  const date = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T12:00:00Z`);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formatMarketTime(value: number) {
  const raw = String(value).padStart(6, "0");
  return `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)}`;
}

function formatShares(value: number) {
  return value >= 1_000_000_000
    ? `${faNumber.format(value / 1_000_000_000)} میلیارد سهم`
    : `${faNumber.format(value / 1_000_000)} میلیون سهم`;
}

function normalizePersianName(value: string) {
  return value.replace(/^BFM/, "").replaceAll("ي", "ی").replaceAll("ك", "ک").replace(/\s+/g, " ").trim();
}

function useOfficialMarketData() {
  const [market, setMarket] = useState(officialSnapshot);
  const [shareholders, setShareholders] = useState(officialShareholders);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
    const base = "https://cdn.tsetmc.com/api";

    Promise.all([
      fetch(`${base}/ClosingPrice/GetClosingPriceInfo/${TSETMC_INSTRUMENT_ID}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`${base}/Instrument/GetInstrumentInfo/${TSETMC_INSTRUMENT_ID}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`${base}/Shareholder/${TSETMC_INSTRUMENT_ID}/${tomorrow}`, { cache: "no-store" }).then((response) => response.json()),
    ])
      .then(([priceData, instrumentData, shareholderData]) => {
        const price = priceData.closingPriceInfo;
        const instrument = instrumentData.instrumentInfo;
        setMarket({
          lastPrice: price.pDrCotVal,
          closingPrice: price.pClosing,
          yesterdayPrice: price.priceYesterday,
          date: price.dEven,
          time: price.lastHEven,
          shares: instrument.zTitad,
          eps: Number(instrument.eps.estimatedEPS),
          sectorPe: Number(instrument.eps.sectorPE),
        });
        if (shareholderData.shareShareholder?.length) {
          setShareholders(
            shareholderData.shareShareholder
              .map((item: { shareHolderName: string; numberOfShares: number; perOfShares: number; dEven: number }) => ({
                name: normalizePersianName(item.shareHolderName),
                shares: item.numberOfShares,
                percent: item.perOfShares,
                date: Math.min(item.dEven, price.dEven),
              }))
              .sort((a: Shareholder, b: Shareholder) => b.percent - a.percent),
          );
        }
        setIsLive(true);
      })
      .catch(() => setIsLive(false));
  }, []);

  return { market, shareholders, isLive };
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const { market, shareholders, isLive } = useOfficialMarketData();
  const dailyChange = ((market.closingPrice - market.yesterdayPrice) / market.yesterdayPrice) * 100;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="صفحه اصلی عظیم">
          <span className="brand-mark">ع</span>
          <span>
            <strong>عظیم</strong>
            <small>دستیار تحلیل بنیادی</small>
          </span>
        </a>

        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجوی نماد یا نام شرکت"
            aria-label="جست‌وجوی نماد یا نام شرکت"
          />
          {query && <button onClick={() => setQuery("")} aria-label="پاک کردن جست‌وجو">×</button>}
        </label>

        <div className="header-status"><span className={isLive ? "live" : ""} /> {isLive ? "اتصال زنده به TSETMC" : "آخرین داده رسمی ذخیره‌شده"}</div>
      </header>

      <section className="workspace" id="top">
        <div className="company-heading">
          <div>
            <div className="eyebrow"><span className="ticker">دزاگرس</span> بازار دوم فرابورس</div>
            <h1>دارویی و نهاده‌های زاگرس دارو پارسیان</h1>
            <p>اطلاعات بازار از TSETMC و صورت‌های مالی از کدال؛ همه مبالغ این داشبورد به تومان نمایش داده می‌شوند.</p>
          </div>
          <div className="price-block">
            <small>آخرین معامله</small>
            <strong><bdi>{faNumber.format(market.lastPrice / 10)}</bdi> <span>تومان</span></strong>
            <em className={dailyChange >= 0 ? "up" : "down"}>{faPercent.format(dailyChange)}٪ نسبت به دیروز · پایانی {faNumber.format(market.closingPrice / 10)}</em>
            <small>آخرین داده: {formatMarketDate(market.date)} · {formatMarketTime(market.time)}</small>
          </div>
        </div>

        <nav className="view-tabs" aria-label="بخش‌های تحلیل">
          {([
            ["overview", "نمای کلی"],
            ["financials", "صورت‌های مالی"],
            ["valuation", "ارزش‌گذاری"],
          ] as const).map(([id, label]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>

        {view === "overview" && <Overview market={market} shareholders={shareholders} />}
        {view === "financials" && <Financials />}
        {view === "valuation" && <Valuation market={market} />}
      </section>

      <footer>
        <span>عظیم · نسخهٔ نخست</span>
        <span>این صفحه توصیهٔ خرید یا فروش نیست.</span>
      </footer>
    </main>
  );
}

function Overview({ market, shareholders }: { market: MarketSnapshot; shareholders: Shareholder[] }) {
  const yearlyMax = Math.max(...yearlyTrend.map((row) => row.sales));
  const seasonalMax = Math.max(...seasonalPerformance.flatMap((row) => row.sales1405 === null ? [row.sales1404, row.profit1404] : [row.sales1404, row.profit1404, row.sales1405]));
  const seasonalMarginScaleMax = 50;
  const seasonalMarginLinePoints = seasonalPerformance.map((row, index) => `${12.5 + index * 25},${100 - (row.margin1404 / seasonalMarginScaleMax) * 100}`).join(" ");
  const monthlySalesMax = Math.max(...publishedMonthlySalesTrend.flatMap((row) => [row.sales1404, row.sales1405 ?? 0]));
  const marginScaleMax = 50;
  const marginLinePoints = financialRows.map((row, index) => `${10 + index * 20},${100 - (row.margin / marginScaleMax) * 100}`).join(" ");
  const marketValue = (market.closingPrice * market.shares) / 10_000_000_000_000;
  const pe = market.closingPrice / market.eps;

  return (
    <div className="view-content">
      <section className="summary-grid">
        <article className="score-card panel">
          <div className="panel-label">وضعیت اعتبار داده</div>
          <div className="score-row">
            <div className="score-ring official"><strong>رسمی</strong><span>دو منبع</span></div>
            <div>
              <h2>داده‌های رسمی کنترل و طبقه‌بندی شدند</h2>
              <p>قیمت و سهامداران از TSETMC؛ فروش و سود از کدال. اعداد محاسبه‌شده جدا از داده‌های رسمی علامت‌گذاری می‌شوند.</p>
            </div>
          </div>
          <div className={`data-check ${salesReconciliation.status}`}>
            <strong>کنترل تطبیق فروش ۱۴۰۴</strong>
            <span>جمع ماهانه {faNumber.format(salesReconciliation.monthlyTotal)} در برابر فروش سالانه {faNumber.format(salesReconciliation.annualTotal)} میلیارد تومان</span>
            <small>اختلاف {faNumber.format(salesReconciliation.difference)} میلیارد تومان · {faPercent.format(salesReconciliation.differencePercent)}٪</small>
          </div>
          <div className="source-actions"><a href={TSETMC_URL} target="_blank" rel="noreferrer">مشاهده در TSETMC</a><a href={CODAL_URL} target="_blank" rel="noreferrer">آخرین صورت مالی کدال</a></div>
        </article>

        <article className="thesis-card panel">
          <div className="panel-label">فرضیهٔ تحلیلی · نه داده رسمی</div>
          <blockquote>آیا رشد مقدار فروش و ترکیب محصولات می‌تواند جلوتر از تورم مواد اولیه حرکت کند؟</blockquote>
          <div className="signal-row">
            <span className="positive">رشد درآمد و سود عملیاتی</span>
            <span className="warning">ریسک قیمت‌گذاری دستوری</span>
          </div>
        </article>
      </section>

      <section className="metrics" aria-label="شاخص‌های کلیدی">
        <Metric label="سرمایه ثبت‌شده" value={`${faNumber.format(officialData.registeredCapitalBillionToman)} میلیارد`} note="تومان · رسمی · کدال ۱۴۰۴" tone="positive" />
        <Metric label="تعداد سهام" value={faNumber.format(market.shares / 1_000_000_000) + " میلیارد"} note="TSETMC" tone="positive" />
        <Metric label="ارزش بازار" value={faNumber.format(marketValue) + " همت"} note="بر پایه قیمت پایانی" tone="neutral" />
        <Metric label="EPS دوازده‌ماهه" value={faNumber.format(market.eps / 10) + " تومان"} note={`P/E: ${faNumber.format(pe)}`} tone="neutral" />
      </section>

      <section className="analysis-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <div><span className="panel-label">روند پنج‌ساله · کدال</span><h2>فروش و سود خالص</h2><DataBadges items={["رسمی", "حاشیه سود: محاسبه‌شده"]} /></div>
            <strong className="growth"><bdi>+۷۳٫۹٪</bdi><small>رشد مرکب فروش</small></strong>
          </div>
          <ChartLegend items={[["فروش", "sales"], ["سود خالص", "profit"], ["حاشیه سود خالص", "margin"]]} />
          <div className="bar-chart" aria-label="نمودار فروش و سود خالص پنج ساله؛ میلیارد تومان">
            {yearlyTrend.map((row) => (
              <div className="bar-column" key={row.year} tabIndex={0} aria-label={`${row.year}، فروش ${faNumber.format(row.sales)}، سود خالص ${faNumber.format(row.netProfit)} میلیارد تومان و حاشیه سود خالص ${faPercent.format((row.netProfit / row.sales) * 100)} درصد`}>
                <ChartTooltip title={`سال ${row.year}`} rows={[["فروش", row.sales, "sales"], ["سود خالص", row.netProfit, "profit"], ["حاشیه سود خالص", (row.netProfit / row.sales) * 100, "margin", "٪"]]} />
                <div className="bar-track dual">
                  <span className="sales-bar" style={{ height: `${(row.sales / yearlyMax) * 100}%` }} />
                  <span className="profit-bar" style={{ height: `${(row.netProfit / yearlyMax) * 100}%` }} />
                </div>
                <small>{row.year}</small>
              </div>
            ))}
            <div className="margin-overlay" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={marginLinePoints} /></svg>
              {financialRows.map((row, index) => (
                <span className="margin-point" key={row.year} style={{ left: `${10 + index * 20}%`, bottom: `${(row.margin / marginScaleMax) * 100}%` }}>
                  <b>{faPercent.format(row.margin)}٪</b>
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="panel drivers-panel">
          <div className="panel-label">محرک‌های سودآوری</div>
          <h2>چه چیزهایی را باید پایش کنیم؟</h2>
          <ul className="driver-list">
            <li><span className="driver-icon up">↗</span><div><strong>مقدار فروش و ترکیب محصول</strong><small>محصولات ضد درد و اقلام پرفروش، هستهٔ رشد درآمد</small></div><bdi>زیاد</bdi></li>
            <li><span className="driver-icon flat">—</span><div><strong>مجوز افزایش نرخ</strong><small>زمان و اندازهٔ اصلاح قیمت بر حاشیه سود اثر مستقیم دارد</small></div><bdi>زیاد</bdi></li>
            <li><span className="driver-icon down">↘</span><div><strong>مواد اولیه و سرمایه در گردش</strong><small>ارز، موجودی و دوره وصول مطالبات را باید هم‌زمان دید</small></div><bdi>متوسط</bdi></li>
          </ul>
        </article>
      </section>

      <section className="panel seasonal-panel">
        <div className="panel-head">
          <div><span className="panel-label">عملکرد فصلی از ابتدای ۱۴۰۴ · کدال</span><h2>فروش و سود خالص فصلی</h2><DataBadges items={["رسمی", "فروش فصل: جمع ماهانه"]} /></div>
          <span className="unit">میلیارد تومان · فقط فصل‌های تکمیل‌شدهٔ ۱۴۰۵ نمایش داده می‌شوند</span>
        </div>
        <ChartLegend items={[["فروش ۱۴۰۴", "sales-previous"], ["سود خالص ۱۴۰۴", "profit"], ["فروش ۱۴۰۵", "sales"], ["حاشیه سود خالص ۱۴۰۴", "margin"]]} />
        <div className="seasonal-scroll">
          <div className="seasonal-chart" aria-label="نمودار فروش و سود خالص فصلی از ۱۴۰۴؛ میلیارد تومان">
            {seasonalPerformance.map((row) => (
              <div className="season-group" key={row.season} tabIndex={0} aria-label={`${row.season}، فروش ۱۴۰۴ ${faNumber.format(row.sales1404)} و سود خالص ۱۴۰۴ ${faNumber.format(row.profit1404)} میلیارد تومان${row.sales1405 === null ? "" : ` و فروش ۱۴۰۵ ${faNumber.format(row.sales1405)} میلیارد تومان`}‌`}>
                <ChartTooltip title={row.season} rows={row.sales1405 === null ? [["فروش ۱۴۰۴", row.sales1404, "sales-previous"], ["سود خالص ۱۴۰۴", row.profit1404, "profit"], ["حاشیه سود خالص", row.margin1404, "margin", "٪"]] : [["فروش ۱۴۰۴", row.sales1404, "sales-previous"], ["سود خالص ۱۴۰۴", row.profit1404, "profit"], ["فروش ۱۴۰۵", row.sales1405, "sales"], ["حاشیه سود خالص", row.margin1404, "margin", "٪"]]} />
                <div className="season-bars">
                  <span className="sales-previous-bar" style={{ height: `${(row.sales1404 / seasonalMax) * 100}%` }} />
                  <span className="profit-bar" style={{ height: `${(row.profit1404 / seasonalMax) * 100}%` }} />
                  {row.sales1405 !== null && <span className="sales-bar" style={{ height: `${(row.sales1405 / seasonalMax) * 100}%` }} />}
                </div>
                <small>{row.season}</small>
              </div>
            ))}
            <div className="margin-overlay seasonal-margin-overlay" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={seasonalMarginLinePoints} /></svg>
              {seasonalPerformance.map((row, index) => (
                <span className="margin-point" key={row.season} style={{ left: `${12.5 + index * 25}%`, bottom: `${(row.margin1404 / seasonalMarginScaleMax) * 100}%` }}>
                  <b>{faPercent.format(row.margin1404)}٪</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel monthly-panel">
        <div className="panel-head">
          <div><span className="panel-label">گزارش‌های فعالیت ماهانه · کدال</span><h2>فروش ماهانه؛ مقایسه ۱۴۰۴ و ۱۴۰۵</h2><DataBadges items={["رسمی", `تا ${toFaDigits(dataSources.codalMonthly.asOf)}`]} /></div>
          <a className="source-link" href={MONTHLY_CODAL_URL} target="_blank" rel="noreferrer">آخرین گزارش ماهانه کدال</a>
        </div>
        <div className="monthly-note">میلیارد تومان · آخرین گزارش منتشرشده: {toFaDigits(dataSources.codalMonthly.publishedAt)} · به‌روزرسانی خودکار روزانه</div>
        <ChartLegend items={[["فروش ۱۴۰۴", "previous"], ["فروش ۱۴۰۵", "sales"]]} />
        <div className="monthly-scroll">
          <div className="monthly-chart" style={{ gridTemplateColumns: `repeat(${publishedMonthlySalesTrend.length}, minmax(82px, 1fr))` }} aria-label="نمودار مقایسه فروش ماهانه منتشرشده ۱۴۰۴ و ۱۴۰۵؛ میلیارد تومان">
            {publishedMonthlySalesTrend.map((row) => {
              const sales1405 = row.sales1405 ?? 0;
              const tooltipRows: [string, number, string, string?][] = [["فروش ۱۴۰۴", row.sales1404, "previous"], ["فروش ۱۴۰۵", sales1405, "sales"]];
              return (
                <div className="monthly-group" key={row.month} tabIndex={0} aria-label={`${row.month}، فروش ۱۴۰۴ ${faNumber.format(row.sales1404)} و فروش ۱۴۰۵ ${faNumber.format(sales1405)} میلیارد تومان`}>
                  <ChartTooltip title={row.month} rows={tooltipRows} />
                  <div className="month-bars">
                    <span className="previous-bar" style={{ height: `${(row.sales1404 / monthlySalesMax) * 100}%` }} />
                    <span className="sales-bar" style={{ height: `${(sales1405 / monthlySalesMax) * 100}%` }} />
                  </div>
                  <small>{row.month}</small>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="analysis-grid official-grid">
        <article className="panel market-facts">
          <div className="panel-label">اطلاعات اصلی نماد · TSETMC</div>
          <h2>مشخصات بازار دزاگرس</h2>
          <dl>
            <div><dt>بازار</dt><dd>بازار دوم فرابورس</dd></div>
            <div><dt>صنعت</dt><dd>مواد و محصولات دارویی</dd></div>
            <div><dt>شناسه ISIN</dt><dd><bdi>IRO3ZGDZ0007</bdi></dd></div>
            <div><dt>تعداد سهام</dt><dd>{formatShares(market.shares)}</dd></div>
            <div><dt>P/E سهم</dt><dd>{faNumber.format(pe)}</dd></div>
            <div><dt>P/E گروه</dt><dd>{faNumber.format(market.sectorPe)}</dd></div>
          </dl>
        </article>
        <article className="panel shareholders-panel">
          <div className="panel-head"><div><span className="panel-label">دارندگان عمده · TSETMC</span><h2>سهامداران اعلام‌شده</h2></div><span className="unit">پایان روز {formatMarketDate(shareholders[0]?.date ?? market.date)}</span></div>
          <div className="shareholder-list">
            {shareholders.map((holder, index) => (
              <div key={`${holder.name}-${holder.shares}`}><span><b>{holder.name}</b><small>{formatShares(holder.shares)}</small></span><strong>{faPercent.format(holder.percent)}٪</strong><i style={{ width: `${holder.percent}%` }} /></div>
            ))}
          </div>
          <p className="source-note">فهرست TSETMC فقط دارندگان عمده اعلام‌شده را نشان می‌دهد و لزوماً جمع آن ۱۰۰٪ نیست.</p>
        </article>
      </section>

      <section className="analysis-grid bottom-grid">
        <article className="panel">
          <div className="panel-label">تز اولیه</div>
          <h2>چرا ارزش بررسی دارد؟</h2>
          <ul className="check-list">
            <li>حضور تخصصی در بازار داروهای ضد درد مخدر و غیرمخدر</li>
            <li>ظرفیت رشد فروش از مسیر مقدار، نرخ و ترکیب محصول</li>
            <li>تقاضای نسبتاً پایدار صنعت دارو در چرخه‌های اقتصادی</li>
          </ul>
        </article>
        <article className="panel risk-card">
          <div className="panel-label">عوامل ابطال تحلیل</div>
          <h2>چه چیزی دیدگاه را تغییر می‌دهد؟</h2>
          <ul className="risk-list">
            <li>افت پایدار حاشیه سود عملیاتی به کمتر از ۳۰٪</li>
            <li>رشد مطالبات تجاری سریع‌تر از فروش برای چند فصل</li>
            <li>تغییر مقررات تولید یا توزیع داروهای تحت کنترل</li>
          </ul>
        </article>
      </section>
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return (
    <article className="metric-card">
      <small>{label}</small>
      <strong>{value}</strong>
      <span className={tone}>{note}</span>
    </article>
  );
}

function DataBadges({ items }: { items: string[] }) {
  return <div className="data-badges">{items.map((item, index) => <span className={index === 0 ? "official" : "derived"} key={item}>{item}</span>)}</div>;
}

function ChartLegend({ items }: { items: [string, string][] }) {
  return <div className="chart-legend">{items.map(([label, tone]) => <span key={label}><i className={tone} />{label}</span>)}</div>;
}

function ChartTooltip({ title, rows }: { title: string; rows: [string, number, string, string?][] }) {
  return (
    <div className="chart-tooltip" role="tooltip">
      <strong>{title}</strong>
      {rows.map(([label, value, tone, unit = "میلیارد تومان"]) => <span key={label}><i className={tone} />{label}<b>{faNumber.format(value)} {unit}</b></span>)}
    </div>
  );
}

function Financials() {
  return (
    <div className="view-content">
      <section className="panel table-panel">
        <div className="panel-head">
          <div><span className="panel-label">خلاصه عملکرد</span><h2>صورت سود و زیان پنج‌ساله</h2></div>
          <span className="unit">ارقام: میلیارد تومان · منبع: کدال</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>سال مالی</th><th>فروش</th><th>سود خالص</th><th>حاشیه سود خالص</th><th>وضعیت منبع</th></tr></thead>
            <tbody>{financialRows.map((row) => <tr key={row.year}><td>{row.year}</td><td>{faNumber.format(row.sales)}</td><td>{faNumber.format(row.netProfit)}</td><td>{faPercent.format(row.margin)}٪</td><td>{row.status}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="analysis-grid">
        <article className="panel"><div className="panel-label">کنترل کیفیت منبع</div><h2>چهار سال حسابرسی‌شده</h2><p className="support-copy">ارقام ۱۴۰۱ تا ۱۴۰۴ از صورت‌های مالی حسابرسی‌شده گرفته شده‌اند. رقم ۱۴۰۰ ستون مقایسه‌ای گزارش ۱۴۰۱ و حسابرسی‌نشده است؛ این تفاوت در جدول مشخص شده است.</p></article>
        <article className="panel"><div className="panel-label">ساختار سرمایه</div><h2>آخرین سرمایه ثبت‌شده</h2><div className="balance-pairs"><span><small>سرمایه فعلی</small><strong>۷۷۰ میلیارد تومان</strong></span><span><small>سرمایه قبلی</small><strong>۱۷۰ میلیارد تومان</strong></span><span><small>رشد سرمایه</small><strong>۳۵۳٪</strong></span></div></article>
      </section>
    </div>
  );
}

function Valuation({ market }: { market: MarketSnapshot }) {
  const pe = market.closingPrice / market.eps;
  return (
    <div className="view-content">
      <section className="valuation-hero panel">
        <div><span className="panel-label">داده بازار · TSETMC</span><h2>نمای فعلی ارزش‌گذاری نسبی</h2><p>این بخش فقط مضارب رسمی بازار را نشان می‌دهد؛ هنوز ارزش منصفانه یا توصیه خرید و فروش محاسبه نشده است.</p></div>
        <div className="fair-value"><small>قیمت پایانی</small><strong>{faNumber.format(market.closingPrice / 10)} <span>تومان</span></strong><em>آخرین داده {formatMarketDate(market.date)}</em></div>
      </section>
      <section className="scenario-grid">
        <Scenario title="P/E سهم" value={faNumber.format(pe)} note="قیمت پایانی تقسیم بر EPS دوازده‌ماهه" tone="bear" unit="برابر" />
        <Scenario title="P/E گروه" value={faNumber.format(market.sectorPe)} note="میانگین صنعت در TSETMC" tone="base" unit="برابر" />
        <Scenario title="EPS دوازده‌ماهه" value={faNumber.format(market.eps / 10)} note="عدد TTM اعلامی TSETMC" tone="bull" unit="تومان" />
      </section>
      <section className="analysis-grid">
        <article className="panel method-card"><div className="panel-label">گام بعدی</div><h2>P/E آینده‌نگر</h2><p>پس از ساخت برآورد سود ۱۴۰۵ و حذف اقلام غیرتکراری، سناریوهای ضریب هدف اضافه می‌شوند.</p></article>
        <article className="panel method-card"><div className="panel-label">گام بعدی</div><h2>جریان نقد تنزیل‌شده</h2><p>مدل DCF پس از تکمیل جریان نقد عملیاتی، سرمایه در گردش و برنامه سرمایه‌گذاری ساخته می‌شود.</p></article>
      </section>
    </div>
  );
}

function Scenario({ title, value, note, tone, unit }: { title: string; value: string; note: string; tone: string; unit: string }) {
  return <article className={`scenario-card ${tone}`}><span>{title}</span><strong>{value} <small>{unit}</small></strong><p>{note}</p></article>;
}
