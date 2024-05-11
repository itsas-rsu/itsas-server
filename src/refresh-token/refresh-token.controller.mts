import service from './refresh-token.service.mjs'

class Controller {
  get(req, res, next) {
    service.get(req)
      .then( tokens => {
        res.cookie('refresh-token', tokens.refreshToken, {httpOnly: true, sameSite: 'strict', expires: new Date(Date.now() + 9000000)});
        res.status(200).send({ token: tokens.accessToken })
      })
      .catch(next)
  }
  create(req, res, next) {
    service.create(req)
      .then( result => {
        res.cookie('refreshtoken', 'token', {httpOnly: true, sameSite: 'strict', expires: Date.now() + 900000});
        res.status(200).send(result.accessToken)
      })
      .catch(next)
  }
  update(req, res, next) {
    service.update(req)
      .then( result => {
        res.cookie('refreshtoken', 'token', {httpOnly: true, sameSite: 'strict', expires: Date.now() + 900000});
        res.status(200).send(result.accessToken)
      })
      .catch(next)
  }
  delete(req, res, next) {
    service.delete(req)
      .then( result => {
        res.cookie('refreshtoken', 'token', {httpOnly: true, sameSite: 'strict', expires: Date.now() + 900000});
        res.status(200).send(result.accessToken)
      })
      .catch(next)
  }
}

const controller: Controller = new Controller()

export default controller