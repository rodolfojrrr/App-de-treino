# Treino Premium v1.0.1

## Correção crítica de inicialização no Android

- Corrige o aplicativo preso indefinidamente na tela `TREINO / Performance Companion`.
- Substitui a camada Dexie do armazenamento principal no Android por IndexedDB direto, mantendo a arquitetura offline.
- Adiciona timeout defensivo na leitura e gravação do banco local para o app nunca ficar eternamente na Splash.
- Reescreve a migração da base antiga `rodolfo-training` para evitar travamentos do WebView durante abertura/upgrade.
- Se uma leitura antiga falhar, o aplicativo entra normalmente e permite criar o perfil em vez de ficar preso na inicialização.
- Corrige a revisão do estado, que estava sendo zerada durante `normalizeCore`, melhorando a proteção contra gravações antigas sobrescreverem novas.
- Mantém package ID `com.rodolfo.treino` e assinatura estável de atualização.

## Teste prioritário

1. Instalar a v1.0.1.
2. Confirmar que a Splash sai para o Primeiro Acesso/Login.
3. Criar usuário.
4. Criar treino e iniciar uma sessão.
5. Alterar carga/reps, sair para outros menus, minimizar e reabrir.
6. Confirmar que o cronômetro e a sessão continuam.
