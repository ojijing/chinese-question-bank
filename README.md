# 初中语文智能题库（React + FastAPI 重建版）

基于原 Streamlit 题库雏形重建。保留题目筛选、试题篮、试卷浏览、题目编辑、单题/整卷 DOCX 导出等核心流程，并补充了数据总览、智能随机组卷、响应式界面和本地参数表导出。

- 前端：React 19 + TypeScript + Vite
- 后端：FastAPI + 原生 `sqlite3`
- 数据库：原项目 `初中语文/data.db`，共 146,782 道题、8,077 套试卷
- DOCX：内置 HTML2DOCX 转换，与题库共用同一端口，**不使用 pandoc**
- 认证：无登录、无账号体系
- 试题篮：保存在浏览器 `localStorage`

## 目录结构

```text
.
├── main.py                  # 项目总入口（FastAPI + 静态前端）
├── start.sh                 # 创建虚拟环境、安装依赖并启动
├── requirements.txt
├── backend/                 # 后端功能模块
│   └── app/
│       ├── main.py          # FastAPI 应用
│       ├── routers/         # 题目、试卷、导出、参数、统计接口
│       ├── services/        # SQLite 查询、HTML 组装、DOCX 代理、参数表
│       ├── database.py
│       └── config.py
├── frontend/                # React 源码与 package.json
│   └── src/
│       ├── pages/           # 各功能页面
│       ├── components/      # 复用组件
│       ├── context/         # 试题篮与提示消息状态
│       └── api/             # 后端接口封装
├── static/                  # 静态文件与前端构建产物
│   ├── app/                 # Vite 构建结果
│   ├── help.png
│   └── favicon.svg
└── data/
    ├── data.db              # SQLite 数据库
    └── config.xlsx          # 难度、题型、知识点分类
```

功能模块、前端源码、静态文件与数据库分别存放，根目录 `main.py` 作为统一入口。

## 启动

### 1. 安装后端依赖

```bash
python3 -m pip install --break-system-packages -r requirements.txt
```

### 2. 启动题库

生产模式直接运行根入口：

```bash
python3 main.py
```

或使用：

```bash
./start.sh
```

访问：

- 题库页面：<http://127.0.0.1:8000>

`static/app` 已包含构建后的前端。修改 React 源码后重新构建：

```bash
cd frontend
npm install
npm run build
```

### 前端开发模式

```bash
# 终端 1：后端
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 终端 2：前端
cd frontend
npm run dev
```

开发页面地址为 <http://127.0.0.1:5173>，Vite 会把 `/api` 与 `/static` 代理到 `8000`。

## 主要功能

### 数据总览

- 题库总量、试卷数、知识点数、题型数
- 题型分布、难度构成、重点知识板块
- 最新试卷与导出使用提示

### 题库检索

- 题干关键词、题型、难度和排序放在搜索结果上方的筛选条中
- 左侧知识点树在页面滚动时保持置顶，检索条件条随页面正常滚动
- 知识点按最多三级树形结构展示，点击一级、二级或三级分类均可筛选
- 最新/最早排序与分页
- 查看解析、单题导出、在线编辑、加入试题篮
- 当前页批量加入试题篮

### 智能组卷

- 设置抽题数量
- 多选题型、多选难度
- 限定知识点或题干关键词
- 可排除试题篮中已有题目
- 随机结果整体或逐题加入试题篮

### 试卷浏览

- 按试卷名搜索
- 浏览原卷题目与快速题号索引
- 整卷加入试题篮
- 整卷导出 DOCX

### 试题篮

- 浏览器本地持久化
- 支持拖动题目卡片或题序目录调整顺序
- 支持上移、下移和“移动到指定位置”
- 右侧提供可点击定位的题序目录，重排时带平滑动画
- 按题型统计
- 清空试题篮
- 导出成功后自动清空试题篮
- 三种导出格式：
  - 仅试题
  - 题目后跟解析
  - 答案放在卷末

### 题目编辑

- 修改题型、难度、知识点
- 富文本编辑题干与解析
- 实时试卷样式预览
- 保存后直接更新 SQLite `Questions` 表

### 题库参数

- 查看难度、题型与知识点分类
- 下载 `题库参数表.xlsx`
- 知识点参数表支持最多三级结构：

| 一级分类 | 二级分类 | 知识点 | ID |
|---|---|---|---|
| 基础知识及语言表达 |  |  |  |
|  | 字音字形 |  |  |
|  |  | 字音 | 5 |
|  |  | 字形 | 15 |

兼容原有“分类 / 知识点 / ID”三列写法。修改分类名称或层级时可保留 ID 不变。

### 切换题库

- 在“使用说明”页面列出数据目录中的题库文件
- 可选择并切换到另一套兼容题库
- 切换结果会记录到 `data/current-db.txt`，刷新后仍保持上次选择
- 切换前建议先导出或清空试题篮，避免题号含义变化

当前数据目录：`data/`

## 主要 API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/meta` | 题库元数据与统计 |
| `GET` | `/api/questions` | 搜索、筛选与分页 |
| `GET` | `/api/questions/{id}` | 获取单题 |
| `PUT` | `/api/questions/{id}` | 更新单题 |
| `POST` | `/api/questions/bulk` | 按 ID 批量获取 |
| `POST` | `/api/questions/random` | 随机抽题 |
| `GET` | `/api/papers` | 搜索与分页试卷 |
| `GET` | `/api/papers/{id}` | 获取整卷题目 |
| `POST` | `/api/exports/docx` | 生成并下载 DOCX |
| `GET` | `/api/config/export` | 下载题库参数表 |
| `GET` | `/api/databases` | 获取可切换题库列表 |
| `POST` | `/api/databases/switch` | 切换当前题库 |

旧数据库表结构保持不变：

- `Questions`
- `Papers`
- `Knowledge`
- `Qtypes`
- `Difficulties`
- `db_info`

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `HOST` | `0.0.0.0` | 后端监听地址 |
| `PORT` | `8000` | 后端监听端口 |
| `RELOAD` | 空 | 设为 `1` 开启 uvicorn 热重载 |
| `TIKU_DB_PATH` | `data/data.db` | SQLite 路径 |
| `TIKU_CONFIG_XLSX` | `data/config.xlsx` | 参数表路径 |
| `TIKU_STATIC_DIR` | `static` | 静态文件目录 |

## DOCX 导出说明

HTML2DOCX 已内置在题库后端，与题库共用同一个端口，不依赖 8010 独立服务。

- 题库导出接口：`POST /api/exports/docx`

HTML2DOCX 的独立 HTTP 接口与健康检查接口已关闭，转换逻辑只由题库导出接口内部调用。

后端在内存中把题目 HTML 组装为完整试卷，调用内置转换器生成 DOCX，并直接返回浏览器。支持题干中的表格与图片（data URI、本地路径、网络地址）。不使用 pandoc。
