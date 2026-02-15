# Temple Stuart A股市场适配计划

## 背景与目标

Temple Stuart是一个期权交易分析平台，当前深度集成美股市场的Tastytrade API，提供从Scanner扫描、期权链分析、策略构建到AI分析的完整流程。

**用户需求**: 用A股数据替代美股期权系统，实现完整的交易分析流程。

**当前进展**:
- ✅ Scanner API已成功集成真实A股数据（东方财富龙虎榜+新浪实时行情）
- ✅ 支持25支热门A股实时数据展示
- ❌ 前端Market Intelligence仍显示"Coming Soon"锁定状态
- ❌ 期权链、Greeks、策略构建等功能未适配A股

**核心挑战**: A股市场与美股在期权产品、数据源、交易机制上存在根本性差异

---

## 市场差异分析

### 美股 vs A股关键差异

| 维度 | 美股市场 | A股市场 | 影响 |
|-----|--------|---------|-----|
| **期权品种** | 成熟丰富，几乎所有流动股票都有期权 | 极度有限：仅50ETF(510050)、300ETF(510300)、商品期货期权、股指期权 | **核心差异** - 无法对绝大多数个股进行期权分析 |
| **Greeks数据源** | Tastytrade提供实时Greeks流 | 无官方实时Greeks流，需本地计算或第三方API | 需要Black-Scholes本地实现或数据商API |
| **IV数据** | 实时IV Rank/Percentile | 期权IV数据稀缺，无历史IV Rank | 需自建IV历史数据库或调整策略 |
| **交易机制** | T+0期权，做空容易 | 股票T+1，融券受限 | 策略适用性受限（如Covered Call需持股） |
| **合约倍数** | 100股/合约 | 10000股/合约（50ETF/300ETF） | 数据处理需特殊适配 |
| **结算方式** | 多数实物交割 | 现金结算为主 | 影响`trading_positions`表逻辑 |

### 当前已实现的A股功能

1. **Scanner数据源** ✅
   - 文件: `src/lib/china-stock-api.ts`
   - 龙虎榜API (东方财富)
   - 实时行情 (新浪财经)
   - 返回25支热门A股数据

2. **Scanner API适配** ✅
   - 路由: `src/app/api/tastytrade/scanner/route.ts`
   - 无Tastytrade连接时自动使用A股数据
   - 返回标准化的metrics数据（ivRank、sector、industry等）

### 缺失的核心功能

**1. 前端UI层** ❌
- Market Intelligence tab仍显示付费锁定界面
- Scanner结果展示组件未实现
- 无法从UI触发Scanner运行

**2. 期权链功能** ❌ (A股期权极度有限)
- `/api/tastytrade/chains` 仅支持美股
- 无A股期权链API适配（50ETF/300ETF）
- Strategy Builder依赖期权链数据

**3. Greeks计算** ❌
- `/api/tastytrade/greeks` 仅支持Tastytrade实时流
- 无Black-Scholes本地计算实现
- A股期权Greeks数据源缺失

**4. AI策略分析** ⚠️ (部分可用)
- `/api/ai/strategy-analysis` 基于期权策略卡片
- `/api/ai/market-brief` 可适配A股Scanner数据
- 需调整Prompt以适应A股市场特点

**5. 持仓管理** ⚠️ (需适配)
- `trading_positions`表结构支持期权
- `stock_lots`表结构支持股票成本法
- 需添加A股特有字段（T+1交割状态、融资融券标记）

---

## 核心决策

### 决策1：期权功能如何处理？

**方案A - 禁用期权功能** (推荐用于MVP)
- ✅ 专注股票分析，避开A股期权稀缺问题
- ✅ Scanner功能已可用，可作为选股工具
- ✅ 实现简单，风险低
- ❌ 无法使用Strategy Builder核心功能

**方案B - 仅支持50ETF/300ETF期权**
- ✅ 利用现有的50ETF期权市场
- ✅ 可实现完整的期权分析流程
- ❌ 只覆盖2个标的，实用性有限
- ❌ 需要获取第三方期权数据API（成本高）

**方案C - 转型为纯A股选股+技术分析平台**
- ✅ 完全适应A股市场特点
- ✅ 可添加A股特色功能（龙虎榜、北向资金、涨跌停统计）
- ❌ 背离Temple Stuart原始定位（期权分析）
- ❌ 需要大幅重构前端UI

