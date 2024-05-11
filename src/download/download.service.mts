import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid'

const db = nano.use('itsas-projects')

import jwt from 'jsonwebtoken'

import { fileURLToPath } from 'url'

import fs from 'fs';

import path from 'path';



class Service {

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getProjects(verifiedToken))
  }

  create(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.uploadFiles(req, verifiedToken))
  }
  download(req, res) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.downloadFile(req, res, verifiedToken))
  }

  downloadFile(req, res, verifiedToken) {
    const projectId = req.params.projectId.split(":")[2];
    const dirPath = path.join('uploads', verifiedToken.ulid, `project-${projectId}`);
    const filePath = path.join(dirPath, 'model.pkl');

    if (fs.existsSync(filePath)) {
      res.download(filePath, 'model.pkl', (err) => {
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

  downloadProjectAvatars(req, res) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.downloadProjectAvatarsFile(req, res, verifiedToken))
  }

  getProjects(verifiedToken) {
    return db.partitionedList(verifiedToken.ulid)
      .catch( err =>
        Promise.reject({
          error: `Не могу найти список проектов: ${err}`,
          status: 403
        })
      )
  }

  async downloadProjectAvatarsFile(req, res, verifiedToken) {
    const projectList = await this.getProjects(verifiedToken)
    const zipFiles = []
    projectList.rows.forEach(project => {
      const projectId = project.id.split(":")[2];
      const dirPath = path.join('uploads', verifiedToken.ulid, `project-${projectId}`);
      const filePath = path.join(dirPath, 'avatar');
      if (fs.existsSync(filePath)) {
        const obj = { path: filePath, name: `${verifiedToken.ulid}-project-${projectId}`}
        zipFiles.push(obj)
      }
    })
    return zipFiles;
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
    return {a:1};
  }

  createProject(req, verifiedToken) {
    return Promise.resolve(1);
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