import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid';

const db = nano.use('itsas-projects')

import jwt from 'jsonwebtoken';

import projectStatusNotificationService from '../notification-services/project-status-notification.service.mjs'

class Service {

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getProjects(verifiedToken))
  }

  count(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getCount(verifiedToken))
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

    return db.insert(req.body, `${verifiedToken.ulid}:project:${ULID.ulid()}`)
    .catch( err =>
        Promise.reject({
          error: `Ошибка создания проекта: ${err}`,
          status: 500
        })
      )
  }

  getProjects(verifiedToken) {
      return db.partitionedList(verifiedToken.ulid,{ include_docs: true })
        .catch( err =>
          Promise.reject({
            error: `Не могу найти список проектов: ${err}`,
            status: 403
          })
        )
    }

  getCount(verifiedToken) {
    return db.partitionInfo(verifiedToken.ulid)
      .catch( err =>
        Promise.reject({
          error: `Не могу найти список проектов: ${err}`,
          status: 403
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

}

const service: Service = new Service()

export default service