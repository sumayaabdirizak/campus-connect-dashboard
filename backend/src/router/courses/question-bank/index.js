import { Router } from 'express';
import { register as registerList } from '../../../controllers/courses/question-bank/list.routes.js';
import { register as registerTopics } from '../../../controllers/courses/question-bank/topics.routes.js';
import { register as registerCreate } from '../../../controllers/courses/question-bank/create.routes.js';
import { register as registerBulkImport } from '../../../controllers/courses/question-bank/bulkImport.routes.js';
import { register as registerImportToQuiz } from '../../../controllers/courses/question-bank/importToQuiz.routes.js';
import { register as registerGenerate } from '../../../controllers/courses/question-bank/generate.routes.js';
import { register as registerPatch } from '../../../controllers/courses/question-bank/patch.routes.js';
import { register as registerDelete } from '../../../controllers/courses/question-bank/delete.routes.js';

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
