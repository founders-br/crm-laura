import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const WORKFLOWS = join(process.cwd(), ".github/workflows");

function workflow(nome: string): string {
  return readFileSync(join(WORKFLOWS, nome), "utf8");
}

describe("fluxo de CI entre feature, staging e main", () => {
  it("feature → staging recebe o gate rápido e todo push integrado em staging roda o CI base", () => {
    const ci = workflow("ci.yml");

    // `pull_request:` sem filtro cobre PRs de feature para staging e também a
    // promoção staging → main. O push em staging mede o COMMIT DE INTEGRAÇÃO,
    // que pode divergir das pontas dos PRs que o formaram.
    expect(ci).toMatch(
      /on:\n  pull_request:\n  push:\n    branches: \[main, staging\]/,
    );
  });

  it("E2E e build completo rodam na promoção para main e depois de cada merge em staging", () => {
    const e2e = workflow("e2e.yml");
    const perf = workflow("perf.yml");

    for (const [nome, texto] of [
      ["e2e.yml", e2e],
      ["perf.yml", perf],
    ] as const) {
      expect(
        texto,
        `${nome}: PR completo só na promoção para main; push completo em main e staging`,
      ).toMatch(
        /on:\n  pull_request:\n    branches: \[main\]\n  push:\n    branches: \[main, staging\]/,
      );
    }
  });

  it("staging constrói e faz smoke das imagens, mas nunca publica no GHCR", () => {
    const imagens = workflow("publish-image.yml");

    expect(imagens).toMatch(
      /push:\n    tags: \["v\*"\]\n    branches: \["main", "staging"\]/,
    );
    expect(imagens).toContain("if: github.event_name != 'pull_request' && github.ref_name != 'staging'");
    expect(imagens).toContain(
      "push: ${{ github.event_name != 'pull_request' && github.ref_name != 'staging' }}",
    );
  });

  it("release continua exclusiva da main", () => {
    const release = workflow("release.yml");

    expect(release).toMatch(/push:\n    branches: \[main\]/);
    expect(release).not.toMatch(/push:\n    branches: \[[^\]]*staging[^\]]*\]/);
  });
});
