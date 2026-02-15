/**
 * 模拟Tastytrade数据生成器
 * 用于在没有真实Tastytrade账号时测试系统
 */

// 股票��
const TECH_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'NFLX', 'INTC'];
const FINANCE_STOCKS = ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'BLK', 'SCHW', 'V', 'MA'];
const ENERGY_STOCKS = ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'HAL'];
const HEALTHCARE_STOCKS = ['UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'LLY', 'BMY', 'AMGN'];
const ETFS = ['SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'XLV'];

const ALL_SYMBOLS = [
  ...TECH_STOCKS,
  ...FINANCE_STOCKS,
  ...ENERGY_STOCKS,
  ...HEALTHCARE_STOCKS,
  ...ETFS,
];

interface MockMetric {
  symbol: string;
  ivRank: number;
  ivPercentile: number;
  impliedVolatility: number;
  liquidityRating: number | null;
  earningsDate: string | null;
  daysTillEarnings: number | null;
  hv30: number | null;
  hv60: number | null;
  hv90: number | null;
  iv30: number | null;
  ivHvSpread: number | null;
  beta: number | null;
  corrSpy: number | null;
  marketCap: string | null;
  sector: string | null;
  industry: string | null;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  lendability: string | null;
  borrowRate: number | null;
  earningsActualEps: number | null;
  earningsEstimate: number | null;
  earningsTimeOfDay: string | null;
  termStructure: Array<{ date: string; iv: number }>;
}

// 随机数生成辅助函数
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max));
}

// 获取股票的行业信息
function getSectorAndIndustry(symbol: string): { sector: string; industry: string } {
  if (TECH_STOCKS.includes(symbol)) {
    return { sector: 'Technology', industry: 'Software & Services' };
  } else if (FINANCE_STOCKS.includes(symbol)) {
    return { sector: 'Financials', industry: 'Banking' };
  } else if (ENERGY_STOCKS.includes(symbol)) {
    return { sector: 'Energy', industry: 'Oil & Gas' };
  } else if (HEALTHCARE_STOCKS.includes(symbol)) {
    return { sector: 'Healthcare', industry: 'Pharmaceuticals' };
  } else if (ETFS.includes(symbol)) {
    return { sector: 'ETF', industry: 'Index Fund' };
  }
  return { sector: 'Unknown', industry: 'Unknown' };
}

// 生成期限结构数据
function generateTermStructure(): Array<{ date: string; iv: number }> {
  const today = new Date();
  const result = [];

  for (let i = 1; i <= 12; i++) {
    const expDate = new Date(today);
    expDate.setDate(expDate.getDate() + i * 30);
    const dateStr = expDate.toISOString().split('T')[0];

    // IV随着时间略微下降（contango）
    const iv = randomBetween(25, 45) - i * 0.5;
    result.push({ date: dateStr, iv });
  }

  return result;
}

