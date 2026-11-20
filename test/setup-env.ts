// setup-env.ts: Tests never depend on the shell. These are cleared before any test file (and so
// before src/server/config.ts) is loaded; a test that needs a setting builds its own config.
for (const name of ["DEMO", "MAPS_API_KEY", "GEMINI_API_KEY", "GEMINI_MODEL"]) {
  delete process.env[name];
}
