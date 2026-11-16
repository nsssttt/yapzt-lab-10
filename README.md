# Lab 10 - API Testing

Start the mock API with `docker compose up -d --build --wait`. It listens on `http://localhost:3000` and serves synthetic data. Reset the data with `docker compose restart api` and wait for it to be healthy before each suite.

Import `API Testing.json` and `Self-study.json` into Hoppscotch Collections and `Local.json` into Environments. Select Local and run the requests in order. The sample auth values are fixtures for the mock endpoints. You can also run the collections using the Hoppscotch CLI.

```sh
hopp test -e Local.json "API Testing.json"
hopp test -e Local.json "Self-study.json"
```

With a fresh mock data set for each run, use `node fetch-lab.mjs` (Node.js 22) or `python api_checks.py` to run the same HTTP checks. Stop the server with `docker compose down`.
