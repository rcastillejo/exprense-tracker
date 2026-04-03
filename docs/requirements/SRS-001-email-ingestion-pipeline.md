# SRS-001: Email Ingestion Pipeline — BCP, Interbank, BBVA, Scotiabank, Diners, Yape

## Version: v1.0
## Date: 2026-04-03
## Status: Draft
## Related: Issue #3, ADR-001, docs/problem-statement.md

---

## 1. Purpose

Define the functional and non-functional requirements for the email ingestion
pipeline that reads bank notification emails from 2 Gmail accounts, parses
spending data per bank, and writes consolidated records to Google Sheets
automatically.

---

## 2. Scope

### In scope (v1)

- Email reading from 2 Gmail accounts via Gmail API (Apps Script native)
- Parsing of transaction emails from: BCP, Interbank, BBVA, Scotiabank, Diners Club, Yape/Plin
- AI-assisted categorization via Claude API for ambiguous descriptions
- Writing parsed transactions to Google Sheets
- Daily time-driven trigger (no real-time processing)
- Deduplication of already-processed emails

### Out of scope (v1)

- Real-time email processing (webhooks, push notifications)
- More than 2 Gmail accounts
- Non-Gmail providers (Outlook, Yahoo)
- Mobile or web UI beyond Google Sheets
- Budget alerts or spending predictions
- PDF/Excel export
- Multi-tenancy or user authentication

---

## 3. Actors

| Actor | Description |
|---|---|
| Usuario 1 | First account holder; Gmail inbox with bank notification emails |
| Usuario 2 | Second account holder; Gmail inbox with bank notification emails |
| Apps Script Runtime | Scheduled executor that runs the pipeline daily |
| Claude API | External AI service used to categorize ambiguous transaction descriptions |
| Google Sheets | Storage and dashboard for all parsed transactions |

---

## 4. Functional Requirements

### FR-01 — Email Retrieval

| ID | Requirement |
|---|---|
| FR-01.1 | The system SHALL connect to Gmail User 1's inbox using Gmail API via Apps Script |
| FR-01.2 | The system SHALL connect to Gmail User 2's inbox using Gmail API via Apps Script |
| FR-01.3 | The system SHALL filter emails by known bank sender addresses (see §7) |
| FR-01.4 | The system SHALL retrieve only emails received since the last successful run (incremental) |
| FR-01.5 | The system SHALL mark processed email IDs to prevent duplicate processing across runs |
| FR-01.6 | The system SHALL handle the case where a Gmail inbox has no new emails gracefully (no error, no write) |

### FR-02 — Email Parsing

| ID | Requirement |
|---|---|
| FR-02.1 | The system SHALL extract the following fields from each transaction email: `fecha`, `monto`, `moneda`, `comercio`, `banco`, `usuario` |
| FR-02.2 | The system SHALL have a dedicated parser module per bank (BCP, Interbank, BBVA, Scotiabank, Diners, Yape/Plin) |
| FR-02.3 | Each parser SHALL use regex patterns matched against the email subject and/or body |
| FR-02.4 | If a parser cannot extract a required field, that field SHALL be recorded as empty and the row flagged with `parse_status = PARTIAL` |
| FR-02.5 | If a parser matches no known pattern, the transaction SHALL be recorded with `parse_status = UNPARSED` and the raw subject stored |
| FR-02.6 | Amounts SHALL be parsed as numbers (no currency symbol, no thousand separators) |
| FR-02.7 | Dates SHALL be normalized to `YYYY-MM-DD` format regardless of the source bank format |

### FR-03 — AI Categorization

| ID | Requirement |
|---|---|
| FR-03.1 | The system SHALL send the `comercio` field to Claude API when the description is ambiguous (e.g., alphanumeric POS codes like "CARGO POS 847362") |
| FR-03.2 | The system SHALL use `claude-haiku-4-5` as the default model for cost efficiency |
| FR-03.3 | Claude API SHALL return a human-readable category (e.g., "Restaurante", "Supermercado", "Transporte") |
| FR-03.4 | The category assigned by Claude SHALL be stored in a `categoria` column in Sheets |
| FR-03.5 | If the `comercio` field is already readable (e.g., "WONG", "STARBUCKS"), the system MAY skip the Claude API call and attempt rule-based categorization first |
| FR-03.6 | If Claude API returns an error or times out, `categoria` SHALL be set to `"Sin categoría"` and the pipeline SHALL continue without failing |
| FR-03.7 | The system SHALL batch Claude API calls where possible to minimize latency and API cost |

