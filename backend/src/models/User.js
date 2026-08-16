import { Model, DataTypes } from 'sequelize';

class User extends Model {
  static initModel(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(80),
          allowNull: false,
          validate: {
            notEmpty: { msg: 'Name cannot be empty' },
            len: { args: [2, 80], msg: 'Name must be 2-80 characters' },
          },
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: { msg: 'Must be a valid email address' },
          },
        },
        // Named `passwordHash`, never `password`, so it's obvious at every
        // call site that this is not a plaintext value.
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'password_hash',
        },
        isOnline: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_online',
        },
        lastSeenAt: {
          type: DataTypes.DATE,
          field: 'last_seen_at',
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        // snake_case in the database, camelCase in JavaScript — each side
        // keeps its own conventions and Sequelize translates between them.
        underscored: true,
        defaultScope: {
          // Never return the hash unless a query explicitly asks for it.
          // Defence in depth: even if a controller forgets to strip it,
          // it won't leak.
          attributes: { exclude: ['passwordHash'] },
        },
        scopes: {
          // Opt back in for login, the one place that needs it:
          //   User.scope('withPassword').findOne(...)
          withPassword: { attributes: {} },
        },
      },
      );

    return this;
  }

  static associate(models) {
    // One user writes many messages.
    this.hasMany(models.Message, { foreignKey: 'user_id', as: 'messages' });

    // A user belongs to many rooms, through the join table.
    this.belongsToMany(models.Room, {
      through: models.RoomMember,
      foreignKey: 'user_id',
      otherKey: 'room_id',
      as: 'rooms',
    });

    // Rooms this user created.
    this.hasMany(models.Room, { foreignKey: 'created_by', as: 'createdRooms' });
  }
}

export default User;
