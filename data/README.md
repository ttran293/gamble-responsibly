# Synthetic demo datasets

- `v1_demo/` contains the original synthetic CSV fixtures, organized by provider.
- `v2_demo/` contains a separate synthetic version with distinct IDs, dates shifted forward one day, and monetary amounts doubled. CSV schemas and provider reconciliation rules stay the same.

Each file starts with its version prefix (`v1_` or `v2_`). Both fixture directories are synthetic and tracked in Git so deployments include them. Regenerate `v2_demo/` from `v1_demo/` with `python scripts/generate-v2-demo.py`.

`loadFixture(provider, version)` selects a dataset; `version` defaults to `v1`. The metrics endpoint accepts `?version=v2`, and the demo connection endpoint accepts `{"version":"v2"}` in its POST body.
