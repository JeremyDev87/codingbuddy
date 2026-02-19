/**
 * Data Scientist Intent Patterns
 *
 * These patterns detect prompts related to data analysis, visualization,
 * statistical modeling, and ML modeling tasks.
 * Priority: 8th (after data-engineer; distinct from ETL/schema work).
 *
 * Confidence Levels:
 * - 0.95: Highly specific data science libraries and concepts (pandas, EDA, jupyter)
 * - 0.90: Core data science tasks (data visualization, statistics, regression model)
 * - 0.85: Broader terms scoped to data science context
 *
 * Distinction from data-engineer:
 * - data-engineer: ETL, schema design, migrations, SQL, databases
 * - data-scientist: EDA, statistical analysis, ML modeling, visualization, notebooks
 *
 * Distinction from ai-ml-engineer:
 * - ai-ml-engineer: LLM integration, RAG, prompt engineering, deep learning frameworks (PyTorch, TensorFlow)
 * - data-scientist: Classical ML (scikit-learn), EDA, statistical analysis, data visualization
 *
 * @example
 * "Pandas로 데이터 분석해줘" → data-scientist (0.95)
 * "matplotlib 시각화 코드 작성" → data-scientist (0.95)
 * "EDA 스크립트 구현" → data-scientist (0.95)
 */

import type { IntentPattern } from './intent-patterns.types';

export const DATA_SCIENCE_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Data science library patterns (0.95) - highly specific
  {
    pattern: /pandas|numpy|matplotlib|seaborn|plotly/i,
    confidence: 0.95,
    description: 'Data science libraries (pandas/numpy/matplotlib/seaborn/plotly)',
  },
  {
    pattern: /jupyter|\.ipynb|주피터/i,
    confidence: 0.95,
    description: 'Jupyter notebook (incl. Korean: 주피터)',
  },
  {
    pattern: /scikit.?learn|sklearn/i,
    confidence: 0.95,
    description: 'scikit-learn ML library',
  },
  // EDA / analysis patterns (0.95)
  {
    pattern: /탐색적\s*분석|EDA|exploratory\s*data\s*analysis/i,
    confidence: 0.95,
    description: 'Exploratory data analysis (EDA)',
  },
  {
    pattern: /데이터\s*분석\s*(스크립트|코드|구현|작성)|data\s*analysis\s*(script|code|implement)/i,
    confidence: 0.95,
    description: 'Data analysis script/code',
  },
  // Visualization patterns (0.90) - scoped to avoid stealing frontend chart work
  {
    pattern: /데이터\s*시각화|data\s*visualization/i,
    confidence: 0.9,
    description: 'Data visualization',
  },
  // Statistical modeling (0.90)
  {
    pattern: /통계\s*(분석|모델|검정)|statistical\s*(analysis|model|test)/i,
    confidence: 0.9,
    description: 'Statistical analysis/modeling',
  },
  {
    pattern: /상관관계\s*분석|correlation\s*analysis/i,
    confidence: 0.9,
    description: 'Correlation analysis',
  },
  // ML modeling (0.90) - scoped with _analysis/_model to avoid overlap with ai-ml-engineer
  {
    pattern: /회귀\s*(분석|모델)|regression\s*(analysis|model)/i,
    confidence: 0.9,
    description: 'Regression analysis/modeling',
  },
  {
    pattern: /분류\s*(모델|알고리즘)|classification\s*(model|algorithm)/i,
    confidence: 0.9,
    description: 'Classification modeling',
  },
  {
    pattern: /피처\s*엔지니어링|feature\s*engineering/i,
    confidence: 0.9,
    description: 'Feature engineering',
  },
  // Scientific computing libraries (0.90) - agent JSON references scipy/statsmodels
  {
    pattern: /scipy|statsmodels/i,
    confidence: 0.9,
    description: 'Scientific computing libraries (scipy/statsmodels)',
  },
  // Standalone data analysis (0.85) - lower confidence to avoid false positives
  {
    pattern: /데이터\s*분석/i,
    confidence: 0.85,
    description: 'Data analysis (Korean, standalone)',
  },
];