// 生成单个股票的模拟数据
export function generateMockMetric(symbol: string): MockMetric {
  const { sector, industry } = getSectorAndIndustry(symbol);

  // 波动率：某些股票高波动，某些低波动
  const baseIV = TECH_STOCKS.includes(symbol) ? randomBetween(30, 80) :
                 FINANCE_STOCKS.includes(symbol) ? randomBetween(20, 50) :
                 ETFS.includes(symbol) ? randomBetween(15, 30) :
                 randomBetween(25, 60);

  const hv30 = baseIV * randomBetween(0.7, 1.2);
  const iv30 = baseIV;
  const ivHvSpread = iv30 - hv30;

  // IV Rank越高越好（高溢价）
  const ivRank = randomInt(0, 100);

  // 流动性：大盘股高，小盘股低
  const liquidityRating = ETFS.includes(symbol) ? 5 : randomInt(2, 5);

  // 财报日期：30天内随机
  const hasEarnings = Math.random() > 0.3;
  let earningsDate = null;
  let daysTillEarnings = null;
  if (hasEarnings) {
    daysTillEarnings = randomInt(1, 30);
    const ed = new Date();
    ed.setDate(ed.getDate() + daysTillEarnings);
    earningsDate = ed.toISOString().split('T')[0];
  }

  return {
    symbol,
    ivRank,
    ivPercentile: randomInt(0, 100),
    impliedVolatility: baseIV,
    liquidityRating,
    earningsDate,
    daysTillEarnings,
    hv30,
    hv60: hv30 * randomBetween(0.95, 1.05),
    hv90: hv30 * randomBetween(0.9, 1.1),
    iv30,
    ivHvSpread,
    beta: ETFS.includes(symbol) ? 1.0 : randomBetween(0.5, 2.0),
    corrSpy: randomBetween(0.3, 0.95),
    marketCap: ETFS.includes(symbol) ? '100B+' :
               randomInt(0, 3) === 0 ? '10B-50B' : '50B-200B',
    sector,
    industry,
    peRatio: randomBetween(10, 50),
    eps: randomBetween(2, 15),
    dividendYield: Math.random() > 0.5 ? randomBetween(0.5, 3.5) : null,
    lendability: 'Easy To Borrow',
    borrowRate: randomBetween(0.1, 2.0),
    earningsActualEps: hasEarnings ? randomBetween(1, 5) : null,
    earningsEstimate: hasEarnings ? randomBetween(1, 5) : null,
    earningsTimeOfDay: hasEarnings ? (Math.random() > 0.5 ? 'Before Market' : 'After Market') : null,
    termStructure: generateTermStructure(),
  };
}

// 生成扫描器结果（按IV Rank排��的高质量股票）
export function generateMockScannerResults(count: number = 30): MockMetric[] {
  const results: MockMetric[] = [];

  // 确保使用所有股票池
  const shuffled = [...ALL_SYMBOLS].sort(() => Math.random() - 0.5);
  const selectedSymbols = shuffled.slice(0, Math.min(count, shuffled.length));

  for (const symbol of selectedSymbols) {
    results.push(generateMockMetric(symbol));
  }

  // 按IV Rank降序排序（高IV Rank = 好的卖期权机会）
  results.sort((a, b) => b.ivRank - a.ivRank);

  return results;
}

// 生成期权链数据
export function generateMockOptionChain(symbol: string, expiration: string) {
  const stockPrice = randomBetween(50, 500);
  const strikes: any[] = [];

  // 生成多个行权价
  for (let i = -10; i <= 10; i++) {
    const strike = Math.round(stockPrice + i * 5);
    const delta = 1 / (1 + Math.exp(-(stockPrice - strike) / 10)); // sigmoid

    strikes.push({
      strike,
      callBid: randomBetween(0.5, 10),
      callAsk: randomBetween(0.6, 11),
      callDelta: delta,
      callGamma: randomBetween(0.01, 0.1),
      callTheta: -randomBetween(0.01, 0.5),
      callVega: randomBetween(0.05, 0.3),
      putBid: randomBetween(0.5, 10),
      putAsk: randomBetween(0.6, 11),
      putDelta: delta - 1,
      putGamma: randomBetween(0.01, 0.1),
      putTheta: -randomBetween(0.01, 0.5),
      putVega: randomBetween(0.05, 0.3),
    });
  }

  return {
    symbol,
    expiration,
    underlyingPrice: stockPrice,
    strikes,
  };
}

// 生成股票报价数据
export function generateMockQuote(symbol: string) {
  const price = randomBetween(50, 500);
  return {
    symbol,
    last: price,
    bid: price - 0.05,
    ask: price + 0.05,
    change: randomBetween(-5, 5),
    changePercent: randomBetween(-2, 2),
    high: price + randomBetween(0, 10),
    low: price - randomBetween(0, 10),
    open: price + randomBetween(-5, 5),
    volume: randomInt(1000000, 100000000),
  };
}