### FR-04 — Data Writing (Google Sheets)

| ID | Requirement |
|---|---|
| FR-04.1 | The system SHALL append new transaction rows to a designated sheet tab named `"Transacciones"` |
| FR-04.2 | Each row SHALL contain the columns defined in §5 (Data Model) |
| FR-04.3 | The system SHALL NOT overwrite existing rows |
| FR-04.4 | The system SHALL write all transactions from a single run in one batch append operation where possible |
| FR-04.5 | A separate sheet tab named `"Dashboard"` SHALL aggregate transactions by month and user using Sheets formulas (not programmatic writes) |
| FR-04.6 | The system SHALL log the run timestamp and count of new rows written to a `"Log"` tab after each execution |

### FR-05 — Deduplication

| ID | Requirement |
|---|---|
| FR-05.1 | The system SHALL store processed Gmail message IDs in a persistent store (a dedicated Sheets tab or PropertiesService) |
| FR-05.2 | Before processing an email, the system SHALL check whether its message ID has already been recorded |
| FR-05.3 | Duplicate emails SHALL be skipped silently (no error, no write) |

### FR-06 — Scheduling

| ID | Requirement |
|---|---|
| FR-06.1 | The pipeline SHALL be triggered automatically once per day via an Apps Script time-driven trigger |
| FR-06.2 | The trigger time SHOULD be configurable (default: 07:00 local time) |
| FR-06.3 | The pipeline SHALL complete within the 6-minute Apps Script execution limit |

---

## 5. Data Model

### 5.1 Transactions sheet (`"Transacciones"`)

| Column | Type | Description |
|---|---|---|
| `id` | String | Gmail message ID (used for deduplication) |
| `fecha` | Date (YYYY-MM-DD) | Transaction date extracted from email |
| `monto` | Number | Transaction amount (positive = expense) |
| `moneda` | String | `"PEN"` or `"USD"` |
| `comercio` | String | Merchant name or raw POS description |
| `categoria` | String | Human-readable category (AI or rule-based) |
| `banco` | String | Bank name: `BCP`, `Interbank`, `BBVA`, `Scotiabank`, `Diners`, `Yape` |
| `usuario` | String | `"Usuario1"` or `"Usuario2"` |
| `parse_status` | String | `OK`, `PARTIAL`, or `UNPARSED` |
| `ingested_at` | Timestamp | Datetime when the row was written by the pipeline |

### 5.2 Log sheet (`"Log"`)

| Column | Type | Description |
|---|---|---|
| `run_at` | Timestamp | Trigger execution datetime |
| `emails_found` | Number | Total emails fetched across both inboxes |
| `rows_written` | Number | New rows appended to Transacciones |
| `rows_skipped` | Number | Duplicates or unmatched emails |
| `errors` | String | Error messages if any, comma-separated |

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Cost | Total monthly infrastructure cost SHALL be $0 (free tier only) |
| NFR-02 | Performance | The pipeline SHALL process up to 100 emails per user per day within the 6-min Apps Script limit |
| NFR-03 | Reliability | If the pipeline fails mid-run, previously written rows SHALL NOT be duplicated on the next run (deduplication by message ID) |
| NFR-04 | Maintainability | Each bank parser SHALL be in its own function/file to allow independent updates |
| NFR-05 | Security | Claude API key SHALL be stored in Apps Script PropertiesService, never hardcoded |
| NFR-06 | Observability | Every run SHALL write a log entry to the `"Log"` tab with outcome and row count |
| NFR-07 | Usability | End users SHALL not need to interact with the Apps Script code to use the system |
| NFR-08 | Resilience | A single unparseable email SHALL NOT stop the pipeline; it SHALL be skipped and logged |

