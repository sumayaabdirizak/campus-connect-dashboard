import { Router } from 'express';
import { register as registerAvailable } from './available.routes.js';
import { register as registerStart } from './start.routes.js';
import { register as registerSaveAnswers } from './saveAnswers.routes.js';
import { register as registerGetAttempt } from './getAttempt.routes.js';
import { register as registerViolation } from './violation.routes.js';
import { register as registerGrade } from './grade.routes.js';

const router = Router();
registerAvailable(router);
registerStart(router);
registerSaveAnswers(router);
registerGetAttempt(router);
registerViolation(router);
registerGrade(router);

export default router;
