/**
 * AI/ML Engineer Intent Patterns
 *
 * These patterns detect prompts related to machine learning, AI models,
 * and LLM development tasks.
 * Priority: 5th (after explicit, recommended, tooling, platform patterns).
 *
 * Confidence Levels:
 * - 0.95: ML/AI frameworks (PyTorch, TensorFlow, HuggingFace, LangChain)
 * - 0.90: ML concepts (training, fine-tuning, embeddings, RAG)
 * - 0.85: Generic AI/ML keywords
 *
 * @example
 * "PyTorch 모델 학습시켜줘" → ai-ml-engineer (0.95)
 * "LangChain으로 RAG 구현" → ai-ml-engineer (0.95)
 * "임베딩 생성해줘" → ai-ml-engineer (0.90)
 */

import type { IntentPattern } from './intent-patterns.types';

export const AI_ML_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // ML Frameworks (0.95)
  {
    pattern: /pytorch|tensorflow|keras|jax/i,
    confidence: 0.95,
    description: 'ML Framework',
  },
  {
    pattern: /hugging\s*face|transformers|diffusers/i,
    confidence: 0.95,
    description: 'HuggingFace',
  },
  {
    pattern: /langchain|llama.?index|llamaindex/i,
    confidence: 0.95,
    description: 'LLM Framework',
  },
  {
    pattern: /openai\s*(api|sdk)|anthropic\s*(api|sdk)/i,
    confidence: 0.95,
    description: 'LLM API',
  },
  // ML Concepts (0.90)
  {
    pattern: /machine\s*learning|ML\s*(모델|model|파이프라인|pipeline)/i,
    confidence: 0.9,
    description: 'Machine Learning',
  },
  {
    pattern: /딥\s*러닝|deep\s*learning|신경망|neural\s*network/i,
    confidence: 0.9,
    description: 'Deep Learning',
  },
  {
    pattern: /모델\s*학습|train.*model|fine.?tun|파인\s*튜닝/i,
    confidence: 0.9,
    description: 'Model Training',
  },
  {
    pattern: /RAG|retrieval.*augment|검색\s*증강/i,
    confidence: 0.9,
    description: 'RAG',
  },
  {
    pattern: /프롬프트\s*엔지니어링|prompt\s*engineer/i,
    confidence: 0.9,
    description: 'Prompt Engineering',
  },
  {
    pattern: /LLM\s*(개발|develop|구현|implement|통합|integrat)/i,
    confidence: 0.9,
    description: 'LLM Development',
  },
  // Generic AI/ML patterns (0.85)
  {
    pattern: /임베딩|embedding|벡터\s*(DB|database|저장)/i,
    confidence: 0.85,
    description: 'Embeddings',
  },
  {
    pattern: /추론|inference|predict|예측\s*모델/i,
    confidence: 0.85,
    description: 'Inference',
  },
  {
    pattern: /AI\s*(모델|model|에이전트|agent|챗봇|chatbot)/i,
    confidence: 0.85,
    description: 'AI Model/Agent',
  },
  // Korean patterns (0.85)
  {
    pattern: /자연어\s*처리|NLP|텍스트\s*분석/i,
    confidence: 0.85,
    description: 'NLP',
  },
  {
    pattern: /컴퓨터\s*비전|computer\s*vision|이미지\s*인식/i,
    confidence: 0.85,
    description: 'Computer Vision',
  },
];
