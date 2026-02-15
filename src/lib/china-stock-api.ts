/**
 * A股数据API - 东方财富接口封装
 * 将A股数据转换为Temple Stuart系统格式
 */

// A股热门股票列表
const CHINA_STOCKS = {
  tech: ['600276', '000063', '002475', '688981', '688008'], // 恒瑞医药、中兴通讯、立讯精密、中芯国际、澜起科技
  finance: ['600036', '601318', '601166', '600016', '600030'], // 招商银行、中国平安、兴业银行、民生银行、中信证券
  consumer: ['600519', '000858', '603288', '600887', '000568'], // 贵州茅台、五粮液、海天味业、伊利股份、泸州老窖
  energy: ['600028', '601857', '600309', '601225', '600346'], // 中国���化、中国石油、万华化学、陕西煤业、恒力石化
  real_estate: ['000002', '001979', '600048', '000069', '600606'], // 万科A、招商蛇口、保利发展、华侨城A、绿地控股
};

const ALL_CHINA_STOCKS = [
  ...CHINA_STOCKS.tech,
  ...CHINA_STOCKS.finance,
  ...CHINA_STOCKS.consumer,
  ...CHINA_STOCKS.energy,
  ...CHINA_STOCKS.real_estate,
];

interface ChinaStockMetric {
  symbol: string; // 股票代码
  name: string;
  ivRank: number; // 用换手率代替
  ivPercentile: number;
  impliedVolatility: number; // 用振幅代替
  liquidityRating: number | null;
  earningsDate: string | null; // 暂无
  daysTillEarnings: number | null;
  hv30: number | null; // 30日波动率（用振幅模拟）
  hv60: number | null;
  hv90: number | null;
  iv30: number | null;
  ivHvSpread: number | null;
  beta: number | null; // 暂无
  corrSpy: number | null;
  marketCap: string | null;
  sector: string | null;
  industry: string | null;
  peRatio: number | null; // 市盈率
  eps: number | null; // 每股收益
  dividendYield: number | null; // 股息率
  lendability: string | null;
  borrowRate: number | null;
  earningsActualEps: number | null;
  earningsEstimate: number | null;
  earningsTimeOfDay: string | null;
  termStructure: Array<{ date: string; iv: number }>;
}

/**
 * 获取龙虎榜数据（高活跃度股票）
 * API: https://datacenter-web.eastmoney.com/api/data/v1/get
 */
export async function fetchLongTigerRank(date: string): Promise<any[]> {
  const url = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

  const params = new URLSearchParams({
    callback: 'callback',
    sortColumns: 'TURNOVERRATE,TRADE_DATE,SECURITY_CODE',
    sortTypes: '-1,-1,1',
    pageSize: '50',
    pageNumber: '1',
    reportName: 'RPT_DAILYBILLBOARD_DETAILSNEW',
    columns: 'SECURITY_CODE,SECUCODE,SECURITY_NAME_ABBR,TRADE_DATE,CLOSE_PRICE,CHANGE_RATE,TURNOVERRATE,FREE_MARKET_CAP',
    source: 'WEB',
    client: 'WEB',
    filter: `(TRADE_DATE<='${date}')(TRADE_DATE>='${date}')`,
  });

  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Referer': 'https://data.eastmoney.com/stock/tradedetail.html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const text = await response.text();

    // 处理JSONP响应：callback({...}); -> {...}
    const jsonText = text.replace(/^callback\(/, '').replace(/\);$/, '');
    const data = JSON.parse(jsonText);

    return data.result?.data || [];
  } catch (error) {
    console.error('[ChinaStockAPI] Failed to fetch long tiger rank:', error);
    return [];
  }
}

/**
 * 获取股票实时行情（新浪API）
 * http://hq.sinajs.cn/list=sh600519,sz000858
 */
export async function fetchStockQuotes(codes: string[]): Promise<Map<string, any>> {
  const result = new Map<string, any>();

  console.log('[ChinaStockAPI] Fetching quotes for codes:', codes);

  // 转换代码格式：600519 -> sh600519
  const sinaFormattedCodes = codes.map(code => {
    if (code.startsWith('6')) return `sh${code}`;
    if (code.startsWith('0') || code.startsWith('3')) return `sz${code}`;
    return code;
  });

  const url = `http://hq.sinajs.cn/list=${sinaFormattedCodes.join(',')}`;
  console.log('[ChinaStockAPI] Sina API URL:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    console.log('[ChinaStockAPI] Response status:', response.status);

    const text = await response.text();
    console.log('[ChinaStockAPI] Response length:', text.length);
    console.log('[ChinaStockAPI] First 500 chars:', text.substring(0, 500));

    // 解析新浪返回格式：var hq_str_sh600519="贵州茅台,1820.00,1825.50,...";
    const lines = text.split('\n').filter(line => line.trim());
    console.log('[ChinaStockAPI] Total lines:', lines.length);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/var hq_str_(sh|sz)(\d+)="(.+)";/);
      if (!match) {
        console.log('[ChinaStockAPI] Line did not match regex:', line.substring(0, 100));
        continue;
      }

      const code = match[2];
      const data = match[3].split(',');
      console.log(`[ChinaStockAPI] Parsed stock ${code}: ${data[0]}, fields: ${data.length}`);

      if (data.length >= 32) {
        result.set(code, {
          name: data[0], // 股票名称
          open: parseFloat(data[1]), // 开盘价
          preClose: parseFloat(data[2]), // 昨收
          current: parseFloat(data[3]), // 当前价
          high: parseFloat(data[4]), // 最高价
          low: parseFloat(data[5]), // 最低价
          volume: parseInt(data[8]), // 成交量（股）
          amount: parseFloat(data[9]), // 成交额（元）
          date: data[30], // 日期
          time: data[31], // 时间
        });
        console.log(`[ChinaStockAPI] Successfully added stock ${code}: ${data[0]}`);
      } else {
        console.log(`[ChinaStockAPI] Stock ${code} has insufficient data fields: ${data.length}`);
      }
    }
  } catch (error) {
    console.error('[ChinaStockAPI] Failed to fetch stock quotes:', error);
  }

  console.log('[ChinaStockAPI] Total stocks fetched:', result.size);
  return result;
}

