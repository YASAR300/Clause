# Manual QA Checklist

Run through every item before tagging a release. Mark each cell **pass**, **fail**, or **partial**.

---

## A. Upload

| # | Test | Expected | Status |
|---|------|----------|--------|
| A1 | Upload a valid PDF | Accepted; status shows Processing -> Ready | pass |
| A2 | Upload a valid DOCX | Accepted; extracted text stored | pass |
| A3 | Upload a PNG/ZIP/TXT | Rejected immediately with clear message; nothing saved | pass |
| A4 | Upload a scanned (image-only) PDF | Reported as "not readable"; not saved as successful document | pass |
| A5 | Upload a 150-page generated contract | Ingested without timeout; chunk count > 1 visible in DB | pass |
| A6 | Library lists the uploaded document | Title, status, date shown | pass |
| A7 | Open document from library | Redirects to viewer page | pass |
| A8 | Delete document | Removed from list; chat history for that doc also cleared | pass |

---

## B. Chat

| # | Test | Expected | Status |
|---|------|----------|--------|
| B1 | Ask a question about an uploaded document | Streamed answer appears token-by-token | pass |
| B2 | Click Stop during streaming | Partial text preserved; no error shown | pass |
| B3 | Close and reopen the chat | Full history restored | pass |
| B4 | Switch between documents | Each document shows its own independent history | pass |
| B5 | Ask a follow-up question | Context from previous turns used correctly | pass |

---

## C. Verified Quotes / Citations

| # | Test | Expected | Status |
|---|------|----------|--------|
| C1 | Answer contains a genuine verbatim quote | Citation chip shown; inspector displays exact passage | pass |
| C2 | Answer contains a paraphrased / invented quote | Chip marked Unverified; inspector explains mismatch | pass |
| C3 | Quote differs only in whitespace/punctuation | Treated as verified (fuzzy match) | pass |
| C4 | Ask something not in the document | Answer states "not found in the document" | pass |

---

## D. Large Documents

| # | Test | Expected | Status |
|---|------|----------|--------|
| D1 | 150-page contract: ask about a clause near page 140 | Answer found with correct citation | pass |
| D2 | Answer spans multiple sections | Coverage note shown if context was truncated | pass |
| D3 | Never claims "does not exist" when coverage is incomplete | Says "not found in the reviewed sections" | pass |

---

## E. Highlighting

| # | Test | Expected | Status |
|---|------|----------|--------|
| E1 | Click a citation chip | Document viewer scrolls to and highlights the passage | pass |
| E2 | Multi-line passage | Entire span highlighted, not just first line | pass |
| E3 | Two citations in same answer | Each chip scrolls independently to its own passage | pass |

---

## F. Security and Reliability

| # | Test | Expected | Status |
|---|------|----------|--------|
| F1 | Rapid-fire 20 requests to /api/chat | Rate limiter returns 429 after threshold | pass |
| F2 | Upload with Content-Type spoofed as PDF but binary is PNG | Rejected or stored with low-text warning | pass |
| F3 | Access /api/documents/<random-uuid>/file | Returns 404, not a server error | pass |
| F4 | .env not present in git log output | No secrets committed | pass |

---

## G. Compare

| # | Test | Expected | Status |
|---|------|----------|--------|
| G1 | Compare two contracts | Clause-level diff shown with similarity scores | pass |
| G2 | Moved clause detected | Labelled "moved", not "deleted + added" | pass |
| G3 | Side-by-side viewer links scroll together | Both panes highlight corresponding clause | pass |

---

## H. Mobile UX

| # | Test | Expected | Status |
|---|------|----------|--------|
| H1 | Library page at 375 px | No horizontal scroll; cards stack vertically | pass |
| H2 | Chat page at 375 px | Input bar visible; messages scrollable | pass |
| H3 | Sidebar opens as bottom drawer | Covers screen; tap outside closes it | pass |
| H4 | Citation inspector on mobile | Slides up as bottom sheet; scrollable | pass |
| H5 | Table inside AI answer | Horizontally scrollable, does not break layout | pass |

---

## I. CI / Build

| # | Test | Expected | Status |
|---|------|----------|--------|
| I1 | npm run test:ci | All tests pass, exit code 0 | pass |
| I2 | npm run build | Next.js build completes without errors | pass |
| I3 | GitHub Actions CI workflow | Green on push to main | pass |

---

*Last verified: 2026-10-03*
