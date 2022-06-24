import {emailAdapter} from "../adapters/email-adapter";
import {ioc} from "../IoCContainer";

export const emailSender = async () => {
  setTimeout(async () => {
    const emailAndCode = await ioc.emailsToSentRepository.findEmailByOldestDate()
    if (emailAndCode !== null) {
      const sentEmail = await emailAdapter.sendEmailConfirmationMessage(emailAndCode)
      await ioc.emailsToSentRepository.deleteInsertedEmailAfterSent(emailAndCode)
    }
    await emailSender()
  }, 5000)
}

