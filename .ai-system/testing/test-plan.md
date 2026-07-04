# Test Plan

> **Metadata**
> - last-updated-by: (set on first update)
> - last-verified-against-code: (set after test plan review)
> - staleness-policy: re-verify if new features are added

> **Overview:** Defines what needs to be tested and at what level. Referenced by `verify-work.md` during the quality gate. Updated as new features are added.

---

## Unit Tests

- [ ] [Module / function to test]
- [ ] Service layer functions
- [ ] Utility functions
- [ ] Data transformation logic

---

## Integration Tests

- [ ] API route responses (happy path)
- [ ] API route error handling
- [ ] Database CRUD operations
- [ ] Authentication flow

---

## End-to-End Tests

- [ ] [Critical user flow 1]
- [ ] [Critical user flow 2]

---

## Performance Tests

- [ ] API response time under normal load
- [ ] Database query performance
- [ ] Page load times (frontend)
