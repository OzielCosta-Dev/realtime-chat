// This file is consumed by sequelize-cli (the migration tool), NOT by the app.
//
// Why .cjs? Our package.json says "type": "module", which makes every .js file
// an ES module. sequelize-cli loads its config with CommonJS require(), so we
// give it a .cjs file — the extension that means "CommonJS" regardless of the
// package.json setting.

require('dotenv').config();

const shared = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  define: {
    underscored: true,
    timestamps: true,
  },
};

module.exports = {
  development: shared,
  test: { ...shared, database: `${process.env.DB_NAME}_test` },
  production: shared,
};
