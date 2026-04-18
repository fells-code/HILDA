"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("patch_artifacts", {
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
      repository_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "repositories",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      artifact_type: {
        type: Sequelize.ENUM("patch", "validation_report"),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      metadata_json: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
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
    await queryInterface.dropTable("patch_artifacts");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_patch_artifacts_artifact_type";',
    );
  },
};
