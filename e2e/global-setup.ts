import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Seeds a real organisation/project/role-users against the real backend
// (backend/scripts/seed_dev_data.py — same script a human dev-login run
// uses) rather than faking API responses. Requires backend/ reachable at
// NEXT_PUBLIC_CUE_API_URL (default http://localhost:8000) with its own
// docker-compose Postgres up — see backend/README.md's Quickstart.
export default function globalSetup(): void {
  const backendDir = path.resolve(__dirname, "../../backend");
  const output = execFileSync("uv", ["run", "python3", "scripts/seed_dev_data.py"], {
    cwd: backendDir,
    encoding: "utf-8",
  });

  const organisationId = output.match(/organisation_id:\s*(\S+)/)?.[1];
  const email = output.match(/administrator\s+(\S+@cue\.dev)/)?.[1];
  if (!organisationId || !email) {
    throw new Error(`could not parse scripts/seed_dev_data.py output:\n${output}`);
  }

  fs.writeFileSync(
    path.resolve(__dirname, ".seed.json"),
    JSON.stringify({ organisationId, email }, null, 2),
  );
}
