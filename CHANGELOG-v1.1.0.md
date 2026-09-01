# Treino Premium v1.1.0

## Correções críticas

- Corrigido o botão de finalizar treino que desaparecia no layout mobile.
- Finalização agora está disponível no cabeçalho e em uma barra de ação visível no celular.
- Corrigida a tela de séries no celular: reps alvo não ficam mais escondidas.
- Campos receberam rótulos explícitos para carga usada e reps feitas.
- Repetições feitas começam vazias em uma nova sessão; o resultado anterior é apenas uma referência.

## Flexibilidade de programação

Novo ajuste pontual por data, sem alterar a divisão semanal recorrente:

- adiar treino;
- trocar por outra ficha;
- substituir por atividade avulsa;
- marcar como descanso/indisponível;
- desfazer o ajuste e voltar ao plano semanal.

Atividades avulsas disponíveis: corrida, caminhada, pedal, natação, elíptico, escada ou nome personalizado.

## Atividades avulsas

- cronômetro persistente;
- distância opcional;
- calorias opcionais;
- observações;
- salvamento no histórico.

## Banco de dados

Schema atualizado para v6 com `scheduleOverrides`. A normalização mantém compatibilidade com dados da v1.0.x.
