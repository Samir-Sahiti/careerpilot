# CareerOS — Plani i Demos Final

**Kohëzgjatja:** 5–7 minuta
**Audienca:** vlerësues + bashkëstudentë
**Formati:** demo live në browser, me një backup video + screenshots gati në rast emergjence

---

## 1. Çka është projekti dhe kujt i shërben

**CareerOS** është një platformë AI që mbulon të gjithë ciklin e kërkimit të punës, jo vetëm një hap të tij.

**Problemi që zgjidh:** sot një kandidat përdor pesë vegla të ndara — një për CV, një për të analizuar shpalljen, një për cover letter, një për mock interview, një për të mbajtur listën e aplikimeve. Asnjëra nuk komunikon me tjetrën. CareerOS i bashkon të gjitha rreth një CV-je të vetme, dhe — pikë kyçe — **mëson nga rezultatet e përdoruesit** për t'i kalibruar parashikimet me kalimin e kohës.

**Përdoruesi target:** kandidatë teknikë aktivë në kërkim pune, sidomos developers / designers / product people, që duan mbështetje AI në të gjithë loop-in: CV → fit me shpalljen → aplikim → intervistë → planifikim karriere.

**Loop-i bazë (do ta përmend në hapje, jo do ta lexoj):**
ngarko CV → ngjit shpalljen → merr fit score + skill gaps + salary context → tailored CV → cover letter → mock interview → track aplikimin → kap rezultatin → kalibro parashikimet e ardhshme.

**Pse është ndryshe:** fit score-i nuk është numër arbitrar nga AI. Përdor një **rubrikë të fiksuar me banda 0–19 / 20–39 / ... / 90–100** dhe — pasi përdoruesi ka ≥3 outcome të kapura — injektojmë historikun e tij si few-shot examples në prompt për ta rikalibruar modelin. Kjo është e dokumentuar te `CLAUDE.md` dhe e implementuar te `buildJobAnalysisPrompt` në `src/lib/ai/prompts.ts`.

---

## 2. Flow-i kryesor që do të demonstroj

E kam zgjedhur flow-n që mbulon **vlerën më të madhe në kohën më të shkurtër** dhe që tregon dallimin nga konkurrenca (kalibrimi + rubrika fikse). Nuk do të demonstroj çdo feature — do të prek 4 nga 7-të, dhe pjesën tjetër do ta tregoj me një screenshot të shpejtë në fund.

### Skript i demos (timing-u real):

**[0:00 – 0:30] Hook + landing demo (pa login)**
- Hap landing page-n.
- "Para se të hyjmë brenda, kjo është gjëja e parë që sheh një vizitor i ri."
- Ngjit një shpallje pune (e kam të kopjuar gati në clipboard) në demo box-in inline.
- Brenda ~10 sekondash kthen role breakdown: skills, seniority, red flags.
- "Kjo është pa login, e limituar në 1 për IP në ditë."

**[0:30 – 1:00] Login + dashboard**
- Login me një llogari demo që e kam përgatitur (CV-ja tashmë e ngarkuar, 4–5 aplikime me outcomes të kapura).
- Tregoj dashboard-in: NextStepWidget, FollowUpWidget. "Çdo widget këtu lidhet me një feature konkret."

**[1:00 – 2:30] Job Analyzer — pjesa qendrore (e kalibruar)**
- Shkoj te Job Analyzer, ngjit një shpallje për një rol Senior Frontend.
- Ndërsa po ngarkohet, them: "Ky është thelbi i CareerOS. Nuk ju jep një numër të rrumbullakosur — ju thotë **mbi çfarë baze** ka dhënë notën."
- Kur kthehet rezultati, theksoj:
  - **Fit score-i** dhe **basis-i** (explicit/inferred/speculative)
  - **Confidence rationale** ("Matched 7/9 skills, seniority inferred...")
  - Matched / missing skills
  - Salary: nëse listing-u nuk ka salary, kthen guidance, jo numra të hallucinuar
  - Company context panel (anash)
- "Vërejtni — kjo llogari ka 4 outcomes të kapura nga më parë. Modeli i ka përdorur si calibration examples. Po të kishte qenë llogari e re, scoreja mund të kishte qenë 8 pikë më e lartë."

**[2:30 – 3:30] Tailored CV + Cover Letter**
- Klikoj "Tailor CV" në faqen e job detail.
- Side-by-side diff: skills të reorderuar, bullets të rishkruar.
- Pastaj klikoj inline-CTA "Generate Cover Letter".
- Tregoj copy-n: 3 paragrafë, të specifikë, pa "I am passionate about" (sistemi i ndalon shprehimisht këto në system prompt — e di përmendës).

