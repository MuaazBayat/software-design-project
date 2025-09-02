# Testing Guide — Jest (Frontend) & Pytest (Backend)

A single, consolidated reference for GlobeTalk’s testing workflows across the **Next.js frontend (Jest)** and **Python services (pytest)**.

---

## 1) Install Prerequisites

### Frontend (Next.js)

From the project root:

```bash
cd services/frontend
npm install
```

### Backend (Python services)

From the project root:

```bash
python -m venv .venv
# Activate the venv each time you work on the project:
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install project requirements (preferred)
pip install -r requirements.txt
# or at minimum
pip install pytest
```

---

## 2) Run Tests (Quick Start — do this right after install)

### Frontend (Jest)

Run all tests once:

```bash
npm run test
```

Watch mode (re-runs on save):

```bash
npm run test:watch
```

Coverage report:

```bash
npm run test:coverage
```

Open the HTML report at `services/frontend/coverage/lcov-report/index.html`.

### Backend (pytest)

Run all tests:

```bash
pytest
```

Coverage summary (terminal):

```bash
pytest --cov=services
```

Detailed HTML coverage:

```bash
pytest --cov=services --cov-report=html
```

Open the HTML report at `htmlcov/index.html`.

---

## 3) Frontend Testing (Jest + React Testing Library)

### Project Conventions

* Test files live under a top-level `__tests__` folder.
* Name tests `*.test.js` / `*.test.tsx`.

### Writing Tests

Example (mocking a complex component like a WebGL globe):

```js
// __tests__/HomePage.test.js
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Replace the real Globe with a simple placeholder
jest.mock('@/components/globe', () => ({
  Globe: () => <div data-testid="mock-globe" />,
}))

describe('HomePage', () => {
  it('renders the mocked Globe component', () => {
    render(<Home />)
    expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
  })
})
```

### Useful Scripts

* `npm run test` — run once
* `npm run test:watch` — watch mode
* `npm run test:coverage` — generate coverage and HTML report

---

## 4) Backend Testing (pytest)

### Folder Structure & Imports

Keep tests organized under a top-level `tests/` directory that mirrors `services/`. Add empty `__init__.py` files so Python recognizes packages.

```
your-project-root/
├── .venv/
├── services/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── some_core_logic.py
│   └── matchmaking/
│       ├── __init__.py
│       └── some_matchmaking_logic.py
└── tests/
    ├── __init__.py
    ├── core/
    │   ├── __init__.py
    │   └── test_core_logic.py
    └── matchmaking/
        ├── __init__.py
        └── test_matchmaking_logic.py
```

Use **absolute imports** in tests (from the project root):

```py
from services.core.some_core_logic import add
```

### Writing Tests

Example:

```py
# services/core/some_core_logic.py
def add(a, b):
    return a + b
```

```py
# tests/core/test_core_logic.py
from services.core.some_core_logic import add

def test_add_positive_numbers():
    assert add(2, 3) == 5

def test_add_negative_numbers():
    assert add(-5, -5) == -10
```

### Running & Coverage

* `pytest` — run all tests
* `pytest --cov=services` — coverage summary
* `pytest --cov=services --cov-report=html` — HTML coverage in `htmlcov/`

---

## 5) Tips & Troubleshooting

* **Activation**: Ensure the Python venv is active before installing/running pytest.
* **Imports**: If pytest can’t find modules, confirm `__init__.py` files exist and that you’re running tests from the project root.
* **Jest environment**: For browser-only APIs (`window.alert`, `WebGL`, etc.), mock them or the components that use them.
* **CI**: Use the same commands in GitHub Actions. Frontend jobs can upload `coverage/` artifacts; backend can upload `htmlcov/`.

---

## 6) At-a-Glance Command Cheat Sheet

**Frontend**

```
cd services/frontend && npm install
npm run test
npm run test:watch
npm run test:coverage
```

**Backend**

```
python -m venv .venv && . .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
pytest
pytest --cov=services --cov-report=html
```
