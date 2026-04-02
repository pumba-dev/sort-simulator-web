import type { AlgorithmKey } from "../types/comparator";

export type LearningAlgorithmMetadata = {
  key: AlgorithmKey;
  title: string;
  concept: string;
  strategy: string;
  bestCase: string;
  averageCase: string;
  worstCase: string;
  pseudocodeLines: string[];
};

export const learningAlgorithms: LearningAlgorithmMetadata[] = [
  {
    key: "insertion",
    title: "Insertion Sort",
    concept:
      "Constroi o vetor ordenado inserindo cada elemento na posicao correta.",
    strategy:
      "Percorre da esquerda para direita e desloca elementos maiores para abrir espaco.",
    bestCase: "O(n)",
    averageCase: "O(n^2)",
    worstCase: "O(n^2)",
    pseudocodeLines: [
      "FUNCTION INSERTION-SORT(A[1..n])",
      "for i <- 2 to n",
      "  X <- A[i]",
      "  j <- i - 1",
      "  while j > 0 and X < A[j]",
      "    A[j + 1] <- A[j]",
      "    j <- j - 1",
      "  A[j + 1] <- X",
    ],
  },
  {
    key: "bubble",
    title: "Bubble Sort",
    concept: "Compara pares adjacentes e troca quando estao fora de ordem.",
    strategy: "Repete passagens ate que nao haja trocas.",
    bestCase: "O(n)",
    averageCase: "O(n^2)",
    worstCase: "O(n^2)",
    pseudocodeLines: [
      "FUNCTION BUBBLE-SORT(A[1..n])",
      "for i <- 1 to n - 1",
      "  trocou <- false",
      "  for j <- 1 to n - i",
      "    if A[j] > A[j + 1]",
      "      trocar A[j] com A[j + 1]",
      "      trocou <- true",
      "  if not trocou",
      "    break",
    ],
  },
  {
    key: "merge",
    title: "Merge Sort",
    concept: "Divide o problema em metades, ordena recursivamente e intercala.",
    strategy: "Usa abordagem dividir-para-conquistar com mesclagem ordenada.",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
    pseudocodeLines: [
      "FUNCTION MERGE-SORT(A, p, r)",
      "if p < r then",
      "  q <- floor((p + r) / 2)",
      "  MERGE-SORT(A, p, q)",
      "  MERGE-SORT(A, q + 1, r)",
      "  MERGE(A, p, q, r)",
      "",
      "FUNCTION MERGE(A, p, q, r)",
      "n1 <- q - p + 1",
      "n2 <- r - q",
      "for i <- 1 to n1",
      "  L[i] <- A[p + i - 1]",
      "for j <- 1 to n2",
      "  R[j] <- A[q + j]",
      "L[n1 + 1] <- INF",
      "R[n2 + 1] <- INF",
      "i <- 1",
      "j <- 1",
      "for k <- p to r",
      "  if L[i] <= R[j] then",
      "    A[k] <- L[i]",
      "    i <- i + 1",
      "  else",
      "    A[k] <- R[j]",
      "    j <- j + 1",
    ],
  },
  {
    key: "heap",
    title: "Heap Sort",
    concept:
      "Transforma o vetor em heap maximo e extrai o maior item repetidamente.",
    strategy: "Mantem propriedade de heap durante as extracoes.",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
    pseudocodeLines: [
      "FUNCTION HEAP-SORT(A[1..n])",
      "BUILD-MAX-HEAP(A)",
      "for i <- heapSize downto 2",
      "  swap A[1] with A[i]",
      "  heapSize <- heapSize - 1",
      "  MAX-HEAPIFY(A, 1, heapSize)",
      "",
      "FUNCTION BUILD-MAX-HEAP(A)",
      "heapSize <- length(A)",
      "for i <- floor(length(A) / 2) downto 1",
      "  MAX-HEAPIFY(A, i, heapSize)",
      "",
      "FUNCTION MAX-HEAPIFY(A, i, heapSize)",
      "left <- 2 * i",
      "right <- 2 * i + 1",
      "largest <- i",
      "if left <= heapSize and A[left] > A[largest] then",
      "  largest <- left",
      "if right <= heapSize and A[right] > A[largest] then",
      "  largest <- right",
      "if largest != i then",
      "  swap A[i] with A[largest]",
      "  MAX-HEAPIFY(A, largest, heapSize)",
    ],
  },
  {
    key: "quick",
    title: "Quick Sort",
    concept: "Particiona em torno de pivo e ordena subvetores recursivamente.",
    strategy: "A escolha de pivo influencia fortemente o desempenho.",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n^2)",
    pseudocodeLines: [
      "FUNCTION QUICK-SORT(A, p, r)",
      "if p < r",
      "  q <- PARTITION(A, p, r)",
      "  QUICK-SORT(A, p, q - 1)",
      "  QUICK-SORT(A, q + 1, r)",
      "",
      "FUNCTION PARTITION(A, p, r)",
      "pivot <- A[r]",
      "i <- p - 1",
      "for j <- p to r - 1",
      "  if A[j] <= pivot",
      "    i <- i + 1",
      "    trocar A[i] com A[j]",
      "trocar A[i + 1] com A[r]",
      "return i + 1",
    ],
  },
];

export const learningByKey: Record<AlgorithmKey, LearningAlgorithmMetadata> =
  learningAlgorithms.reduce(
    (accumulator, item) => {
      accumulator[item.key] = item;
      return accumulator;
    },
    {} as Record<AlgorithmKey, LearningAlgorithmMetadata>,
  );
