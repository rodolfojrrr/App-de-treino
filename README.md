# TREINO Premium

Aplicativo pessoal de treino para Android e Windows, projetado para funcionar offline e acompanhar o treino sem perder estado quando o usuário navega, minimiza ou fecha o app sem querer.

## Princípio central

Uma sessão só termina quando o usuário toca em **Finalizar treino**.

O cronômetro não depende de um contador mantido apenas na tela. A sessão salva `startedAt`, pausas e alterações de séries. Ao reabrir o app, o tempo é recalculado a partir desses timestamps e o treino volta ao estado salvo.

## Estrutura

- `shared-app/`: interface e regras comuns entre Android e Windows.
- `mobile-app/`: wrapper Android com Capacitor, IndexedDB, notificações e haptics.
- `frontend/`: wrapper da interface Windows.
- `backend/`: armazenamento local e servidor de sincronização Wi-Fi no PC.
- `desktop-app/`: Electron.
- `scripts/`: sincronização do código compartilhado e assinatura de teste.

Antes de cada build, `scripts/sync-shared-app.mjs` copia a interface canônica de `shared-app/src` para o alvo. Assim PC e celular usam a mesma experiência e a mesma regra de negócio.


## Novidades da v1.1.0

- execução mobile refeita para mostrar claramente **Reps alvo**, **Carga usada (kg)** e **Reps feitas** em cada série;
- as repetições realizadas não são mais preenchidas automaticamente com o treino anterior; o histórico anterior aparece apenas como referência;
- botão **Finalizar treino** visível no topo e em uma barra fixa no celular;
- confirmação de finalização permite salvar mesmo com séries pendentes;
- ajustes pontuais por data sem alterar a semana fixa:
  - adiar o treino para outra data;
  - trocar por outra ficha;
  - substituir por corrida, caminhada, pedal, natação ou outra atividade;
  - marcar o dia como indisponível/descanso;
- atividades avulsas possuem cronômetro persistente, distância, calorias e observação e entram no histórico.

## Dados e fotos

### Android

- estado principal: IndexedDB local;
- fotos: blobs em tabela separada;
- atualização do APK não deve remover os dados do app;
- suporte a backup `.treino`.

### Windows

Os dados ficam em `app.getPath('userData')`, fora da pasta de instalação. Fotos ficam em arquivos separados e são incluídas no backup.

## Login

O login é local e offline. A senha não é salva em texto puro: é derivada com PBKDF2 + SHA-256, salt aleatório e iterações elevadas. Esta autenticação é uma barreira de privacidade do aplicativo, não substitui a segurança do sistema operacional/dispositivo.

## Treino persistente

`activeSession` é parte do estado persistido. Alterações de carga, repetições, conclusão de série, notas, pausa e descanso são salvas sem exigir um botão de salvar.

Se o processo for fechado, a sessão continua logicamente ativa. Quando o app abre novamente, o tempo decorrido é calculado por `Date.now() - startedAt - pausas`.

## Descanso no Android

O app usa `@capacitor/local-notifications` para agendar o aviso do fim do descanso e `@capacitor/haptics` para feedback tátil.

## Sincronização PC ↔ celular

O aplicativo de PC expõe uma API somente na rede local na porta `3035`. O PC exibe um código de pareamento de seis dígitos. O celular usa IP + código para receber ou enviar um backup completo.

## Gerar APK

O workflow `Gerar APK Android - Treino Premium` gera o artifact:

`Treino-Premium-APK-1.1.0`

O package id Android continua `com.rodolfo.treino` e a assinatura de teste estável do projeto é mantida para permitir atualização sobre builds posteriores que usem a mesma chave.

## Gerar Windows

O workflow `Gerar Windows - Treino Premium` gera:

`Treino-Premium-Windows-1.1.0`

## Atualizar o repositório

Extraia esta versão e execute `ATUALIZAR-GITHUB-v1.1.0.bat`. O atualizador pode preparar a própria pasta e enviar a versão para a branch `main`.
