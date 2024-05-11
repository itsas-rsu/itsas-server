import type { Express, Router, Request, Response, NextFunction} from 'express'

import express from 'express'

import controller from './upload.controller.mjs'

import service from './upload.service.mjs'

const router: Router = express.Router()

router.use(async (req: Request, res: Response, next: NextFunction) => {
    service.hasAuthorizationHeader(req)
        .then (() => next())
        .catch(next)
})

// const storage = multer.diskStorage({
//     destination: function (req, file, callback) {
//         callback(null, __dirname + '/files');
//     },
//     filename: function (req, file, callback) {
//        // You can write your own logic to define the filename here (before passing it into the callback), e.g:
//        const filename = `file_${crypto.randomUUID()}`; // Create custom filename (crypto.randomUUID available in Node 19.0.0+ only)
//        callback(null, filename);
//     }
// })

// const upload = multer({
//     storage: storage,
//     limits: {
//        fileSize: 1048576 // Defined in bytes (1 Mb)
//     },
// })

router
    .route('/project/:projectId')
    .get(controller.get)
    .post(controller.upload)
    .delete(controller.delete)
    .put(controller.upload)

router
    .route('/avatar')
    .get(controller.getAvatar)
    .post(controller.uploadAvatar)
    .delete(controller.delete)
    .put(controller.uploadAvatar)

router
    .route('/project-avatar/:projectId')
    .get(controller.getProjectAvatar)
    .post(controller.uploadProjectAvatar)
    .delete(controller.deleteProjectAvatar)
    .put(controller.uploadProjectAvatar)

router.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.status(err.status || 500)
    .send(err);
});

export default router