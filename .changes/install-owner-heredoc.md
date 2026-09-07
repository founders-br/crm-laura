---
impacto: nada_mudou
secao: corrigido
titulo: Bootstrap do primeiro admin não executa locale por acidente
---

O instalador deixa de executar o comando locale ao expandir um comentário do
SQL de criação do primeiro dono. Isso impede que variáveis de idioma do Linux
sejam enviadas ao PostgreSQL e interrompam a promoção do admin.
