# ERS - Documento de Especificação de Requisitos de Software (v0.2)

## 1. Visão Geral

### 1.1 Objetivo

Definir os requisitos iniciais de uma aplicação web para ensino e comparação de algoritmos de ordenação, evoluindo o simulador atual para uma experiência iterativa e visual.

### 1.2 Escopo

A aplicação permitirá:

- Aprendizado dos algoritmos com animações passo a passo.
- Execução de testes interativos dos algoritmos.
- Comparação de desempenho e número de comparações entre múltiplos algoritmos em diferentes cenários de entrada.

### 1.3 Stack Tecnológica

- Front-end: Vue 3
- Linguagem: TypeScript
- Estilo: SASS (SCSS)
- Ant Design Vue 4x
- Vite

### 1.4 Público-alvo

- Estudantes de algoritmos e estrutura de dados.
- Professores e instrutores.
- Desenvolvedores iniciantes interessados em análise de desempenho.

## 2. Definições e Premissas

### 2.1 Definições

- Cenário de entrada: forma do vetor de teste (crescente, decrescente ou aleatório).
- Rodada de teste: execução de um algoritmo para um tamanho e cenário específicos.
- Simulação comparativa: conjunto de rodadas para todos os algoritmos selecionados.

### 2.2 Premissas

- O processamento será local no navegador.
- As simulações do comparador serão executadas em Web Workers para não bloquear a interface principal.
- Os algoritmos iniciais considerados no MVP: Insertion Sort, Bubble Sort, Merge Sort, Heap Sort e Quick Sort.

## 3. Módulos do Sistema

## Módulo 1 - Aprendizado e Teste de Algoritmos

### Descrição

Módulo educacional com explicações, animações e área de execução manual.

### Requisitos funcionais (RF)

- RF-001: O sistema deve listar os algoritmos disponíveis para estudo.
- RF-002: O sistema deve exibir descrição textual de cada algoritmo (conceito e estratégia).
- RF-003: O sistema deve exibir complexidade assintótica ($O$-notação) de melhor, médio e pior caso para cada algoritmo.
- RF-004: O sistema deve animar a execução passo a passo do algoritmo sobre um vetor.
- RF-005: O usuário deve poder iniciar, pausar, continuar e reiniciar a animação.
- RF-006: O usuário deve poder controlar a velocidade da animação (1x a 10x) com label visual do multiplicador.
- RF-007: O sistema deve exibir índices das posições (começando em 1) e valores de cada elemento durante a visualização.
- RF-008: O sistema deve exibir o estado das variáveis internas do algoritmo (i, j) durante a execução da animação.
- RF-009: O usuário deve poder testar o algoritmo com vetor personalizado (entrada manual via .txt com formato específico ou geração automática).
- RF-010: O sistema deve exibir resultado final ordenado e métricas básicas (tempo, comparações e uso de memória).

### Critérios de aceite

- CA-001: Dado um algoritmo selecionado, a animação deve representar corretamente suas operações principais (comparações e trocas).
- CA-002: A mudança de velocidade (1x a 10x) deve impactar o ritmo da animação sem quebrar a ordem dos passos.
- CA-003: Os índices devem ser exibidos começando de 1 e cada coluna deve ter altura proporcional ao seu valor.
- CA-004: O painel de variáveis deve atualizar em tempo real durante a execução, exibindo os valores de i e j de forma clara.
- CA-005: Para qualquer vetor válido, o resultado exibido deve estar ordenado em ordem crescente.

## Módulo 2 - Comparador de Algoritmos

### Descrição

Módulo para benchmark com seleção de algoritmos, cenários de teste e tamanhos de entrada configuráveis.

### Requisitos funcionais (RF)

- RF-011: O usuário deve poder selecionar um ou mais algoritmos para comparar.
- RF-012: O usuário deve poder selecionar um ou mais cenários de teste, podendo escolher de 1 a 3 opções entre:
  - Crescente
  - Decrescente
  - Aleatório
- RF-013: O usuário deve poder selecionar um ou mais tamanhos de vetor para a simulação, escolhendo livremente entre os tamanhos disponíveis:
  - 100
  - 1.000
  - 5.000
  - 30.000
  - 50.000
  - 100.000
  - 150.000
  - 200.000
- RF-014: O usuário deve poder definir a quantidade de replicações de cada teste.
- RF-015: O sistema deve calcular e exibir a média dos resultados por algoritmo/tamanho/cenário, com exclusão de outliers.
- RF-016: O usuário deve poder definir um limite máximo de tempo por execução de algoritmo em cada rodada.
- RF-017: Ao atingir o limite máximo de tempo, a execução deve ser interrompida com status de timeout, sem travar a aplicação.
- RF-018: O sistema deve medir, no mínimo, tempo de execução, número de comparações e uso de memória por algoritmo.
- RF-019: O sistema deve apresentar os resultados em tabela e gráfico.
- RF-020: O sistema deve mostrar progresso da simulação em tempo real.
- RF-021: O processamento do comparador deve ocorrer em thread assíncrona (Web Worker), mantendo a UI responsiva durante toda a simulação.

