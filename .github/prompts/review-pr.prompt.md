---
agent: agent
description: >
  Review a Java/Spring Boot or JavaScript/TypeScript pull request.
  Usage: /review-pr <source-branch> <target-branch> [repo-path]
  Example: /review-pr feature/JIRA-123 develop
---

# PR Review — Java / Spring Boot · JavaScript / TypeScript

> **Platform note:** Copilot Chat cannot run shell commands directly.
> This prompt uses `#terminalLastCommand` — you run one git command in the terminal,
> Copilot reads the output automatically. No copy-pasting required.

---

## Usage

If the user invokes `/review-pr` with no arguments, or with incomplete/invalid arguments, respond with exactly this help message and nothing else:

```
Usage: /review-pr <source-branch> <target-branch> [repo-path]

  source-branch   The feature or fix branch you want reviewed
  target-branch   The branch it merges into (e.g. main, develop)
  repo-path       (Optional) Absolute path to the local repo checkout.
                  Defaults to the current workspace root.

Examples:
  /review-pr feature/JIRA-123 develop
  /review-pr fix/login-bug main
  /review-pr feature/payment-service develop /c/repos/my-service

Notes:
  • source-branch and target-branch must be different.
  • source-branch can be a local branch.
  • target-branch is always resolved from remote (origin) to ensure it is up to date.
  • Supports Java / Spring Boot and JavaScript / TypeScript projects.
```

---

## Step 1 — Parse & Validate Arguments

The user's input is: `${input}`

Extract:
- `SOURCE_BRANCH` — first token (the feature/fix branch being reviewed)
- `TARGET_BRANCH` — second token (the base branch, e.g. `main`, `develop`)
- `REPO_PATH` — third token if given; default to the current workspace root

**Before doing anything else**, check: are `SOURCE_BRANCH` and `TARGET_BRANCH` the same value?
If yes, stop immediately and ask the user to provide two **different** branch names. Do not run any commands with an empty diff.

---

## Step 2 — Collect the Diff via Terminal + #terminalLastCommand

Copilot Chat cannot execute shell commands directly. Use this flow instead:

**2a — Ask the user to run this single combined command** in the VS Code integrated terminal (`Ctrl+\``):

```bash
git fetch origin <TARGET_BRANCH> && echo "=== LOG ===" && git log origin/<TARGET_BRANCH>..<SOURCE_BRANCH> --oneline && echo "=== STAT ===" && git diff origin/<TARGET_BRANCH>...<SOURCE_BRANCH> --stat && echo "=== DIFF ===" && git diff origin/<TARGET_BRANCH>...<SOURCE_BRANCH> && echo "=== DEPS ===" && git diff origin/<TARGET_BRANCH>...<SOURCE_BRANCH> -- "**/pom.xml" "**/build.gradle" "**/build.gradle.kts" "**/package.json" "**/package-lock.json"
```

> Target branch is always resolved from `origin/<TARGET_BRANCH>` so the diff reflects the latest remote state, not a stale local copy. Source branch is local.

**2b — Once the command has run**, tell the user to type `#terminalLastCommand` in the chat input. Copilot will read the terminal output automatically — no copy-pasting required.

**2c — Edge cases:**
- If `git fetch` fails (no network / wrong remote), ask the user whether to fall back to local `TARGET_BRANCH`
- If the diff is empty after confirming the branches are different, stop and report it — do not fabricate a review

---

## Step 3 — Detect Project Type

Read the workspace root to determine the stack:
- If `pom.xml` or `build.gradle` exists → **Java / Spring Boot**
- If `package.json` exists → inspect `dependencies` for `react`, `vue`, `angular`, `next`, `express`, `nest` → **JavaScript / TypeScript** (note the sub-framework)
- If both exist → review both stacks

---

## Step 4 — Review Checklist

Work through the diff file-by-file. For every finding write:

```
[SEVERITY] path/to/file:line — Category — What is wrong — How to fix it
```

Severities: **BLOCKER** | **MAJOR** | **MINOR** | **NIT**

---

### Universal (all projects)

**Correctness & Logic**
- Business logic matches the PR description / linked ticket
- No off-by-one errors, missing null/undefined checks, or unhandled edge cases
- All conditional branches are complete; `switch` / match covers all cases or has a default

**Security — OWASP Top 10**
- No secrets, API keys, or passwords committed (check `.env`, config files, test fixtures)
- User input is validated and sanitised before use — never trust client-supplied data
- No string-interpolated queries or shell commands built from user input
- Sensitive data (PII, tokens, credentials) is not logged or included in error responses
- Dependencies added in this PR have no known critical CVEs (flag if unclear)
- Authentication and authorisation checks are present on every protected route/endpoint
- Insecure direct object references (IDOR) — resource ownership verified server-side

**Tests**
- New logic has corresponding unit tests
- Edge cases covered: null/undefined/empty input, boundary values, error paths
- No test state leaks between test cases
- Mocks/stubs are reset after each test

**Code Quality**
- Functions are single-responsibility; flag anything over ~40 lines
- Magic numbers and strings extracted to named constants
- No dead code, commented-out blocks, or leftover debug statements
- No TODO comments introduced without a linked ticket

---

### Java / Spring Boot (when applicable)