---

## 7. Bank Sender Configuration

Each bank parser is identified by the sender email address and/or subject prefix.
These patterns must be validated against real samples before implementation.

| Bank | Expected sender domain | Notes |
|---|---|---|
| BCP | `@notificaciones.viabcp.com` | May include SMS-to-email forwarding |
| Interbank | `@interbank.pe` | Subject typically starts with "Alerta de consumo" |
| BBVA | `@bbva.pe` or `@bbvamail.pe` | Multiple email formats possible |
| Scotiabank | `@scotiabank.com.pe` | Verify current notification address |
| Diners Club | `@dinersclub.com.pe` | Confirm sender; low volume expected |
| Yape / Plin | `@yape.com.pe` | Yape and Plin may share format; verify |

> **Note:** Actual sender addresses and email body patterns MUST be confirmed
> against real email samples before implementing parsers. These are initial
> estimates. See §8 for the field extraction requirement per bank.

---

## 8. Parser Field Extraction Requirements

Each parser MUST attempt to extract the following fields. Fields marked
**Required** cause `parse_status = PARTIAL` if missing.

| Field | BCP | Interbank | BBVA | Scotiabank | Diners | Yape |
|---|---|---|---|---|---|---|
| `fecha` | Required | Required | Required | Required | Required | Required |
| `monto` | Required | Required | Required | Required | Required | Required |
| `moneda` | Required | Required | Required | Required | Required | Optional (default PEN) |
| `comercio` | Required | Required | Required | Required | Required | Optional (transferencia) |

---

## 9. Acceptance Criteria (from Issue #3)

### AC-01 — BCP single user transaction
```
GIVEN a BCP expense email arrives in Usuario 1's Gmail
WHEN the daily trigger runs
THEN the expense appears in Sheets with: fecha, monto, comercio, banco="BCP", usuario="Usuario1"
```

### AC-02 — Multi-user consolidation
```
GIVEN emails from both usuarios arrive on the same day
WHEN the pipeline processes
THEN all expenses are consolidated in the "Transacciones" sheet with a "usuario" column
  distinguishing each record
```

### AC-03 — AI categorization of ambiguous descriptions
```
GIVEN an email with description "CARGO POS 847362"
WHEN Claude API processes it
THEN a human-readable category is assigned (e.g., "Restaurante") in the "categoria" column
```

### AC-04 — Deduplication
```
GIVEN the pipeline runs twice on the same day without new emails
WHEN the second run completes
THEN no duplicate rows are added to "Transacciones"
```

### AC-05 — Resilience on parse failure
```
GIVEN an email that does not match any known parser pattern
WHEN the pipeline processes it
THEN the email is skipped, parse_status is recorded as "UNPARSED", and the pipeline continues
```

---

## 10. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| OQ-01 | What are the exact sender email addresses for each bank? Need real email samples. | rcastillejo | Open |
| OQ-02 | Does Diners Club send email notifications for every transaction or only statements? | rcastillejo | Open |
| OQ-03 | Should Yape and Plin use separate parsers or a shared one? | rcastillejo | Open |
| OQ-04 | What is the exact Apps Script project setup? Single `.gs` file or clasp + multiple files? | rcastillejo | Open |
| OQ-05 | Which Google Sheets spreadsheet ID will be used? Shared between both users? | rcastillejo | Open |
| OQ-06 | What is the preferred category taxonomy for Claude API prompts? | rcastillejo | Open |

---

## 11. Dependencies

| Dependency | Type | Notes |
|---|---|---|
| Gmail API (Apps Script) | Internal | Native to Apps Script; no additional auth needed |
| Claude API | External | Requires API key; stored in PropertiesService |
| Google Sheets API (Apps Script) | Internal | Native; no additional auth needed |
| Real email samples per bank | Input | Required before implementing parsers |

---

## References

- `docs/problem-statement.md` — Problem context and constraints
- `docs/decisions/ADR-001-stack-tecnologico.md` — Technology stack decision
- Issue #3 — Original feature request
