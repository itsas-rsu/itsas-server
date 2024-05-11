import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import signUpService from './sign-up.service.mjs'

import signUpController from './sign-up.controller.mjs'

const router: Router = express.Router()

router.use(async (req: Request, res: Response, next: NextFunction) => {
    signUpService.checkMethod(req)
        .then (() => next())
        .catch(next)
})

router
    .route('/')
    //.get(loginController.getLogin)
    .post(signUpController.createUser)
//.put(LoginController.updateLogin)
//.delete(LoginController.deleteLogin)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});

export default router