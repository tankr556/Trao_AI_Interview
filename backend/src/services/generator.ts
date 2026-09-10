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

    let promptText = `Explain your practical experience with: ${req.text}`;
    let outline = `Candidate should cover practical usage, challenges faced, and trade-offs regarding ${req.text}.`;

    if (category === 'behavioural') {
      promptText = `Tell me about a time you had to handle: ${req.text}. How did you navigate it?`;
      outline = `Candidate should follow the STAR method (Situation, Task, Action, Result) focusing on ${req.text}.`;
    } else if (category === 'system-design') {
      promptText = `How would you design a scalable system leveraging or addressing: ${req.text}?`;
      outline = `Candidate should outline architecture, data flow, bottlenecks, and redundancy for ${req.text}.`;
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
      front: `[${category.toUpperCase()}] Key concept for: ${req.text}`,
      back: outline,
      requirement_ids: [req.id],
      confidence: 0
    });
  });

  return { questions, flashcards };
}
