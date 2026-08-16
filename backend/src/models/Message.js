import { Model, DataTypes } from 'sequelize';

class Message extends Model {
  static initModel(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: 'Message cannot be empty' },
            len: { args: [1, 4000], msg: 'Message must be under 4000 characters' },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'user_id',
        },
        roomId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'room_id',
        },
      },
      {
        sequelize,
        modelName: 'Message',
        tableName: 'messages',
        underscored: true,
      },
    );

    return this;
  }

  static associate(models) {
    // `as: 'author'` is what lets us write
    //   Message.findAll({ include: [{ model: User, as: 'author' }] })
    // and get message.author.name for display.
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    this.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
  }
}

export default Message;
