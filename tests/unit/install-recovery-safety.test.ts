import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const KIT = path.join(ROOT, "hostgator-setup-kit");

function recoveryOutput(projectDir: string, appHealthy: "0" | "1"): string {
  return execFileSync(
    "bash",
    [
      "-c",
      `
        set -euo pipefail
        export NO_COLOR=1
        export INSTALL_SH_LIB=1
        . "$1/install.sh"
        . "$1/_common.sh"
        PROJECT_DIR="$2"
        APP_SAUDAVEL="$3"
        show_recovery
      `,
      "recovery-test",
      KIT,
      projectDir,
      appHealthy,
    ],
    { encoding: "utf8" },
  );
}

function expectNonDestructive(output: string): void {
  expect(output).not.toContain("rm -f .env");
  expect(output).not.toContain("down -v");
  expect(output).not.toContain("drop schema public cascade");
}

describe("recuperação do install.sh depois de localizar o projeto", () => {
  it("preserva configuração e banco quando o .env já existe", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deskcomm-recovery-env-"));
    try {
      fs.writeFileSync(path.join(dir, ".env"), "DOMAIN=crm.exemplo.test\n", { mode: 0o600 });
      const output = recoveryOutput(dir, "0");

      expect(output).toContain("configuração já está salva");
      expect(output).toContain("Preserve o .env, os volumes e o banco");
      expect(output).toContain("install.sh");
      expectNonDestructive(output);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("não manda resetar nada quando o app já estava saudável", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deskcomm-recovery-healthy-"));
    try {
      fs.writeFileSync(path.join(dir, ".env"), "DOMAIN=crm.exemplo.test\n", { mode: 0o600 });
      const output = recoveryOutput(dir, "1");

      expect(output).toContain("app já estava saudável");
      expect(output).toContain("healthcheck.sh");
      expectNonDestructive(output);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("leitura segura do crontab", () => {
  function runCron(mode: "absent" | "read-error") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deskcomm-cron-read-"));
    const bin = path.join(dir, "bin");
    const writeMark = path.join(dir, "wrote");
    fs.mkdirSync(bin);
    const stub = path.join(bin, "crontab");
    fs.writeFileSync(
      stub,
      `#!/usr/bin/env bash
case "\${1:-}" in
  -l)
    if [ "\${CRONTAB_MODE:-}" = absent ]; then
      printf 'no crontab for teste\\n' >&2
      exit 1
    fi
    printf 'permission denied reading crontab\\n' >&2
    exit 1
    ;;
  -)
    touch "$CRONTAB_WRITE_MARK"
    cat >/dev/null
    ;;
  *) exit 2 ;;
esac
`,
      { mode: 0o755 },
    );

    const result = spawnSync(
      "bash",
      [
        "-c",
        `
          set -euo pipefail
          . "$1/_common.sh"
          PROJECT_DIR="$2/projeto"
          INTERNAL_SECRET=segredo-de-teste
          NEXT_PUBLIC_APP_URL=https://crm.exemplo.test
          setup_update_agent_cron >/dev/null
        `,
        "cron-test",
        KIT,
        dir,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
          CRONTAB_MODE: mode,
          CRONTAB_WRITE_MARK: writeMark,
        },
      },
    );

    return { dir, writeMark, result };
  }

  it("trata somente a ausência normal como crontab vazio", () => {
    const run = runCron("absent");
    try {
      expect(run.result.status).toBe(0);
      expect(fs.existsSync(run.writeMark)).toBe(true);
    } finally {
      fs.rmSync(run.dir, { recursive: true, force: true });
    }
  });

  it("propaga erro inesperado de leitura sem sobrescrever o crontab", () => {
    const run = runCron("read-error");
    try {
      expect(run.result.status).not.toBe(0);
      expect(run.result.stderr).toContain("permission denied reading crontab");
      expect(fs.existsSync(run.writeMark)).toBe(false);
    } finally {
      fs.rmSync(run.dir, { recursive: true, force: true });
    }
  });
});
