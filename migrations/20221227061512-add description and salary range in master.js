"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.addColumn("master_enums", "min_salary", {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: "status",
      }),
      queryInterface.addColumn("master_enums", "max_salary", {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: "status",
      }),
      queryInterface.addColumn("master_enums", "description", {
        type: Sequelize.STRING,
        allowNull: true,
        after: "status",
      }),
    ]);
  },

  async down(queryInterface, Sequelize) {
    return Promise.all(
      [queryInterface.removeColumn("master_enums", "min_salary")],
      [queryInterface.removeColumn("master_enums", "max_salary")],
      [queryInterface.removeColumn("master_enums", "description")]
    );
  },
};