/**
 * 将A股数据转换为Temple Stuart Scanner格式
 */
function convertToScannerMetric(
  code: string,
  quote: any,
  sector: string = '未知',
  industry: string = '未知'
): ChinaStockMetric {
  const changeRate = Math.abs(((quote.current - quote.preClose) / quote.preClose) * 100);
  const amplitude = ((quote.high - quote.low) / quote.preClose) * 100; // 振幅

  // 用换手率模拟IV Rank（假设2%换手率 = 50 IV Rank）
  const turnoverRate = (quote.volume / 1000000000) * 100; // 简化计算
  const ivRank = Math.min(100, turnoverRate * 25);

  return {
    symbol: code,
    name: quote.name,
    ivRank,
    ivPercentile: Math.random() * 100,
    impliedVolatility: amplitude, // 用振幅代替IV
    liquidityRating: quote.volume > 10000000 ? 4 : 2, // 根据成交量
    earningsDate: null,
    daysTillEarnings: null,
    hv30: amplitude * 0.9,
    hv60: amplitude * 0.95,
    hv90: amplitude,
    iv30: amplitude,
    ivHvSpread: amplitude * 0.1,
    beta: null,
    corrSpy: null,
    marketCap: quote.amount > 10000000000 ? '1000亿+' : '100-1000亿',
    sector,
    industry,
    peRatio: null, // 需要额外API获取
    eps: null,
    dividendYield: null,
    lendability: '可融券',
    borrowRate: null,
    earningsActualEps: null,
    earningsEstimate: null,
    earningsTimeOfDay: null,
    termStructure: [],
  };
}

/**
 * 生成A股扫描结果（模拟Temple Stuart Scanner）
 */
export async function generateChinaStockScannerResults(count: number = 30): Promise<ChinaStockMetric[]> {
  console.log('[ChinaStockAPI] Starting generateChinaStockScannerResults, count:', count);
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  console.log('[ChinaStockAPI] Today date:', today);

  // 方案1：尝试获取龙虎榜（真实高活跃度股票）
  let hotStocks = await fetchLongTigerRank(today);

  if (hotStocks.length === 0) {
    console.log('[ChinaStockAPI] No LongTiger data, using default stock list');
    // 回退到默认股票列表
    hotStocks = ALL_CHINA_STOCKS.slice(0, count).map(code => ({
      SECURITY_CODE: code,
      SECURITY_NAME_ABBR: `股票${code}`,
    }));
    console.log('[ChinaStockAPI] Using default stocks:', hotStocks.length);
  }

  // 获取实时行情
  const codes = hotStocks.slice(0, count).map((s: any) => s.SECURITY_CODE);
  console.log('[ChinaStockAPI] Codes to fetch:', codes);
  const quotes = await fetchStockQuotes(codes);
  console.log('[ChinaStockAPI] Quotes fetched:', quotes.size);

  const results: ChinaStockMetric[] = [];

  for (const stock of hotStocks.slice(0, count)) {
    const code = stock.SECURITY_CODE;
    const quote = quotes.get(code);

    if (!quote) {
      console.log(`[ChinaStockAPI] No quote found for stock: ${code}`);
      continue;
    }

    // 判断行业（简化版）
    let sector = '未知';
    let industry = '未知';
    if (CHINA_STOCKS.tech.includes(code)) {
      sector = '科技';
      industry = '半导体/软件';
    } else if (CHINA_STOCKS.finance.includes(code)) {
      sector = '金融';
      industry = '银行/证券';
    } else if (CHINA_STOCKS.consumer.includes(code)) {
      sector = '消费';
      industry = '食品饮料';
    } else if (CHINA_STOCKS.energy.includes(code)) {
      sector = '能源';
      industry = '石油化工';
    } else if (CHINA_STOCKS.real_estate.includes(code)) {
      sector = '房地产';
      industry = '地产开发';
    }

    const metric = convertToScannerMetric(code, quote, sector, industry);
    results.push(metric);
  }

  // 按ivRank降序排序
  results.sort((a, b) => b.ivRank - a.ivRank);

  return results;
}
