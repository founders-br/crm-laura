---
impacto: nada_mudou
secao: corrigido
titulo: Staging valida o commit integrado antes de chegar à main
---

O fluxo de CI passa a validar também o commit já mergeado em `staging`: typecheck,
lint, unitários, invariantes de banco/RLS, build de produção, E2E e construção/smoke
das três imagens Docker. As imagens de `staging` são apenas construídas para validação
e não são publicadas no GHCR; publicação continua restrita à `main` e às tags de release.
