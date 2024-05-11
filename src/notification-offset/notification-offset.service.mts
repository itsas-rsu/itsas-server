import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid';

const db = nano.use('itsas-notifications')

import {AsyncDatabase} from 'promised-sqlite3';

const sqliteDb = await AsyncDatabase.open('./db.sqlite');

import jwt from 'jsonwebtoken';

class Service {

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getProjects(verifiedToken))
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

  async createProject(req, verifiedToken) {
    return await sqliteDb.run("INSERT INTO 'offsets' (id, offset) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET offset=excluded.offset;", [
      `${verifiedToken.ulid}:current-offset`,
      req.body.offset
    ]);

  }

  async getProjects(verifiedToken) {
    const currentOffset: any = await sqliteDb.get("SELECT * FROM 'offsets' WHERE id = ?", `${verifiedToken.ulid}:current-offset`);
    const maxOffset: any = await sqliteDb.get("SELECT * FROM 'offsets' WHERE id = ?", `${verifiedToken.ulid}:offset`);
    return {
      'currentOffset': currentOffset?.offset,
      'maxOffset': maxOffset?.offset
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
      if (error instanceof jwt.TokenExpiredError) {
        return Promise.reject({
          error: `Срок действия токена истек: ${error.expiredAt}`,
          status: 419
        });
      }
      else {
        return Promise.reject({
          error: `Ошибка верификации токена: ${error.message}`,
          status: 419
        });
      }
    }
  }
}

const service: Service = new Service()

export default service