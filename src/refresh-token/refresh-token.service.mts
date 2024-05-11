import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid';

const db = nano.use('itsas-notifications')

import jwt from 'jsonwebtoken';

import {AsyncDatabase} from 'promised-sqlite3';

const sqliteDb = await AsyncDatabase.open("./db.sqlite");

class Service {

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getTokens(verifiedToken))
  }

  create(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getTokens(verifiedToken))
  }

  update(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getTokens(verifiedToken))
  }

  delete(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getTokens(verifiedToken))
  }

  async getTokens(verifiedToken) {
    try {
      let {token:refreshToken, claim} = await this.createRefreshToken(verifiedToken)
      let [obj , accessToken] = await Promise.all([this.saveRefreshToken(verifiedToken, claim), this.createAccessToken(verifiedToken)])
      return {refreshToken, accessToken}
    }
    catch (err) {
      return Promise.reject({
        error: `Ошибка создания токена обновления: ${err}`,
        status: 500
      })
    }
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

  async createRefreshToken(verifiedToken) {
    const payload = {
      ulid: verifiedToken.ulid,
      claim: ULID.ulid()
    };
    const secret =  process.env.TOKEN_PRIVATE_KEY
    const options = { expiresIn: '2h' };
    return {
      token: jwt.sign(payload, secret, options),
      claim: payload.claim,
    }
  }

  saveRefreshToken(verifiedToken, claim) {
    return sqliteDb.run("INSERT INTO 'refresh-tokens' (id, claim) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET claim=excluded.claim;", [
      verifiedToken.ulid,
      claim
    ]);
  }

  async createAccessToken(verifiedToken) {
    const payload = {
      id: verifiedToken.id,
      ulid: verifiedToken.ulid
    };
    const secret =  process.env.TOKEN_PRIVATE_KEY
    const options = { expiresIn: '1h' };
    return jwt.sign(payload, secret, options);
  }

  getProjects(verifiedToken, limit) {
      return db.partitionedList(verifiedToken.ulid,{ include_docs: true, limit, start_key: `${verifiedToken.ulid}:0`, end_key: `${verifiedToken.ulid}:f`})
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
    const token = req.cookies['refresh-token'];
    if (!token) {
      return Promise.reject({
        error: 'У Вас нет токена обновления. Зайдите в Ваш аккаунт опять',
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
        error: `Ошибка верификации токена обновления: ${error.message}`,
        status: 419
      });
    }
  }
}

const service: Service = new Service()

export default service