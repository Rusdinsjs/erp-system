---
description: How to run the development server without auto-browser verification
---

# Manual Development Startup

## Purpose

Start the backend and frontend servers for manual testing, ensuring no automated browser windows are spawned by the agent.

## Steps

// turbo

1. Stop any running instances:

```powershell
# Press Ctrl+C in the terminal if running
```

// turbo
2. Run the startup script:

```powershell
./start-dev.ps1
```

## Verification

1. **Do not** wait for the browser to open automatically.
2. Manually open your preferred browser.
3. Navigate to:
   - Frontend: `http://localhost:5174`
   - Backend Health: `http://localhost:8080/health`
