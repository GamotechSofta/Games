# Render Static Site — Redirects / Rewrites
# Add these in Render Dashboard → your aakda.in static site → Redirects/Rewrites
# (Order matters: operator/service rules MUST be above the SPA catch-all.)
#
# | Type    | Source        | Destination                         |
# |---------|---------------|-------------------------------------|
# | Rewrite | /operator/*   | https://api.aakda.in/operator/*     |
# | Rewrite | /service/*    | https://api.aakda.in/service/*      |
# | Rewrite | /*            | /index.html                         |
#
# Why: PotLudo POSTs to https://aakda.in/operator/user/login etc.
# Without these rewrites, aakda.in returns empty HTTP 200 and PotLudo shows:
#   "Operator gateway request failed with status 200."
