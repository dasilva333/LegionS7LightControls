# Service User Manual – keyboard-led-project

This project’s backend is running as a **Windows service** (via NSSM), so it stays up without a console window and works even when you’re logged out.

---

## Service Details
- **Service name:** `keyboard-led-backend`
- **Executable:** `C:\Program Files\nodejs\node.exe`
- **Script:** `C:\Users\h4rdc\Documents\Github\keyboard-led-project\automation\backend\server.js`
- **Working directory:** `C:\Users\h4rdc\Documents\Github\keyboard-led-project\automation\backend`

## Logs
- **stdout:** `C:\Users\h4rdc\.pm2\logs\keyboard-led-backend.out.log`
- **stderr:** `C:\Users\h4rdc\.pm2\logs\keyboard-led-backend.err.log`

---

## Common Tasks (Windows – run in an elevated terminal)

### Check service status
```bat
sc query keyboard-led-backend
```

### Start / Stop / Restart service
```bat
sc start keyboard-led-backend
sc stop keyboard-led-backend
```

### View logs
```bat
type C:\Users\h4rdc\.pm2\logs\keyboard-led-backend.out.log

type C:\Users\h4rdc\.pm2\logs\keyboard-led-backend.err.log
```

---

## Rebuild Frontend + Deploy
From `automation/frontend`:
```bat
npm run build
```
This automatically copies `build/` → `automation/backend/dist/`.

---

## Backend Static Hosting
The backend serves the built frontend from:
```
C:\Users\h4rdc\Documents\Github\keyboard-led-project\automation\backend\dist
```
Routes:
- `/` → `dist/index.html`
- `/app` → `dist/index.html`

---

## If the Service Won’t Start
1) Check the **stderr** log first.
2) Manually run the backend to see errors:
```bat
cd C:\Users\h4rdc\Documents\Github\keyboard-led-project\automation\backend
node server.js
```
3) If it runs manually but not as a service, re-check paths in NSSM.

---

## NSSM Location / Maintenance
NSSM is installed here:
```
C:\Tools\nssm-2.24\nssm-2.24\win64\nssm.exe
```

### Edit service settings (GUI)
```bat
C:\Tools\nssm-2.24\nssm-2.24\win64\nssm.exe edit keyboard-led-backend
```

### Remove service
```bat
sc stop keyboard-led-backend
sc delete keyboard-led-backend
```

---

## Optional: Test API
```bat
curl http://localhost:3005/health
```

---

If you update `server.js` or any backend dependencies, just restart the service after install/build.
