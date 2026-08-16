'use strict';

/**
 * Join table for the many-to-many between users and rooms.
 *
 * A user belongs to many rooms; a room has many users. A relational database
 * can't express that with a single foreign key on either side, so it needs a
 * third table where each ROW is one membership.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('room_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      room_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'rooms', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Stops the same user joining the same room twice. Enforced by the
    // database, so it holds even if two "join" requests race each other.
    await queryInterface.addConstraint('room_members', {
      fields: ['user_id', 'room_id'],
      type: 'unique',
      name: 'room_members_user_id_room_id_unique',
    });

    // Speeds up "which rooms is this user in?" — the sidebar query.
    await queryInterface.addIndex('room_members', ['user_id'], {
      name: 'room_members_user_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('room_members');
  },
};
