import nano from '../couch-db/couch-db.mjs'

import * as ULID from 'ulid';

const db = nano.use('itsas-server')

import jwt from 'jsonwebtoken';

import {spawn} from 'child_process'

import { promises as fs } from 'fs';

class Service {

    get(req) {
      return this.getToken(req)
        .then(token => this.verifyToken(token))
        .then(verifiedToken => this.getNeuralData(verifiedToken, req))
    }

    async getNeuralData(verifiedToken, req) {
        try {
            const data = await fs.readFile(`./uploads/${verifiedToken.ulid}/project-${req.params.projectId}/predicting_data.json`, 'utf8');
            const jsonData = JSON.parse(data);
            return jsonData;
        } catch (error) {
            console.error('Error reading the neural data file:', error);
            throw new Error('Failed to read neural data');
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
            return Promise.reject({
            error: `Ошибка верификации токена: ${error.message}`,
            status: 419
            });
        }
    }
}

const service: Service = new Service()

export default service
