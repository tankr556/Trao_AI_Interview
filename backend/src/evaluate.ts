import fs from 'fs';
import path from 'path';
import { runPrepKitPipeline } from '../src/services/pipeline.js';

interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

async function runBatchEvaluation() {
  const rawArgs = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === '--input' && rawArgs[i + 1]) {
      inputPath = rawArgs[i + 1];
    }
    if (rawArgs[i] === '--output' && rawArgs[i + 1]) {
      outputPath = rawArgs[i + 1];
    }
  }

  // Fallback argument index lookup if passed as positional arguments
  if (!inputPath && rawArgs[0]) inputPath = rawArgs[0];
  if (!outputPath && rawArgs[1]) outputPath = rawArgs[1];

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const absoluteInput = path.resolve(process.cwd(), inputPath);
  const absoluteOutput = path.resolve(process.cwd(), outputPath);

  if (!fs.existsSync(absoluteInput)) {
    console.error(`Input file not found at: ${absoluteInput}`);
    process.exit(1);
  }

  console.log(`[Batch Evaluate] Reading input cases from ${inputPath}...`);
  const rawData = fs.readFileSync(absoluteInput, 'utf-8');
  const parsedData = JSON.parse(rawData);
  const cases: BatchCase[] = Array.isArray(parsedData) ? parsedData : (parsedData.cases || []);

  const outputKits: any[] = [];

  for (const item of cases) {
    console.log(`[Batch Evaluate] Processing case: ${item.id}...`);
    try {
      const generatedKit = await runPrepKitPipeline({
        userId: 'batch-eval-user',
        jdText: item.jd,
        companyUrl: item.company_url,
        daysAvailable: item.days
      });

      outputKits.push({
        id: item.id,
        status: 'ok',
        kit: generatedKit,
        error: null
      });
    } catch (err: any) {
      console.warn(`[Batch Evaluate] Case ${item.id} failed: ${err.message}`);
      outputKits.push({
        id: item.id,
        status: 'failed',
        kit: null,
        error: {
          code: 'COMPANY_UNREACHABLE',
          message: err.message || 'Pipeline evaluation failed for this case.'
        }
      });
    }
  }

  const resultJSON = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: outputKits
  };

  fs.writeFileSync(absoluteOutput, JSON.stringify(resultJSON, null, 2));
  console.log(`[Batch Evaluate] Completed! Written ${outputKits.length} kits to ${outputPath}`);
}

runBatchEvaluation().catch(err => {
  console.error('[Batch Evaluate] Fatal error:', err);
  process.exit(1);
});
