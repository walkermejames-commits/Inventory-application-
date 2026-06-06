# Seller Health Check

The seller app exposes this safe diagnostic route:

```text
/api/health
```

Live URL:

```text
https://door-in-four-seller.onrender.com/api/health
```

Expected signs of a current deployment:

```json
{
  "ok": true,
  "app": "seller",
  "buyerQuoteFlow": "v2"
}
```

How to read it:

1. If the route returns 404, Render is not serving the latest seller code.
2. If it returns `buyerQuoteFlow: "v2"`, the new buyer quote code is deployed.
3. If any env flag is false, add the missing value in Render and redeploy.

This endpoint only reports true or false flags. It must never expose secret values.

Quick deployment ritual:

1. Open `/api/health`.
2. Open `/` and look for the buyer quote v2 homepage marker.
3. Open `/buy` and look for the buyer quote v2 form marker.
4. Open `/get-a-quote` and confirm it redirects to `/buy`.
