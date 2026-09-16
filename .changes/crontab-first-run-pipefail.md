---
impacto: nada_mudou
secao: corrigido
titulo: Primeira ativação do crontab não interrompe o instalador
---

Uma instalação nova passa a tratar a ausência inicial de crontab como uma lista
vazia. Assim, o drain de eventos e o agente de atualização são configurados na
mesma execução mesmo com `set -o pipefail`, sem esconder falhas ao gravar o cron.
