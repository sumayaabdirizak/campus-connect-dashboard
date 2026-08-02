import { Router } from 'express';
import { register as registerAvailable } from '../../../controllers/courses/quiz-taking/available.routes.js';
import { register as registerStart } from '../../../controllers/courses/quiz-taking/start.routes.js';
import { register as registerSaveAnswers } from '../../../controllers/courses/quiz-taking/saveAnswers.routes.js';
import { register as registerGetAttempt } from '../../../controllers/courses/quiz-taking/getAttempt.routes.js';
import { register as registerViolation } from '../../../controllers/courses/quiz-taking/violation.routes.js';
import { register as registerGrade } from '../../../controllers/courses/quiz-taking/grade.routes.js';

const router = Router();
registerAvailable(router);
registerStart(router);
registerSaveAnswers(router);
registerGetAttempt(router);
registerViolation(router);
registerGrade(router);

export default router;
