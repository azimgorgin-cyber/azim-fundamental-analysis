import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = JSON.parse(await readFile(new URL("../app/data/dezagros-official.json", import.meta.url), "utf8"));

test("official data package is complete and internally reconciled", () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.symbol, "دزاگرس");
  assert.equal(data.monthlySalesTrend.length, 12);
  assert.equal(data.monthlySalesTrend.filter((row) => row.sales1405 !== null).length, 3);
  assert.match(data.sources.codalMonthly.url, /^https:\/\/www\.codal\.ir\/Reports\/Decision\.aspx/);
  assert.match(data.sources.tsetmc.url, /^https:\/\/www\.tsetmc\.com\/instInfo\//);

  const monthlyTotal = Math.round(data.monthlySalesTrend.reduce((sum, row) => sum + row.sales1404, 0) * 10) / 10;
  const check = data.validation.monthlyToAnnualSales1404;
  assert.equal(monthlyTotal, check.monthlyTotal);
  assert.equal(Math.round((check.monthlyTotal - check.annualTotal) * 10) / 10, check.difference);
  assert.ok(check.differencePercent <= 1);
});
