import nano from '../couch-db/couch-db.mjs'

import type {User, GoogleUser} from 'user.mjs'

import * as ULID from 'ulid';

import bcrypt from 'bcrypt'

const db = nano.use('itsas-users')

import {OAuth2Client} from 'google-auth-library';

const client = new OAuth2Client();

import jwt from 'jsonwebtoken';

import {encode, decode} from '../helpers/crypto.mjs';

class UserService {

  async verifyGoogle(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_USER,
    });
    return ticket;
  }

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

  createUser(req) {
    return (req.body.type === 'google') ? this.googleUser(req) :
    new Promise((res, rej) => {
        db.partitionedList(req.body.username)
          .then(loginList => {
            if (loginList.rows.length === 0 )
              return res(loginList.rows.length)
            else {
              rej({
                error: `Пользователь с именем ${req.body.username} уже существует`,
                status: 400
              })
            }
          })
          .catch( (e) =>
            rej({
              error: `Ошибка запроса к базе данных: ${e}`,
              status: 400
            })
          )
    })
  }

  checkGoogleUser(ticket) {
    return db.get(`${ticket.payload.sub}:user`)
      .then(
        res =>
          Promise.reject({
            error: `Такой пользователь уже существует. Войдите от его имени`,
            status: 500
          }),
        () => {
          return ticket.payload
        }
      )
  }

  googleUser(req) {
    return this.verifyGoogle(req.body.token)
      .then(ticket => this.checkGoogleUser(ticket))
      .then(userData => this.createUserObject(userData))
      .then(encodedUser => this.createGoogleUser(encodedUser))
      .then(userDb => this.createGoogleUserToken(userDb))
  }

  createHash(req) {
    return bcrypt.hash(req.body.password, +process.env.SALT_ROUNDS )
      .catch ( err =>
        Promise.reject( {
          error: `Ошибка создания кеша пароля: ${err}`,
          status: 500
        })
      )
  }

  createGoogleUser(encodedUser) {
    return db.insert(encodedUser.data as object, `${encodedUser.id}:user`)
    .catch( err =>
      Promise.reject({
        error: `Ошибка создания пользователя: ${err}`,
        status: 500
      })
    )
  }

  async createGoogleUserToken(user) {
    const payload = {
      id: user.id
    };
    const secret =  process.env.PRIVATE_KEY
    const options = { expiresIn: '1h' };
    return jwt.sign(payload, secret, options);
  }

  insertUser(req, hash) {
    const user: User = {
      ulid: ULID.ulid(),
      password: hash
    }
    return db.insert(user as object, `${req.body.username}:user`)
    .catch( err =>
        Promise.reject({
          error: `Ошибка создания пользователя: ${err}`,
          status: 500
        })
      )
  }

  getUserDB(decodedToken) {
    return db.get(`${decodedToken.id}`).catch( err =>
      Promise.reject({
        error: `Не могу найти Вашего пользователя в базе данных: ${err}`,
        status: 403
      })
    )
  }

  async decodeUserData(userDb) {
    return decode(userDb.userData)
  }

  async createUserInfo(userData) {
    const user = JSON.parse(userData)
    if (user.type === 'simple') {
      return {
        login: user.username,
        picture: user.picture,
        firstName: user.firstName,
        lastName: user.lastName
      }
    } else {
      return {
        login: user.name,
        picture: user.picture,
        firstName: user.given_name,
        lastName: user.family_name
      }
    }
  }

  getUser(req) {
    return this.getToken(req)
      .then(token => this.verifyToken(token))
      .then(decodedToken => this.getUserDB(decodedToken))
      .then(userDB => this.decodeUserData(userDB))
      .then(userData => this.createUserInfo(userData))
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
        error: 'Доступ закрыт. Не указан токен пользователя',
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

  async decodeUserId(token) {
    return decode(token.id)
  }

  async createUserObject(userData) {
    const googleUserData: GoogleUser = {
      ulid: ULID.ulid(),
      userData: encode(JSON.stringify(userData)),
      createDate: Date.now()
    }
    return {id: encode(userData.sub),
            data: googleUserData}
  }

  async generateAccessToken() {
    // const payload = {
    //   id: user.id,
    //   email: user.email
    // };

    // const secret =  process.env.PRIVATE_KEY
    // const options = { expiresIn: '1h' };

    // return jwt.sign(payload, secret, options);
  }

  verifyAccessToken(token) {
    const secret = process.env.TOKEN_PUBLIC_KEY;
    try {
      const decoded = jwt.verify(token, secret);
      return { success: true, data: decoded };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  createSimpleUser(req) {
    return this.createHash(req).then(hash => this.insertUser(req, hash))
  }
}

const userService: UserService = new UserService()

export default userService