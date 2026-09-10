import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { KitModel } from '../models/Kit.js';
import { runPrepKitPipeline } from '../services/pipeline.js';
import { allocateSchedule } from '../services/scheduler.js';
import { generateQuestionsForRequirements } from '../services/generator.js';

const router = Router();

// POST /api/kits - Create kit & run async generation
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { jd_text, company_url, days } = req.body;
    const userId = req.user?.userId || 'anonymous';

    if (!jd_text || typeof jd_text !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Job description text (jd_text) is required.' } });
    }

    const numDays = days ? parseInt(days, 10) : 5;

    // Check for duplicate submission (same user + same company_url + same JD length)
    const existingKit = await KitModel.findOne({
      user_id: userId,
      'source.company_url': company_url,
      'source.jd_chars': jd_text.length
    });

    if (existingKit) {
      return res.json({ message: 'Kit already exists for this role.', kit: existingKit });
    }

    // Save initial draft kit
    const kitDoc = new KitModel({
      user_id: userId,
      status: 'generating',
      source: {
        company_url: company_url || '',
        jd_chars: jd_text.length,
        researched_at: new Date().toISOString()
      }
    });
    await kitDoc.save();

    // Trigger async pipeline execution
    runPrepKitPipeline({
      userId,
      jdText: jd_text,
      companyUrl: company_url || '',
      daysAvailable: numDays
    })
      .then(async (generatedKit) => {
        await KitModel.findByIdAndUpdate(kitDoc._id, {
          ...generatedKit,
          status: 'ready'
        });
      })
      .catch(async (err) => {
        console.error('Pipeline execution error:', err);
        await KitModel.findByIdAndUpdate(kitDoc._id, {
          status: 'failed',
          error_message: err.message || 'Pipeline failed during generation.'
        });
      });

    return res.status(202).json({
      message: 'Kit generation started.',
      kit_id: kitDoc._id,
      status: 'generating'
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/kits - Get all user kits
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const kits = await KitModel.find({ user_id: userId }).sort({ createdAt: -1 });
    return res.json({ kits });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/kits/:id - Get specific kit
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const kit = await KitModel.findOne({ _id: req.params.id, user_id: userId });
    if (!kit) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found or access denied.' } });
    }
    return res.json({ kit });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/kits/:id - Partial edit inline (questions, flashcards, brief)
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { questions, flashcards, company_brief, role } = req.body;

    const kit = await KitModel.findOne({ _id: req.params.id, user_id: userId });
    if (!kit) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found or access denied.' } });
    }

    if (questions) kit.questions = questions;
    if (flashcards) kit.flashcards = flashcards;
    if (company_brief) kit.company_brief = company_brief;
    if (role) kit.role = role;

    await kit.save();
    return res.json({ message: 'Kit updated successfully.', kit });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/kits/:id/regenerate/:section - Regenerate one section preserving pinned/edited items
router.post('/:id/regenerate/:section', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { section } = req.params; // 'company_brief' | 'schedule' | 'technical' | 'behavioural'

    const kit = await KitModel.findOne({ _id: req.params.id, user_id: userId });
    if (!kit) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found or access denied.' } });
    }

    if (section === 'schedule') {
      const newSchedule = allocateSchedule(kit.questions, kit.role.requirements, kit.schedule.days_available);
      kit.schedule = newSchedule;
    } else if (section === 'technical' || section === 'behavioural' || section === 'system-design') {
      // Keep pinned / edited items
      const pinnedItems = kit.questions.filter(q => q.category === section && (q.isPinned || q.isEdited));
      
      const categoryReqs = kit.role.requirements.filter(r => 
        section === 'technical' ? r.kind === 'technical' : r.kind === 'behavioural'
      );

      const regenerated = await generateQuestionsForRequirements(
        categoryReqs,
        section as any,
        kit.role.title,
        kit.company_brief.summary,
        kit.questions.length + 1
      );

      // Merge pinned + new regenerated
      const otherCategoryQuestions = kit.questions.filter(q => q.category !== section);
      kit.questions = [...otherCategoryQuestions, ...pinnedItems, ...regenerated.questions];
    }

    await kit.save();
    return res.json({ message: `Section '${section}' regenerated successfully.`, kit });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export const kitsRouter = router;
