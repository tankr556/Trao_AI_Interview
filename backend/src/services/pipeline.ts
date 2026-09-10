import { extractRequirementsFromJD } from './extractor.js';
import { crawlCompanySite } from './crawler.js';
import { generateQuestionsForRequirements } from './generator.js';
import { checkRequirementCoverage } from './coverage.js';
import { allocateSchedule } from './scheduler.js';
import { IKit, IQuestion, IFlashcard } from '../models/Kit.js';

export interface PipelineInput {
  userId: string;
  jdText: string;
  companyUrl: string;
  daysAvailable: number;
}

export async function runPrepKitPipeline(input: PipelineInput): Promise<IKit> {
  const { userId, jdText, companyUrl, daysAvailable } = input;

  // Step 1: Research - Extract requirements
  const extractedRole = await extractRequirementsFromJD(jdText);

  // Step 2: Research - Crawl company site
  const crawlResult = await crawlCompanySite(companyUrl);

  // Step 3: Generation - Separate calls by category
  const technicalReqs = extractedRole.requirements.filter(r => r.kind === 'technical');
  const behaviouralReqs = extractedRole.requirements.filter(r => r.kind === 'behavioural');
  const domainReqs = extractedRole.requirements.filter(r => r.kind === 'domain');

  let allQuestions: IQuestion[] = [];
  let allFlashcards: IFlashcard[] = [];
  let questionCounter = 1;

  // Technical Call
  if (technicalReqs.length > 0) {
    const techRes = await generateQuestionsForRequirements(
      technicalReqs,
      'technical',
      extractedRole.title,
      crawlResult.summary,
      questionCounter
    );
    allQuestions.push(...techRes.questions);
    allFlashcards.push(...techRes.flashcards);
    questionCounter += techRes.questions.length;
  }

  // Behavioural Call
  if (behaviouralReqs.length > 0) {
    const behRes = await generateQuestionsForRequirements(
      behaviouralReqs,
      'behavioural',
      extractedRole.title,
      crawlResult.summary,
      questionCounter
    );
    allQuestions.push(...behRes.questions);
    allFlashcards.push(...behRes.flashcards);
    questionCounter += behRes.questions.length;
  }

  // System Design / Domain Call
  if (domainReqs.length > 0) {
    const sysRes = await generateQuestionsForRequirements(
      domainReqs,
      'system-design',
      extractedRole.title,
      crawlResult.summary,
      questionCounter
    );
    allQuestions.push(...sysRes.questions);
    allFlashcards.push(...sysRes.flashcards);
    questionCounter += sysRes.questions.length;
  }

  // Step 4: Deterministic Coverage Check & Second Pass
  let coverageResult = checkRequirementCoverage(extractedRole.requirements, allQuestions);
  let passes = 1;

  if (coverageResult.uncoveredRequirements.length > 0 && passes < 3) {
    passes++;
    const gapRes = await generateQuestionsForRequirements(
      coverageResult.uncoveredRequirements,
      'technical',
      extractedRole.title,
      crawlResult.summary,
      questionCounter
    );
    allQuestions.push(...gapRes.questions);
    allFlashcards.push(...gapRes.flashcards);
    
    // Re-check coverage after gap pass
    coverageResult = checkRequirementCoverage(extractedRole.requirements, allQuestions);
  }

  // Step 5: Deterministic Schedule Allocation
  const scheduleResult = allocateSchedule(allQuestions, extractedRole.requirements, daysAvailable);

  // Assemble full Appendix A compliant kit object
  const kit: IKit = {
    user_id: userId,
    status: 'ready',
    source: {
      company: crawlResult.summary.substring(0, 40) || 'Company',
      company_url: companyUrl,
      role: extractedRole.title,
      location: 'Remote / On-site',
      jd_chars: jdText.length,
      researched_at: new Date().toISOString(),
      pages_used: crawlResult.pages_used
    },
    company_brief: {
      summary: crawlResult.summary,
      what_they_do: crawlResult.what_they_do,
      sources: crawlResult.sources
    },
    role: {
      title: extractedRole.title,
      seniority: extractedRole.seniority,
      responsibilities: extractedRole.responsibilities,
      requirements: extractedRole.requirements
    },
    questions: allQuestions,
    flashcards: allFlashcards,
    schedule: scheduleResult,
    coverage: {
      uncovered_requirement_ids: coverageResult.uncovered_requirement_ids,
      passes
    }
  };

  return kit;
}
