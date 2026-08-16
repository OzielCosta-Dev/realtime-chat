import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

// Cost factor for bcrypt. Each +1 doubles the work needed to hash — and to
// brute-force. 10 is roughly 100ms on modern hardware: slow enough to make
// offline cracking expensive, fast enough that login feels instant.
const SALT_ROUNDS = 10;

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
        // VIRTUAL means "exists on the instance, never stored in a column".
        // Controllers set `password`; the beforeSave hook below turns it into
        // `passwordHash`. The plaintext never reaches the database, and no
        // controller ever has to remember to hash anything.
        password: {
          type: DataTypes.VIRTUAL,
          validate: {
            len: { args: [8, 128], msg: 'Password must be 8-128 characters' },
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
        hooks: {
          // beforeValidate, NOT beforeSave.
          //
          // Sequelize's create lifecycle is:
          //   beforeValidate -> VALIDATE -> afterValidate -> beforeSave -> INSERT
          //
          // passwordHash is `allowNull: false`, so if we hashed in beforeSave
          // the validation step would already have failed on a null hash.
          // Hashing here means passwordHash is populated before validation
          // runs. Fires on create and update alike, so changing a password
          // goes through exactly the same path as registering.
          beforeValidate: async (user) => {
            if (user.password) {
              user.passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
            }
          },
        },
      },
      );

    return this;
  }

  /**
   * Compares a plaintext attempt against the stored hash.
   *
   * bcrypt.compare re-hashes the attempt using the salt embedded in the stored
   * hash, then compares in constant time — so it leaks no information through
   * how long it takes to fail.
   *
   * Requires the `withPassword` scope, since defaultScope hides the hash.
   */
  async checkPassword(plainTextPassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(plainTextPassword, this.passwordHash);
  }

  static associate(models) {
    // One user writes many messages.
    this.hasMany(models.Message, { foreignKey: 'userId', as: 'messages' });

    // A user belongs to many rooms, through the join table.
    this.belongsToMany(models.Room, {
      through: models.RoomMember,
      foreignKey: 'userId',
      otherKey: 'roomId',
      as: 'rooms',
    });

    // Rooms this user created.
    this.hasMany(models.Room, { foreignKey: 'createdBy', as: 'createdRooms' });
  }
}

export default User;