**推荐**: **方案A（MVP）+ 方案C部分功能**
- 第一阶段：解锁Scanner UI，作为A股选股工具
- 第二阶段：添加A股特色分析（龙虎榜追踪、资金流向）
- 第三阶段：如有需求，再评估50ETF期权支持

### 决策2：前端UI改造范围

**关键问题**: Market Intelligence tab是否需要完全重写？

**分析**:
- 当前tab显示"Coming Soon"锁定，说明UI框架已存在
- Scanner数据结构已与Tastytrade兼容（同样的metrics格式）
- Option Chain/Strategy Builder部分可暂时隐藏

**方案**: 渐进式解锁UI
1. 修改权限检查逻辑，移除"Coming Soon"锁定
2. 实现Scanner结果表格组件（symbol、ivRank、sector等）
3. 隐藏/禁用Option Chain和Strategy Builder按钮
4. 保留AI Market Brief功能（适配A股数据）

---

## 实施计划

### Phase 1: 解锁Scanner UI (高优先级)

**目标**: 让用户能在前端看到A股Scanner数据

**关键文件**:
- `src/app/trading/page.tsx` - Trading主页面
- Market Intelligence tab相关组件（需定位具体组件文件）

**步骤**:

1. **移除锁定逻辑**
   - 查找"Coming Soon"锁定条件（可能基于tier或feature flag）
   - 修改为对所有用户开放

2. **实现Scanner结果表格**
   - 复用现有的`ttScannerData`状态变量
   - 创建数据表格组件，展示：
     - Symbol (股票代码+名称)
     - Sector (行业)
     - IV Rank (用换手率模拟)
     - Liquidity Rating (流动性评分)
     - Market Cap (市值)
   - 添加排序功能（按ivRank、sector等）

3. **Run Scanner按钮功能**
   - 已有`ttScannerUniverse`状态（universe选择器）
   - 添加universe选项：`china_a_share`
   - 点击时调用`/api/tastytrade/scanner?universe=china_a_share`

4. **AI Market Brief集成**
   - 调用`/api/ai/market-brief`
   - 传入A股Scanner数据
   - 修改Prompt以适应A股市场（去除期权相关描述）

**验证清单**:
- [ ] Market Intelligence tab可见且可点击
- [ ] 显示"Run Scanner"按钮
- [ ] 点击后调用Scanner API并显示25支A股
- [ ] 表格支持排序和筛选
- [ ] AI Market Brief生成成功（适配A股数据）

---

### Phase 2: A股特色功能扩展 (中优先级)

**目标**: 添加A股市场独有的分析维度

**新增功能**:

1. **龙虎榜追踪** (`src/lib/china-stock-api.ts`已有基础)
   - 展示上榜股票的买卖席位
   - 标注游资、机构席位
   - 统计连续上榜天数

2. **资金流向分析**
   - 北向资金流入/流出
   - 行业资金热力图
   - 主力资金动向

3. **涨跌停统计**
   - 当日涨停/跌停数量
   - 连板梯队（2板、3板、N板）
   - 炸板率统计

**数据源**:
- 东方财富Choice API（付费）
- 或继续使用免费的东方财富网页API
- Tushare Pro（部分免费）

**实施要点**:
- 扩展`china-stock-api.ts`
- 添加新的API路由：`/api/china-market/*`
- 在Trading页面添加新的sub-tab或panel

---

### Phase 3: 期权功能适配 (低优先级/可选)

**目标**: 支持50ETF/300ETF期权分析

**前置条件**:
- 获取期权数据API（万得、聚源、Tushare等）
- 实现Black-Scholes Greeks计算

**步骤**:

1. **期权链API**
   ```typescript
   // src/lib/china-options-api.ts
   export async function fetchChinaOptionChain(
     underlying: '510050' | '510300',
     expiration?: string
   ): Promise<OptionChain>
   ```

2. **Greeks本地计算**
   ```typescript
   export function calculateBlackScholesGreeks(params: {
     S: number;  // 标的价格
     K: number;  // 行权价
     T: number;  // 到期天数
     r: number;  // 无风险利率
     sigma: number;  // 隐含波动率
     optionType: 'call' | 'put';
   }): Greeks
   ```