**Spring Boot Idioms**
- `@Transactional` not on `private` methods; propagation level is deliberate
- No N+1 queries — verify `@OneToMany` / `@ManyToMany` fetch type and use `JOIN FETCH` or `@EntityGraph` where needed
- `@Async` returns `void` or `Future`; not combined unsafely with `@Transactional`
- Constructor injection preferred over `@Autowired` field injection
- `@ConfigurationProperties` for grouped config; `@Value` for single isolated properties
- No values hardcoded that belong in `application.properties` or environment variables
- REST endpoints use the correct HTTP verb and return appropriate status codes
- `@ControllerAdvice` + `@ExceptionHandler` used consistently — no ad-hoc `try/catch` swallowing exceptions in controllers

**Java Security**
- No SQL built by string concatenation — use JPA / named queries / parameterised `JdbcTemplate`
- User input never flows into `Runtime.exec()`, `ProcessBuilder`, `ScriptEngine`, or `eval`
- Sensitive fields have `@JsonIgnore` or are excluded via DTOs — never return raw entity objects from controllers
- CSRF not disabled on state-changing endpoints
- `@PreAuthorize` / `@Secured` present on all protected endpoints
- File uploads validate content type and size; storage path not exposed in responses
- `ObjectMapper` deserialisation does not enable `enableDefaultTyping` (polymorphic type handling)

**Performance**
- No `findAll()` on unbounded tables — pagination enforced
- `Optional.get()` always guarded; prefer `orElse` / `orElseThrow`
- No expensive operations inside loops that could be batched
- `@Cacheable` applied where appropriate; `@CacheEvict` handles invalidation

**Resilience**
- External HTTP calls (RestTemplate / WebClient / Feign) have explicit connect and read timeouts
- `@Retryable` / `@CircuitBreaker` applied to calls that can transiently fail

**Build & Dependencies**
- No `SNAPSHOT` versions on a release or main branch
- New `pom.xml` / `build.gradle` entries are justified and have no obvious CVEs
- No duplicate or conflicting transitive dependencies

---

### JavaScript / TypeScript (when applicable)

**TypeScript & Language**
- `any` is not used as an escape hatch — use proper types or `unknown`
- `null` / `undefined` are handled explicitly; no unchecked property access on nullable values
- Async functions have `try/catch` or `.catch()` — unhandled promise rejections must not be silently swallowed
- `==` not used where `===` is required
- No `eval()`, `new Function()`, `setTimeout(string)` — these allow code injection
- No `Object.assign` / spread that accidentally copies prototype properties

**Frontend Security (React / Vue / Angular)**
- No `dangerouslySetInnerHTML` / `v-html` / `[innerHTML]` with unsanitised user content — leads to XSS
- User-controlled values are never used to construct `href`, `src`, `action` attributes without sanitisation (open redirect / XSS)
- Sensitive data (tokens, PII) not stored in `localStorage` or `sessionStorage` — prefer `httpOnly` cookies
- CORS configuration is not wildcard (`*`) for credentialed requests
- Content Security Policy headers set if server-rendered
- Form inputs validated both client-side and server-side

**Node / Express / NestJS Security**
- `helmet` middleware enabled (sets secure HTTP headers)
- Rate limiting applied to authentication and public-facing endpoints
- File upload endpoints validate MIME type and size; files not served from user-controlled paths
- SQL / NoSQL queries use parameterised statements or ORM query builders — no template literals in queries
- JWT secrets sourced from environment variables; `algorithm` explicitly set (reject `none`)
- `express-validator` / `class-validator` decorators applied to all request DTOs

**React / Component Best Practices**
- `useEffect` has correct dependency arrays — missing deps cause stale closure bugs
- Large components are split; business logic extracted to custom hooks
- `key` props on lists use stable unique IDs, not array indices
- Expensive computations wrapped in `useMemo` / `useCallback` where measurable
- No direct DOM manipulation bypassing the framework

**Performance**
- No synchronous blocking operations (`fs.readFileSync`, `crypto.pbkdf2Sync`) in request handlers
- Large payloads paginated; streaming used for large file responses
- Images and assets have explicit size constraints; no unbounded uploads stored in-memory
- Database queries in loops replaced with batch queries or `Promise.all`

**Dependencies & Supply Chain**
- New `package.json` entries are justified; `^` version ranges reviewed for breaking-change risk
- `package-lock.json` / `yarn.lock` committed and updated consistently with `package.json`
- No packages with known critical CVEs introduced (run `npm audit` / `yarn audit` if unclear)
- No `postinstall` scripts in new dependencies that execute arbitrary code

---

## Step 5 — Output

```
## PR Review: SOURCE_BRANCH → TARGET_BRANCH
Stack: Java/Spring Boot | JavaScript/TypeScript | Both

### Overview
2–3 sentences: what this PR does and why.

### Verdict
- [ ] APPROVED
- [ ] APPROVED WITH COMMENTS — resolve MAJORs before merge
- [ ] CHANGES REQUESTED — BLOCKERs must be fixed

---

### Findings

| # | Severity | File : Line | Category | Issue | Suggestion |
|---|----------|-------------|----------|-------|------------|

---

### Positive Highlights
Good patterns worth reinforcing.

### Questions for the Author
Anything unclear that needs context before a final verdict.
```

Keep the tone constructive. Always explain **why** a finding matters — not just what is wrong.
