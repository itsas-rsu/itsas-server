import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import signInService from './sign-in.service.mjs'

import singInController from './sign-in.controller.mjs'

const router: Router = express.Router()

router.use(async (req: Request, res: Response, next: NextFunction) => {
    signInService.checkMethod(req)
        .then (() => next())
        .catch(next)
})

router
    .route('/')
    .post(singInController.userSignIn)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});

export default router
