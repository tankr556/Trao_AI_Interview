import { IQuestion, IRequirement, IScheduleDay } from '../models/Kit.js';

export function allocateSchedule(
  questions: IQuestion[],
  requirements: IRequirement[],
  daysAvailable: number
): { days_available: number; days: IScheduleDay[] } {
  // Ensure daysAvailable is an integer >= 1
  const numDays = Math.max(1, Math.floor(daysAvailable));

  // Map requirements for quick priority lookup
  const reqPriorityMap = new Map<string, 'must' | 'nice'>();
  requirements.forEach(r => reqPriorityMap.set(r.id, r.priority));

  // Sort questions: higher priority requirements and higher difficulty questions first
  const sortedQuestions = [...questions].sort((a, b) => {
    const aHasMust = a.requirement_ids.some(id => reqPriorityMap.get(id) === 'must');
    const bHasMust = b.requirement_ids.some(id => reqPriorityMap.get(id) === 'must');

    if (aHasMust !== bHasMust) {
      return aHasMust ? -1 : 1;
    }
    return b.difficulty - a.difficulty; // Higher difficulty first
  });

  const days: IScheduleDay[] = [];
  
  // Initialize schedule days
  for (let i = 1; i <= numDays; i++) {
    days.push({
      day: i,
      focus: i === numDays && numDays > 1 ? 'Final Review & Mock Practice' : `Core Topics Day ${i}`,
      question_ids: [],
      minutes: 0
    });
  }

  // Distribute questions across available days
  if (numDays === 1) {
    // Edge case: 1 day -> All questions compressed into Day 1 with capped realistic time
    days[0].question_ids = sortedQuestions.map(q => q.id);
    days[0].focus = 'Intensive 1-Day Prep';
    days[0].minutes = Math.min(180, Math.max(45, sortedQuestions.length * 20));
  } else {
    // Normal / Multi-day distribution: round robin with front-loading
    sortedQuestions.forEach((q, idx) => {
      const targetDayIndex = idx % Math.max(1, numDays - 1); // Save last day for review
      days[targetDayIndex].question_ids.push(q.id);
    });

    // Calculate integer minutes for each day
    days.forEach((day, idx) => {
      if (day.question_ids.length === 0) {
        day.minutes = 30; // Default buffer review day
        day.focus = 'Revision & Soft Skills Preparation';
      } else {
        // Integer minutes per question
        day.minutes = Math.max(30, day.question_ids.length * 25);
        if (idx === 0) {
          day.focus = 'Must-Have Core Technical Requirements';
        } else {
          day.focus = `Topic Deep-Dive & System Architecture Part ${idx}`;
        }
      }
    });
  }

  return {
    days_available: numDays,
    days
  };
}
