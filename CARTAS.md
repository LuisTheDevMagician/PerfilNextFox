# 🃏 Guia de Cartas

Este guia explica como o conteúdo do jogo é organizado e como criar boas cartas.

---

## 🗂️ Hierarquia: Disciplina → Tema → Carta

Todo o conteúdo do jogo segue três níveis:

```
Disciplina (matéria)          ex.: Química
 └── Tema                     ex.: Química do Ensino Médio
      └── Carta               ex.: Tabela Periódica
           └── 10 dicas       ex.: "Hoje tenho 118 elementos."
```

| Nível | O que é | Regras |
|---|---|---|
| **Disciplina** | A matéria ou área do conhecimento. Serve só para agrupar temas. | Precisa de um nome. |
| **Tema** | O baralho que é jogado em uma partida. | Precisa de um nome e pertence a **uma** disciplina. |
| **Carta** | A entidade que os jogadores tentam adivinhar. | Precisa de um nome, pertence a **um** tema e tem **exatamente 10 dicas**, todas preenchidas. |

### Como isso aparece na partida

- No lobby, o **HOST** escolhe primeiro a disciplina e depois o tema.
- Só aparecem no seletor os temas que têm **pelo menos uma carta**. Um tema vazio fica invisível para o HOST.
- A partida usa **todas as cartas do tema**, uma depois da outra. Quando a última carta termina, o jogo vai para a tela de vitória. Ou seja, **a quantidade de cartas do tema define a duração da partida**. Dez é um bom tamanho.
- As cartas aparecem na **ordem em que foram cadastradas**. Para fazer um baralho que começa fácil e fica difícil, cadastre as cartas nessa ordem.
- Sempre selecione um tema antes de iniciar. Sem tema, o jogo mistura as cartas de todas as disciplinas.

### Excluir apaga em cascata

- Excluir uma **disciplina** apaga todos os temas e todas as cartas dela.
- Excluir um **tema** apaga todas as cartas dele.

O painel pede confirmação, mas não há como desfazer.

---

## 🛠️ Como criar cartas pelo Painel Admin

1. Com o jogo rodando, abra **`http://localhost:3000/admin`** no **mesmo computador** que roda o servidor. O painel fala com o backend em `localhost:3001`, então ele não funciona aberto pelo celular ou por outro PC da rede.
2. Na aba **Disciplinas**, crie a matéria (ou use uma que já exista).
3. Na aba **Temas**, crie o tema e escolha a disciplina dele.
4. Na aba **Cartas**, clique em adicionar e preencha:
   - **Nome da carta**: a resposta.
   - **Disciplina** e **Tema**.
   - **Dica 1** a **Dica 10**.
5. Salve. A carta já fica disponível na próxima partida com esse tema.

Para editar ou excluir, use os ícones de lápis e lixeira em cada item. Na aba Cartas, os filtros de matéria e tema ajudam a encontrar uma carta.

---

## ✍️ Como escrever uma boa carta

### O nome (a resposta)

O nome é o que o HOST vê como resposta certa e o que aparece para todos quando alguém acerta ou quando o HOST revela a resposta. Quem decide se a resposta de um jogador está certa é o **HOST, manualmente**, então não é preciso que o jogador escreva o nome exatamente igual.

- Use um nome claro e reconhecível: `Cataratas do Iguaçu`, `Teste de Turing`.
- Um complemento entre parênteses ajuda o HOST a julgar respostas parecidas: `pH (Potencial Hidrogeniônico)`, `Independência do Brasil (1822)`.

### As 10 dicas

Na sua vez, o jogador escolhe **qual número** de dica quer revelar (qualquer um de 1 a 10, uma por turno). Por isso:

- **Cada dica precisa fazer sentido sozinha**, sem depender da anterior.
- **Convenção do projeto:** a dica 1 é a mais difícil e a dica 10 é a mais fácil, quase entregando a resposta.
- **Escreva em primeira pessoa**, como no jogo de tabuleiro Perfil: "Sou...", "Fui criado...", "Fico no...".
- **Nunca escreva a resposta** dentro de uma dica, nem uma palavra que a entregue diretamente (por exemplo, "o hotel Copacabana Palace" numa carta sobre Copacabana).
- **Uma informação por dica.** Evite repetir a mesma ideia com outras palavras em duas dicas.
- **Evite opiniões** ("sou o futuro da computação") — prefira fatos que ajudem a chegar na resposta.
- **Confira os fatos** (datas, nomes, números) antes de usar em sala de aula.

### Pontuação

A carta vale **10 pontos** enquanto até 1 dica foi revelada. A partir da 2ª dica, perde 1 ponto por dica revelada, até o mínimo de **1 ponto**:

| Dicas reveladas | 0–1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Pontos | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 |

### Exemplo completo

**Nome:** `Pão de Açúcar (Rio de Janeiro)`

1. Fui idealizado como atração pelo engenheiro Augusto Ferreira Ramos.
2. Sou formado por um tipo de rocha chamado gnaisse.
3. Apareci em uma cena de ação do filme "007 Contra o Foguete da Morte".
4. Meu nome vem da semelhança com as fôrmas de barro usadas nos engenhos coloniais.
5. Tenho 396 metros de altura.
6. Para chegar ao meu topo, é preciso fazer uma parada no Morro da Urca.
7. A viagem até mim começa na Praia Vermelha.
8. Marco a entrada da Baía de Guanabara.
9. Meu teleférico, inaugurado em 1912, foi o primeiro do Brasil.
10. Sou o morro carioca famoso pelo seu bondinho.

---

## ⚙️ Cadastro em lote pela API

Para cadastrar muitas cartas de uma vez, dá para usar a API REST do backend (porta `3001`), que aplica as mesmas regras do painel.

| Ação | Requisição | Corpo (JSON) |
|---|---|---|
| Listar disciplinas | `GET /api/disciplinas` | — |
| Criar disciplina | `POST /api/disciplinas` | `{ "nome": "Química" }` |
| Listar temas | `GET /api/temas` | — |
| Criar tema | `POST /api/temas` | `{ "nome": "Química do Ensino Médio", "disciplinaId": 4 }` |
| Listar cartas de um tema | `GET /api/cartas/tema/:id` | — |
| Criar carta | `POST /api/cartas` | `{ "nome": "Etanol", "temaId": 5, "dicas": ["...", "... (10 no total)"] }` |
| Editar | `PUT /api/disciplinas/:id`, `/api/temas/:id`, `/api/cartas/:id` | mesmo formato da criação |
| Excluir | `DELETE /api/disciplinas/:id`, `/api/temas/:id`, `/api/cartas/:id` | — |

Exemplo com `curl`:

```bash
curl -X POST http://localhost:3001/api/cartas \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Etanol","temaId":5,"dicas":["d1","d2","d3","d4","d5","d6","d7","d8","d9","d10"]}'
```

A API recusa a carta (erro 400) se faltar o nome ou o tema, ou se ela não tiver exatamente 10 dicas preenchidas.

---

## 💾 Onde as cartas ficam salvas

- **Modo normal (`bun startgame.ts`):** no arquivo SQLite `backend/data/quiz.db`. Esse arquivo é versionado no git, então para compartilhar cartas novas com o resto do time basta fazer commit dele.
- **Modo Docker / AVA (`bun bunDockerCompose.ts`):** o banco fica em um volume próprio do Docker e **não** é copiado do `quiz.db` local. Ele começa só com as cartas iniciais, e as cartas criadas no modo normal não aparecem ali. No modo Docker, cadastre as cartas pelo painel admin do próprio Docker. `docker compose down -v` apaga esse volume e tudo que foi cadastrado nele.
