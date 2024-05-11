import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import userService from './user.service.mjs'

import userController from './user.controller.mjs'

const router: Router = express.Router()

router.use(async (req: Request, res: Response, next: NextFunction) => {
    userService.hasAuthorizationHeader(req)
        .then (() => next())
        .catch(next)
})


router
    .route('/')
    .get(userController.getUser)
    // .post(signUpController.createUser)
//.put(LoginController.updateLogin)
//.delete(LoginController.deleteLogin)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});

export default router