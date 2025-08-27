// Add this script to your package.json scripts section:
"scripts": {
  "dev:test": "cp .env.test .env.local && next dev",
  "dev:prod": "cp .env.production .env.local && next dev"
}