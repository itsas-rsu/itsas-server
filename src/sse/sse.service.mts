import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid';

const db = nano.use('itsas-server')

import jwt from 'jsonwebtoken';

class Service {

  static  clients = new Map();

  static client(clientId) {
    return Service.clients.get(clientId);
  }

  static getUlid() {
    return ULID.ulid();
  }

  addClient(clientId: string, res: any) {
    Service.clients.set(clientId, res);
  }

  deleteClient(verifiedToken, req) {
    req.on('close', () => {
      Service.clients.delete(verifiedToken);
    });
  }

  sendMessageToClient(clientId: string, message: string) {
    const data = `data: ${message}\nid: ${Service.getUlid()}\n\n`;
    Service.client(clientId).write(data);
  }

  sendEventMessageToClient(clientId: string, event: string, message: string) {
      const data = `event: ${event}\ndata: ${message}\nid: ${Service.getUlid()}\n\n`;
      Service.client(clientId)?.write(data);
  }

  sendRetryToClient(clientId: string, message: string) {
    const data = `retry: ${message}\nid: ${Service.getUlid()}\n\n`;
    Service.client(clientId).write(data);
  }

  get(req, res) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getClient(verifiedToken, res))
      .then(verifiedToken => this.deleteClient(verifiedToken, req))
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

  getClient(verifiedToken, res) {
      this.addClient(verifiedToken.ulid, res)
      // setInterval(() => {
      //   this.sendMessageToClient(verifiedToken.ulid,"Hello, SSE")
      // }, 5000)
      return verifiedToken;
      // db.partitionedList(verifiedToken.ulid,{ include_docs: true, start_key: `${verifiedToken.ulid}:project:0`, end_key: `${verifiedToken.ulid}:project:f`})
        // .catch( err =>
        //   Promise.reject({
        //     error: `Не могу найти список проектов: ${err}`,
        //     status: 403
        //   })
        // )
    }

  async hasAuthorizationHeader(req) {
    if (!req.query.token)
      return Promise.reject({
        error: 'Не заданы параметры авторизации',
        status: 403
      })
    return true;
  }

  async getToken(req) {
    const token = req.query.token;
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