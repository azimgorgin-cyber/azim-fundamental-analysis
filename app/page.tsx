"use client";

import { useState } from "react";

type View = "overview" | "financials" | "valuation";

const financialRows = [
  { year: "۱۴۰۰", revenue: "۱۴۸٬۳۹۶", profit: "۱۰۸٬۹۷۴", margin: "۴۱٫۲٪", eps: "۱٬۷۶۵" },
  { year: "۱۴۰۱", revenue: "۲۰۹٬۰۴۴", profit: "۹۱٬۲۳۸", margin: "۳۲٫۶٪", eps: "۱٬۳۶۴" },
  { year: "۱۴۰۲", revenue: "۲۷۹٬۵۵۹", profit: "۱۲۱٬۴۰۲", margin: "۳۵٫۸٪", eps: "۱٬۵۴۲" },
  { year: "۱۴۰۳", revenue: "۳۸۶٬۱۱۲", profit: "۱۴۷٬۸۸۰", margin: "۳۳٫۹٪", eps: "۱٬۷۹۶" },
  { year: "۱۴۰۴*", revenue: "۴۷۲٬۶۰۰", profit: "۱۷۸٬۹۰۰", margin: "۳۴٫۷٪", eps: "۲٬۰۹۰" },
];

const chartBars = [38, 48, 60, 76, 92];

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");

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

        <div className="header-status"><span /> داده‌های نمایشی</div>
      </header>

      <section className="workspace" id="top">
        <div className="company-heading">
          <div>
            <div className="eyebrow"><span className="ticker">فولاد</span> بازار اول بورس</div>
            <h1>فولاد مبارکه اصفهان</h1>
            <p>نمونهٔ اولیه برای نمایش ساختار تحلیل؛ ارقام واقعی و به‌روز نیستند.</p>
          </div>
          <div className="price-block">
            <small>قیمت نمایشی</small>
            <strong><bdi>۴٬۸۲۰</bdi> <span>ریال</span></strong>
            <em>+۱٫۸٪</em>
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

        {view === "overview" && <Overview />}
        {view === "financials" && <Financials />}
        {view === "valuation" && <Valuation />}
      </section>

      <footer>
        <span>عظیم · نسخهٔ نخست</span>
        <span>این صفحه توصیهٔ خرید یا فروش نیست.</span>
      </footer>
    </main>
  );
}

