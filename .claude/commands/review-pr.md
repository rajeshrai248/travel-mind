# PR Review — Java / Spring Boot

**Usage:** `/review-pr <source-branch> <target-branch> [local-repo-path]`

**Arguments provided:** $ARGUMENTS

---

You are a senior Java and Spring Boot engineer performing a thorough pull request review. The organization's MCP server connections to GitHub and Azure DevOps are blocked, so you will work with locally available files.

## Step 1 — Parse Arguments

Extract from `$ARGUMENTS`:
- `SOURCE_BRANCH` — the feature/fix branch being merged (first token)
- `TARGET_BRANCH` — the base branch (second token, e.g. `main`, `develop`)
- `REPO_PATH` — optional local path to the repo checkout (third token; if omitted, use the current working directory)

If arguments are missing or ambiguous, ask the user to clarify before proceeding.

## Step 2 — Gather the Diff

Run the following in the repo directory to get the full diff between branches:

```bash
git -C <REPO_PATH> diff <TARGET_BRANCH>...<SOURCE_BRANCH> --stat
git -C <REPO_PATH> diff <TARGET_BRANCH>...<SOURCE_BRANCH>
git -C <REPO_PATH> log <TARGET_BRANCH>..<SOURCE_BRANCH> --oneline
```

Also collect:
```bash
git -C <REPO_PATH> diff <TARGET_BRANCH>...<SOURCE_BRANCH> -- pom.xml '**/pom.xml' '**/build.gradle' '**/build.gradle.kts'
```

If the repo path is not accessible, ask the user to paste the diff output directly.

## Step 3 — Understand Context

Before reviewing, read:
1. Any `README.md` at the repo root for project conventions
2. `pom.xml` or `build.gradle` at the root for dependency versions and Java version
3. Any `.editorconfig`, `checkstyle*.xml`, or `spotbugs*.xml` for code style rules

## Step 4 — Perform the Review

Work through each changed file and evaluate the following categories. For every finding, cite the **file path and line number**, classify its **severity** (`BLOCKER / MAJOR / MINOR / NIT`), and provide a **concrete suggestion**.

### 4.1 Correctness & Logic
- Business logic matches the PR description / ticket
- No off-by-one errors, null-pointer risks, or unhandled edge cases
- Conditional branches are complete (all enum values handled, etc.)
- No silent exception swallowing (`catch (Exception e) {}`)

### 4.2 Spring Boot Specifics
- `@Transactional` boundaries are correct (not on `private` methods, right propagation level)
- No N+1 query problems — check `@OneToMany`, `@ManyToMany` fetch strategies
- `@Async` methods return `void` or `Future`; `@Transactional` + `@Async` interactions are safe
- Beans are not `@Autowired` on fields where constructor injection is preferred
- `@Value` vs `@ConfigurationProperties` used appropriately
- No hardcoded `application.properties` values that should be externalised
- `@RestController` endpoints have proper `@RequestMapping` / HTTP verb annotations
- Response entities use correct HTTP status codes
- Exception handlers use `@ControllerAdvice` / `@ExceptionHandler` consistently

### 4.3 Security (OWASP Top 10)
- No SQL built by string concatenation — use JPA, named queries, or `JdbcTemplate` with `?` params
- User-supplied data is never passed to `Runtime.exec()`, `ProcessBuilder`, or `ScriptEngine`
- Passwords / secrets not logged or returned in API responses
- Sensitive fields annotated with `@JsonIgnore` or excluded via DTOs
- CSRF protection not accidentally disabled for state-changing endpoints
- `@PreAuthorize` / `@Secured` present on protected endpoints
- File upload endpoints validate type, size, and do not expose the storage path

### 4.4 Performance
- `Stream` operations are not nested in loops unnecessarily
- Collections sized up-front where size is known
- No `Optional.get()` without `isPresent()` check
- Pagination used for list endpoints (not `findAll()` on large tables)
- Caching annotations (`@Cacheable`) used where appropriate and cache eviction is handled

### 4.5 Error Handling & Resilience
- All checked exceptions are handled or propagated meaningfully
- External HTTP calls (RestTemplate / WebClient / Feign) have timeouts and fallbacks
- Database operations inside try/catch propagate or wrap exceptions — no swallowed failures
- Retry / circuit-breaker annotations (`@Retryable`, `@CircuitBreaker`) applied where needed

### 4.6 Testing
- New public methods have corresponding unit tests
- Service-layer tests mock dependencies (`@MockBean` / Mockito)
- Integration tests use `@SpringBootTest` or slice annotations (`@WebMvcTest`, `@DataJpaTest`) correctly
- Test data is cleaned up (no persistent side-effects between tests)
- Edge cases (empty list, null input, max value) are covered

### 4.7 Code Quality & Maintainability
- Methods are single-responsibility and not excessively long (>40 lines is a smell)
- Magic numbers / strings extracted to constants or enums
- Deprecation warnings introduced by the PR are addressed
- Javadoc on public API surface (especially if this is a library module)
- Unused imports, variables, and dead code removed
- Logging uses parameterised form (`log.debug("val={}", val)` not string concat)

### 4.8 Dependency & Build
- New dependencies in `pom.xml` / `build.gradle` have clear justification
- No version pinned to `SNAPSHOT` in a release branch
- No duplicate or conflicting transitive dependencies introduced
- License of new dependencies is compatible with the project

## Step 5 — Summary Report

Present findings in this structure:

```
## PR Review: <SOURCE_BRANCH> → <TARGET_BRANCH>

### Overview
<2–3 sentence summary of what the PR does>

### Verdict
[ ] APPROVED — no blockers, minor notes below
[ ] APPROVED WITH COMMENTS — address majors before merge
[ ] CHANGES REQUESTED — blockers must be resolved

### Findings

| # | Severity | File : Line | Category | Finding | Suggestion |
|---|----------|-------------|----------|---------|------------|
| 1 | BLOCKER  | ...         | Security | ...     | ...        |
| 2 | MAJOR    | ...         | Spring   | ...     | ...        |
...

### Positive Highlights
<What was done well — reinforce good patterns>

### Questions for the Author
<Anything unclear that needs context before a final verdict>
```

Keep the tone constructive. Explain *why* each finding matters, not just *what* is wrong.