3. **API路由扩展**
   - `POST /api/china-options/chains`
   - `POST /api/china-options/greeks`

4. **数据库表扩展**
   ```sql
   ALTER TABLE securities ADD COLUMN
     china_product_type VARCHAR(20),  -- '50ETF'|'300ETF'
     contract_multiplier INT,          -- 10000
     settlement_type VARCHAR(20);      -- 'CASH'|'PHYSICAL'
   ```

**成本估算**:
- 期权数据API费用：约¥200-500/月（Tushare积分）
- 开发工时：约20-30小时

---

## 数据模型适配

### 现有表结构

**securities表** (期权元数据)
```prisma
model securities {
  ticker_symbol            String?
  option_contract_type     String?        // 'call'|'put'
  option_strike_price      Float?
  option_expiration_date   DateTime?
  option_underlying_ticker String?
}
```

**trading_positions表** (期权持仓)
```prisma
model trading_positions {
  symbol              String
  option_type         String?            // 'CALL'|'PUT'
  strike_price        Float?
  expiration_date     DateTime?
  position_type       String             // 'LONG'|'SHORT'
  quantity            Float
  status              String             // 'OPEN'|'CLOSED'
}
```

**stock_lots表** (股票成本法)
```prisma
model stock_lots {
  symbol               String
  acquired_date        DateTime
  original_quantity    Float
  remaining_quantity   Float
  cost_per_share       Float
  status               String  // 'OPEN'|'PARTIAL'|'CLOSED'
}
```

### A股特有字段扩展

**securities表扩展**:
```sql
ALTER TABLE securities ADD COLUMN (
  is_china_stock BOOLEAN DEFAULT FALSE,
  china_product_type VARCHAR(20),        -- '50ETF'|'300ETF'|NULL (个股)
  contract_multiplier INT DEFAULT 10000,
  settlement_type VARCHAR(20),           -- 'CASH'|'PHYSICAL'
  trading_hours VARCHAR(50),             -- '09:30-11:30,13:00-15:00'
  china_exchange VARCHAR(10)             -- 'SH'|'SZ'|'BJ'
);
```

**stock_lots表扩展** (A股成本法要求):
```sql
ALTER TABLE stock_lots ADD COLUMN (
  matching_method VARCHAR(20) DEFAULT 'FIFO',  -- 'FIFO'|'LIFO'|'AVG'
  t1_settlement_date DATE,                     -- T+1交割日期
  is_margin_financing BOOLEAN DEFAULT FALSE,   -- 是否融资融券
  margin_interest_rate DECIMAL(5,4)           -- 融资利率（如适用）
);
```

---

## API路由规划

### 现有Tastytrade路由
- ✅ `/api/tastytrade/scanner` - 已适配A股
- `/api/tastytrade/chains` - 仅美股
- `/api/tastytrade/greeks` - 仅美股
- `/api/tastytrade/positions` - 仅美股

### 新增A股路由

**Phase 1 (Scanner UI)**:
- 无需新增，复用现有scanner路由

**Phase 2 (A股特色)**:
```
/api/china-market/longtigerrank  - 龙虎榜数据
/api/china-market/money-flow      - 资金流向
/api/china-market/limit-up-stats  - 涨跌停统计
/api/china-market/north-flow      - 北向资金
```

**Phase 3 (期权支持)**:
```
/api/china-options/chains         - 50ETF/300ETF期权链
/api/china-options/greeks         - Greeks计算
/api/china-options/positions      - A股期权持仓
```

---

## 验证计划

### Phase 1 验证

**前端测试**:
1. 访问 http://localhost:3007/trading
2. 切换到Market Intelligence tab
3. 验证"Coming Soon"锁定已移除
4. 点击"Run Scanner"按钮
5. 验证显示25支A股数据表格
6. 测试排序功能（按ivRank、sector）
7. 点击生成AI Market Brief
8. 验证Brief内容适配A股市场

**API测试**:
```bash
# Scanner API
curl "http://localhost:3007/api/tastytrade/scanner?universe=popular" \
  -H "Cookie: userEmail=test@example.com"
# 预期：返回25支A股，_chinaStock: true

# Market Brief API
curl -X POST "http://localhost:3007/api/ai/market-brief" \
  -H "Content-Type: application/json" \
  -d '{"scannerData": [...A股数据...]}'
# 预期：返回中文market brief
```

