import {NextFunction, Request, Response, Router} from "express";
import {jwtService} from "../application/jwt-service";
import {ioc} from "../IoCContainer";
const base64 = require('base-64');


export const authRouter = Router({})

authRouter.post('/login',
  async (req: Request, res: Response) => {
    const user = await ioc.userService.checkCredentials(req.body.loginOrEmail, req.body.password)
    if (user) {
      const token = await jwtService.createJWT(user)
      res.status(201).send(token)
    } else {
      res.sendStatus(401)
    }
  })


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization) {
    res.send(401)
    return
  }
  const token = req.headers.authorization.split(' ')[1] // "bearer jdgjkad.jajgdj.jksadgj"

  const userId = await jwtService.getUserIdByToken(token)
  if (userId) {
    req.user = await ioc.userService.findUser(userId)
    next()
  }
  res.send(401)
}

export const authMiddlewareHeadersAuthorization = (req: Request, res: Response, next: NextFunction) => {
  try {
    const expectedAuthHeaderValue = "Basic " + base64.encode("admin:qwerty")

    if (req.headers.authorization !== expectedAuthHeaderValue){
      return res.sendStatus(401)
    }
    next();
  } catch (e) {
    res.sendStatus(401)
  }
}