"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("approval_requests", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "tasks",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      approval_type: {
        type: Sequelize.ENUM("plan", "patch", "validation"),
        allowNull: false,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      payload_json: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("approval_requests");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_approval_requests_approval_type";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_approval_requests_status";',
    );
  },
};
