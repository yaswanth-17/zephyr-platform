# Zephyr Learning Platform

An interactive learning platform and playground for Zephyr RTOS — Device Tree (DTS), CMakeLists, and YAML Bindings — powered by your local Zephyr installation.

![Platform](https://img.shields.io/badge/Zephyr-RTOS-blue) ![Python](https://img.shields.io/badge/Python-3.11+-green) ![React](https://img.shields.io/badge/React-18-61dafb) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)

---

## What it does

- **Learn** — Step-by-step topics for Device Tree, CMakeLists, and YAML bindings with real code examples
- **Auto Generate** — Pick a peripheral (PWM, GPIO, UART…) + SoC + board → get a ready-to-use DTS overlay instantly
- **Try It Yourself** — Write your own DTS and validate it against real Zephyr bindings with line-by-line feedback
- **Search** — Full-text search across 3,500+ Zephyr bindings, 994+ boards, 50+ vendors

All data comes directly from your local Zephyr installation — no internet required after setup.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.11+ | https://python.org |
| Node.js | 18+ LTS | https://nodejs.org |
| Zephyr RTOS | Any | https://docs.zephyrproject.org/latest/develop/getting_started |
| Git | Any | https://git-scm.com |

You need a working Zephyr workspace already set up (i.e. you can already build Zephyr apps).

---

## Project Structure

```
zephyr-platform/
├── parser/                  # Zephyr metadata extractor (run once)
│   ├── parsers/
│   │   ├── bindings_parser.py
│   │   └── board_parser.py
│   ├── run_all.py
│   └── requirements.txt
│
├── data/                    # Generated data (git-ignored, created by parser)
│   └── json/
│       ├── bindings.json    # 3,500+ peripheral bindings
│       └── boards.json      # 994+ board definitions
│
├── backend/                 # Python FastAPI server
│   ├── main.py
│   ├── requirements.txt
│   ├── api/routes/
│   ├── core/
│   └── services/
│
└── frontend/                # React + TypeScript + Tailwind
    ├── src/
    ├── package.json
    └── vite.config.ts
```

---

## Setup

### Step 1 — Clone the repo

```bash
git clone https://github.com/yourusername/zephyr-platform.git
cd zephyr-platform
```

### Step 2 — Run the Zephyr metadata parser

This reads your local Zephyr installation and generates the data the app uses.

```bash
cd parser
pip install -r requirements.txt

# Replace the path below with your actual Zephyr location
python run_all.py --zephyr-base "D:/Projects/zephyr_project/external/zephyr"
```

**How to find your Zephyr base path:**

```bash
# Windows
echo %ZEPHYR_BASE%

# Linux / macOS
echo $ZEPHYR_BASE
```

If that prints nothing, look for a folder containing `dts/`, `boards/`, `soc/`, and `west.yml`. That folder is your Zephyr base.

**Expected output:**
```
Found 1800+ YAML files in .../dts/bindings
Parsed: 3555 bindings
Saved → data/json/bindings.json  (4920 KB)

Found 994 board YAML files
Saved → data/json/boards.json  (238 KB)
```

### Step 3 — Start the backend

```bash
cd backend
pip install -r requirements.txt

# Create the environment file
echo DATA_DIR=../data/json > .env

# Start the server
python -m uvicorn main:app --reload --port 8000
```

You should see:
```
[startup] Loaded 3555 bindings
[startup] Loaded 994 boards
[startup] Ready — 3555 bindings, 994 boards
INFO: Application startup complete.
```

Keep this terminal open.

### Step 4 — Start the frontend

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
VITE v8.x  ready in 1200ms
➜  Local: http://localhost:5173/
```

### Step 5 — Open the app

Go to **http://localhost:5173** in your browser.

---

## Usage

### Dashboard
The homepage shows all three modules. Click any card to get started.

### DTS Playground — Auto Generate (Mode A)
1. Go to **Device Tree → Playground**
2. Select a **Peripheral** (PWM, GPIO, UART, SPI…)
3. Select a **SoC** (esp32s3, nrf52840, stm32f4…)
4. Select a **Board**
5. Click **Generate DTS** → get a complete overlay file with pinctrl, Kconfig, and explanation

### DTS Playground — Try It Yourself (Mode B)
1. Go to **Device Tree → Playground** → switch to **Try It Yourself**
2. Write your own DTS overlay in the editor
3. Click **Validate** → see errors, warnings, and hints against real Zephyr bindings

### DTS Learn
Step-by-step topics covering:
- What is Device Tree
- Nodes and Properties
- The `compatible` property
- Overlay files
- Aliases and Chosen
- Pin Control (pinctrl)

### Search
Type any keyword — peripheral name, vendor, SoC, compatible string — and get instant results with full property details.

---

## Running after initial setup

Once set up, you only need two commands each time:

**Terminal 1 — Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173**.

---

## Re-running the parser

If you update Zephyr to a newer version, re-run the parser to refresh the data:

```bash
cd parser
python run_all.py --zephyr-base "path/to/your/zephyr"
```

---

## Troubleshooting

**Dropdowns are empty / API errors in browser console**
→ The backend is not running. Start it in a separate terminal (Step 3 above).

**`uvicorn` is not recognized**
→ Run it as `python -m uvicorn main:app --reload --port 8000` instead.

**`npm` is not recognized**
→ Node.js is not installed. Download from https://nodejs.org (LTS version).

**`ModuleNotFoundError: No module named 'pydantic_settings'`**
→ Run `pip install pydantic-settings` then retry.

**Parser says bindings folder not found**
→ Your `--zephyr-base` path is wrong. Make sure the folder contains a `dts/bindings/` subdirectory.

**Port 8000 already in use**
→ Change the port: `python -m uvicorn main:app --reload --port 8001`
→ Then update `frontend/vite.config.ts` proxy target to `http://127.0.0.1:8001`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Python, FastAPI, Pydantic |
| Data | JSON files generated from Zephyr source |
| Parser | Python, PyYAML |
| State | Zustand |
| Routing | React Router v6 |

---

## Roadmap

- [x] DTS bindings parser
- [x] Board definitions parser
- [x] FastAPI backend with search and generate endpoints
- [x] DTS Learn module (6 topics)
- [x] DTS Playground — Auto Generate (Mode A)
- [x] DTS Playground — Try It Yourself + Validate (Mode B)
- [x] Global search across all bindings
- [ ] CMakeLists learn + playground
- [ ] YAML bindings learn + playground
- [ ] DTS tree visualizer (D3.js)
- [ ] Memory / flash partition analyzer
- [ ] AI assistant integration
- [ ] Kconfig learn module

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/cmake-module`
3. Commit your changes: `git commit -m "add cmake learn module"`
4. Push and open a PR

---

## License

MIT
