import type {
  SortRunOptions,
  SortRunResult,
  SortStep,
} from "../types/sort-types";

const ABORT_SENTINEL = Symbol("sort-aborted");
// [BENCHMARK] Tamanho em bytes de cada número (float64)
const BYTES_PER_NUMBER = 8;
// [BENCHMARK] Estimativa de bytes por frame de chamada no sift-down iterativo
const STACK_FRAME_BYTES = 32;

export default (A: number[], options: SortRunOptions = {}): SortRunResult => {
  // [BENCHMARK] Desestrutura opções de controle: gravação de passos, sinal de abort e frequência de checagem
  const {
    recordSteps = true,
    signal,
    yieldEveryOps = 50000,
    deadlineMs,
  } = options;

  // [BENCHMARK] Array de snapshots para animação passo a passo
  const steps: SortStep[] = [];
  // [BENCHMARK] Acumuladores de métricas: comparações e trocas realizadas
  let comparisons = 0;
  let swaps = 0;

  // [SORT] Cópia do array de entrada para não mutar o original
  const arr = [...A];

  // [BENCHMARK] Base da memória auxiliar: apenas a cópia do array principal
  const baseAux = arr.length * BYTES_PER_NUMBER;
  // [BENCHMARK] Profundidade máxima do heap: log2(n) — determina altura da árvore
  const maxRecursionDepth = Math.max(
    1,
    Math.ceil(Math.log2(Math.max(arr.length, 2))),
  );
  // [BENCHMARK] Pico de memória = cópia do array + frames estimados do sift-down
  const peakAux = baseAux + maxRecursionDepth * STACK_FRAME_BYTES;

  // [BENCHMARK] Contador de operações para espaçar verificações do sinal de abort
  let ops = 0;
  const tick = () => {
    // [BENCHMARK] Incrementa contador a cada operação interna
    ops += 1;
    // [BENCHMARK] A cada lote de yieldEveryOps operações, verifica se o sort foi cancelado
    if (ops >= yieldEveryOps) {
      ops = 0;
      if (signal && signal.aborted) {
        throw ABORT_SENTINEL;
      }
      if (deadlineMs !== undefined && Date.now() >= deadlineMs) {
        throw ABORT_SENTINEL;
      }
    }
  };

  // [BENCHMARK] Grava snapshot do estado atual do array somente se recordSteps estiver ativo
  const pushStep = (fields: SortStep) => {
    if (recordSteps) steps.push(fields);
  };

  function maxHeapifyIterative(
    A: number[],
    heapSize: number,
    startI: number,
    comps: number,
    sw: number,
  ): { comparisons: number; swaps: number } {
    // [SORT] Índice do nó atual sendo analisado no sift-down
    let i = startI;
    // [BENCHMARK] Cópias locais de métricas para acumular dentro do heapify sem mutar os globais
    let localComps = comps;
    let localSwaps = sw;

    // [SORT] Desce o heap até encontrar posição correta para o nó atual (sift-down iterativo)
    while (true) {
      // [SORT] Assume que o nó atual é o maior entre ele e seus filhos
      let largest = i;
      // [SORT] Calcula índice do filho esquerdo na representação de heap em array (2i+1)
      const l = 2 * i + 1;
      // [SORT] Calcula índice do filho direito na representação de heap em array (2i+2)
      const r = 2 * i + 2;

      // [SORT] Compara nó atual com filho esquerdo: se filho é maior, ele é o novo candidato
      if (l < heapSize && A[l] > A[largest]) {
        // [BENCHMARK] Registra comparação com filho esquerdo
        localComps++;
        // [SORT] Filho esquerdo é o maior até agora
        largest = l;
      }
      // [BENCHMARK] Verifica abort após comparação com filho esquerdo
      tick();

      // [SORT] Compara candidato atual com filho direito: se direito é maior, vira o candidato
      if (r < heapSize && A[r] > A[largest]) {
        // [BENCHMARK] Registra comparação com filho direito
        localComps++;
        // [SORT] Filho direito é o maior entre os três nós avaliados
        largest = r;
      }
      // [BENCHMARK] Verifica abort após comparação com filho direito
      tick();

      // [SORT] Se o maior não é o nó atual, troca e continua descendo para restaurar max-heap
      if (largest !== i) {
        // [BENCHMARK] Registra comparação da condição de posição (largest !== i)
        localComps++;

        // [SORT] Troca o nó atual com o maior filho para restaurar a propriedade max-heap
        [A[i], A[largest]] = [A[largest], A[i]];
        // [BENCHMARK] Registra a troca realizada
        localSwaps++;

        // [BENCHMARK] Snapshot após troca: destaca os dois nós envolvidos no sift-down
        pushStep({
          values: [...A],
          activeIndexes: [i, largest],
          comparisons: localComps,
          swaps: localSwaps,
          variables: { i, largest, heapSize },
          pivotIndex: null,
          heapifyRegion: { start: 0, end: heapSize },
        });
        tick();

        // [SORT] Desce para a posição do filho trocado e continua o sift-down
        i = largest;
      } else {
        // [SORT] Nó já está na posição correta: propriedade max-heap restaurada, encerra loop
        break;
      }
    }

    // [BENCHMARK] Retorna métricas acumuladas durante o heapify para propagação ao escopo global
    return { comparisons: localComps, swaps: localSwaps };
  }

  try {
    // [SORT] Fase 1 — Construção do max-heap: heapifica de baixo para cima (último nó interno até raiz)
    for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
      const result = maxHeapifyIterative(
        arr,
        arr.length,
        i,
        comparisons,
        swaps,
      );
      // [BENCHMARK] Acumula métricas retornadas pelo heapify no contador global
      comparisons = result.comparisons;
      swaps = result.swaps;
    }

    // [SORT] Fase 2 — Extração: move a raiz (máximo atual) para o fim e re-heapifica o restante
    for (let i = arr.length - 1; i > 0; i--) {
      // [SORT] Troca a raiz do heap (maior elemento) com o último elemento não ordenado
      [arr[0], arr[i]] = [arr[i], arr[0]];
      // [BENCHMARK] Registra a troca de extração
      swaps++;

      // [BENCHMARK] Snapshot após extração: destaca raiz e a posição final do elemento extraído
      pushStep({
        values: [...arr],
        activeIndexes: [0, i],
        comparisons,
        swaps,
        variables: { i, heapSize: i },
        pivotIndex: null,
        heapifyRegion: { start: 0, end: i },
      });
      tick();

      // [SORT] Re-heapifica o heap reduzido (exclui o elemento recém colocado na posição final)
      const result = maxHeapifyIterative(arr, i, 0, comparisons, swaps);
      // [BENCHMARK] Acumula métricas retornadas pelo heapify no contador global
      comparisons = result.comparisons;
      swaps = result.swaps;
    }
  } catch (error) {
    // [BENCHMARK] Captura abort: retorna resultado parcial com flag aborted=true
    if (error === ABORT_SENTINEL) {
      return {
        steps,
        finalArray: arr,
        comparisons,
        swaps,
        peakAuxBytes: peakAux,
        aborted: true,
      };
    }
    throw error;
  }

  // [BENCHMARK] Garante ao menos um snapshot quando array já está ordenado (nenhum passo gerado)
  if (recordSteps && steps.length === 0) {
    steps.push({
      values: [...arr],
      activeIndexes: [],
      comparisons: 0,
      swaps: 0,
      variables: { i: 0, heapSize: arr.length },
      pivotIndex: null,
      heapifyRegion: null,
    });
  }

  // [BENCHMARK] Resultado final: array ordenado + métricas coletadas
  return {
    steps,
    finalArray: arr,
    comparisons,
    swaps,
    peakAuxBytes: peakAux,
    aborted: false,
  };
};
