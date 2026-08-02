import { Router } from 'express';
import { register as r0 } from '../../../controllers/courses/quizzes/list.routes.js';
import { register as r1 } from '../../../controllers/courses/quizzes/create.routes.js';
import { register as r2 } from '../../../controllers/courses/quizzes/patch-delete.routes.js';
import { register as r3 } from '../../../controllers/courses/quizzes/duplicate.routes.js';
import { register as r4 } from '../../../controllers/courses/quizzes/csvExport.routes.js';
import { register as r5 } from '../../../controllers/courses/quizzes/csvImport.routes.js';
import { register as r6 } from '../../../controllers/courses/quizzes/reorder.routes.js';
import { register as r7 } from '../../../controllers/courses/quizzes/questions.routes.js';
import { register as r8 } from '../../../controllers/courses/quizzes/attempts.routes.js';
import { register as r9 } from '../../../controllers/courses/quizzes/analytics.routes.js';
import { register as r10 } from '../../../controllers/courses/quizzes/submit.routes.js';

const router = Router();
r0(router);
r1(router);
r2(router);
r3(router);
r4(router);
r5(router);
r6(router);
r7(router);
r8(router);
r9(router);
r10(router);

export default router;
