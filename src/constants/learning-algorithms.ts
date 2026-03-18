import type { AlgorithmKey } from "../types/comparator";

export type LearningAlgorithmMetadata = {
  key: AlgorithmKey;
  title: string;
  concept: string;
  strategy: string;
  bestCase: string;
  averageCase: string;
  worstCase: string;
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
  },
  {
    key: "bubble",
    title: "Bubble Sort",
    concept: "Compara pares adjacentes e troca quando estao fora de ordem.",
    strategy: "Repete passagens ate que nao haja trocas.",
    bestCase: "O(n)",
    averageCase: "O(n^2)",
    worstCase: "O(n^2)",
  },
  {
    key: "merge",
    title: "Merge Sort",
    concept: "Divide o problema em metades, ordena recursivamente e intercala.",
    strategy: "Usa abordagem dividir-para-conquistar com mesclagem ordenada.",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
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
  },
  {
    key: "quick",
    title: "Quick Sort",
    concept: "Particiona em torno de pivo e ordena subvetores recursivamente.",
    strategy: "A escolha de pivo influencia fortemente o desempenho.",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n^2)",
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
