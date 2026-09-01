# Treino Premium v1.0.0

Esta versão é uma reestruturação do projeto com foco em confiabilidade durante o treino, conforto visual e uso no PC + Android.

## Destaques

- Conta local com usuário e senha usando PBKDF2/SHA-256.
- Opção para manter a sessão conectada no dispositivo.
- Sessão de treino persistente: navegar pelo app não finaliza o treino.
- Fechar ou colocar o app em segundo plano não finaliza a sessão; o tempo é calculado por timestamps persistidos.
- Autosave das alterações da sessão ativa.
- Carga e repetições registradas individualmente em cada série.
- Cargas da última sessão são pré-preenchidas ao iniciar o mesmo exercício novamente.
- Pausa explícita do cronômetro, separada de sair da tela.
- Descanso persistente e notificação local no Android.
- Interface premium responsiva com tema claro/escuro e cores personalizáveis.
- Dashboard com treino do dia, meta semanal, sequência, peso e estatísticas.
- Biblioteca e editor de treinos.
- Configuração de séries individual por exercício.
- Fotos de execução por exercício.
- Histórico detalhado.
- PRs de carga e gráfico de peso.
- Fotos de evolução corporal.
- Metas semanais e mensais.
- Backup completo com fotos.
- Sincronização PC ↔ celular via Wi-Fi local.
- Uma interface compartilhada entre PC e celular para reduzir divergências e bugs.
- Migração dos dados da estrutura 0.x no celular e no PC.
- GitHub Actions atualizado para runtimes atuais.
- Electron com contextIsolation, sandbox e nodeIntegration desativado.
