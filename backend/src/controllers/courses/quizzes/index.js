import { Router } from 'express';
import { register as r0 } from './list.routes.js';
import { register as r1 } from './create.routes.js';
import { register as r2 } from './patch-delete.routes.js';
import { register as r3 } from './duplicate.routes.js';
import { register as r4 } from './csvExport.routes.js';
import { register as r5 } from './csvImport.routes.js';
import { register as r6 } from './reorder.routes.js';
import { register as r7 } from './questions.routes.js';
import { register as r8 } from './attempts.routes.js';
import { register as r9 } from './analytics.routes.js';
import { register as r10 } from './submit.routes.js';

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
