# Jinsi ya Kuweka Ibn Smart Print Online (Deployment)

Sehemu ya **front end** (React + Vite) ndiyo inayowekwa online kwa hatua hizi. Folda za `backend/`, `agent/` na `django_admin/` ni za Python na zinahitaji seva yake (angalia sehemu ya mwisho).

## 1. Weka kwenye GitHub
1. Fungua https://github.com/new, tengeneza repository mpya (mfano `ibn-smart-print`). Usichague README wala .gitignore.
2. Toa (unzip) faili hili, kisha kwenye folda hiyo endesha:

```bash
git init
git add .
git commit -m "Ibn Smart Print - first commit"
git branch -M main
git remote add origin https://github.com/JINA-LAKO/ibn-smart-print.git
git push -u origin main
```

(Au kwenye GitHub bonyeza **Add file → Upload files** na uburute faili zote.)

## 2. Chagua mahali pa kuweka (mojawapo)

### A. GitHub Pages (bure, tayari imewekwa)
1. Kwenye repo: **Settings → Pages → Source: GitHub Actions**.
2. Kila ukifanya `git push` kwenye `main`, workflow ya `.github/workflows/deploy.yml` itajenga na kuweka online.
3. Kiungo: `https://JINA-LAKO.github.io/ibn-smart-print/`

### B. Vercel (rahisi zaidi)
1. https://vercel.com → **Add New → Project** → chagua repo yako.
2. Bonyeza **Deploy**. (`vercel.json` ipo tayari.)

### C. Netlify
1. https://app.netlify.com → **Add new site → Import from Git** → chagua repo.
2. Bonyeza **Deploy**. (`netlify.toml` ipo tayari.)

## 3. Kujaribu kwenye kompyuta yako
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # hutengeneza folda ya dist/
```

## 4. Backend, Django admin na Print Agent
GitHub Pages, Vercel na Netlify hazitumii Python. Kwa sasa front end inafanya kazi yenyewe (data ya mfano ndani ya kivinjari). Ili kuunganisha printa halisi:
- `backend/` (FastAPI): weka kwenye Render, Railway au VPS: `pip install -r requirements.txt` kisha `uvicorn backend.main:app --host 0.0.0.0 --port 8000`.
- `agent/`: inaendeshwa kwenye kompyuta ya Windows ya dukani yenye printa (`setup_windows_service.bat`).
- Usiweke siri (secrets/API keys) kwenye GitHub. Faili za `.env` tayari zimeondolewa na `.gitignore`.
