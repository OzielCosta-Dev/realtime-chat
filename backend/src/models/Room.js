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
            notEmpty: { msg: 'Room name cannot be empty' },
            len: { args: [2, 60], msg: 'Room name must be 2-60 characters' },
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
    this.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });

    this.hasMany(models.Message, { foreignKey: 'room_id', as: 'messages' });

    this.belongsToMany(models.User, {
      through: models.RoomMember,
      foreignKey: 'room_id',
      otherKey: 'user_id',
      as: 'members',
    });
  }
}

export default Room;
