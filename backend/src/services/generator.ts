import { IRequirement, IQuestion, IFlashcard } from '../models/Kit.js';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const GeneratedQuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().min(1).max(3)
});

const GeneratedQuestionsArraySchema = z.array(GeneratedQuestionSchema);

export async function generateQuestionsForRequirements(
  requirements: IRequirement[],
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit',
  roleTitle: string,
  hiringContext: string,
  startIdCount: number = 1
): Promise<{ questions: IQuestion[]; flashcards: IFlashcard[] }> {
  if (requirements.length === 0) {
    return { questions: [], flashcards: [] };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'dummy_key_for_now') {
    return fallbackQuestionGeneration(requirements, category, startIdCount);
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert technical interviewer preparing questions for a candidate applying for the position of "${roleTitle}".

Target Question Category: "${category}"
Hiring & Company Context: "${hiringContext}"

Target Requirements to test:
${JSON.stringify(requirements, null, 2)}

CRITICAL INSTRUCTIONS:
1. Generate 1-2 targeted, practical interview questions specifically for the "${category}" category.
2. For each question, map it to the relevant requirement IDs it tests using "requirement_ids": ["r1", ...].
3. Provide a clear, structured answer outline for what a top-tier candidate's answer should contain.
4. Difficulty must be an integer between 1 and 3 (1=Beginner/Basic, 2=Intermediate/Applied, 3=Advanced/Architectural).
5. Assign stable IDs starting from "q${startIdCount}", "q${startIdCount + 1}"...
6. Return JSON strictly in this format:
[
  {
    "id": "q1",
    "requirement_ids": ["r1"],
    "category": "${category}",
    "prompt": "Detailed question prompt here...",
    "answer_outline": "Key points to look for in candidate response...",
    "difficulty": 2
  }
]
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    const validated = GeneratedQuestionsArraySchema.parse(parsed);

    // Create corresponding flashcards
    const flashcards: IFlashcard[] = validated.map((q, idx) => ({
      id: `f${startIdCount + idx}`,
      front: `[${category.toUpperCase()}] ${q.prompt}`,
      back: q.answer_outline,
      requirement_ids: q.requirement_ids,
      confidence: 0
    }));

    return { questions: validated, flashcards };
  } catch (err) {
    console.warn(`LLM Question generation failed for category ${category}. Using fallback.`);
    return fallbackQuestionGeneration(requirements, category, startIdCount);
  }
}

function fallbackQuestionGeneration(
  requirements: IRequirement[],
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit',
  startIdCount: number
): { questions: IQuestion[]; flashcards: IFlashcard[] } {
  const questions: IQuestion[] = [];
  const flashcards: IFlashcard[] = [];

  requirements.forEach((req, idx) => {
    const qId = `q${startIdCount + idx}`;
    const fId = `f${startIdCount + idx}`;
    const textLower = req.text.toLowerCase();

    let promptText = `How do you structure and optimize performance when working with ${req.text}?`;
    let outline = `Candidate should cover architectural principles, common pitfalls, performance optimizations, and hands-on experience with ${req.text}.`;

    if (textLower.includes('react')) {
      promptText = `Explain how React's Virtual DOM diffing algorithm works, and how custom Hooks along with useMemo/useCallback help prevent unnecessary re-renders in large applications.`;
      outline = `1. Virtual DOM reconciliation process & key props importance.\n2. Using useMemo & useCallback to memoize expensive computations/callbacks.\n3. Custom Hook pattern for encapsulating reusable stateful logic.`;
    } else if (textLower.includes('node')) {
      promptText = `How does Node.js handle asynchronous non-blocking I/O operations under the hood using the Event Loop and Libuv thread pool?`;
      outline = `1. Explanation of Event Loop phases (Timers, Poll, Check, Close).\n2. Role of Libuv thread pool for disk I/O and cryptographic operations.\n3. Best practices to avoid blocking the main thread.`;
    } else if (textLower.includes('mongo') || textLower.includes('database')) {
      promptText = `Compare MongoDB Indexing strategies (Single field, Compound, Text indexes). How do you debug slow queries using explain()?`;
      outline = `1. Creating compound indexes matching Equality-Sort-Range (ESR) rule.\n2. Reading executionStats from db.collection.explain('executionStats').\n3. Memory management, indexing overhead, and covered queries.`;
    } else if (textLower.includes('rest') || textLower.includes('api')) {
      promptText = `How do you design a secure, versioned RESTful API with proper JWT authentication, rate limiting, and standardized error handling?`;
      outline = `1. Stateless JWT authentication flow & Refresh tokens stored in HttpOnly cookies.\n2. Middleware rate limiting to prevent abuse.\n3. Standardized error response JSON format (status, error_code, message).`;
    } else if (textLower.includes('aws') || textLower.includes('cloud')) {
      promptText = `Walk through your process for deploying a Node.js/React application on AWS (e.g. EC2 / ECS / S3 + CloudFront). How do you manage secrets?`;
      outline = `1. Host React static bundle on S3 + CloudFront CDN for low latency.\n2. Node.js backend container/EC2 behind Application Load Balancer (ALB).\n3. Storing secrets securely in AWS Secrets Manager or Environment Variables.`;
    } else if (category === 'behavioural' || textLower.includes('agile') || textLower.includes('collaboration')) {
      promptText = `Describe a challenging situation where project requirements changed rapidly or a critical bug occurred in production. How did you handle it?`;
      outline = `1. Situation & Context description.\n2. Actions taken using STAR method (Communication, Root cause analysis, Escalation).\n3. Clear measurable result and lessons learned.`;
    }

    questions.push({
      id: qId,
      requirement_ids: [req.id],
      category,
      prompt: promptText,
      answer_outline: outline,
      difficulty: req.priority === 'must' ? 2 : 1
    });

    flashcards.push({
      id: fId,
      front: `[${category.toUpperCase()}] ${req.text}: ${promptText}`,
      back: outline,
      requirement_ids: [req.id],
      confidence: 0
    });
  });

  return { questions, flashcards };
}
