// 花费统计聚合核心：把 usage 记录按时间尺度分桶，产出两张图（token / 预估花费）所需的数据
// 缩放语义：zoom>1 放大（窗口收窄、细节增多），越界自动跨档；最小尺度(hour)有放大上限，最大尺度(year)有缩小上限
import { CONFIG } from './config.js';

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 1.25;

/** 单价解析：自定义覆盖 > model 价目 > vendor 价目 > 兜底；缓存命中价缺省按 cacheRatio 折算输入价 */
export function resolvePrice(app, vendor, model) {
  const P = CONFIG.tokenPricing;
  const base = P.byModel[model] || P.byVendor[vendor] || P.byVendor.custom;
  return {
    input: typeof app.priceInput === 'number' ? app.priceInput : base.input,
    output: typeof app.priceOutput === 'number' ? app.priceOutput : base.output,
    cache: typeof app.priceCache === 'number' ? app.priceCache : (base.cache ?? base.input * P.cacheRatio)
  };
}

/**
 * 单条记录预估花费
 * rec: { pt 输入(含缓存), ct 输出, ch 缓存命中, cm 缓存未命中 }
 * 旧记录无 ch/cm 字段时全部按普通输入价计费。
 */
export function recordCost(app, rec) {
  const p = resolvePrice(app, rec.vendor, rec.model);
  const ch = rec.ch ?? 0;
  const cm = rec.cm ?? 0;
  const plain = Math.max(0, rec.pt - ch - cm); // 未拆分出缓存属性的普通输入
  return ((ch * p.cache) + ((cm + plain) * p.input) + (rec.ct * p.output)) / 1e6;
}

/** 桶对齐：返回某时刻所属桶的起点（本地时区） */
function bucketStart(t, scaleKey) {
  const d = new Date(t);
  d.setMilliseconds(0); d.setSeconds(0);
  switch (scaleKey) {
    case 'hour': return d.getTime();                       // 按分钟
    case 'day': d.setMinutes(0); return d.getTime();       // 按小时
    case 'week':
    case 'month': d.setMinutes(0); d.setHours(0); return d.getTime(); // 按日
    case 'year': d.setMinutes(0); d.setHours(0); d.setDate(1); return d.getTime(); // 按月
  }
  return d.getTime();
}

/** 下一桶起点 */
function bucketNext(t, scaleKey) {
  const d = new Date(t);
  switch (scaleKey) {
    case 'hour': d.setMinutes(d.getMinutes() + 1); break;
    case 'day': d.setHours(d.getHours() + 1); break;
    case 'week':
    case 'month': d.setDate(d.getDate() + 1); break;
    case 'year': d.setMonth(d.getMonth() + 1); break;
  }
  return d.getTime();
}

function fmtLabel(t, scaleKey) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  switch (scaleKey) {
    case 'hour': return `${p(d.getHours())}:${p(d.getMinutes())}`;
    case 'day': return `${p(d.getHours())}:00`;
    case 'week': case 'month': return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    case 'year': return `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
  }
  return '';
}

/**
 * 聚合
 * @param records [{t,pt,ct,ch,cm,vendor,model}]
 * @param scaleKey hour|day|week|month|year
 * @param zoom 缩放系数（1=默认窗口）
 * @returns { rows:[{key,label,tokens,inputCacheHit,inputMiss,output,cost}],
 *            totals:{tokens,cost,count,pt,ct,ch,cm,hitRate} }
 */
export function aggregate(records, scaleKey, zoom, app) {
  const scale = CONFIG.usageScales.find(s => s.key === scaleKey) ?? CONFIG.usageScales[1];
  const visible = Math.max(3, Math.min(120, Math.round(scale.buckets / zoom)));

  // 窗口：截止当前桶，向前 visible 个桶
  const end = bucketStart(Date.now(), scaleKey);
  const starts = [];
  let cur = end;
  for (let i = 0; i < visible; i++) {
    starts.unshift(cur);
    // 上一桶：倒退到当前桶起点前一毫秒再对齐
    cur = bucketStart(cur - 1, scaleKey);
  }

  const buckets = starts.map(t => ({
    key: `${scaleKey}-${t}`, label: fmtLabel(t, scaleKey), start: t,
    tokens: 0, cost: 0, ch: 0, cm: 0, pt: 0, ct: 0
  }));
  const idxOf = new Map(starts.map((t, i) => [t, i]));
  const winStart = starts[0];
  const winEnd = bucketNext(end, scaleKey);

  for (const rec of records) {
    if (rec.t < winStart || rec.t >= winEnd) continue;
    const b = bucketStart(rec.t, scaleKey);
    const i = idxOf.get(b);
    if (i == null) continue;
    buckets[i].tokens += rec.pt + rec.ct;
    buckets[i].pt += rec.pt;
    buckets[i].ct += rec.ct;
    buckets[i].ch += rec.ch ?? 0;
    buckets[i].cm += rec.cm ?? 0;
    buckets[i].cost += recordCost(app, rec);
  }

  const totals = buckets.reduce((a, b) => ({
    tokens: a.tokens + b.tokens,
    cost: a.cost + b.cost,
    pt: a.pt + b.pt,
    ct: a.ct + b.ct,
    ch: a.ch + b.ch,
    cm: a.cm + b.cm
  }), { tokens: 0, cost: 0, pt: 0, ct: 0, ch: 0, cm: 0 });
  totals.count = records.filter(r => r.t >= winStart && r.t < winEnd).length;
  // 缓存命中率：命中 / 参与缓存统计的输入（无任何缓存字段记录时为 null，不展示）
  const cacheBase = totals.ch + totals.cm;
  totals.hitRate = cacheBase > 0 ? totals.ch / cacheBase : null;

  return { rows: buckets, totals };
}

/** 格式化工具 */
export const fmtTokens = (v) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return String(Math.round(v));
};
export const fmtCost = (v) => `${CONFIG.tokenPricing.currency}${v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4)}`;
