import nano from '../couch-db/couch-db.mjs'

import type {User} from 'user.mjs'

import * as ULID from 'ulid';

import {OAuth2Client} from 'google-auth-library';

const client = new OAuth2Client();

import bcrypt from 'bcrypt'

import {encode} from '../helpers/crypto.mjs';

const db = nano.use('itsas-users')

import jwt from 'jsonwebtoken';

import refreshTokenService from '../refresh-token/refresh-token.service.mjs'

class SignInService {
  checkMethod(req) {
    return (req.method === "POST") ? Promise.resolve("POST") :
      Promise.reject({
        error: `Метод ${req.method} недопустим`,
        status: 400
      })
  }

  checkUserName(req) {
    return req.body.username !== undefined ? Promise.resolve(JSON.stringify(req.body.username)) :
      Promise.reject({
        error: `Не задано имя пользователя`,
        status: 400
      })
  }

  checkPassword(req) {
    return req.body.password !== undefined ? Promise.resolve(req.body.password) :
      Promise.reject({
        error: `Не задан пароль пользователя`,
        status: 400
      })
  }

  userSignIn(req) {
    return (req.body.type === 'google') ? this.googleUserSignIn(req) : this.simpleUserSignIn(req)
  }

  simpleUserSignIn(req) {
    return this.verifyPassword(req)
    .then(() => this.getUserDB(req))
    .then(userDB => this.checkUserPassword(userDB, req))
    .then(userDB => refreshTokenService.getTokens({ulid: userDB.ulid, id: userDB._id}))
  }

  googleUserSignIn(req) {
    return this.verifyGoogleToken(req.body.token)
    .then(ticket => this.getGoogleUserId(ticket))
    .then(userId => this.getGoogleUserDB(userId))
    // .then(userDB => refreshTokenService.getTokens({ulid: userDB.ulid, id: userDB._id}))
  }

  async verifyGoogleToken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_USER,
    });
    return ticket;
  }

  async getGoogleUserId(ticket) {
    return `${encode(ticket.payload.sub)}:user`
  }

  getGoogleUserDB(userId) {
    return db.get(userId).catch( err => {
      return Promise.reject({
        error: `Не могу найти такого пользователя: ${err}`,
        status: 403
      })}
    )
  }

  async createSimpleUserAccessToken(user) {
    const payload = {
      id: user._id,
      ulid: user.ulid
    };
    const secret =  process.env.TOKEN_PRIVATE_KEY
    const options = { expiresIn: '1h' };
    return jwt.sign(payload, secret, options);
  }

  async createSimpleUserRefreshToken(user) {
    const payload = {
      id: user._id,
      ulid: user.ulid
    };
    const secret =  process.env.TOKEN_PRIVATE_KEY
    const options = { expiresIn: '1h' };
    return jwt.sign(payload, secret, options);
  }

  getUserDB(req) {
    return db.get(`${encode(req.body.username)}:user`).catch( err => {
      return Promise.reject({
        error: `Не могу найти этого пользователя: ${err}`,
        status: 403
      })}
    )
  }

  checkUserPassword(userDB, req) {
    return bcrypt.compare(req.body.password, userDB.password)
    .then(result => {
      return result ? userDB :
        Promise.reject({
          error: 'Вы указали неправильный пароль',
          status: 403
        })
    })
  }

  async verifyPassword(req) {
    if (!req.body.password)
      return Promise.reject( {
        error: `Не задан пароль пользователя`,
        status: 500
      })
    return true
  }
}

const signInService: SignInService = new SignInService()

export default signInService