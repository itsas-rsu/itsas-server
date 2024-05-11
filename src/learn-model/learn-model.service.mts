import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid';

const db = nano.use('itsas-server')

import jwt from 'jsonwebtoken';

import {spawn} from 'child_process'

class Service {

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getProjects(verifiedToken, req))
  }

  create(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.createProject(req, verifiedToken))
  }

  update(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.createProject(req, verifiedToken))
  }

  delete(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.createProject(req, verifiedToken))
  }

  createProject(req, verifiedToken) {
    const pythonCommand = process.platform === "win32" ? "python" : "python3";

    const pyProg = spawn(pythonCommand, ['./src/python-scripts/predict.py', verifiedToken.ulid, req.params.projectId, req.body.epochs]);

    return true;
  }

  getProjects(verifiedToken, req) {
    const pythonCommand = process.platform === "win32" ? "python" : "python3";

    const pyProg = spawn(pythonCommand, ['./src/python-scripts/learn.py', verifiedToken.ulid, req.params.projectId, req.query.epochs]);

    return true;
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