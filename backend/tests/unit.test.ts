import { describe, it, expect } from 'vitest';
import { allocateSchedule } from '../src/services/scheduler.js';
import { checkRequirementCoverage } from '../src/services/coverage.js';
import { IRequirement, IQuestion } from '../src/models/Kit.js';

describe('Deterministic Schedule Allocator (Part 9)', () => {
  const mockRequirements: IRequirement[] = [
    { id: 'r1', text: '5+ years Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'MongoDB schema design', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Mentoring junior devs', kind: 'behavioural', priority: 'nice' }
  ];

  const mockQuestions: IQuestion[] = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Node Event Loop', answer_outline: 'Explain loop phases', difficulty: 3 },
    { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'Indexing strategies', answer_outline: 'B-Tree & Compound', difficulty: 2 },
    { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Conflict resolution', answer_outline: 'STAR method', difficulty: 1 }
  ];

  it('allocates material across exactly requested number of days (5 days)', () => {
    const res = allocateSchedule(mockQuestions, mockRequirements, 5);
    expect(res.days_available).toBe(5);
    expect(res.days.length).toBe(5);
    res.days.forEach(day => {
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThan(0);
    });
  });

  it('handles edge case days = 1 by compressing into day 1 with integer minutes', () => {
    const res = allocateSchedule(mockQuestions, mockRequirements, 1);
    expect(res.days_available).toBe(1);
    expect(res.days.length).toBe(1);
    expect(res.days[0].question_ids.length).toBe(3);
    expect(Number.isInteger(res.days[0].minutes)).toBe(true);
  });

  it('handles edge case days = 60 by spreading across 60 days', () => {
    const res = allocateSchedule(mockQuestions, mockRequirements, 60);
    expect(res.days_available).toBe(60);
    expect(res.days.length).toBe(60);
  });
});

describe('Deterministic Coverage Check (Part 8)', () => {
  const mockRequirements: IRequirement[] = [
    { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Docker', kind: 'technical', priority: 'must' }
  ];

  it('detects uncovered requirement gaps accurately', () => {
    const incompleteQuestions: IQuestion[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'React Hooks', answer_outline: 'useMemo', difficulty: 2 }
    ];

    const cov = checkRequirementCoverage(mockRequirements, incompleteQuestions);
    expect(cov.uncovered_requirement_ids).toEqual(['r2']);
    expect(cov.uncoveredRequirements.length).toBe(1);
    expect(cov.uncoveredRequirements[0].id).toBe('r2');
  });

  it('reports empty uncovered list when all requirements are mapped', () => {
    const completeQuestions: IQuestion[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'React Hooks', answer_outline: 'useMemo', difficulty: 2 },
      { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'Docker compose', answer_outline: 'Volumes', difficulty: 2 }
    ];

    const cov = checkRequirementCoverage(mockRequirements, completeQuestions);
    expect(cov.uncovered_requirement_ids.length).toBe(0);
  });
});
