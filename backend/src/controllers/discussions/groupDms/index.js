import { Router } from 'express';
import { register as r0 } from './route-00.js';
import { register as r1 } from './route-01.js';
import { register as r2 } from './route-02.js';
import { register as r3 } from './route-03.js';
import { register as r4 } from './route-04.js';
import { register as r5 } from './route-05.js';
import { register as r6 } from './route-06.js';
import { register as r7 } from './route-07.js';
import { register as r8 } from './route-08.js';
import { register as r9 } from './route-09.js';
import { register as r10 } from './route-10.js';

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
