const esES = {
  app: {
    brandTitle: "Sorting Lab",
    brandSubtitle: "Simulador Iterativo",
    footerText: "Sorting Algorithms Simulator · Pumba Developer © 2026",
  },
  menu: {
    learning: "Aprendizaje",
    comparator: "Comparador",
    history: "Historial",
    navigation: "Navegacion",
    openNavigation: "Abrir menu de navegacion",
  },
  language: {
    change: "Cambiar idioma",
    current: "Idioma actual: {language}",
    options: {
      "pt-BR": "Portugues (Brasil)",
      "en-US": "Ingles (Estados Unidos)",
      "es-ES": "Espanol (Espana)",
    },
    flagAlt: {
      "pt-BR": "Bandera de Brasil",
      "en-US": "Bandera de Estados Unidos",
      "es-ES": "Bandera de Espana",
    },
  },
  common: {
    algorithms: {
      insertion: "Insertion Sort",
      bubble: "Bubble Sort",
      merge: "Merge Sort",
      heap: "Heap Sort",
      quick: "Quick Sort",
      tim: "Tim Sort",
    },
    scenarios: {
      crescente: "Creciente",
      decrescente: "Decreciente",
      aleatorio: "Aleatorio",
      quaseOrdenado: "Casi ordenado",
      quaseDecrescente: "Casi invertido",
      gaussiano: "Gaussiano",
      organPipe: "Sube-baja",
      comOutliers: "Con outliers",
      all: "Todos los escenarios",
    },
    sizes: {
      all: "Todos los tamaños",
    },
    metrics: {
      time: "Tiempo",
      comparisons: "Comparaciones",
      memory: "Memoria",
    },
    notSelected: "No seleccionado",
  },
  mobileValidation: {
    title: "Acceso no disponible",
    message:
      "Esta aplicacion no funciona en dispositivos moviles. Accede desde una tablet o computadora.",
  },
  table: {
    columns: {
      algorithm: "Algoritmo",
      scenario: "Escenario",
      size: "Tamaño",
      avgTimeMs: "Tiempo medio (ms)",
      comparisons: "Comparaciones",
      swaps: "Intercambios",
      avgMemoryKb: "Memoria media (KB)",
      timeouts: "Timeouts",
    },
  },
  chart: {
    yAxis: {
      avgTimeMs: "Tiempo medio (ms)",
      avgComparisons: "Comparaciones medias",
      avgMemoryKb: "Memoria media (KB)",
    },
    empty: "Sin datos para el gráfico",
    series: "Serie",
    vectorSize: "Tamaño del vector",
    scaleLinear: "Escala lineal",
    scaleLog: "Escala logarítmica",
    resetZoom: "Restablecer zoom",
    zoomHint: "Scroll: zoom · Arrastrar: caja de zoom · Ctrl+arrastrar: desplazar",
  },
  comparator: {
    hero: {
      title: "Módulo 2 - Comparador de Algoritmos",
      description:
        "Configura escenarios, tamaños y replicaciones para comparar el rendimiento medio entre algoritmos.",
    },
    sections: {
      configuration: "Configuración de la Simulación",
      progress: "Progreso de la Simulación",
      environment: "Entorno de Ejecución",
      table: "Resultados en Tabla",
      chart: "Resultados en Gráfico",
    },
    form: {
      algorithms: "Algoritmos",
      scenarios: "Escenarios",
      sizes: "Tamaños",
      replications: "Replicaciones",
      timeoutMs: "Timeout por ejecución (ms)",
      timeoutMinutes: "Timeout por ejecución (min)",
      timeoutEnabled: "Habilitar timeout (min)",
      seed: "Semilla (seed)",
      removeOutliers: "Eliminar outliers (IQR)",
      allowDuplicates: "Permitir duplicados",
    },
    buttons: {
      start: "Iniciar comparación",
      cancel: "Cancelar",
      download: "Descargar",
      downloadMarkdown: "Descargar Markdown",
      downloadPdf: "Descargar PDF",
    },
    tooltips: {
      algorithms: "Selecciona uno o más algoritmos para comparar lado a lado.",
      scenarios:
        "Escenarios de entrada usados para generar los vectores: creciente, decreciente o aleatorio.",
      sizes: "Tamaños de vectores generados para cada algoritmo y escenario.",
      replications:
        "Cuántas veces se ejecuta cada combinación para calcular el promedio.",
      replicationsCap:
        "Mínimo {min}, máximo {max} (ajustado automáticamente según el mayor tamaño seleccionado para proteger la memoria del navegador).",
      timeoutEnabled:
        "Cuando está activo, define un tiempo máximo por ejecución. Desactivado, el algoritmo se ejecuta sin límite de tiempo.",
      timeoutMinutes:
        "Tiempo máximo, en minutos, que cada ejecución puede durar antes de ser interrumpida.",
      seed: "Valor inicial del generador pseudoaleatorio. Mantiene los resultados reproducibles entre ejecuciones.",
      removeOutliers:
        "Cuando está activo, elimina valores atípicos (regla de IQR) antes de calcular el promedio.",
      allowDuplicates:
        "Cuando está activo, el escenario aleatorio muestrea valores con reemplazo en [1..n], permitiendo duplicados. Otros escenarios no se ven afectados.",
      start: "Inicia la simulación comparativa con la configuración actual.",
      cancel: "Cancela la simulación en curso.",
      download: "Exporta los resultados en CSV, Markdown o PDF.",
    },
    feedback: {
      initial: "Configura e inicia una simulación comparativa.",
      validation: {
        selectAlgorithm: "Selecciona al menos un algoritmo.",
        selectScenario: "Selecciona al menos un escenario.",
        selectSize: "Selecciona al menos un tamaño de vector.",
        replications: "Las replicaciones deben estar entre {min} y {max}.",
        timeout: "El timeout debe ser mayor que cero.",
      },
      running: "Simulación en curso ({completed}/{total})",
      currentCell:
        "Ejecutando: {algorithm} {'|'} {scenario} {'|'} n={size} {'|'} Rep. {replication}/{total}",
      finishedTitle: "Simulación completada",
      finished: "Simulación finalizada.",
      cancelled: "Simulación cancelada por el usuario.",
      errorPrefix: "Error en el comparador",
      workerError: "Error interno del worker.",
      starting: "Iniciando simulación...",
      pendingLoaded:
        "Configuración cargada desde el historial. Haz clic en Iniciar para ejecutar de nuevo.",
    },
    confirm: {
      heavyJob: {
        title: "Simulación pesada detectada",
        description:
          "Esta configuración ejecutará {totalRuns} replicaciones en {cells} celdas, con un pico estimado de {peakMemory} de memoria por ejecución. En dispositivos con poca RAM o varias pestañas abiertas, el navegador puede bloquearse. ¿Continuar?",
        proceed: "Continuar",
        cancel: "Cancelar",
      },
    },
    help: {
      title: "Cómo usar el Comparador",
      openTooltip: "Abrir guía de uso",
      tabs: {
        general: "General",
        algorithms: "Algoritmos",
        scenarios: "Escenarios",
        parameters: "Parámetros",
      },
      general: {
        intro:
          "El Comparador ejecuta cada algoritmo de ordenación seleccionado sobre los mismos vectores de entrada y mide tiempo, comparaciones, intercambios y memoria auxiliar. Los resultados permiten analizar el rendimiento relativo en diferentes condiciones.",
        workflow:
          "Para empezar: elige uno o más algoritmos, uno o más escenarios de entrada, uno o más tamaños de vector, ajusta replicaciones/semilla/timeout según necesidad y haz clic en Iniciar comparación. La simulación corre en un Web Worker, así que la página sigue respondiendo.",
        results:
          "Al terminar, la tabla muestra el promedio por celda (algoritmo × escenario × tamaño) y el gráfico permite alternar entre métricas (tiempo, comparaciones, memoria). Usa el botón Descargar para exportar como CSV, Markdown o PDF. Cada ejecución se guarda automáticamente en el Historial.",
      },
      scenarios: {
        crescente:
          "Array ya ordenado en orden creciente: [1, 2, 3, ..., n]. Mejor caso para Insertion/Bubble con detección de orden.",
        decrescente:
          "Orden decreciente: [n, n-1, ..., 1]. Peor caso clásico para varios algoritmos.",
        aleatorio:
          "Permutación aleatoria de [1..n] generada por la semilla. Sin repeticiones, a menos que 'permitir duplicados' esté activo — en ese caso, los valores se muestrean con reemplazo en [1..n].",
        quaseOrdenado:
          "Base creciente con ~5% de pares intercambiados aleatoriamente. Modela datos casi ordenados — favorece Insertion y Tim Sort.",
        quaseDecrescente:
          "Base decreciente con ~5% de pares perturbados. Forma del peor caso, pero suavizada.",
        gaussiano:
          "Valores muestreados de una distribución normal (media n/2, σ=n/6, recortado a [1,n]). Modela mediciones reales de sensores/sistemas — los duplicados son intrínsecos.",
        organPipe:
          "Sube hasta la mitad (1..n/2) y luego baja (n/2..1). Forma de 'tubo de órgano' presente en algunos pipelines de datos.",
        comOutliers:
          "Base ordenada con ~1% de elementos lanzados a posiciones aleatorias. Modela datos de producción con ruido puntual.",
        note: "Cada escenario se generará para cada tamaño seleccionado, y cada combinación se ejecutará con el número de replicaciones configurado. Total de ejecuciones = algoritmos × escenarios × tamaños × replicaciones.",
      },
      parameters: {
        replications:
          "Cuántas veces se ejecuta cada celda (algoritmo × escenario × tamaño) para calcular el promedio. Más replicaciones = promedio más estable, pero ejecución total más lenta. El límite máximo se ajusta al mayor tamaño seleccionado para proteger la memoria del navegador.",
        seed: "Semilla del generador pseudoaleatorio (Mulberry32). La semilla define arrays reproducibles: todos los algoritmos de la misma celda reciben exactamente el mismo array de entrada, garantizando comparación justa. Cambiar la semilla regenera arrays diferentes, pero los resultados siguen siendo reproducibles para la nueva semilla.",
        timeout:
          "Cuando está activo, cada replicación que supere el límite (en minutos) se aborta y se cuenta como timeout. Las replicaciones con timeout se excluyen de los promedios de tiempo pero se registran en la columna 'Timeouts'. Útil para limitar ejecuciones muy largas en vectores grandes.",
        outliers:
          "Eliminación de outliers mediante IQR (Tukey 1.5×): tras recolectar todas las duraciones de una celda, los valores fuera de [Q1 − 1.5·IQR, Q3 + 1.5·IQR] se descartan antes de calcular el promedio. Reduce el ruido por recolección de basura, planificación del SO o variación térmica de CPU.",
        duplicates:
          "Cuando está activo, el escenario aleatorio muestrea valores con reemplazo en [1..n], permitiendo elementos repetidos. Útil para probar el comportamiento de algoritmos con claves duplicadas (relevante para Quick Sort 3-way, por ejemplo). Otros escenarios no se ven afectados.",
      },
    },
    report: {
      title: "Informe del Comparador de Algoritmos",
      sections: {
        header: "Encabezado",
        environment: "Entorno de Ejecución",
        configuration: "Configuración",
        aggregated: "Resultados Agregados",
        raw: "Muestras Brutas",
      },
      header: {
        executedAt: "Ejecutado en",
        seed: "Semilla",
        replications: "Replicaciones",
        outlierRemoval: "Eliminación de outliers (IQR)",
        outlierEnabled: "activada",
        outlierDisabled: "desactivada",
        timeout: "Timeout por ejecución",
        timeoutFormat: "{min} min ({ms} ms)",
        elapsed: "Tiempo total",
      },
      environment: {
        browser: "Navegador",
        os: "Sistema Operativo",
        hardware: "Hardware",
        gpu: "GPU",
        baselineScore: "Baseline Score",
        threads: "{count} Subprocesos",
        memory: "{gb} GB RAM",
        desktop: "Escritorio",
        mobile: "Móvil",
      },
      config: {
        algorithms: "Algoritmos",
        scenarios: "Escenarios",
        sizes: "Tamaños",
      },
      aggregated: {
        columns: {
          algorithm: "Algoritmo",
          scenario: "Escenario",
          size: "Tamaño",
          avgTime: "Tiempo medio (ms)",
          avgComparisons: "Comparaciones",
          avgSwaps: "Intercambios",
          avgMemory: "Memoria (KB)",
          timeouts: "Timeouts",
          outliersRemoved: "Outliers eliminados",
        },
      },
      raw: {
        cellHeading: "{algorithm} - {scenario} - n={size}",
        columns: {
          rep: "Rep",
          duration: "Duración (ms)",
          comparisons: "Comparaciones",
          swaps: "Intercambios",
          memory: "Memoria (KB)",
          timeout: "Timeout",
        },
        outliersRemoved: "Outliers (durationMs) eliminados: {values}",
      },
      boolean: {
        yes: "sí",
        no: "no",
      },
    },
  },
  environment: {
    executedOn: "Benchmark ejecutado en:",
    threads: "{count} Subproceso(s)",
    memory: "{gb} GB RAM",
    desktop: "Escritorio",
    mobile: "Móvil",
    baselineScore: "Puntuación base: {score} ms",
    gpu: "GPU: {name}",
  },
  history: {
    hero: {
      title: "Modulo 3 - Historial y Exportacion",
      description:
        "Reabre simulaciones anteriores, revisa detalles y exporta los resultados.",
    },
    sections: {
      saved: "Simulaciones guardadas",
      imported: "Simulaciones importadas",
      details: "Detalles de la Simulacion",
    },
    buttons: {
      clear: "Limpiar",
      reopen: "Reabrir en comparador",
      export: "Exportar",
      exportCsv: "Exportar CSV",
      exportPng: "Exportar PNG",
      import: "Importar CSV",
      delete: "Eliminar",
      favorite: "Marcar favorito",
      unfavorite: "Quitar favorito",
    },
    empty: {
      noEntries: "No hay simulaciones registradas",
      noImported: "No hay simulaciones importadas",
      selectEntry: "Selecciona una simulacion para ver los detalles",
    },
    feedback: {
      cleared: "Historial limpiado correctamente.",
      csvExported: "CSV exportado.",
      reportMissing: "Informe completo no disponible para esta entrada.",
      pngExported: "Grafico exportado en PNG.",
      pngExportError: "No fue posible exportar el grafico.",
      deleted: "Simulacion eliminada.",
      favoriteAdded: "Simulacion marcada como favorita.",
      favoriteRemoved: "Eliminada de favoritas.",
      imported: "CSV importado correctamente.",
      importError: "No fue posible importar el CSV. Verifica el archivo.",
      importEmptyFile: "Archivo vacio.",
    },
    confirm: {
      deleteEntry: "Eliminar esta simulacion?",
      clearAll: "Limpiar todo el historial?",
    },
    summary: {
      entryCounts: "{algorithms} algoritmo(s) · {scenarios} escenario(s)",
      sizeReplication: "{sizes} tamano(s), {replications} replicacion(es)",
      executedAt: "Ejecutado en {date}",
      elapsed: "Tiempo total",
    },
    csvHeaders: {
      algorithm: "algoritmo",
      scenario: "escenario",
      size: "tamano",
      avgTimeMs: "tiempo_medio_ms",
      avgComparisons: "comparaciones_medias",
      avgMemoryKb: "memoria_media_kb",
      timeouts: "timeouts",
    },
    export: {
      filePrefix: "historial",
    },
  },
  learning: {
    hero: {
      title: "Aprendizaje y Prueba",
      description:
        "Estudia como evoluciona cada algoritmo en el vector con visualizacion iterativa y controles de ejecucion.",
    },
    sections: {
      configuration: "Configuracion del Algoritmo",
      controls: "Controles de la Animacion",
      visualization: "Visualizacion del Vector",
      variables: "Estado de Variables",
      basicMetrics: "Metricas Basicas",
      pseudo: "Pseudo Algoritmo",
      description: "Descripcion y Complejidad",
    },
    form: {
      algorithm: "Algoritmo",
      inputType: "Tipo de entrada",
      scenario: "Escenario",
      sizeVisualization: "Tamano para visualizacion (maximo {max})",
      manualVector: "Vector manual (numeros separados por comas)",
      speed: "Velocidad",
      generated: "Generado",
      manual: "Manual",
      prepare: "Preparar",
      start: "Iniciar",
      pause: "Pausar",
      reset: "Reiniciar",
      continue: "Continuar",
      stepPrevious: "Paso anterior",
      stepNext: "Siguiente paso",
      statusPrefix: "Estado:",
      manualHelp:
        "Formato aceptado: numeros separados por coma, espacio o punto y coma.",
    },
    validation: {
      manualEmpty:
        "Ingresa numeros separados por coma, espacio o punto y coma.",
      manualInvalid: "Formato invalido. Ejemplo: 8, 4, 6, 1 o 8 4 6 1.",
      manualMinValues: "Ingresa al menos 2 numeros para iniciar la simulacion.",
    },
    status: {
      readyPrepare: "Listo para preparar simulacion",
      readyStart: "Listo para iniciar",
      running: "Ejecutando",
      completed: "Completado",
      paused: "Pausado",
    },
    aria: {
      vectorAnimation: "Animacion del vector ordenandose",
      pseudoRegion: "Pseudo algoritmo",
    },
    empty: {
      variables: "Prepara una simulacion para ver las variables",
    },
    kpi: {
      time: "Tiempo (ms)",
      comparisons: "Comparaciones",
      swaps: "Intercambios",
    },
    complexity: {
      best: "Mejor",
      average: "Medio",
      worst: "Peor",
    },
    variableLabels: {
      i: "i:",
      j: "j:",
      x: "X:",
      nMinusI: "n - i:",
      gapAt: "Hueco:",
      p: "p:",
      q: "q:",
      r: "r:",
      depth: "Profundidad:",
      largest: "largest:",
      heapSize: "heapSize:",
      pivot: "pivot:",
    },
    tooltips: {
      configAlgorithm:
        "Elige el algoritmo de ordenacion a visualizar. Cada uno tiene comportamiento y rendimiento diferentes.",
      configInputType:
        "Elige si quieres un vector generado automaticamente o ingresar tus propios valores.",
      configScenario:
        "Creciente: vector ya ordenado. Decreciente: vector invertido. Aleatorio: orden aleatorio.",
      configSize:
        "Cantidad de elementos en el vector (maximo 30 para visualizacion clara).",
      configManualVector:
        "Ingresa numeros separados por coma, espacio o punto y coma. Maximo 30 valores.",
      controlsSpeed:
        "Ajusta la velocidad de reproduccion de la animacion. Valores mayores = mas rapido.",
      controlsStart: "Inicia la ejecucion automatizada del algoritmo.",
      controlsPause: "Pausa la animacion en el paso actual.",
      controlsReset: "Vuelve al primer paso de la animacion.",
      controlsContinue: "Continua la animacion desde donde fue pausada.",
      controlsStepBackward: "Vuelve al estado anterior de la animacion.",
      controlsStepForward: "Avanza al siguiente paso de la animacion.",
      visualization:
        "Grafico visual del vector. Los colores cambian segun el algoritmo: barra activa, ordenada, pivot y particiones.",
      variables:
        "Monitorea las variables internas del algoritmo en tiempo real durante la ejecucion.",
      basicMetrics:
        "Resumen estadistico de la ejecucion: tiempo transcurrido, comparaciones totales e intercambios/desplazamientos.",
      kpiTime:
        "Tiempo total transcurrido desde el inicio de la animacion, en milisegundos.",
      kpiComparisons:
        "Numero total de comparaciones entre elementos hasta ahora.",
      kpiSwaps:
        "Numero total de intercambios o desplazamientos de elementos realizados.",
      pseudo:
        "Pseudo-codigo didactico del algoritmo seleccionado, usando arreglos indexados desde 1.",
      description:
        "Informacion del algoritmo seleccionado: concepto, estrategia y complejidad en diferentes escenarios.",
      variablesByAlgorithm: {
        bubbleI:
          "Variable i del pseudo-codigo (pasada externa de bubble sort).",
        bubbleJ: "Variable j del pseudo-codigo (bucle interno de comparacion).",
        bubbleNMinusI:
          "Rango ya ordenado asociado al limite n - i del pseudo-codigo.",
        insertionI:
          "Variable i del pseudo-codigo (indice del elemento que se inserta).",
        insertionJ:
          "Variable j del pseudo-codigo (posicion analizada en la parte ordenada).",
        insertionX:
          "Variable X del pseudo-codigo (valor temporal que se inserta).",
        insertionGap:
          "Posicion del hueco abierto donde se insertara el elemento.",
        mergeP: "Variable p del pseudo-codigo (inicio de la particion).",
        mergeQ: "Variable q del pseudo-codigo (punto medio).",
        mergeR: "Variable r del pseudo-codigo (fin de la particion).",
        mergeDepth: "Nivel de profundidad de recursion (0 = merge final).",
        heapI: "Variable i del pseudo-codigo (nodo que se ajusta en heapify).",
        heapLargest: "Variable largest del pseudo-codigo.",
        heapSize: "Variable heapSize del pseudo-codigo.",
        quickP: "Variable p del pseudo-codigo (inicio de la particion).",
        quickR: "Variable r del pseudo-codigo (fin de la particion).",
        quickI: "Variable i del pseudo-codigo (frontera de valores <= pivot).",
        quickJ: "Variable j del pseudo-codigo (indice actualmente comparado).",
        quickPivot: "Variable pivot del pseudo-codigo.",
        quickQ:
          "Variable q del pseudo-codigo (posicion final del pivot tras PARTITION).",
        fallbackI: "Indice de iteracion del bucle externo.",
        fallbackJ: "Indice de iteracion del bucle interno.",
      },
    },
    algorithmDetails: {
      insertion: {
        concept:
          "Construye el vector ordenado insertando cada elemento en su posicion correcta.",
        strategy:
          "Recorre de izquierda a derecha y desplaza elementos mayores para abrir espacio.",
      },
      bubble: {
        concept:
          "Compara pares adyacentes e intercambia cuando estan fuera de orden.",
        strategy: "Repite pasadas hasta que no haya intercambios.",
      },
      merge: {
        concept:
          "Divide el problema en mitades, ordena de forma recursiva e intercala.",
        strategy: "Usa un enfoque de divide y venceras con mezcla ordenada.",
      },
      heap: {
        concept:
          "Transforma el vector en un max-heap y extrae el mayor elemento repetidamente.",
        strategy: "Mantiene la propiedad de heap durante las extracciones.",
      },
      quick: {
        concept:
          "Particiona alrededor de un pivot y ordena sub-vectores recursivamente.",
        strategy: "La eleccion del pivot influye mucho en el rendimiento.",
      },
      tim: {
        concept:
          "Híbrido entre Merge Sort e Insertion Sort, usado como sort por defecto en varios lenguajes.",
        strategy:
          "Detecta runs ya ordenados en el vector y mezcla bloques pequeños con Insertion local, aprovechando datos parcialmente ordenados.",
      },
    },
    pseudocode: {
      insertion: [
        "FUNCTION INSERTION-SORT(A[1..n])",
        "for i <- 2 to n",
        "  X <- A[i]",
        "  j <- i - 1",
        "  while j > 0 and X < A[j]",
        "    A[j + 1] <- A[j]",
        "    j <- j - 1",
        "  A[j + 1] <- X",
      ],
      bubble: [
        "FUNCTION BUBBLE-SORT(A[1..n])",
        "for i <- 1 to n - 1",
        "  intercambio <- false",
        "  for j <- 1 to n - i",
        "    if A[j] > A[j + 1]",
        "      intercambiar A[j] con A[j + 1]",
        "      intercambio <- true",
        "  if not intercambio",
        "    break",
      ],
      merge: [
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
      heap: [
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
      quick: [
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
        "    intercambiar A[i] con A[j]",
        "intercambiar A[i + 1] con A[r]",
        "return i + 1",
      ],
    },
    pseudoTips: {
      insertion: [
        "Define la funcion principal de Insertion Sort para un vector indexado de 1 a n.",
        "Recorre el vector desde la segunda posicion hasta el final, insertando un elemento por iteracion.",
        "Copia el valor actual en la variable temporal X antes de los desplazamientos.",
        "Inicializa j en la posicion inmediatamente anterior a i para comparar con elementos ya ordenados.",
        "Sigue desplazando mientras haya elementos mayores que la clave en la parte ordenada.",
        "Desplaza A[j] una posicion a la derecha para abrir espacio.",
        "Mueve j hacia la izquierda para seguir buscando la posicion correcta.",
        "Inserta la clave en la posicion final encontrada tras los desplazamientos.",
      ],
      bubble: [
        "Define la funcion principal de Bubble Sort para todo el vector.",
        "Controla las pasadas externas; en cada pasada, el mayor restante va al final.",
        "Reinicia la bandera de intercambio para detectar si todavia hay desorden.",
        "Recorre pares adyacentes de la parte aun no consolidada del vector.",
        "Compara el par actual y verifica si esta fuera de orden.",
        "Intercambia ambos elementos para corregir el orden local.",
        "Marca que hubo un intercambio en esta pasada.",
        "Si no hubo intercambios, el vector ya esta ordenado.",
        "Finaliza antes para evitar iteraciones innecesarias.",
      ],
      merge: [
        "Define la funcion recursiva principal de Merge Sort para el intervalo [p, r].",
        "Verifica el caso recursivo: solo divide si hay al menos dos elementos.",
        "Calcula el punto medio q para separar el intervalo en dos mitades.",
        "Ordena recursivamente la mitad izquierda [p, q].",
        "Ordena recursivamente la mitad derecha [q + 1, r].",
        "Intercala las dos mitades ya ordenadas en el intervalo original.",
        "Separador visual entre la funcion principal y la auxiliar de merge.",
        "Define la funcion auxiliar que intercala dos particiones ordenadas.",
        "Calcula el tamano de la particion izquierda.",
        "Calcula el tamano de la particion derecha.",
        "Recorre los elementos de la particion izquierda temporal.",
        "Copia cada elemento de la mitad izquierda al arreglo auxiliar L.",
        "Recorre los elementos de la particion derecha temporal.",
        "Copia cada elemento de la mitad derecha al arreglo auxiliar R.",
        "Agrega centinela al final de L para simplificar comparaciones de limite.",
        "Agrega centinela al final de R para simplificar comparaciones de limite.",
        "Inicializa el puntero i al inicio de L.",
        "Inicializa el puntero j al inicio de R.",
        "Recorre todas las posiciones del intervalo original [p, r].",
        "Compara elementos actuales de L y R para decidir cual entra en el vector final.",
        "Escribe en A[k] el menor elemento entre cabeceras de L y R.",
        "Avanza el puntero i tras consumir un elemento de L.",
        "Camino alternativo cuando el elemento de R es menor.",
        "Escribe en A[k] el elemento actual de R.",
        "Avanza el puntero j tras consumir un elemento de R.",
      ],
      heap: [
        "Define la funcion principal de Heap Sort para un vector indexado de 1 a n.",
        "Construye inicialmente un max-heap con todos los elementos del vector.",
        "Recorre el final del vector para extraer el mayor elemento del heap en cada iteracion.",
        "Mueve el mayor elemento (raiz) a su posicion final al final del vector.",
        "Reduce el tamano util del heap despues de fijar un elemento al final.",
        "Restaura la propiedad de max-heap desde la raiz.",
        "Separador visual entre la funcion principal y las auxiliares.",
        "Define la funcion auxiliar para construir el max-heap inicial.",
        "Inicializa el tamano del heap con el tamano total del vector.",
        "Recorre los nodos internos de abajo hacia arriba para heapificar todo.",
        "Aplica heapify en cada nodo interno para garantizar la propiedad de max-heap.",
        "Separador visual antes de la rutina de ajuste local del heap.",
        "Define la funcion que corrige el heap en el nodo i para un heapSize actual.",
        "Calcula el indice del hijo izquierdo del nodo i.",
        "Calcula el indice del hijo derecho del nodo i.",
        "Asume inicialmente que el mayor esta en la raiz local i.",
        "Compara el hijo izquierdo con el mayor actual respetando heapSize.",
        "Actualiza el indice del mayor cuando gana el hijo izquierdo.",
        "Compara el hijo derecho con el mayor actual respetando heapSize.",
        "Actualiza el indice del mayor cuando gana el hijo derecho.",
        "Verifica si el mayor no esta en la raiz local y requiere ajuste.",
        "Intercambia la raiz local con el mayor hijo para restaurar el orden del heap.",
        "Continua recursivamente el ajuste en el subarbol afectado por el intercambio.",
      ],
      quick: [
        "Define la funcion recursiva principal de Quick Sort para el intervalo [p, r].",
        "Ejecuta la particion solo cuando el intervalo tiene mas de un elemento.",
        "Particiona el intervalo y obtiene la posicion final q del pivot.",
        "Ordena recursivamente la particion izquierda del pivot.",
        "Ordena recursivamente la particion derecha del pivot.",
        "Separador visual entre Quick Sort y su rutina de particion.",
        "Define la funcion de particion usada por Quick Sort.",
        "Selecciona el ultimo elemento como pivot de la particion actual.",
        "Inicializa i para delimitar la frontera de elementos menores o iguales al pivot.",
        "Recorre el intervalo de comparacion de p a r - 1.",
        "Evalua si el elemento actual debe ir al lado izquierdo del pivot.",
        "Avanza la frontera de elementos menores o iguales al pivot.",
        "Intercambia para mantener elementos <= pivot agrupados a la izquierda.",
        "Coloca el pivot entre los dos grupos al terminar el bucle.",
        "Retorna el indice final del pivot para dividir llamadas recursivas.",
      ],
      separator: "Separador visual entre bloques del pseudo-codigo.",
      fallbackStep: "Ejecuta el paso {step} de {algorithm}.",
    },
  },
};

export default esES;
