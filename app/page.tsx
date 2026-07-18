"use client";

import { useEffect, useState } from "react";

type View = "overview" | "financials" | "valuation";

const TSETMC_INSTRUMENT_ID = "43450146028916610";
const TSETMC_URL = `https://www.tsetmc.com/instInfo/${TSETMC_INSTRUMENT_ID}`;
const CODAL_URL = "https://www.codal.ir/Reports/Decision.aspx?LetterSerial=Wrkmb17ieruWpxFvobgbyw%3d%3d&rt=0&let=6&ct=0&ft=-1";

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

const officialSnapshot: MarketSnapshot = {
  lastPrice: 19210,
  closingPrice: 19210,
  yesterdayPrice: 19800,
  date: 20260718,
  time: 122844,
  shares: 7_700_000_000,
  eps: 1982,
  sectorPe: 9.73,
};

const officialShareholders: Shareholder[] = [
  { name: "شخص حقیقی", shares: 3_866_332_015, percent: 50.212, date: 20260718 },
  { name: "شخص حقیقی", shares: 723_231_281, percent: 9.392, date: 20260718 },
  { name: "صندوق سرمایه‌گذاری ا.ب تصمیم‌ساز", shares: 402_300_000, percent: 5.224, date: 20260718 },
  { name: "شخص حقیقی خارجی", shares: 212_882_216, percent: 2.764, date: 20260718 },
  { name: "سرمایه‌گذاری آتیه سپهر سنا", shares: 138_263_601, percent: 1.795, date: 20260718 },
];

const yearlyTrend = [
  { year: "۱۴۰۰", sales: 395.2, netProfit: 62.8, status: "حسابرسی‌نشده" },
  { year: "۱۴۰۱", sales: 924.9, netProfit: 391.6, status: "حسابرسی‌شده" },
  { year: "۱۴۰۲", sales: 1631.4, netProfit: 487.4, status: "حسابرسی‌شده" },
  { year: "۱۴۰۳", sales: 2596.1, netProfit: 995.1, status: "حسابرسی‌شده" },
  { year: "۱۴۰۴", sales: 3614.8, netProfit: 1526.2, status: "حسابرسی‌شده" },
];

const seasonalTrend = [
  { season: "بهار", profit1403: 208.5, profit1404: 315.8 },
  { season: "تابستان", profit1403: 310.4, profit1404: 449.4 },
  { season: "پاییز", profit1403: 187.1, profit1404: 444.7 },
  { season: "زمستان", profit1403: 289.1, profit1404: 316.4 },
];

const financialRows = yearlyTrend.map((row) => ({
  ...row,
  margin: (row.netProfit / row.sales) * 100,
}));

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const faPercent = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

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
                name: item.shareHolderName,
                shares: item.numberOfShares,
                percent: item.perOfShares,
                date: item.dEven,
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
  const seasonalMax = Math.max(...seasonalTrend.flatMap((row) => [row.profit1403, row.profit1404]));
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
              <h2>داده‌های کلیدی تطبیق شدند</h2>
              <p>قیمت، تعداد سهام و سهامداران از TSETMC؛ فروش، سود خالص و سرمایه ثبت‌شده از گزارش‌های رسمی کدال.</p>
            </div>
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
        <Metric label="سرمایه ثبت‌شده" value="۷۷۰ میلیارد" note="تومان · کدال ۱۴۰۴" tone="positive" />
        <Metric label="تعداد سهام" value={faNumber.format(market.shares / 1_000_000_000) + " میلیارد"} note="TSETMC" tone="positive" />
        <Metric label="ارزش بازار" value={faNumber.format(marketValue) + " همت"} note="بر پایه قیمت پایانی" tone="neutral" />
        <Metric label="EPS دوازده‌ماهه" value={faNumber.format(market.eps / 10) + " تومان"} note={`P/E: ${faNumber.format(pe)}`} tone="neutral" />
      </section>

      <section className="analysis-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <div><span className="panel-label">روند پنج‌ساله · کدال</span><h2>فروش و سود خالص</h2></div>
            <strong className="growth"><bdi>+۷۳٫۹٪</bdi><small>رشد مرکب فروش</small></strong>
          </div>
          <ChartLegend items={[["فروش", "sales"], ["سود خالص", "profit"]]} />
          <div className="bar-chart" aria-label="نمودار فروش و سود خالص پنج ساله؛ میلیارد تومان">
            {yearlyTrend.map((row) => (
              <div className="bar-column" key={row.year} tabIndex={0} aria-label={`${row.year}، فروش ${faNumber.format(row.sales)} و سود خالص ${faNumber.format(row.netProfit)} میلیارد تومان`}>
                <ChartTooltip title={`سال ${row.year}`} rows={[["فروش", row.sales, "sales"], ["سود خالص", row.netProfit, "profit"]]} />
                <div className="bar-track dual">
                  <span className="sales-bar" style={{ height: `${(row.sales / yearlyMax) * 100}%` }} />
                  <span className="profit-bar" style={{ height: `${(row.netProfit / yearlyMax) * 100}%` }} />
                </div>
                <small>{row.year}</small>
              </div>
            ))}
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
          <div><span className="panel-label">مقایسه فصلی از ابتدای ۱۴۰۳ · کدال</span><h2>سود خالص فصلی؛ مقایسه ۱۴۰۳ و ۱۴۰۴</h2></div>
          <span className="unit">میلیارد تومان · فصل‌ها از تفاضل گزارش‌های تجمعی محاسبه شده‌اند</span>
        </div>
        <ChartLegend items={[["سود خالص ۱۴۰۳", "previous"], ["سود خالص ۱۴۰۴", "profit"]]} />
        <div className="seasonal-scroll">
          <div className="seasonal-chart" aria-label="نمودار مقایسه سود خالص فصلی ۱۴۰۳ و ۱۴۰۴؛ میلیارد تومان">
            {seasonalTrend.map((row) => (
              <div className="season-group" key={row.season} tabIndex={0} aria-label={`${row.season}، سود خالص ۱۴۰۳ ${faNumber.format(row.profit1403)} و سود خالص ۱۴۰۴ ${faNumber.format(row.profit1404)} میلیارد تومان`}>
                <ChartTooltip title={row.season} rows={[["سود خالص ۱۴۰۳", row.profit1403, "previous"], ["سود خالص ۱۴۰۴", row.profit1404, "profit"]]} />
                <div className="season-bars">
                  <span className="previous-bar" style={{ height: `${(row.profit1403 / seasonalMax) * 100}%` }} />
                  <span className="profit-bar" style={{ height: `${(row.profit1404 / seasonalMax) * 100}%` }} />
                </div>
                <small>{row.season}</small>
              </div>
            ))}
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

function ChartLegend({ items }: { items: [string, string][] }) {
  return <div className="chart-legend">{items.map(([label, tone]) => <span key={label}><i className={tone} />{label}</span>)}</div>;
}

function ChartTooltip({ title, rows }: { title: string; rows: [string, number, string][] }) {
  return (
    <div className="chart-tooltip" role="tooltip">
      <strong>{title}</strong>
      {rows.map(([label, value, tone]) => <span key={label}><i className={tone} />{label}<b>{faNumber.format(value)} میلیارد تومان</b></span>)}
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
