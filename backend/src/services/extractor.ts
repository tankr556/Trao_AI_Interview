import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

export const RequirementSchemaZod = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice'])
});

export const ExtractedRoleZod = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchemaZod)
});

export type ExtractedRole = z.infer<typeof ExtractedRoleZod>;

export async function extractRequirementsFromJD(jdText: string): Promise<ExtractedRole> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'dummy_key_for_now') {
    // Fallback deterministic extractor when API key is missing or dummy
    return fallbackExtraction(jdText);
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert HR and technical recruiter. Parse the following Job Description (JD) text and extract structured information.

CRITICAL INSTRUCTIONS:
1. ONLY extract what is explicitly stated in the text. Do NOT infer, invent, or assume details not present.
2. If a requirement mentions "required", "must have", "essential", mark priority as "must".
3. If it mentions "nice to have", "bonus", "plus", "preferred", mark priority as "nice". If ambiguous, default to "must".
4. Assign stable IDs to requirements like "r1", "r2", "r3"...
5. Categorize each requirement into kind: "technical", "behavioural", or "domain".
6. Return strictly valid JSON adhering to this JSON schema:
{
  "title": "Role title or Senior Backend Engineer",
  "seniority": "Senior / Mid / Lead / Junior",
  "responsibilities": ["list of responsibilities"],
  "requirements": [
    {
      "id": "r1",
      "text": "5+ years of React experience",
      "kind": "technical",
      "priority": "must"
    }
  ]
}

JOB DESCRIPTION TEXT:
<page_content>
${jdText}
</page_content>
`;

  let attempts = 0;
  while (attempts < 2) {
    try {
      attempts++;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '';
      const parsedJSON = JSON.parse(responseText);
      const validated = ExtractedRoleZod.parse(parsedJSON);
      return validated;
    } catch (err) {
      if (attempts >= 2) {
        console.warn('LLM Requirement extraction failed or malformed JSON. Using robust fallback extraction.');
        return fallbackExtraction(jdText);
      }
    }
  }

  return fallbackExtraction(jdText);
}

function fallbackExtraction(jdText: string): ExtractedRole {
  const requirements: z.infer<typeof RequirementSchemaZod>[] = [];
  let reqCount = 1;

  const techKeywords = [
    { name: 'React.js & Frontend State Management', pattern: /react|frontend|next\.js|vue|angular|javascript|typescript/i, kind: 'technical' },
    { name: 'Node.js & Express Async Architecture', pattern: /node|express|nest|backend|server/i, kind: 'technical' },
    { name: 'MongoDB & Database Optimization', pattern: /mongo|nosql|database|sql|postgres|mysql/i, kind: 'technical' },
    { name: 'RESTful API Security & Microservices', pattern: /rest|api|graphql|microservices/i, kind: 'technical' },
    { name: 'AWS Infrastructure & Cloud Deployment', pattern: /aws|cloud|docker|kubernetes|devops|s3|ec2/i, kind: 'technical' },
    { name: 'Agile Team Collaboration & Problem Solving', pattern: /team|communication|agile|scrum|leadership/i, kind: 'behavioural' }
  ];

  techKeywords.forEach(tk => {
    if (tk.pattern.test(jdText)) {
      requirements.push({
        id: `r${reqCount++}`,
        text: tk.name,
        kind: tk.kind as any,
        priority: 'must'
      });
    }
  });

  // If no tech keywords matched, fallback to line parsing
  if (requirements.length === 0) {
    const lines = jdText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lines.forEach((line) => {
      requirements.push({
        id: `r${reqCount++}`,
        text: line.substring(0, 100),
        kind: 'technical',
        priority: 'must'
      });
    });
  }

  // Determine Title
  let title = 'Full Stack Developer';
  if (/full\s*stack/i.test(jdText)) title = 'Full Stack Developer';
  else if (/frontend/i.test(jdText)) title = 'Frontend Engineer';
  else if (/backend/i.test(jdText)) title = 'Backend Engineer';

  return {
    title,
    seniority: /3\+\s*years|senior/i.test(jdText) ? 'Senior (3+ Years)' : 'Mid-Level',
    responsibilities: [
      'Design, build, and maintain scalable web applications and REST APIs.',
      'Collaborate with cross-functional teams to deliver high quality features.'
    ],
    requirements
  };
}
