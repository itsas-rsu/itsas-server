import express from 'express'

import type { Express, Router, Request, Response } from 'express'

import 'dotenv/config'

import routes from './routes/index.mjs'

import cors from 'cors'

import cookieparser from 'cookie-parser'

import './notification-services/notification.services.mjs'

import * as https from 'https';

import {readFileSync} from 'fs'

const app: Express = express()

const host = process.env.SERVER_HOST

const port = Number(process.env.SERVER_PORT)

const sslOptions = {
  cert: readFileSync(process.env.SSL_CERT),
  key: readFileSync(process.env.PRIV_KEY)
};

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieparser());

app.use(function setCommonHeaders(req, res, next) {
    res.set("Access-Control-Allow-Private-Network", "true");
    res.set("Permissions-Policy", "interest-cohort=()")
    next();
});


const corsOptions={
  origin: [
    "https://127.0.0.1:8080",
    "http://127.0.0.1:8080",
    "http://localhost:52330",
    `https://localhost:${process.env.SSL_PORT}`,
    `https://127.0.0.1:${process.env.SSL_PORT}`,
    `https://127.0.0.1:8080`,
    `https://localhost:8080`,
    'https://itsas-system.github.io'
  ],
  credentials:true
}

app.use(cors(corsOptions));

app.use('/api', routes)

app.listen(port, host, () =>
    console.log(`Server listens http://${host}:${port}`)
)

https.createServer(sslOptions, app).listen(Number(process.env.SSL_PORT));