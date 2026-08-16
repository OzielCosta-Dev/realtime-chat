import { Model, DataTypes } from 'sequelize';

/**
 * The join table between User and Room.
 *
 * We model it explicitly rather than letting Sequelize auto-generate it,
 * because it carries data of its own (`joinedAt`) and because we may want to
 * query memberships directly — e.g. "is this user allowed in this room?"
 * before letting their socket subscribe to it.
 */
class RoomMember extends Model {
  static initModel(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
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
        joinedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'joined_at',
        },
      },
      {
        sequelize,
        modelName: 'RoomMember',
        tableName: 'room_members',
        underscored: true,
      },
    );

    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    this.belongsTo(models.Room, { foreignKey: 'room_id', as: 'room' });
  }
}

export default RoomMember;
