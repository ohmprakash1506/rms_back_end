'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('clusters', { companyId: Sequelize.STRING });
    await queryInterface.createTable('projectResources', { companyId: Sequelize.STRING });
    await queryInterface.createTable('projects', { companyId: Sequelize.STRING });
    await queryInterface.createTable('resources', { companyId: Sequelize.STRING });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('clusters');
    await queryInterface.dropTable('projectResources');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('resources');
  }
};
