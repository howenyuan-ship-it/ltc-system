# 長照服務管理系統

新東安居家長照服務管理系統 — 全端開發專案

## 技術架構

| 層級 | 技術 |
|------|------|
| 後端 | Python 3.12 + Django 4.2 + Django REST Framework |
| 資料庫 | PostgreSQL 16 |
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 圖表 | Recharts |
| 狀態管理 | Zustand |
| 容器化 | Docker + Docker Compose |

## 專案結構

```
ltc-system/
├── backend/          # Django 後端
│   ├── apps/
│   │   ├── accounts/     # 帳號與機構管理
│   │   ├── cases/        # 個案管理
│   │   ├── services/     # 服務項目與紀錄
│   │   ├── incidents/    # 異常事件管理
│   │   ├── care_plans/   # 照顧計畫
│   │   ├── assessments/  # 個案評估
│   │   ├── reports/      # 統計報表 / 儀表板
│   │   └── quality/      # 品質管理
│   └── config/           # Django 設定
├── frontend/         # React 前端
│   └── src/
│       ├── pages/    # 頁面元件
│       ├── components/ # 共用元件
│       ├── api/      # API 客戶端
│       └── store/    # 狀態管理
├── .github/workflows/ # GitHub Actions CI
└── docker-compose.yml
```

## 快速啟動（Docker）

```bash
# 1. 複製環境設定
cp backend/.env.example backend/.env

# 2. 啟動所有服務
docker compose up -d

# 3. 建立管理員帳號
docker compose exec backend python manage.py createsuperuser

# 4. 載入範例資料
docker compose exec backend python manage.py shell < create_sample_data.py
```

- 前端介面：http://localhost
- 後端 API：http://localhost:8000/api/
- API 文件：http://localhost:8000/api/docs/
- Django Admin：http://localhost:8000/admin/

## 本機開發

### 後端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # 設定資料庫連線
python manage.py migrate
python manage.py shell < create_sample_data.py
python manage.py runserver
```

### 前端

```bash
cd frontend
cp .env.example .env.local
npm install --legacy-peer-deps
npm run dev
```

前端開發伺服器：http://localhost:5173

## 測試帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | admin1234 | 超級管理員/督導 |
| caregiver1~5 | pass1234 | 居服員 |

## 主要功能

- **首頁儀表板**：KPI 卡片、服務趨勢圖、服務類型分布、今日服務名單
- **個案管理**：個案清單、搜尋篩選、CMS 等級、狀態管理
- **異常事件管理**：事件通報、嚴重程度分級、追蹤處理
- **服務紀錄**：排班、服務項目（BA01/BA05/BA07 等）、狀態追蹤
- **統計報表**：日/週/月/季/年 服務報表匯出
- **REST API**：完整 CRUD + JWT 驗證 + Swagger 文件

## 推送至 GitHub

```bash
git init
git add .
git commit -m "feat: 初始化長照服務管理系統"
git remote add origin https://github.com/YOUR_USERNAME/ltc-system.git
git push -u origin main
```
