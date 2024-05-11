import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import controller from './download.controller.mjs'

import service from './download.service.mjs'

const router: Router = express.Router()

router.use(async (req: Request, res: Response, next: NextFunction) => {
    service.hasAuthorizationHeader(req)
        .then (() => next())
        .catch(next)
})

router
    .route('/project/:projectId')
    .get(controller.download)
    .delete(controller.delete)
    .put(controller.download)

router
    .route('/project-avatars')
    .get(controller.downloadProjectAvatars)
    .delete(controller.delete)
    .put(controller.download)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});

export default router