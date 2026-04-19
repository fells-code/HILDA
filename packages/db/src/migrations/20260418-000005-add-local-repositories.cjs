"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_repositories_provider\" ADD VALUE IF NOT EXISTS 'local';",
    );

    await queryInterface.addColumn("repositories", "local_path", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("repositories", "local_path");
  },
};
