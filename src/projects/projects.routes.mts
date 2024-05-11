import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import service from './projects.service.mjs'

import controller from './projects.controller.mjs'

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

router
    .route('/count')
    .get(controller.count)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});

export default router