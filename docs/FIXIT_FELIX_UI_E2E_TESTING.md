# Fix it Felix UI E2E Testing Guide

This document explains how to test the UI flow for:
- chat-driven ticket creation,
- approval execution,
- ticket detail checklist rendering,
- checklist provenance indicators.

## 1. Prerequisites

1. Backend (`Cummins-Backend`) is running on `http://127.0.0.1:8000`.
2. Frontend (`breakthru-dashboard`) is running on `http://127.0.0.1:8080`.
3. Backend migrations are applied, especially the learned-pattern migration.
4. Test technician account exists (`engine/engine`).

## 2. Quick Health Check

```bash
curl -s -o /tmp/ui_probe.out -w '%{http_code}' http://127.0.0.1:8080/
curl -s -o /tmp/api_probe.out -w '%{http_code}' -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"engine","password":"engine"}'
```

Expected:
- UI probe `200`
- login `200`

## 3. Manual End-to-End Scenario

1. Open `http://127.0.0.1:8080/login`.
2. Login as technician (`engine/engine`).
3. On `/ask-ai`, send a detailed prompt such as:

```text
Create a ticket for engine X15 fuel leak on truck 4821 at INDY station.
Issue: fuel leak near injector hose with white smoke.
Parts affected: fuel injector and hose.
Assign technician and prepare checklist.
```

4. Verify assistant returns a pending `create_ticket` proposal card.
5. Click `Confirm`.
6. Verify redirect to `/tickets/<uuid>` and success toast (`Ticket created ...`).
7. Click `View Full Repair Details & Checklist`.
8. Verify `Repair Checklist` appears.
9. Verify provenance badges above checklist:
   - `Baseline` (always expected)
   - `Knowledge` (when retrieval contributes)
   - `Learned from similar completed tickets` (when pattern match contributes)

## 4. Regression Checks

After confirming ticket creation, also verify:
1. `Tickets` page lists the new ticket.
2. Ticket detail loads without 500/404 errors.
3. Checklist updates persist after toggling steps.

## 5. Optional Build Check

```bash
cd breakthru-dashboard
npm run build
```

Expected: build completes successfully.
