import service from './upload.service.mjs'

class Controller {
  get(req, res, next) {
    service.get(req)
      .then( result => {
        res.status(200).send(result)
      })
      .catch(next)
  }
  getAvatar(req, res, next) {
    service.getAvatar(req, res)
      .catch(next)
  }

  getProjectAvatar(req, res, next) {
    service.getProjectAvatar(req, res)
      .catch(next)
  }

  upload(req, res, next) {
    service.upload(req)
      .then( result => {
        res.status(200).send(result)
      })
      .catch(next)
  }

  uploadAvatar(req, res, next) {
    service.uploadAvatar(req)
      .then( result => {
        res.status(200).send(result)
      })
      .catch(next)
  }

  uploadProjectAvatar(req, res, next) {
    service.uploadProjectAvatar(req)
      .then( result => {
        res.status(200).send(result)
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
  deleteProjectAvatar(req, res, next) {
    service.delete(req)
      .then( project => {
        res.status(200).send(project)
      })
      .catch(next)
  }
}

const controller: Controller = new Controller()

export default controller