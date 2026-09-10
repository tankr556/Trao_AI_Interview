import mongoose from 'mongoose';

export interface IRequirement {
  id: string;
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}

export interface IQuestion {
  id: string;
  requirement_ids: string[];
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit';
  prompt: string;
  answer_outline: string;
  difficulty: number; // 1 - 3
  isEdited?: boolean;
  isPinned?: boolean;
}

export interface IFlashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  confidence?: number; // 1-5 or 0 for unrated
  isEdited?: boolean;
  isPinned?: boolean;
}

export interface IScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number; // Integer
}

export interface ICoverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface IKit {
  _id?: string;
  user_id: string;
  status: 'draft' | 'generating' | 'ready' | 'failed';
  error_message?: string;
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
    isEdited?: boolean;
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: IRequirement[];
  };
  questions: IQuestion[];
  flashcards: IFlashcard[];
  schedule: {
    days_available: number;
    days: IScheduleDay[];
  };
  coverage: ICoverage;
  createdAt?: Date;
  updatedAt?: Date;
}

const RequirementSchema = new mongoose.Schema<IRequirement>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
  priority: { type: String, enum: ['must', 'nice'], required: true }
}, { _id: false });

const QuestionSchema = new mongoose.Schema<IQuestion>({
  id: { type: String, required: true },
  requirement_ids: [{ type: String, required: true }],
  category: { type: String, enum: ['technical', 'behavioural', 'system-design', 'company-fit'], required: true },
  prompt: { type: String, required: true },
  answer_outline: { type: String, required: true },
  difficulty: { type: Number, required: true, min: 1, max: 3 },
  isEdited: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false }
}, { _id: false });

const FlashcardSchema = new mongoose.Schema<IFlashcard>({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  requirement_ids: [{ type: String, required: true }],
  confidence: { type: Number, default: 0, min: 0, max: 5 },
  isEdited: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false }
}, { _id: false });

const ScheduleDaySchema = new mongoose.Schema<IScheduleDay>({
  day: { type: Number, required: true },
  focus: { type: String, required: true },
  question_ids: [{ type: String, required: true }],
  minutes: { 
    type: Number, 
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer duration'
    }
  }
}, { _id: false });

const KitSchema = new mongoose.Schema<IKit>({
  user_id: { type: String, required: true, index: true },
  status: { type: String, enum: ['draft', 'generating', 'ready', 'failed'], default: 'generating' },
  error_message: { type: String },
  source: {
    company: { type: String, default: '' },
    company_url: { type: String, default: '' },
    role: { type: String, default: '' },
    location: { type: String, default: '' },
    jd_chars: { type: Number, default: 0 },
    researched_at: { type: String, default: '' },
    pages_used: [{ type: String }]
  },
  company_brief: {
    summary: { type: String, default: '' },
    what_they_do: { type: String, default: '' },
    sources: [{ type: String }],
    isEdited: { type: Boolean, default: false }
  },
  role: {
    title: { type: String, default: '' },
    seniority: { type: String, default: '' },
    responsibilities: [{ type: String }],
    requirements: [RequirementSchema]
  },
  questions: [QuestionSchema],
  flashcards: [FlashcardSchema],
  schedule: {
    days_available: { type: Number, default: 5 },
    days: [ScheduleDaySchema]
  },
  coverage: {
    uncovered_requirement_ids: [{ type: String }],
    passes: { type: Number, default: 1 }
  }
}, { timestamps: true });

export const KitModel = mongoose.model<IKit>('Kit', KitSchema);