### Critérios de aceite

- CA-006: Ao iniciar a comparação, apenas os algoritmos selecionados devem ser executados.
- CA-007: O sistema deve executar somente os cenários selecionados (1, 2 ou 3).
- CA-008: O sistema deve executar somente os tamanhos selecionados pelo usuário.
- CA-009: Ao configurar múltiplas replicações, a média sem outliers deve ser exibida corretamente.
- CA-010: Ao atingir o tempo máximo configurado, a execução deve ser interrompida e marcada como timeout.
- CA-011: Durante a simulação, a interface deve permanecer navegável e responsiva.
- CA-012: A tabela e o gráfico devem representar os mesmos valores calculados.

## Módulo 3 - Histórico e Exportação (Proposta Inicial)

### Descrição

Módulo para registrar execuções e facilitar compartilhamento dos resultados. Incluído para completar a estrutura inicial em 3 módulos e pode ser refinado depois.

### Requisitos funcionais (RF)

- RF-022: O sistema deve armazenar localmente o histórico das últimas simulações (Local Storage).
- RF-023: O usuário deve poder reabrir uma simulação do histórico para visualização.
- RF-024: O usuário deve poder exportar os resultados em CSV.
- RF-025: O usuário deve poder exportar gráfico em imagem (PNG).

### Critérios de aceite

- CA-013: Após recarregar a página, ao menos as últimas 10 simulações devem permanecer disponíveis no histórico.
- CA-014: O arquivo CSV exportado deve conter algoritmo, tamanho, tipo de entrada, tempo e comparações.

## 4. Requisitos Não Funcionais (RNF)

- RNF-001 (Tecnologia): A aplicação deve ser implementada com Vue 3 e TypeScript.
- RNF-002 (Estilo): A camada visual deve utilizar SASS (SCSS) com organização por módulos/componentes.
- RNF-003 (Usabilidade): A interface deve ser responsiva para desktop e mobile.
- RNF-004 (Desempenho): A interface não deve travar durante simulações longas; o comparador deve executar as simulações em Web Worker.
- RNF-005 (Confiabilidade): Para entradas idênticas, o mesmo algoritmo deve produzir os mesmos resultados ordenados.
- RNF-006 (Manutenibilidade): Novos algoritmos devem ser adicionados com baixo acoplamento, sem alteração extensa no núcleo.
- RNF-007 (Observabilidade): Erros de execução devem ser reportados com mensagem clara ao usuário.
- RNF-008 (Controle de execução): O sistema deve respeitar timeout configurado por execução e registrar o evento de interrupção.

## 5. Regras de Negócio

- RN-001: O resultado de ordenação deve estar sempre em ordem crescente.
- RN-002: Em modo comparativo, todos os algoritmos devem usar exatamente o mesmo vetor-base por rodada para garantir justiça na comparação.
- RN-003: A geração de vetor aleatório deve aceitar semente opcional para permitir reprodutibilidade (backlog do MVP).
- RN-004: A exclusão de outliers para cálculo da média deve seguir uma regra única e documentada para todo o sistema.
- RN-005: Execuções finalizadas por timeout não devem travar a fila de simulações e devem ser marcadas no resultado final.

## 6. Fluxos Principais

### 6.1 Fluxo de aprendizado

1. Usuário acessa módulo de aprendizado.
2. Seleciona algoritmo.
3. Define vetor e velocidade.
4. Executa animação.
5. Visualiza resultado e métricas.

### 6.2 Fluxo de comparação

1. Usuário acessa módulo comparador.
2. Seleciona algoritmos.
3. Seleciona um ou mais cenários (crescente, decrescente, aleatório).
4. Seleciona um ou mais tamanhos de vetor.
5. Define quantidade de replicações.
6. Define limite máximo de tempo por execução.
7. Executa benchmark de forma assíncrona.
8. Visualiza tabela, gráfico, progresso e possíveis timeouts.

## 7. Backlog Inicial (MVP)

### Fase 1

- Estrutura do projeto Vue 3 + TypeScript + SASS.
- Implementação do Módulo 1 com 2 algoritmos (ex.: Bubble e Insertion).
- Base de animação e controles.

### Fase 2

- Implementação completa do Módulo 2 com seleção de cenários e tamanhos.
- Gráficos e tabela de comparação.
- Repetições, média com exclusão de outliers e controle de timeout.
- Execução assíncrona em Web Worker.

### Fase 3

- Implementação do Módulo 3 (histórico e exportação).
- Melhorias de UX, acessibilidade e refinamento visual.

## 8. Itens em Aberto para Próxima Versão do ERS

- Definir se haverá autenticação de usuário.
- Definir política de persistência além do navegador (opcional).
- Definir conjunto final de algoritmos (incluindo variantes de Quick Sort).
- Definir estratégia formal de testes automatizados (unitários e de interface).

## 9. Versionamento do Documento

- Versão: 0.3
- Data: 2026-03-18
- Status: Atualizado com implementações do Módulo 1 (índices, valores, variáveis de estado e velocidade 1-10x)
