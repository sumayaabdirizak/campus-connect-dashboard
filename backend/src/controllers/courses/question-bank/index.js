import { Router } from 'express';
import { register as registerList } from './list.routes.js';
import { register as registerTopics } from './topics.routes.js';
import { register as registerCreate } from './create.routes.js';
import { register as registerBulkImport } from './bulkImport.routes.js';
import { register as registerImportToQuiz } from './importToQuiz.routes.js';
import { register as registerGenerate } from './generate.routes.js';
import { register as registerPatch } from './patch.routes.js';
import { register as registerDelete } from './delete.routes.js';

const router = Router();
registerList(router);
registerTopics(router);
registerCreate(router);
registerBulkImport(router);
registerImportToQuiz(router);
registerGenerate(router);
registerPatch(router);
registerDelete(router);

export default router;
