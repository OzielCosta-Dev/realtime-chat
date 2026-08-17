import { Model, DataTypes } from 'sequelize';

class Room extends Model {
  static initModel(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(60),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: { msg: 'O nome da sala não pode ficar vazio' },
            len: { args: [2, 60], msg: 'O nome da sala deve ter entre 2 e 60 caracteres' },
          },
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.UUID,
          field: 'created_by',
        },
      },
      {
        sequelize,
        modelName: 'Room',
        tableName: 'rooms',
        underscored: true,
      },
    );

    return this;
  }

  static associate(models) {
    // foreignKey must be the MODEL ATTRIBUTE name (createdBy), not the column
    // name (created_by). Passing the column name makes Sequelize define a
    // second, separate attribute, and every response then carries the same
    // value twice under both spellings.
    this.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });

    this.hasMany(models.Message, { foreignKey: 'roomId', as: 'messages' });

    this.belongsToMany(models.User, {
      through: models.RoomMember,
      foreignKey: 'roomId',
      otherKey: 'userId',
      as: 'members',
    });
  }
}

export default Room;
