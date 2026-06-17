## Contributing

Contributions are welcome! This project is built for the Zephyr and embedded firmware community, so whether you're fixing a bug, adding a new learning topic, or improving the DTS generator — all help is appreciated.

---

### Ways to contribute

- **Add learning content** — new topics for DTS, CMake, or YAML modules
- **Improve the DTS generator** — better overlay templates, more peripheral support
- **Fix validator rules** — improve error messages or catch more edge cases
- **Add CMake / YAML modules** — the backend services are ready, just needs frontend pages
- **Report bugs** — open an issue with steps to reproduce
- **Improve docs** — fix typos, add examples, clarify setup steps

---

### Getting started

**1. Fork the repository**

Click the **Fork** button on GitHub to create your own copy.

**2. Clone your fork**

```bash
git clone https://github.com/YOUR_USERNAME/zephyr-platform.git
cd zephyr-platform
```

**3. Set up the project locally**

Follow the [Setup](#setup) section in this README to get the parser, backend, and frontend all running.

**4. Create a feature branch**

Always work on a new branch — never commit directly to `main`.

```bash
git checkout -b feature/your-feature-name
# examples:
# git checkout -b feature/cmake-learn-module
# git checkout -b fix/dts-validator-pinctrl
# git checkout -b docs/add-i2c-examples
```

**5. Make your changes**

Keep changes focused — one feature or fix per branch. See the [Project Structure](#project-structure) section to understand where each file lives.

**6. Test your changes**

```bash
# Backend — make sure the API still starts cleanly
cd backend
python -m uvicorn main:app --reload --port 8000

# Frontend — make sure there are no build errors
cd frontend
npm run build
```

**7. Commit with a clear message**

```bash
git add .
git commit -m "type: short description"
```

Use these prefixes:

| Prefix | When to use |
|--------|------------|
| `feat:` | New feature or page |
| `fix:` | Bug fix |
| `docs:` | README or comment changes |
| `refactor:` | Code cleanup, no behavior change |
| `style:` | UI/CSS changes |
| `parser:` | Changes to the Zephyr metadata parser |

Examples:
```bash
git commit -m "feat: add CMake learn module with 5 topics"
git commit -m "fix: dts validator missing semicolon false positive"
git commit -m "docs: add nRF52840 examples to DTS learn"
git commit -m "parser: detect soc family for STM32H7 bindings"
```

**8. Push and open a Pull Request**

```bash
git push origin feature/your-feature-name
```

Then go to GitHub → your fork → click **"Compare & pull request"**.

In your PR description, include:
- What you changed and why
- Screenshots if it's a UI change
- Which Zephyr version you tested against (run `west --version` in your Zephyr workspace)

---

### Adding a new learning topic

Learning content lives in the frontend as static data inside each page file.

For DTS topics, open `frontend/src/pages/dts/DTSLearn.tsx` and add a new entry to the `TOPICS` array:

```tsx
{
  id: 'your-topic-id',
  title: 'Your Topic Title',
  content: `Explanation text here.
  
  Supports multi-line. Use bullet points like:
  • Point one
  • Point two`,
  code: `/* DTS code example */
&uart0 {
    status = "okay";
};`,
},
```

---

### Adding a new peripheral to the DTS generator

Open `backend/services/dts_generator.py` and add your peripheral to the relevant maps:

```python
# Add Kconfig symbols
KCONFIG_MAP["CAN"] = ["CONFIG_CAN=y", "CONFIG_CAN_AUTO_CALC_TIMING_ON_START=y"]

# Add CMake hints
CMAKE_MAP["CAN"] = ["target_sources(app PRIVATE src/can_sample.c)"]
```

The generator will automatically find the right binding from the parsed Zephyr data.

---

### Reporting a bug

Open an issue at: `https://github.com/YOUR_USERNAME/zephyr-platform/issues`

Include:
- Your OS (Windows / Linux / macOS)
- Your Zephyr version (`cat $ZEPHYR_BASE/VERSION`)
- Python version (`python --version`)
- Node version (`node --version`)
- Steps to reproduce
- What you expected vs what happened
- Any error messages from the terminal

---

### Code style

**Python (backend + parser)**
- Follow PEP 8
- Type hints on all function signatures
- Docstrings on all public functions

**TypeScript (frontend)**
- Functional components only
- Props typed with interfaces
- No `any` types

---

### Need help?

Open a [GitHub Discussion](https://github.com/YOUR_USERNAME/zephyr-platform/discussions) or file an issue — happy to help you get your contribution merged.
