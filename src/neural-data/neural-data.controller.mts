import service from './neural-data.service.mjs'

class Controller {
  get(req, res, next) {
    service.get(req)
      .then( result => {
        res.status(200).send(result)
      })
      .catch(next)
  }
}

const controller: Controller = new Controller()

export default controller