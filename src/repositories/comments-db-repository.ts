import {
  ArrayErrorsType, ReturnTypeObjectComment, UserAccountDBType,
} from "../types/all_types";
import {
  MongoHasNotUpdated, notDeletedComment,
  notFoundCommentId
} from "../middlewares/errorsMessages";
import {MyModelComments} from "../mongoose/CommentsSchemaModel";
import {MyModelLikeStatusCommentId} from "../mongoose/likeStatusComment";
import {ioc} from "../IoCContainer";


export class CommentsRepository {

  async findCommentInDB(filter: { "allComments.id": string }) {
    return MyModelComments.findOne(filter)
  }

  async findCommentById(commentId: string, user: UserAccountDBType | null): Promise<ReturnTypeObjectComment> {
    const errorsArray: ArrayErrorsType = [];
    const filter = {"allComments.id": commentId}
    const foundPostWithComments = await MyModelComments.findOne(filter, {
      _id: false,
      "allComments._id": false
    }).lean()

    if (!foundPostWithComments) {
      errorsArray.push(notFoundCommentId)
      return {
        data: null,
        errorsMessages: errorsArray,
        resultCode: 1
      }
    }
    const comment = [foundPostWithComments.allComments.filter(i => i.id === commentId)[0]]
    const commentFiledLikesInfo = await ioc.preparationComments.preparationCommentsForReturn(comment, user)

    return {
      data: commentFiledLikesInfo[0],
      errorsMessages: errorsArray,
      resultCode: 0
    }
  }

  async updateCommentById(commentId: string, content: string): Promise<ReturnTypeObjectComment> {
    const errorsArray: ArrayErrorsType = [];
    const filterToUpdate = {"allComments.id": commentId}
    let resultCode = 0

    const result = await MyModelComments.updateOne(filterToUpdate, {$set: {"allComments.$.content": content}})

    if (result.modifiedCount === 0 && result.matchedCount == 0) {
      errorsArray.push(MongoHasNotUpdated)
    }

    if (errorsArray.length !== 0) {
      resultCode = 1
    }

    return {
      data: null,
      errorsMessages: errorsArray,
      resultCode: resultCode
    }
  }

  async deletedCommentById(commentId: string): Promise<ReturnTypeObjectComment> {
    const errorsArray: ArrayErrorsType = [];
    const filterToDelete = {"allComments.id": commentId}

    const resultDeleted = await MyModelComments.findOneAndUpdate(filterToDelete, {
      $pull: {
        allComments: {
          id: commentId
        }
      }
    })

    if (!resultDeleted) {
      errorsArray.push(notDeletedComment)
      return {
        data: null,
        errorsMessages: errorsArray,
        resultCode: 1
      }
    }
    return {
      data: null,
      errorsMessages: errorsArray,
      resultCode: 0
    }
  }

  async changeLikeStatusComment(user: UserAccountDBType, commentId: string, likeStatus: string): Promise<Boolean> {
    const userId = user.accountData.id
    const createdAt = (new Date()).toISOString()

    const newLikeStatus = {
      commentId: commentId,
      userId: userId,
      likeStatus: likeStatus,
      createdAt: createdAt,
    }
    try {
      const filterToUpdate = {"allComments.id": commentId}
      const result = await MyModelComments.findOneAndUpdate(
        filterToUpdate,
        {$set: {"allComments.$.likeStatus": likeStatus}}
      )
      if (!result) {
        return false
      }

      const currentLikeStatus = await MyModelLikeStatusCommentId.findOneAndUpdate(
        {
          $and:
            [{commentId: commentId},
              {userId: userId}]
        },
        newLikeStatus,
        {upsert: true})

      return true

    } catch (e) {
      console.log(e)
      return false
    }
  }

}