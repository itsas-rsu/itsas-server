import signUpService from './sign-up.service.mjs'

class SignUpController {
  createUser(req, res, next) {
    signUpService.createUser(req)
    // signUpService.checkUserName(req)
    //   .then(() => signUpService.checkPassword(req))
    //   .then(() => signUpService.checkUser(req))
    //   .then(() => signUpService.createUser(req))
    //   .then(() => signUpService.getUser(req))
      .then((token) => {
        res.status(200).send({ token })
      })
      .catch(next)
  }
}

const signUpController: SignUpController = new SignUpController()

export default signUpController