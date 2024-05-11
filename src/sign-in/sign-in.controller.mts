import signInService from './sign-in.service.mjs'

class SignInController {
  userSignIn(req, res, next) {
    signInService.userSignIn(req)
      .then((tokens) => {
        res.cookie('refresh-token', tokens.refreshToken, {httpOnly: true, sameSite: 'strict', expires: new Date(Date.now() + 9000000)});
        res.status(200).send({ token: tokens.accessToken})
      })
      .catch(next)
  }
}

const signInController: SignInController = new SignInController()

export default signInController