### Phase 2 验证

测试龙虎榜、资金流向等新增功能

### Phase 3 验证

测试50ETF期权链和Greeks计算

---

## 风险与限制

### 技术风险

1. **数据源稳定性** 🔴
   - 新浪财经API无官方文档，可能随时变更
   - 缓解：添加多个数据源作为备份（腾讯财经、网易财经）

2. **Greeks计算准确性** 🟡
   - Black-Scholes模型假设较理想化
   - 缓解：标注数据来源"本地计算，仅供参考"

3. **中文编码问题** 🟢
   - A股股票名称为中文
   - 缓解：已测试成功，无明显问题

### 功能限制

1. **期权品种极少** 🔴
   - A股仅50ETF/300ETF等少数期权
   - 无法对绝大多数个股进行期权分析
   - **建议**：Phase 1禁用期权功能

2. **实时数据延迟** 🟡
   - 免费API通常有15分钟延迟
   - 缓解：标注"延迟数据"或购买实时行情

3. **T+1交易限制** 🟡
   - 无法像美股T+0那样灵活
   - 影响策略适用性（如Day Trading策略无效）

---

## 成本估算

### 开发成本

**Phase 1 (Scanner UI解锁)**:
- 前端UI修改：8-12小时
- 测试与调试：4小时
- **总计**：12-16小时

**Phase 2 (A股特色功能)**:
- 新数据API集成：10-15小时
- UI组件开发：8-10小时
- 测试：5小时
- **总计**：23-30小时

**Phase 3 (期权支持)**:
- 期权API集成：12-16小时
- Greeks计算实现：8-10小时
- 数据库扩展：4小时
- UI适配：10小时
- **总计**：34-40小时

### 数据API成本

- **免费方案** (Phase 1-2):
  - 新浪财经 (免费，有延迟)
  - 东方财富网页API (免费，不稳定)
  - **成本**: ¥0/月

- **进阶方案** (Phase 3):
  - Tushare Pro积分套餐
  - **成本**: ¥200-500/月

- **企业方案**:
  - 万得Wind / 聚源API
  - **成本**: ¥5000+/月

---

## 关键文件清单

### 已修改文件 (Phase 0 - Scanner后端)
- ✅ `src/lib/china-stock-api.ts` - A股数据API
- ✅ `src/app/api/tastytrade/scanner/route.ts` - Scanner路由适配

### 待修改文件 (Phase 1 - Scanner UI)
- `src/app/trading/page.tsx` - Trading主页面
- 需定位Market Intelligence锁定逻辑所在文件
- 需创建Scanner结果表格组件

### 待新增文件 (Phase 2 - A股特色)
- `src/lib/china-market-api.ts` - 龙虎榜/资金流向API
- `src/app/api/china-market/*/route.ts` - 新API路由

### 待新增文件 (Phase 3 - 期权支持)
- `src/lib/china-options-api.ts` - 期权数据API
- `src/lib/black-scholes.ts` - Greeks计算库
- `src/app/api/china-options/*/route.ts` - 期权API路由

---

## 总结

### 完整流程缺失清单

**已完成** ✅:
1. Scanner后端API（A股数据）

**待实现** ❌:
1. **Scanner前端UI** - 核心缺失，用户无法使用
2. **Option Chain** - A股期权稀缺，建议Phase 3
3. **Greeks计算** - 依赖期权链，Phase 3
4. **Strategy Builder** - 依赖期权链，Phase 3
5. **AI Market Brief** - 后端已有，需调整Prompt
6. **持仓管理** - 基础设施已有，需添加A股字段

### 推荐实施路径

1. **立即执行**: Phase 1 (Scanner UI解锁)
   - 成本：12-16小时
   - 收益：用户立即可用A股选股功能

2. **近期规划**: Phase 2 (A股特色功能)
   - 成本：23-30小时
   - 收益：差异化功能，更符合A股市场

3. **长期评估**: Phase 3 (期权支持)
   - 成本：34-40小时 + 数据API费用
   - 收益：完整期权分析，但仅限50ETF/300ETF

**核心建议**: 先实现Phase 1，验证用户需求后再决定Phase 2/3
