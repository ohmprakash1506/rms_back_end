'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.changeColumn('resources', 'country', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "IN"
      })
    ])
  },

  async down (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.changeColumn('resources', 'country', {
        type: Sequelize.STRING
      })
    ])
  }
};
