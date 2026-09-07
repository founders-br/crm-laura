import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const installer = readFileSync("hostgator-setup-kit/install.sh", "utf8");
const blocks = [
  ...installer.matchAll(/^docker run[^\n]*<<SQL[^\n]*\n[\s\S]*?^(do \\\$\\\$[\s\S]*?)^SQL$/gm),
]
  .map((match) => match[1]!)
  .filter((body) => body.includes("public.platform_admins"));

function assertNoCommands(body: string) {
  // Comentários SQL também são expandidos pelo Bash. Não permitir nenhuma
  // das duas sintaxes, mesmo em comentários ou strings destinadas ao Postgres.
  expect(body, "heredoc do owner não pode conter substituição de comando").not.toMatch(/`|\$\(/);
}

describe("heredoc SQL do bootstrap do owner", () => {
  it("encontra exatamente o bloco real e impede substituição de comando", () => {
    expect(blocks).toHaveLength(1);
    assertNoCommands(blocks[0]!);
  });

  it.each(["-- `printf invasao`\n", "-- $(printf invasao)\n"])(
    "a guarda rejeita substituição em comentário SQL: %s",
    (comment) => {
      expect(() => assertNoCommands(comment)).toThrow();
    },
  );

  it("expande somente os parâmetros necessários e preserva o SQL", () => {
    expect(blocks).toHaveLength(1);
    const body = blocks[0]!;
    // Validar antes de executar: nunca rodar comandos introduzidos no SQL.
    assertNoCommands(body);
    const actual = execFileSync(
      "bash",
      ["--noprofile", "--norc", "-c", `cat <<SQL\n${body}SQL\n`],
      {
        env: {
          NODE_ENV: "test",
          PATH: "/usr/bin:/bin",
          OWNER_EMAIL: "owner@example.invalid",
          APP_LOCALE: "es",
          AI_PROVIDER: "openrouter",
        },
        encoding: "utf8",
      },
    );
    const expected = body
      .replaceAll("${OWNER_EMAIL}", "owner@example.invalid")
      .replaceAll("${APP_LOCALE:-pt-BR}", "es")
      .replaceAll("${AI_PROVIDER}", "openrouter")
      .replaceAll("\\$", "$");
    expect(actual).toBe(expected);
  });
});
