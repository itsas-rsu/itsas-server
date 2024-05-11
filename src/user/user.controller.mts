import userService from './user.service.mjs'

class UserController {
  getUser(req, res, next) {
    userService.getUser(req)
      .then( user => {
        res.status(200).send({user})
      })
      .catch(next)
  }
}

const userController: UserController = new UserController()

export default userController