**[3:30 – 4:30] Interview Coach (adaptive mode)**
- Filloj një session të ri intervistë për të njëjtin rol.
- Përgjigjem **qëllimisht në mënyrë të paqartë** për pyetjen e parë (behavioral).
- Modeli kthen një **follow-up**, jo pyetjen tjetër — kjo është pjesa adaptive (T1-2).
- Pastaj jap përgjigje më të plotë, vazhdon me pyetjen tjetër.
- Tregoj feedback strukturë: strengths, improvements, score, STAR coverage si checkbox për behavioral.
- Klikoj `/interview/progress` për ta treguar trendin nëpër sessione.

**[4:30 – 5:30] Outcome capture + post-mortem (loop-i mbyllet)**
- Shkoj te Applications, marr një aplikim ekzistues, e ndryshoj statusin në "rejected".
- OutcomeModal hapet: stage reached, reason.
- Pas ruajtjes, shfaqet kartela e rejection post-mortem.
- AI kthen: likely_gap, çfarë bëjnë profile të ngjashme, sugjerim për Career Ladder.
- "Dhe ky është loop-i i mbyllur — outcome-i futet automatikisht në historikun që kalibron fit score-t e ardhshëm."

**[5:30 – 6:00] Analytics — provë e loop-it**
- Hap Analytics tab.
- Tregoj AI Calibration widget: "scores over-predict by ~12 pts — be more selective".
- Tregoj rejection patterns (top 3 missing skills nga rejections).
- Cohort benchmark (nëse cohort ka ≥20 anëtarë; nëse jo, them që është privacy threshold).

**[6:00 – 6:30] Career Ladder — quick tour**
- Klikoj te /career.
- Tregoj 3 paths (IC, Management, Specialised Pivot).
- Klikoj një roadmap item → status bëhet `in_progress` → progress bar lëviz.
- "Pse kam zgjedhur ta lë në fund: është feature që ka vlerë në kohë të gjatë, jo në një demo single-shot."

**[6:30 – 7:00] Mbyllje**
- Përmbledhje në 2 fjali: "loop i plotë + AI që mëson nga ti".
- Pyetje.

---

## 3. Pjesët teknike që do të shpjegoj shkurt

Do të mbaj shpjegimet teknike në **3 pikat ku ka vlerë të vërtetë inxhinierike**, jo në çdo file. Audienca e humb fokusin shpejt nëse zhytemi në strukturë folderash.

**a) Stack-u — një rresht:** "Next.js 16 App Router, React 19, Supabase për DB + Auth + Storage, Vercel AI SDK me Anthropic Claude Haiku, Tailwind v4."

**b) Si funksionon kalibrimi (core differentiator-i im):**
- Kur përdoruesi ka ≥3 outcome të kapura, marr 10 nga aplikimet e fundit (5 pozitive, 5 rejections).
- I injektoj në prompt si few-shot examples përpara rubrikës.
- Modeli sheh: "ky kandidat mori 70 dhe nuk u përgjigj askush" → e di që duhet të jetë më i rreptë.
- Rubrika ka banda fikse të dokumentuara — model-i nuk mund të dalë jashtë tyre pa arsye të qartë.
- Kjo është në `buildJobAnalysisPrompt` te `src/lib/ai/prompts.ts`.

**c) Pse `streamObject` jo `streamText` për feedback-un e intervistës:**
- Versioni fillestar nxirrte feedback si markdown me `[SCORE: 85]` parsuar me regex — i brishtë.
- Tani përdor `streamObject` me Zod schema (`InterviewFeedbackSchema`).
- UI render-on direkt strengths/improvements si lista, STAR si 4 checkbox për behavioral.
- Ky është një case ku validimi schema-tik është dukshëm më i mirë se prompting për format.

**d) Rate limiting fails CLOSED:**
- Two-tier: global 10/orë, plus per-route caps (cv/parse 3/h, cover-letter 5/h, etj.).
- Nëse DB jep error gjatë check-ut → mohojmë requestin, jo lejojmë.
- Ka rëndësi sepse çdo request AI kushton para reale dhe një bug në rate limiter mund t'i hapë derën abuse-it.

**e) Demo i palogazhuar:**
- Tabela e veçantë `demo_rate_limits` me hash SHA-256 të IP-së (kurrë IP raw).
- Pa RLS — qëllimisht — sepse aksesohet vetëm via admin client (service role).
- 1 për IP në ditë.

**Çka NUK do ta hap:** RLS policies file-by-file, struktura e plotë e folderave, çdo Zod schema. Janë në kod nëse pyet dikush.

---

## 4. Çka kam kontrolluar para demos

Checklist konkret që e kaloj **një orë para prezantimit**:

**Build + deploy:**
- [ ] `npm run build` kalon pa errors
- [ ] `npm run lint` pa warnings të reja
- [ ] `npx vitest` — testet kalojnë (rate limit tests veçanërisht)
- [ ] Deploy në Vercel kalon pa errors
- [ ] Live URL hapet në incognito + në mobile

