import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import controller from './neural-data.controller.mjs'

const router: Router = express.Router()

router
  .route('/:projectId')
  .get(controller.get)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
  res.status(err.status || 500)
  .send(err);
});

export default router