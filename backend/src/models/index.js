import sequelize from '../config/database.js';
import User from './User.js';
import Room from './Room.js';
import Message from './Message.js';
import RoomMember from './RoomMember.js';

const models = { User, Room, Message, RoomMember };

// Two passes, and the order matters.
//
// 1. init every model — each one registers its columns with Sequelize.
// 2. THEN wire the associations. A model can't declare a relationship to a
//    model that hasn't been initialised yet, and our relationships are
//    circular (User -> Message -> User), so they can't all be done in one go.
Object.values(models).forEach((model) => model.initModel(sequelize));
Object.values(models).forEach((model) => model.associate(models));

export { sequelize, User, Room, Message, RoomMember };
export default models;
