"use client";

import { useState } from "react";

type View = "overview" | "financials" | "valuation";

const financialRows = [
  { year: "۱۴۰۰", revenue: "۷٬۸۵۰", profit: "۳٬۱۲۰", margin: "۳۱٫۸٪", eps: "۶۸۰" },
  { year: "۱۴۰۱", revenue: "۱۱٬۴۲۰", profit: "۴٬۸۵۰", margin: "۳۴٫۲٪", eps: "۹۲۰" },
  { year: "۱۴۰۲", revenue: "۱۶٬۹۸۰", profit: "۷٬۴۶۰", margin: "۳۶٫۵٪", eps: "۱٬۲۶۰" },
  { year: "۱۴۰۳", revenue: "۲۵٬۳۰۰", profit: "۱۱٬۹۰۰", margin: "۳۹٫۴٪", eps: "۱٬۸۶۰" },
  { year: "۱۴۰۴*", revenue: "۳۳٬۷۰۰", profit: "۱۵٬۷۰۰", margin: "۴۰٫۲٪", eps: "۲٬۱۵۰" },
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
            <div className="eyebrow"><span className="ticker">دزاگرس</span> بازار دوم فرابورس</div>
            <h1>دارویی و نهاده‌های زاگرس دارو پارسیان</h1>
            <p>نمونهٔ اولیه برای نمایش ساختار تحلیل؛ ارقام واقعی و به‌روز نیستند.</p>
          </div>
          <div className="price-block">
            <small>قیمت نمایشی</small>
            <strong><bdi>۸٬۴۱۰</bdi> <span>ریال</span></strong>
            <em>نمونهٔ آموزشی</em>
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
            <div className="score-ring"><strong>۷۴</strong><span>از ۱۰۰</span></div>
            <div>
              <h2>نیازمند بررسی بیشتر</h2>
              <p>رشد فروش جذاب است؛ قیمت‌گذاری دارو، سرمایه در گردش و پایداری حاشیه سود باید دقیق‌تر سنجیده شود.</p>
            </div>
          </div>
          <div className="score-scale" aria-label="امتیاز ۷۴ از ۱۰۰"><span style={{ width: "74%" }} /></div>
          <div className="score-legend"><span>ضعیف</span><span>متوسط</span><span>قوی</span></div>
        </article>

        <article className="thesis-card panel">
          <div className="panel-label">نکتهٔ محوری تحلیل</div>
          <blockquote>آیا رشد مقدار فروش و ترکیب محصولات می‌تواند جلوتر از تورم مواد اولیه حرکت کند؟</blockquote>
          <div className="signal-row">
            <span className="positive">رشد درآمد و سود عملیاتی</span>
            <span className="warning">ریسک قیمت‌گذاری دستوری</span>
          </div>
        </article>
      </section>

      <section className="metrics" aria-label="شاخص‌های کلیدی">
        <Metric label="حاشیه سود عملیاتی" value="۴۰٫۲٪" note="روند نمایشی صعودی" tone="positive" />
        <Metric label="بازده حقوق صاحبان سهام" value="۴۱٫۵٪" note="نیازمند تطبیق با گزارش" tone="positive" />
        <Metric label="بدهی به حقوق صاحبان سهام" value="۰٫۳۴" note="ریسک مالی متوسط" tone="neutral" />
        <Metric label="کیفیت سود نقدی" value="۷۶٪" note="وابسته به وصول مطالبات" tone="neutral" />
      </section>

      <section className="analysis-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <div><span className="panel-label">روند پنج‌ساله</span><h2>رشد درآمد</h2></div>
            <strong className="growth"><bdi>+۴۳٫۹٪</bdi><small>رشد مرکب نمایشی</small></strong>
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
            <li><span className="driver-icon up">↗</span><div><strong>مقدار فروش و ترکیب محصول</strong><small>محصولات ضد درد و اقلام پرفروش، هستهٔ رشد درآمد</small></div><bdi>زیاد</bdi></li>
            <li><span className="driver-icon flat">—</span><div><strong>مجوز افزایش نرخ</strong><small>زمان و اندازهٔ اصلاح قیمت بر حاشیه سود اثر مستقیم دارد</small></div><bdi>زیاد</bdi></li>
            <li><span className="driver-icon down">↘</span><div><strong>مواد اولیه و سرمایه در گردش</strong><small>ارز، موجودی و دوره وصول مطالبات را باید هم‌زمان دید</small></div><bdi>متوسط</bdi></li>
          </ul>
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
        <article className="panel"><div className="panel-label">کیفیت سود</div><h2>سود حسابداری چقدر نقدی است؟</h2><div className="quality-meter"><span style={{ width: "76%" }} /></div><p className="support-copy">نسبت جریان نقد عملیاتی به سود خالص در نمونهٔ نمایشی قابل قبول است؛ مطالبات از شرکت‌های پخش و موجودی مواد اولیه باید جداگانه پایش شوند.</p></article>
        <article className="panel"><div className="panel-label">ساختار مالی</div><h2>سرمایه در گردش، محور اصلی</h2><div className="balance-pairs"><span><small>بدهی خالص</small><strong>۱٫۸ همت</strong></span><span><small>پوشش بهره</small><strong>۶٫۲ برابر</strong></span><span><small>نسبت جاری</small><strong>۱٫۵۸</strong></span></div></article>
      </section>
    </div>
  );
}

function Valuation() {
  return (
    <div className="view-content">
      <section className="valuation-hero panel">
        <div><span className="panel-label">دامنه ارزش‌گذاری نمایشی</span><h2>ارزش منصفانه بر پایهٔ دو روش</h2><p>میانگین وزنی P/E آینده‌نگر و جریان نقد تنزیل‌شده؛ بدون استفاده از دادهٔ زنده بازار.</p></div>
        <div className="fair-value"><small>میانه ارزش منصفانه</small><strong>۹٬۴۵۰ <span>ریال</span></strong><em>۱۲٪ بالاتر از قیمت نمایشی</em></div>
      </section>
      <section className="scenario-grid">
        <Scenario title="بدبینانه" value="۶٬۹۰۰" note="تأخیر افزایش نرخ و رشد مطالبات" tone="bear" />
        <Scenario title="پایه" value="۹٬۴۵۰" note="رشد متعادل فروش و ثبات حاشیه" tone="base" />
        <Scenario title="خوش‌بینانه" value="۱۲٬۲۰۰" note="بهبود ترکیب محصول و کنترل سرمایه در گردش" tone="bull" />
      </section>
      <section className="analysis-grid">
        <article className="panel method-card"><div className="panel-label">روش اول</div><h2>P/E آینده‌نگر</h2><div className="method-value"><strong>۵٫۲×</strong><span>ضریب هدف نمایشی</span></div><p>برای مقایسه با شرکت‌های دارویی هم‌گروه، پس از تعدیل سودهای غیرتکراری و یکسان‌سازی سال مالی.</p></article>
        <article className="panel method-card"><div className="panel-label">روش دوم</div><h2>جریان نقد تنزیل‌شده</h2><div className="method-value"><strong>۳۴٪</strong><span>نرخ تنزیل نمایشی</span></div><p>ارزش اقتصادی را با تمرکز بر وصول مطالبات، موجودی مواد اولیه و سرمایه‌گذاری تولیدی می‌سنجد.</p></article>
      </section>
    </div>
  );
}

function Scenario({ title, value, note, tone }: { title: string; value: string; note: string; tone: string }) {
  return <article className={`scenario-card ${tone}`}><span>{title}</span><strong>{value} <small>ریال</small></strong><p>{note}</p></article>;
}
