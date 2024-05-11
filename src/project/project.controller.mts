import service from './project.service.mjs'

class Controller {
  get(req, res, next) {
    service.get(req)
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
  upload(req, res, next) {
    service.upload(req)
      .then(file => {
        res.status(200).send({message: "Файл успешно загружен", file: file})
      })
      .catch(next)
  }
  show(req, res, next) {
    service.show(req)
      .then( files => {
        res.status(200).send(files)
      })
      .catch(next)
  }
}

const controller: Controller = new Controller()

export default controller