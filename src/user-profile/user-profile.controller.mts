import service from './user-profile.service.mjs'

class Controller {
  get(req, res, next) {
    service.get(req)
      .then( userProfile => {
        res.status(200).send( userProfile )
      })
      .catch(next)
  }

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