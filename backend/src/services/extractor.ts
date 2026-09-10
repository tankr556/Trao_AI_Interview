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
  const lines = jdText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const requirements: z.infer<typeof RequirementSchemaZod>[] = [];
  let reqCount = 1;

  let title = 'Software Engineer';
  if (lines.length > 0) {
    title = lines[0].substring(0, 50);
  }

  for (const line of lines) {
    if (line.length < 5) continue;
    const lower = line.toLowerCase();
    
    // Quick heuristic extraction
    if (
      lower.includes('experience') || 
      lower.includes('skill') || 
      lower.includes('proficient') || 
      lower.includes('knowledge') || 
      lower.includes('require') || 
      lower.includes('ability') || 
      lower.includes('degree') ||
      line.startsWith('-') ||
      line.startsWith('•')
    ) {
      const isNice = lower.includes('bonus') || lower.includes('nice') || lower.includes('preferred') || lower.includes('plus');
      const isBehavioural = lower.includes('team') || lower.includes('communication') || lower.includes('mentoring') || lower.includes('lead');
      const isDomain = lower.includes('finance') || lower.includes('healthcare') || lower.includes('e-commerce');

      requirements.push({
        id: `r${reqCount++}`,
        text: line.replace(/^[-•*]\s*/, ''),
        kind: isBehavioural ? 'behavioural' : isDomain ? 'domain' : 'technical',
        priority: isNice ? 'nice' : 'must'
      });
    }
  }

  // Handle thin JD case
  if (requirements.length === 0 && lines.length > 0) {
    requirements.push({
      id: 'r1',
      text: lines.join(' ').substring(0, 150),
      kind: 'technical',
      priority: 'must'
    });
  }

  return {
    title: title || 'Software Engineer',
    seniority: 'Mid-Senior',
    responsibilities: lines.slice(1, 4),
    requirements
  };
}
