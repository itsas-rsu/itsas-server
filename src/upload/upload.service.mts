import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid'

const db = nano.use('itsas-server')

import jwt from 'jsonwebtoken'

import { fileURLToPath } from 'url'

import multer from 'multer'

import fs from 'fs';

import path from 'path';

class Service {

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getProjects(verifiedToken))
  }
  getAvatar(req, res) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getAvatarFile(req, res, verifiedToken))
  }

  getProjectAvatar(req, res) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getProjectAvatarFile(req, res, verifiedToken))
  }

  create(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.uploadFiles(req, verifiedToken))
  }
  upload(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.uploadFile(req, verifiedToken))
  }

  uploadAvatar(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.uploadAvatarFile(req, verifiedToken))
  }

  uploadProjectAvatar(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.uploadProjectAvatarFile(req, verifiedToken))
  }


  uploadFile(req, verifiedToken) {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const projectId = req.params.projectId.split(":")[2]
        let destPath = path.join('uploads', verifiedToken.ulid, `project-${projectId}`);
        fs.mkdirSync(destPath, { recursive: true });
        cb(null, destPath);
      },

      filename: function (req, file, cb) {
          cb(null, 'data.csv');
      }

    });

    const upload = multer({ storage: storage }).single('file');

    return new Promise((resolve, reject) => {
      upload(req, null, err => {
        if (err) {
          return reject({
            error: `Ошибка при загрузке файла: ${err.message}`,
            status: 403
          });
        } else {
          return resolve({upload: 'ok'})
        }
      })
    })
  }

  uploadAvatarFile(req, verifiedToken) {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        let destPath = path.join('uploads', verifiedToken.ulid);
        fs.mkdirSync(destPath, { recursive: true });
        cb(null, destPath);
      },

      filename: function (req, file, cb) {
          // cb(null, "avatar"+file.originalname.slice((file.originalname.lastIndexOf(".") - 1 >>> 0) + 2));
          cb(null, "avatar");
      }

    });

    const upload = multer({ storage: storage }).single('file');

    return new Promise((resolve, reject) => {
      upload(req, null, err => {
        if (err) {
          return reject({
            error: `Ошибка при загрузке файла: ${err.message}`,
            status: 403
          });
        } else {
          return resolve({upload: 'ok'})
        }
      })
    })
  }
  // upload() {
  //   const uploadDir = new URL('./files/', import.meta.url);
  //   const storage = multer.diskStorage({
  //     destination: function (req, file, callback) {
  //         callback(null, fileURLToPath(uploadDir));
  //     },
  //     filename: function (req, file, callback) {
  //       // You can write your own logic to define the filename here (before passing it into the callback), e.g:
  //       const filename = '111'
  //       callback(null, filename);
  //     }
  //   })
  //   // const upload = multer({
  //   //   storage: storage,
  //   //   limits: {
  //   //     fileSize: 10048576 // Defined in bytes (1 Mb)
  //   //   },
  //   // })

  //   const upload = multer({ dest: './files/' })
  //   return upload.single('file')
  // }

  uploadProjectAvatarFile(req, verifiedToken) {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const projectId = req.params.projectId.split(":")[2]
        let destPath = path.join('uploads', verifiedToken.ulid, `project-${projectId}`);
        fs.mkdirSync(destPath, { recursive: true });
        cb(null, destPath);
      },

      filename: function (req, file, cb) {
          // cb(null, file.originalname);
          cb(null, 'avatar');
      }

    });

    const upload = multer({ storage: storage }).single('file');

    return new Promise((resolve, reject) => {
      upload(req, null, err => {
        if (err) {
          return reject({
            error: `Ошибка при загрузке файла: ${err.message}`,
            status: 403
          });
        } else {
          return resolve({upload: 'ok'})
        }
      })
    })
  }

  update(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.createProject(req, verifiedToken))
  }

  delete(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.deleteFiles(req, verifiedToken))
  }

  deleteFiles(req, verifiedToken) {
    const projectId = req.params.projectId.split(":")[2]
    const dir = path.join('uploads', verifiedToken.ulid, `project-${projectId}`);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return {delete: 'ok'}
    }
    catch (err) {
      throw Error(`Ошибка удаления файла: ${err}}`)
    }
  }

  uploadFiles(req, verifiedToken) {
    // this.upload(req)
    return {a:1};
  }

  createProject(req, verifiedToken) {
    return Promise.resolve(1);
  }

  getProjects(verifiedToken) {
      return db.partitionedList(verifiedToken.ulid,{ include_docs: true, start_key: `${verifiedToken.ulid}:project:0`, end_key: `${verifiedToken.ulid}:project:f`})
        .catch( err =>
          Promise.reject({
            error: `Не могу найти список проектов: ${err}`,
            status: 403
          })
        )
  }

  getAvatarFile(req, res, verifiedToken) {
    const dirPath = path.join('uploads', verifiedToken.ulid);
    const filePath = path.join(dirPath, 'avatar');
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'avatar', (err) => {
        if (err) {
          res.status(500).send({
            error: `Ошибка при скачивании файла: ${err.message}`
          });
        }
      });
    } else {
      res.status(404).send({
        error: 'Файл не найден'
      });
    }
  }

  getProjectAvatarFile(req, res, verifiedToken) {
    const dirPath = path.join('uploads', verifiedToken.ulid);
    const filePath = path.join(dirPath, 'avatar');
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'avatar', (err) => {
        if (err) {
          res.status(500).send({
            error: `Ошибка при скачивании файла: ${err.message}`
          });
        }
      });
    } else {
      res.status(404).send({
        error: 'Файл не найден'
      });
    }
  }

  async hasAuthorizationHeader(req) {
    if (!req.headers['authorization'])
      return Promise.reject({
        error: 'Не заданы параметры авторизации',
        status: 403
      })
    return true;
  }

  async getToken(req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return Promise.reject({
        error: 'Доступ закрыт. Нет токена пользователя',
        status: 403
      })
    }
    return token;
  }
  async verifyToken(token) {
    const secret = process.env.TOKEN_PRIVATE_KEY;
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      return Promise.reject({
        error: `Ошибка верификации токена: ${error.message}`,
        status: 419
      });
    }
  }

}

const service: Service = new Service()

export default service