**Llogaria demo:**
- [ ] Llogari demo e dedikuar (jo personale) — `demo@careeros.app` ose ngjashëm
- [ ] CV e ngarkuar dhe aktive (PDF i pastër, parse_status = 'completed')
- [ ] 4–5 aplikime me outcomes të kapura (që kalibrimi të jetë i dukshëm)
- [ ] 2–3 sessione intervistë të mbyllura me score (që Progress page të ketë trend)
- [ ] Career roadmap e gjeneruar me të paktën 1 item `done`, 1 `in_progress`
- [ ] Rate limit jo afër kufirit (nuk dua të marr 429 mes demos)

**Të dhëna gati:**
- [ ] Shpallje pune në clipboard, **2 versione**: njëra me salary të shfaqur, tjetra pa
- [ ] Përgjigje "e dobët" dhe "e mirë" e parapërgatitur për intervistën adaptive (që follow-up logic-u të aktivizohet besueshëm)
- [ ] Backup video i gjithë demos (screen recording 3–5 min) i ngarkuar dhe i lidhur

**Mjedisi fizik:**
- [ ] Browser në incognito, zoom 110%, vetëm tab-at e nevojshëm
- [ ] Notifications off (Slack, email, OS)
- [ ] Wifi i testuar; hotspot i telefonit gati si fallback
- [ ] Browser cache i pastruar — që login-i të jetë "fresh" sikur përdorues i ri
- [ ] Dark mode (kontrasti më i mirë në projektor)

**Repo:**
- [ ] README i përditësuar (verifikuar — pasqyron features aktualë sipas FEATURE_AUDIT.md)
- [ ] `docs/demo-plan.md` i committuar
- [ ] Git push i fundit përpara prezantimit
- [ ] Repo public (ose access i dhënë vlerësuesve)

**ENV vars në Vercel:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] OAuth providers (Google + GitHub) të konfiguruar nëse do ta tregoj atë rrugë

---

## 5. Plani B nëse demoja live dështon

E kam menduar në **3 nivele**, varësisht se sa thellë shkon problemi.

**Niveli 1 — Internet i ngadaltë / API call-i pa kthim:**
- Vazhdoj të flas, them "ndërkohë që po pres, le të shpjegoj çfarë po ndodh prapa skenës."
- Shpjegoj rate limiting / prompt strukturën / Zod validation gjersa kthehet response-i.
- Nëse pas 15 sekondash ende asgjë → kaloj në Niveli 2.

**Niveli 2 — Një feature i caktuar nuk punon (p.sh. AI call jep 500):**
- Kaloj direkt te **screenshots-et e parapërgatitur** për atë feature (i kam në një folder lokal + në Notion).
- Vazhdoj demon live për pjesët e tjera që funksionojnë.
- Jam i sinqertë: "Ky endpoint po ka problem tani — ja screenshots-et nga ekzekutimi i fundit i suksesshëm."

**Niveli 3 — Aplikacioni live nuk hapet fare / Vercel down / DB down:**
- Kaloj 100% në **video backup-in 3–5 minutësh** (i ngarkuar paraprakisht në Drive me share link, edhe lokalisht në laptop).
- Pas videos, hap kodin në VS Code dhe tregoj 2 file kritikë: `src/lib/ai/prompts.ts` (rubrika + kalibrimi) dhe `src/lib/rateLimit.ts`.
- Kjo akoma e tregon vlerën inxhinierike edhe pa app live.

**Niveli 4 — laptop-i im jashtë funksioni:**
- Slide deck-u + video backup-i janë në Drive.
- Mund ta hap nga laptop-i i dikujt tjetër ose nga telefoni (deck minimal i optimizuar).

**Rregulla që ndjek pavarësisht nivelit:**
- Kurrë mos shqetësohem live — nëse panikohem, audienca e ndjen.
- Nuk gjykoj veten me zë ("oh jo, kjo zakonisht punon..."). Vazhdoj rrjedhshëm.
- Mbaj timing-un. Nëse jam vonë, e shkurtoj Career Ladder dhe Analytics — Job Analyzer + Outcome loop janë "must show".

---

## Shtojcë: Mesazhe kyçe që duhet të mbeten te audienca

Nëse pas demos audienca mban mend vetëm 3 gjëra, duhet të jenë:

1. **CareerOS mbyll loop-in e plotë** — nga CV deri te outcome — jo një feature i veçuar.
2. **AI mëson nga përdoruesi** — fit score-t kalibrohen me historikun real të aplikimeve, jo janë numra statikë.
3. **Inxhinierikisht është i ndërtuar serioz** — RLS gjithkund, rate limiting fails closed, validim Zod, prompts të centralizuar, schema idempotent.

Çdo gjë tjetër — features, dizajni, navigimi — janë support për këto tre.