function Overview() {
  return (
    <div className="view-content">
      <section className="summary-grid">
        <article className="score-card panel">
          <div className="panel-label">جمع‌بندی بنیادی</div>
          <div className="score-row">
            <div className="score-ring"><strong>۷۸</strong><span>از ۱۰۰</span></div>
            <div>
              <h2>نیازمند بررسی بیشتر</h2>
              <p>سودآوری مناسب است؛ ریسک انرژی و نوسان نرخ‌های جهانی باید دقیق‌تر سنجیده شود.</p>
            </div>
          </div>
          <div className="score-scale" aria-label="امتیاز ۷۸ از ۱۰۰"><span /></div>
          <div className="score-legend"><span>ضعیف</span><span>متوسط</span><span>قوی</span></div>
        </article>

        <article className="thesis-card panel">
          <div className="panel-label">نکتهٔ محوری تحلیل</div>
          <blockquote>آیا رشد نرخ فروش می‌تواند فشار هزینهٔ انرژی و مواد اولیه را جبران کند؟</blockquote>
          <div className="signal-row">
            <span className="positive">سود عملیاتی رو به رشد</span>
            <span className="warning">حاشیه سود نوسانی</span>
          </div>
        </article>
      </section>

      <section className="metrics" aria-label="شاخص‌های کلیدی">
        <Metric label="حاشیه سود عملیاتی" value="۳۴٫۷٪" note="+۰٫۸ واحد درصد" tone="positive" />
        <Metric label="بازده حقوق صاحبان سهام" value="۳۸٫۲٪" note="بالاتر از صنعت" tone="positive" />
        <Metric label="بدهی به حقوق صاحبان سهام" value="۰٫۲۱" note="ریسک مالی پایین" tone="neutral" />
        <Metric label="کیفیت سود نقدی" value="۸۶٪" note="قابل قبول" tone="neutral" />
      </section>

      <section className="analysis-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <div><span className="panel-label">روند پنج‌ساله</span><h2>رشد درآمد</h2></div>
            <strong className="growth"><bdi>+۳۳٫۶٪</bdi><small>رشد مرکب</small></strong>
          </div>
          <div className="bar-chart" aria-label="نمودار رشد درآمد پنج ساله">
            {chartBars.map((height, index) => (
              <div className="bar-column" key={height}>
                <div className="bar-track"><span style={{ height: `${height}%` }} /></div>
                <small>{["۱۴۰۰", "۱۴۰۱", "۱۴۰۲", "۱۴۰۳", "۱۴۰۴"][index]}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel drivers-panel">
          <div className="panel-label">محرک‌های سودآوری</div>
          <h2>چه چیزهایی را باید پایش کنیم؟</h2>
          <ul className="driver-list">
            <li><span className="driver-icon up">↗</span><div><strong>نرخ ارز و قیمت فروش</strong><small>اثر مثبت مستقیم بر درآمد صادراتی</small></div><bdi>زیاد</bdi></li>
            <li><span className="driver-icon flat">—</span><div><strong>قیمت جهانی فولاد</strong><small>محرک چرخه‌ای درآمد و حاشیه سود</small></div><bdi>زیاد</bdi></li>
            <li><span className="driver-icon down">↘</span><div><strong>محدودیت انرژی</strong><small>ریسک افت تولید در دوره‌های اوج مصرف</small></div><bdi>متوسط</bdi></li>
          </ul>
        </article>
      </section>

      <section className="analysis-grid bottom-grid">
        <article className="panel">
          <div className="panel-label">تز اولیه</div>
          <h2>چرا ارزش بررسی دارد؟</h2>
          <ul className="check-list">
            <li>مقیاس تولید و جایگاه رقابتی تثبیت‌شده</li>
            <li>ساختار سرمایه متعادل و توان تولید نقد</li>
            <li>ظرفیت رشد اسمی درآمد در محیط تورمی</li>
          </ul>
        </article>
        <article className="panel risk-card">
          <div className="panel-label">عوامل ابطال تحلیل</div>
          <h2>چه چیزی دیدگاه را تغییر می‌دهد؟</h2>
          <ul className="risk-list">
            <li>افت پایدار حاشیه سود عملیاتی به کمتر از ۲۵٪</li>
            <li>کاهش تولید بیش از ۱۵٪ به‌دلیل محدودیت انرژی</li>
            <li>افزایش شدید مداخلات قیمتی یا عوارض صادراتی</li>
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

function Financials() {
  return (
    <div className="view-content">
      <section className="panel table-panel">
        <div className="panel-head">
          <div><span className="panel-label">خلاصه عملکرد</span><h2>صورت سود و زیان پنج‌ساله</h2></div>
          <span className="unit">ارقام: میلیارد ریال · *برآورد نمایشی</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>سال مالی</th><th>درآمد عملیاتی</th><th>سود ناخالص</th><th>حاشیه عملیاتی</th><th>سود هر سهم</th></tr></thead>
            <tbody>{financialRows.map((row) => <tr key={row.year}><td>{row.year}</td><td>{row.revenue}</td><td>{row.profit}</td><td>{row.margin}</td><td>{row.eps}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="analysis-grid">
        <article className="panel"><div className="panel-label">کیفیت سود</div><h2>سود حسابداری چقدر نقدی است؟</h2><div className="quality-meter"><span style={{ width: "86%" }} /></div><p className="support-copy">نسبت جریان نقد عملیاتی به سود خالص در محدودهٔ قابل قبول قرار دارد؛ تغییرات سرمایه در گردش همچنان باید پایش شود.</p></article>
        <article className="panel"><div className="panel-label">ساختار مالی</div><h2>ترازنامه کم‌ریسک</h2><div className="balance-pairs"><span><small>بدهی خالص</small><strong>۱۲٫۴ همت</strong></span><span><small>پوشش بهره</small><strong>۸٫۶ برابر</strong></span><span><small>نسبت جاری</small><strong>۱٫۷۴</strong></span></div></article>
      </section>
    </div>
  );
}

function Valuation() {
  return (
    <div className="view-content">
      <section className="valuation-hero panel">
        <div><span className="panel-label">دامنه ارزش‌گذاری نمایشی</span><h2>ارزش منصفانه بر پایهٔ دو روش</h2><p>میانگین وزنی P/E آینده‌نگر و جریان نقد تنزیل‌شده؛ بدون استفاده از دادهٔ زنده بازار.</p></div>
        <div className="fair-value"><small>میانه ارزش منصفانه</small><strong>۵٬۶۴۰ <span>ریال</span></strong><em>۱۷٪ بالاتر از قیمت نمایشی</em></div>
      </section>
      <section className="scenario-grid">
        <Scenario title="بدبینانه" value="۳٬۹۸۰" note="افت تولید و فشار حاشیه سود" tone="bear" />
        <Scenario title="پایه" value="۵٬۶۴۰" note="رشد متعادل فروش و ثبات حاشیه" tone="base" />
        <Scenario title="خوش‌بینانه" value="۷٬۱۲۰" note="رشد نرخ فروش و رفع محدودیت انرژی" tone="bull" />
      </section>
      <section className="analysis-grid">
        <article className="panel method-card"><div className="panel-label">روش اول</div><h2>P/E آینده‌نگر</h2><div className="method-value"><strong>۵٫۸×</strong><span>ضریب هدف</span></div><p>مناسب برای مقایسه با تاریخچه شرکت و شرکت‌های هم‌گروه، مشروط به تعدیل سودهای غیرتکراری.</p></article>
        <article className="panel method-card"><div className="panel-label">روش دوم</div><h2>جریان نقد تنزیل‌شده</h2><div className="method-value"><strong>۳۲٪</strong><span>نرخ تنزیل</span></div><p>برای سنجش ارزش اقتصادی بر پایهٔ جریان نقد، سرمایه‌گذاری و رشد بلندمدت استفاده می‌شود.</p></article>
      </section>
    </div>
  );
}

function Scenario({ title, value, note, tone }: { title: string; value: string; note: string; tone: string }) {
  return <article className={`scenario-card ${tone}`}><span>{title}</span><strong>{value} <small>ریال</small></strong><p>{note}</p></article>;
}
