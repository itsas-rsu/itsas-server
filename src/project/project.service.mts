import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid';

const db = nano.use('itsas-projects')

import jwt from 'jsonwebtoken';

import multer from 'multer';

import fs from 'fs';

import path from 'path';

import projectStatusNotificationService from '../notification-services/project-status-notification.service.mjs'

class Service {

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getProject(req, verifiedToken))
  }

  create(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.createProject(req, verifiedToken))
  }

  update(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.updateProject(req, verifiedToken))
  }

  delete(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.deleteProject(req, verifiedToken))
  }

  upload(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(() => this.uploadFile(req))
  }

  show(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(() => this.showFiles(req))
  }

  async createProject(req, verifiedToken) {
    const projectUlid = ULID.ulid();
    let project = {}
    try {
      project = await db.insert(req.body, `${verifiedToken.ulid}:project:${projectUlid}`)
    }
    catch (err) {
      return Promise.reject({
        error: `Ошибка создания проекта: ${err}`,
        status: 500
      })
    }
    projectStatusNotificationService.sendMessage(`${verifiedToken.ulid}:project:${projectUlid}`, 'Created' )
    return project
  }

  getProject(req, verifiedToken) {
    const projectId = req.params.projectId.split(":")
    return db.get(`${verifiedToken.ulid}:project:${projectId[2]}`)
      .catch( err =>
        Promise.reject({
          error: `Не могу найти проект: ${err}`,
          status: 403
        })
      )
  }

  updateProject(req, verifiedToken) {
    const project = req.body
    const projectId = project._id.split(":")[2]
    project._id = `${verifiedToken.ulid}:project:${projectId}`
    projectStatusNotificationService.sendMessage(project._id, 'Updated' )
    return db.insert(project)
    .catch( err =>
        Promise.reject({
          error: `Ошибка сохранения проекта: ${err}`,
          status: 403,
        })
      )
  }

  deleteProject(req, verifiedToken) {
    const projectId = req.params.projectId.split(":")[2]
    return db.destroy(`${verifiedToken.ulid}:project:${projectId}`, req.query.rev)
    .catch( err =>
        Promise.reject({
          error: `Ошибка удаления проекта: ${err}`,
          status: 403,
        })
      )
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

  showFiles(req) {
    return new Promise(async (resolve, reject) => {
        try {
            const projectDocId = req.params.projectId;
            let projectDoc = await db.get(projectDocId) as any;
            if (projectDoc.files && Array.isArray(projectDoc.files)) {
                const files = projectDoc.files.map(fileName => ({
                    name: fileName,
                }));
                resolve(files);
            } else {
                throw new Error("Файлы для этого проекта не найдены");
            }
        } catch (err) {
            if (err.reason === "missing") {
                reject({
                    error: "Проект не найден",
                    status: 404
                });
            } else {
                reject({
                    error: `Ошибка получения файлов: ${err.message}`,
                    status: 500
                });
            }
        }
    });
  }

  uploadFile(req) {

    const projectId = req.params.projectId.replace(/:/g, "-");

    const storage = multer.diskStorage({

      destination: function (req, file, cb) {
        const destPath = path.join('uploads', projectId);
        fs.mkdirSync(destPath, { recursive: true });
        cb(null, destPath);
      },

      filename: function (req, file, cb) {
        cb(null, file.originalname);
      }

    });

    const upload = multer({ storage: storage }).single('file');

    return new Promise((resolve, reject) => {
      upload(req, null, async function (err) {
        if (err) {
          reject(err);
        } else {
          try {
            const projectDocId = req.params.projectId;
            let projectDoc = await db.get(projectDocId) as any;
            projectDoc.files = projectDoc.files || [];
            projectDoc.files.push(req.file.originalname); // Добавляем имя файла

            await db.insert(projectDoc);
            resolve(req.file); // Возвращаем информацию о файле
          } catch (error) {
            reject({
              error: `Ошибка при обновлении проекта с файлами: ${error.message}`,
              status: 500
            });
          }
        }
      });
    });
  }
}

const service: Service = new Service()

export default service