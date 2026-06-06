# Admin / FC Health Check

The admin app exposes a safe diagnostic route:

```text
/api/health
```

Likely live URL:

```text
https://inventory-application-was4.onrender.com/api/health
```

Expected signs of a current deployment:

```json
{
  "ok": true,
  "app": "admin",
  "operationsBoard": "available",
  "dispatchReflex": "available"
}
```

How to read it:

1. If the route returns 404, Render is not serving the latest admin code.
2. If it returns `operationsBoard: "available"`, the FC operations layer is present in the deployed code.
3. If it returns `dispatchReflex: "available"`, the dispatch reflex route is present in the deployed code.
4. If any env flag is false, add the missing value in Render and redeploy.

This endpoint only reports true or false flags. It must never expose secret values.

Quick FC deployment ritual:

1. Open `/api/health`.
2. Open `/operations` and confirm the FC board loads.
3. Open `/bookings` and confirm booking data loads.
4. Confirm the dispatch reflex route exists at `/api/organism/dispatch-reflex`.
5. Do not run the dispatch reflex manually in production unless the secret/header setup is understood.

Useful routes:

```text
/
/operations
/bookings
/api/health
/api/organism/dispatch-reflex
```
