import { IRequirement, IQuestion, ICoverage } from '../models/Kit.js';

export function checkRequirementCoverage(
  requirements: IRequirement[],
  questions: IQuestion[]
): ICoverage & { uncoveredRequirements: IRequirement[] } {
  // Collect all requirement IDs referenced across generated questions
  const coveredReqIds = new Set<string>();
  
  questions.forEach(q => {
    q.requirement_ids.forEach(id => coveredReqIds.add(id));
  });

  const uncoveredReqIds: string[] = [];
  const uncoveredRequirements: IRequirement[] = [];

  requirements.forEach(req => {
    if (!coveredReqIds.has(req.id)) {
      uncoveredReqIds.push(req.id);
      uncoveredRequirements.push(req);
    }
  });

  return {
    uncovered_requirement_ids: uncoveredReqIds,
    passes: 1,
    uncoveredRequirements
  };
}
