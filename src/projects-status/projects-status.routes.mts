import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import controller from './projects-status.controller.mjs'

import service from './projects-status.service.mjs'

const router: Router = express.Router()

router.use(async (req: Request, res: Response, next: NextFunction) => {
    service.hasAuthorizationHeader(req)
        .then (() => next())
        .catch(next)
})

router
    .route('/')
    .get(controller.get)
    .post(controller.create)
    .put(controller.update)
    .delete(controller.delete)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});

export default router