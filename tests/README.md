# Verification

Run `composer validate --no-check-publish` and `composer check` after installing PHP dependencies. The GitHub Actions workflow runs Composer validation and a PHP syntax check. Integration tests that call OpenRouter are intentionally not automatic because they need a real API key and can consume quota.

For the browser worker, run `npm install`, `npm run install-browser`, then `npm start` inside `worker/`. Test only with public HTTPS pages. Keep the worker bound to loopback.
