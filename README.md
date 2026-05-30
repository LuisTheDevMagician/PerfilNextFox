# 🎮 Jogo Perfil - Quiz Multiplayer

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20NC%201.0-blue)](https://polyformproject.org/licenses/noncommercial/1.0.0)

Jogo web multiplayer local estilo "Perfil" (jogo de adivinhação com dicas progressivas) com arquitetura separada em **Backend** (Bun + Elysia) e **Frontend** (Next.js 16+). Suporta até 9 jogadores simultâneos em tempo real via rede local.

---

## 📋 Sobre o Jogo

O **Jogo PerfilNextFox** é um quiz de adivinhação divertido e educacional onde:
- Uma **ENTIDADE: Carta** A resposta correta precisa ser descoberta através de **10 DICAS** progressivas.
- Há um **HOST** (mestre do jogo) que vê todas as informações da carta (dicas, resposta, controle do jogo).
- Os demais **JOGADORES** (até 8) veem apenas as dicas sendo reveladas, o contador de tempo e a pontuação em jogo em tempo real.

**Logo do Game**:


![Logo do Game](images/logo.png)

### 🆕 Mecânicas e Regras Atualizadas
- **Pontos Dinâmicos Decrescentes:** A carta começa valendo **10 pontos** de Acerto (mesmo que se revele a dica 0 e a dica 1). A cada dica adicional revelada pelo mestre (da 2ª à 10ª), a pontuação decresce sucessivamente até o piso natural de **1 ponto**.
- **Temporizador de 40 Segundos:** Cada turno tem **40 segundos** contados em tempo real na tela de todos. Se o tempo esgotar sem que o jogador da vez responda, a vez passa automaticamente para o próximo.
- **Uma Dica por Turno:** O jogador da vez pode revelar **apenas uma dica** por turno antes de responder ou passar a vez. Após revelar, deve responder ou ceder o turno.
- **O Vencedor Preserva a Vez:** O jogador que **acerta** a resposta além de faturar a atual contagem de pontos ganha o direito de manter sua "Vez" para a solicitação da carta e de dicas da rodada seguinte! O turno só é passado se o jogador errar uma alternativa ou se resolver pular a vez.
- **Ninguém Acertou ("Alerta Amarelo"):** Se todas as dicas foram expostas ou a paciência da mesa cedeu e ninguém adivinhou a Entidade, o HOST pode resolver a carta. Um modal de alerta amarelo cobrirá todas as telas revelando a reposta não preenchida.

### 💡 Recomendações do Desenvolvedor

> **Crie um Hotspot Wi-Fi direto no PC do HOST.**
>
> Após vários testes, a forma mais estável que encontramos para jogar foi o próprio PC que roda o jogo criar um ponto de acesso (hotspot) e os demais jogadores se conectarem a ele. Evita bugs de conexão, quedas do HOST e instabilidades causadas por roteadores com isolamento de clientes. No Windows: *Configurações → Rede e Internet → Hotspot Móvel*. No Linux: use o NetworkManager ou `nmcli`.

### 🔊 Efeitos Sonoros

O jogo possui efeitos sonoros para os principais momentos da partida. Os arquivos ficam em `frontend/public/sound/`:

| Arquivo | Momento em que toca |
|---|---|
| `answearRight.mp3` | Resposta correta validada pelo HOST |
| `answearWrong.mp3` | Resposta errada validada pelo HOST |
| `noOneCorrect.mp3` | HOST revela a resposta (ninguém acertou) |
| `revealClue.mp3` | Dica revelada pelo jogador da vez |
| `passTurn.mp3` | Vez passada para o próximo jogador |
| `sendButton.mp3` | Jogador envia uma resposta |
| `rolldice.mp3` | Jogador rola os dados no lobby |
| `victoryScreenSound.mp3` | Tela de vitória ao fim da partida |

Para substituir um som, basta trocar o `.mp3` correspondente mantendo o mesmo nome de arquivo.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: Next.js 16+ (App Router), TypeScript, Tailwind CSS 4, Material UI / Icons.
- **Backend**: Bun runtime, Elysia 1.x, WebSocket nativo do Bun.
- **Banco de Dados**: SqLite e Drizzle ORM.
- **Gerenciador de Pacotes Oficial**: Bun.

---

## 📦 Instalação e Execução (Início Rápido)

### Pré-requisitos
- [Bun](https://bun.sh/) instalado globalmente

### Opção A — Um único comando (recomendado)

```bash
bun startgame.ts
```

Só isso. Na **primeira execução**, o script detecta automaticamente que `node_modules` ainda não existe e instala as dependências do backend e do frontend antes de subir os serviços. Nas execuções seguintes, pula direto para iniciar.

O script sobe o **Backend** (porta 3001) e o **Frontend** (porta 3000) em paralelo num único terminal, com logs prefixados por `[backend]` e `[frontend]`. `Ctrl+C` encerra os dois.

### Opção B — Dois terminais separados

**Terminal 1 — Backend:**
```bash
cd backend
bun install
bun run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
bun install
bun run dev
```

Após estar rodando, acesse o app em: **http://localhost:3000**

---

## 🌐 Jogando com Amigos (Em Rede Local / Wi-Fi)

Você pode rodar tudo no seu PC (Mestre) e os convidados entram pelo celular ou outro computador na mesma rede.

1. **Todos na mesma rede:** Certifique-se de que todos os dispositivos estejam no mesmo Wi-Fi ou rede local. Alguns roteadores possuem isolamento de clientes — desative-o se necessário.
2. **Convide pelo Lobby:** Assim que entrar no Lobby como HOST, clique em **"Convidar Jogadores"**. Um modal abre com:
   - **QR Code** — basta escanear com a câmera do celular para acessar a sala diretamente.
   - **Endereço da sala** — exibido em texto (ex: `http://192.168.1.100:3000`) com um botão **Copiar** para enviar pelo chat.
   - O IP é detectado automaticamente pelo servidor; nenhuma configuração manual é necessária.

> Se o QR code ou o endereço exibido não funcionar, verifique se o Firewall da máquina hospedeira está bloqueando as portas **3000** e **3001** e crie exceções de entrada para elas.

---

## 🎲 Resumo Lógico da Mesa

### 1. Preparação (Lobby)
- O **primeiro competidor** que acessa a página e digita um nick entra garantindo a coroa de **HOST** 👑 permanente.
- Todos os membros que ingressarem deverão jogar os "Dados" 🎲 ali desenhados.
- Ao final dos membros, o HOST clica na autorização para formar a ordem e arrasta todo o grupo ao salão de Início.

### 2. A Partida em Si
- Os **JOGADORES** observam quantas casas podem evoluir no lance (sinalizado visualmente pela box Pontos em Jogo) e o **contador regressivo de 40 segundos**. Quando o "Sua Vez" brilhar, podem requisitar **uma** dica antes de responder ou passar.
- Qualquer indivíduo tem capacidade de arriscar um pitaco **A qualquer exato momento** no campo Resposta!
- O **HOST** escuta a notificação sonora da tentativa enviada e usa os botões para validar e sinalizar visualmente: Acerto (Verde), Errou (Vermelho) ou Falha da Tenda (Amarelo).

### 3. Vitória
- Ao bater o limite estipulado de rodadas de baralhos, o App entra em estado de Fim de Jogo.
- Coroações no Ranking. O HOST reseta.

---

## 🐛 Resolução de Problemas / Troubleshooting

- **A tela fica em um ciclo "Aguardando Conexão... / Conectando" e não entra na Home:** O servidor Bun desligou, resetou ou sofreu erro, cheque o console rodando em seu Terminal de Backend.
- **Eu Consigo mas ninguém mais conecta:** O Firewall da máquina hospedeira rejeitou conexões na Porta 3000 ou 3001. Desative proteção ou crie Regra de Exceção de Tráfego de Entrada. 

---

## 📄 Licença

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20NC%201.0-blue)](https://polyformproject.org/licenses/noncommercial/1.0.0)

Este projeto está licenciado sob a **PolyForm Noncommercial License 1.0.0**. É permitido usar, copiar, modificar e distribuir o software para fins não comerciais (estudos, pesquisa, projetos pessoais, uso educacional). O uso com fins comerciais é proibido.

Consulte o arquivo [`LICENSE`](LICENSE) para o texto completo.

---

## 👨‍💻 Feito para Divertir

Desenvolvido por:

 **[LuisTheDevMagician - Luis Eduardo](https://github.com/LuisTheDevMagician)**  - Aluno - Análise e Desenvolvimento de Sistemas - Módulo V - IFPI - Campus Corrente

 **[GuilhermeAlves25 - Guilherme Alves Da Silva](https://github.com/GuilhermeAlves25)** -  Aluno - Análise e Desenvolvimento de Sistemas - Módulo V - IFPI - Campus Corrente

 **[phaolapaixao - Phaola Paraguai da Paixão Lustosa](https://github.com/phaolapaixao)**- Aluna - Análise e Desenvolvimento de Sistemas - Módulo V - IFPI - Campus Corrente


 Karl - Professor - Análise e Desenvolvimento de Sistemas - Módulo V - IFPI - Campus Corrente
 
 
 *(Next.js 16+, TypeScript, Tailwind CSS 4, Bun, Elysia, WebSocket, Drizzle ORM | Dezembro 2025/Abril 2026).*


Boa sorte e que desbanquem logo essa Entidade! 🏆🎮

---

# Telas do jogo

## Telas Antigas - Protótipo Inicial de Alta Fidelidade

### Tela Inicial — PC e Smartphone

![Tela Inicial PC](images/telasPrototipoInicial/telaInicialPc.png)

![Tela Inicial Smartphone](images/telasPrototipoInicial/telaInicialSp.png)

### Lobby — Visão Host (PC e Smartphone)

![Lobby Host PC 0](images/telasPrototipoInicial/telaLobbyPcHost0.png)

![Lobby Host PC 1](images/telasPrototipoInicial/telaLobbyPcHost1.png)

![Lobby Host Smartphone 1](images/telasPrototipoInicial/telaLobbySpHost1.png)![Lobby Host Smartphone 2](images/telasPrototipoInicial/telaLobbySpHost2.png)


### Lobby — Visão Jogador (PC e Smartphone)

![Lobby Jogador PC](images/telasPrototipoInicial/telaLobbyPcJogador.png)

![Lobby Jogador Smartphone](images/telasPrototipoInicial/telaLobbySpJogador.png)

### Jogo — Visão Host Smartphone

![Jogo Host Smartphone 2](images/telasPrototipoInicial/telaJogoSpHost2.png)![Jogo Host Smartphone](images/telasPrototipoInicial/telaJogoSpHost.png)![Jogo Host Smartphone - Resposta Recebida](images/telasPrototipoInicial/telaJogoSpHostRespostaRecebida.png)

### Jogo — Visão Jogador (PC e Smartphone)

![Jogo Jogador PC na Vez](images/telasPrototipoInicial/telaJogoPcVezDoJogador.png)

![Jogo Jogador Smartphone 1](images/telasPrototipoInicial/telaJogoSpJogador1.png)![Jogo Jogador Smartphone na Vez 2](images/telasPrototipoInicial/telaJogoSpVezDoJogador2.png)![Jogo Jogador Smartphone fora da Vez](images/telasPrototipoInicial/telaJogSpJogadorNaoeAVezDele.png)


### Resposta Correta

![Resposta Correta](images/telasPrototipoInicial/telaRespostaCorreta.png)

### Resposta Errada

![Resposta Errada](images/telasPrototipoInicial/telaRespostaErrada.png)

### Ninguém Acertou — Visão Host PC e Alerta Geral

![Host PC quando ninguém acerta](images/telasPrototipoInicial/telaHostPcQuandoNinguemAcerta.png)

![Ninguém Acertou](images/telasPrototipoInicial/telaNinguemAcertou.png)

### Tela de Vitória — Visão Host (PC e Smartphone)

![Vitória Host PC](images/telasPrototipoInicial/telaVitoriaPcHost.png)

![Vitória Host Smartphone](images/telasPrototipoInicial/telaVitoriaSpHost.png)

### Tela de Vitória — Visão Jogador (PC e Smartphone)

![Vitória Jogador PC](images/telasPrototipoInicial/telaVitoriaPcJogador.png)

![Vitória Jogador Smartphone](images/telasPrototipoInicial/telaVitoriaSpJogador.png)

### Painel Administrador — CRUD

![Painel Admin - Cartas](images/telasPrototipoInicial/telaPainelAdminCrudCartas.png)

![Painel Admin - Disciplinas](images/telasPrototipoInicial/telaPainelAdminCrudDisciplinas.png)

![Painel Admin - Temas](images/telasPrototipoInicial/telaPainelAdminCrudTemas.png)

---

## Telas da Versão Final

### Tela Inicial — PC e Smartphone

![Tela Inicial PC](images/telasVersaoFinal/telaInicialPc.png)

![Tela Inicial Smartphone](images/telasVersaoFinal/telaInicialSp.png)

### Lobby — Visão Host (PC e Smartphone)

![Lobby Host PC](images/telasVersaoFinal/telaLobbyPcHost.png)

![Lobby Pc Host 2](images/telasVersaoFinal/telaLobbyPcHost2.png)

![Lobby Host Smartphone](images/telasVersaoFinal/telaLobbySpHost.png)

### Lobby - Convidar Jogadores (Somente Host)

![Lobby Convidar Jogadores](images/telasVersaoFinal/telaConvidarJogadoresSomenteHost.png)

### Lobby — Visão Jogador (PC e Smartphone)

![Lobby Jogador PC](images/telasVersaoFinal/telaLobbyPcJogador.png)

![Lobby Jogador Smartphone](images/telasVersaoFinal/telaLobbySpJogador.png)

### Tela Espectador - Novas Telas Não Existiam no Protótipo Inicial (Pc e Smartphone)

![Espectador Pc](images/telasVersaoFinal/telaEspectadorPc.png)

![Espectador Smartphone](images/telasVersaoFinal/telaEspectadorSp.png)

### Jogo — Visão Host PC

![Jogo Host PC](images/telasVersaoFinal/telaJogoPcHost.png)

### Jogo — Visão Host Smartphone

![Jogo Host Smartphone](images/telasVersaoFinal/telaJogoSpHost.png) ![Jogo Host Smartphone - Resposta Recebida](images/telasVersaoFinal/telaJogoSpHostRespostaRecebida.png) ![Jogo Host Smartphone 2](images/telasVersaoFinal/telaJogoSpHost2.png)

### Jogo — Visão Jogador PC (na vez e fora da vez)

![Jogo Jogador PC na Vez](images/telasVersaoFinal/telaJogoJogadorPcNaVezDele.png)

![Jogo Jogador PC fora da Vez](images/telasVersaoFinal/telaJogoPcJogadorQuandoNaoEAVezDele.png)

### Jogo — Visão Jogador Smartphone (na vez e fora da vez)

![Jogo Jogador Smartphone na Vez](images/telasVersaoFinal/telaJogoSpJogadorQuandoEAVezDele.png) ![Jogo Jogador Smartphone na Vez 2](images/telasVersaoFinal/telaJogoSpJogadorQuandoEAVezDele2.png) ![Jogo Jogador Smartphone fora da Vez](images/telasVersaoFinal/telaJogoSpJogadorQuandoNaoEAVezDele.png)

### Resposta Recebida — PC

![Resposta Recebida PC](images/telasVersaoFinal/telaRespostaRecebidaPc.png)

### Resposta Correta

![Resposta Correta](images/telasVersaoFinal/telaRespostaCorreta.png)

### Resposta Errada

![Resposta Errada](images/telasVersaoFinal/telaRespostaErrada.png)

### Ninguém Acertou — Visão Host PC e Alerta Geral

![Host PC quando ninguém acerta](images/telasVersaoFinal/telaDoHostPcQundoNinguemAcertaAResposta.png)

![Ninguém Acertou](images/telasVersaoFinal/telaNinguemAcertou.png)

### Tela de Vitória — Visão Host (PC e Smartphone)

![Vitória Host PC](images/telasVersaoFinal/telaVitoriaPcHost.png)

![Vitória Host Smartphone](images/telasVersaoFinal/telaVitoriaSpHost.png)

### Tela de Vitória — Visão Jogador (PC e Smartphone)

![Vitória Jogador PC](images/telasVersaoFinal/telaVitoriaPcJogador.png)

![Vitória Jogador Smartphone](images/telasVersaoFinal/telaVitoriaSpJogador.png)

### Painel Administrador — CRUD

![Painel Admin - Cartas](images/telasVersaoFinal/telaPainelAdministradorCrudCartas.png)

![Painel Admin - Disciplinas](images/telasVersaoFinal/telaPainelAdministradorCrudDisciplina.png)

![Painel Admin - Temas](images/telasVersaoFinal/telaPainelAdministradorCrudTemas.png)




























