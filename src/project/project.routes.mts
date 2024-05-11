import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import service from './project.service.mjs'

import controller from './project.controller.mjs'

const router: Router = express.Router()

router.use(async (req: Request, res: Response, next: NextFunction) => {
    service.hasAuthorizationHeader(req)
        .then (() => next())
        .catch(next)
})

router
    .route('/')
    .post(controller.create)

router
    .route('/:projectId')
    .get(controller.get)
    .post(controller.upload)
    .put(controller.update)
    .delete(controller.delete)

router
    .route('/:projectId/files')
    .get(controller.show)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});


export default router