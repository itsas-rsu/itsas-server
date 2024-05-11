import service from './sse.service.mjs'

import type { IncomingMessage, ServerResponse } from 'http'

class Controller {
  get(req: IncomingMessage, res, next) {

    const headers = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    }

    // req.on('close', () => {
    //   service.deleteClient(req);
    // });

    service.get(req, res).then( result =>
      res.writeHead(200, headers)
    )
    .catch(next)
  }
  // get(req, res, next) {
  //   service.get(req, res)
  //     .then( result => {
  //       res.status(200).send(result)
  //     })
  //     .catch(next)
  // }
  create(req, res, next) {
    service.create(req)
      .then( result => {
        res.status(200).send(result)
      })
      .catch(next)
  }
  update(req, res, next) {
    service.update(req)
      .then( result => {
        res.status(200).send(result)
      })
      .catch(next)
  }
  delete(req, res, next) {
    service.delete(req)
      .then( project => {
        res.status(200).send(project)
      })
      .catch(next)
  }
}

const controller: Controller = new Controller()

export default controller