'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      content: {
        // TEXT, not STRING: no length ceiling to trip over later.
        type: Sequelize.TEXT,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        // Delete the user, delete their messages.
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      room_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'rooms', key: 'id' },
        // Delete the room, delete its messages — they'd be orphans otherwise.
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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

    // The single most important index in this app.
    //
    // Loading a room's history is always "messages WHERE room_id = ?
    // ORDER BY created_at DESC LIMIT 50". Without an index, Postgres scans
    // EVERY message in the table and sorts them, on every room open. With a
    // composite (room_id, created_at) index it jumps straight to that room's
    // rows, already in time order.
    //
    // Column order matters: room_id first because we filter on it exactly,
    // created_at second because we sort on it.
    await queryInterface.addIndex('messages', ['room_id', 'created_at'], {
      name: 'messages_room_id_created_at_idx',
    });
  },

  async down(queryInterface) {
    // dropTable removes the index too, but being explicit documents intent.
    await queryInterface.removeIndex('messages', 'messages_room_id_created_at_idx');
    await queryInterface.dropTable('messages');
  },
};
