import {Router, Request, Response} from "express";
import {jwtService} from "../application/jwt-service";
import {ioc} from "../IoCContainer";
import requestIp from 'request-ip';
import {checkoutIPFromBlackList} from "../middlewares/middleware-checkoutIPFromBlackList";
import {checkoutContentType} from "../middlewares/checkout-contentType";
import {
  bodyCode,
  bodyEmail,
  bodyLogin,
  bodyPassword,
  inputValidatorMiddleware
} from "../middlewares/input-validator-middleware";
import {
  checkHowManyTimesUserLoginLast10secWithSameIp
} from "../middlewares/checkHowManyTimesUserLoginLast10secWithSameIp";
import {checkOutEmailOrLoginInDB} from "../middlewares/checkOutEmailInDB";
import {parseQuery} from "../middlewares/parse-query";


export const authRouter = Router({})

authRouter.post('/registration',
  checkoutIPFromBlackList,
  checkoutContentType,
  bodyLogin, bodyPassword, bodyEmail, inputValidatorMiddleware,
  checkOutEmailOrLoginInDB,
  checkHowManyTimesUserLoginLast10secWithSameIp,
  async (req: Request, res: Response) => {
    const clientIp = requestIp.getClientIp(req);
    const  countItWithIsConnectedFalse = await ioc.authUsersAccountService.checkHowManyTimesUserLoginLastHourSentEmail(clientIp)
    if (countItWithIsConnectedFalse > 5) {
      res.status(403).send('5 emails were sent to confirm the code.')
      return
    }
    const user = await ioc.authUsersAccountService.createUserRegistration(req.body.login, req.body.email, req.body.password, clientIp);
    if (user) {
      res.sendStatus(204);
      return
      }
    res.status(400).send({
      "errorsMessages": [
        {
          message: "Error with authRouter.post('/registration'...",
          field: "some"
        }
      ]
    });
    return
  });

authRouter.get('/confirm-registration',
  async (req: Request, res: Response) => {
    const parseQueryData = parseQuery(req)
    const code = parseQueryData.code
    if (code === null) {
      res.sendStatus(400)
      return
    }
    const result = await ioc.authUsersAccountService.confirmByCodeInParams(code)
    console.log(code, "code")
    if (result && result.emailConfirmation.isConfirmed) {
      res.status(201).send("Email confirmed by query ?Code=.");
      return
    } else {
      res.sendStatus(400)
      return
    }
  })

authRouter.post('/registration-confirmation',
  checkoutIPFromBlackList,
  bodyCode, inputValidatorMiddleware,
  checkHowManyTimesUserLoginLast10secWithSameIp,
  async (req: Request, res: Response) => {
    const clientIp = requestIp.getClientIp(req);
    const  countItWithIsConnectedFalse = await ioc.authUsersAccountService.checkHowManyTimesUserLoginLastHourSentEmail(clientIp)
    if (countItWithIsConnectedFalse > 5) {
      res.status(429).send('More than 5 attempts from one IP-address during 10 seconds.')
      return
    }
    const result = await ioc.authUsersAccountService.confirmByCodeInParams(req.body.code)
    if (result && result.emailConfirmation.isConfirmed) {
      res.status(204).send();
      return
    }
    res.status(400).send({
      "errorsMessages": [
        {
          message: "That code is not correct.",
          field: "code"
        }
      ],
      resultCode: 1
    })
    return
  });

authRouter.get('/registration-email-resend',
  checkHowManyTimesUserLoginLast10secWithSameIp,
  async (req: Request, res: Response) => {
    const parseQueryData = parseQuery(req)
    const code = parseQueryData.code
    if (code === null) {
      res.status(400).send("query param is empty")
      return
    }
    const user = await ioc.authUsersAccountService.findByConfirmationCode(code)
    if (user === null) {
      res.status(400).send("Bad code or isConfirmed is true.")
      return
    }
    const result = await ioc.authUsersAccountService.updateAndSentConfirmationCodeByEmail(user.accountData.email)
    res.send(`Resend code to email:  ${result?.accountData?.email}`)
  })

authRouter.post('/confirm-email',
  async (req: Request, res: Response) => {
    const result = await ioc.authUsersAccountService.confirmByEmail(req.body.confirmationCode, req.body.email)
    if (result !== null) {
      res.status(201).send("Email confirmed by email and confirmationCode.");
    } else {
      res.sendStatus(400)
    }
  })

authRouter.get('/confirm-code/:code',
  async (req: Request, res: Response) => {
    const result = await ioc.authUsersAccountService.confirmByCodeInParams(req.params.code)
    if (result && result.emailConfirmation.isConfirmed) {
      res.status(201).send("Email confirmed by params confirmationCode.");
    } else {
      res.sendStatus(400)
    }
  })

authRouter.post('/resend-registration-code',
  async (req: Request, res: Response) => {
    // need to finish, from postman I understand how to take the info to search for a query when
    // I click the link in the email itself I do not know
    const result = await ioc.authUsersAccountService.updateAndSentConfirmationCode(req.body.email, req.body.password)
    if (result?.accountData?.email === undefined) {
      res.status(400).send("Bad code or isConfirmed is true or more than 5 times sent email with code.");
      return
    }
    res.send(`Resend code to email:  ${result?.accountData?.email}`)
  })

authRouter.delete('/logout',
  async (req: Request, res: Response) => {
    const result = await ioc.authUsersAccountService.deleteUserWithRottenCreatedAt()
    res.send(`Total, did not confirm registration user were deleted = ${result}`)
  })


authRouter.post('/login',
  async (req: Request, res: Response) => {
    const user = await ioc.usersService.checkCredentials(req.body.login, req.body.password)
    if (user !== null) {
      const token = await jwtService.createJWT(user)
      res.send({
        "token": token
      })
    } else {
      res.sendStatus(401)
    }
  })

