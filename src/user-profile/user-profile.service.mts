import nano from '../couch-db/couch-db.mjs'

import type {User} from 'user.mjs'

import * as ULID from 'ulid';

import {OAuth2Client} from 'google-auth-library';

const client = new OAuth2Client();

import bcrypt from 'bcrypt'

import {encode, decode} from '../helpers/crypto.mjs';

const db = nano.use('itsas-users')

import jwt from 'jsonwebtoken';

class Service {
  async hasAuthorizationHeader(req) {
    if (!req.headers['authorization'])
      return Promise.reject({
        error: 'Не заданы параметры авторизации',
        status: 403
      })
    return true;
  }

  get(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.getUserProfile(verifiedToken))
      .then(userDb => this.decodeUserProfile(userDb))
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

  getUserProfile(verifiedToken) {
    return db.get(`${verifiedToken.ulid}:user-profile`)
      .catch( err =>
        Promise.reject({
          error: `Не могу найти проект: ${err}`,
          status: 403
        })
      )
  }

  decodeUserProfile(userDb) {
    userDb.personalInfo = JSON.parse(decode(userDb.personalInfo));
    delete userDb._id;
    return userDb;
  }

  update(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.updateUserProfile(req, verifiedToken))
  }

  updateUserProfile(req, verifiedToken) {
    const userProfile = req.body
    userProfile._id = `${verifiedToken.ulid}:user-profile`
    userProfile.personalInfo = encode(JSON.stringify(userProfile.personalInfo))
    return db.insert(userProfile, `${verifiedToken.ulid}:user-profile`)
    .catch( err =>
        Promise.reject({
          error: `Ошибка сохранения профиля пользовател: ${err}`,
          status: 500
        })
      )
  }

  create(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.createUserProfile(req, verifiedToken))
  }

  createUserProfile(req, verifiedToken) {
    return db.insert(req.body, `${verifiedToken.ulid}:user-profile`)
    .catch( err =>
        Promise.reject({
          error: `Ошибка создания профиля пользовател: ${err}`,
          status: 500
        })
      )
  }

  delete(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(verifiedToken => this.deleteUserProfile(req, verifiedToken))
  }

  deleteUserProfile(req, verifiedToken) {
    return db.destroy(`${verifiedToken.ulid}:user-profile`, req.query.rev)
    .catch( err =>
        Promise.reject({
          error: `Ошибка удаления проекта: ${err}`,
          status: 403,
        })
      )
  }
}

const service: Service = new Service()

export default service