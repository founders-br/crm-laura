---
impacto: nada_mudou
secao: corrigido
titulo: Falhas tardias do instalador preservam a instalação existente
---

Depois que o projeto é localizado, uma falha do instalador passa a orientar a
corrigir a causa e reexecutar o processo sem apagar `.env`, volumes ou banco. Se
o app já estava saudável, o diagnóstico deixa isso explícito e aponta também o
`healthcheck.sh`. A leitura do crontab também deixa de transformar erros
inesperados em uma lista vazia antes de gravar as automações.
