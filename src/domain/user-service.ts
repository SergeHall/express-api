import bcrypt from 'bcrypt'
import {ObjectId} from "mongodb";
import {UserDBType} from "../types/all_types";
import {UserRepository} from "../repositories/users-db-repository";




export class UserService{
  constructor(private userRepository: UserRepository ) {
    this.userRepository = userRepository
  }
  async createUser(login: string, email: string, password: string): Promise<UserDBType> {

    const passwordSalt = await bcrypt.genSalt(10)
    const passwordHash = await this._generateHash(password, passwordSalt)

    const newUser: UserDBType = {
      _id: new ObjectId(),
      userName: login,
      email,
      passwordSalt,
      passwordHash,
      createdAt: new Date()
    }
    return this.userRepository.createUser(newUser)
  }
  async findUser(mongoId: ObjectId): Promise<UserDBType | null> {
    return  await this.userRepository.findUserById(mongoId)
  }
  async checkCredentials(loginOrEmail: string, password:string) {
    const user = await this.userRepository.findByLoginOrEmail(loginOrEmail)
    if(!user){
      return false
    }
    const passwordHash = await this._generateHash(password, user.passwordSalt)
    return user   //.passwordHash === passwordHash; // true or false if not match
  }
  async _generateHash(password: string, salt: string) {
    const  hash = await bcrypt.hash(password, salt)
    return hash
  }
}