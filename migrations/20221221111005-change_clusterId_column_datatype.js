"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const result = await queryInterface.sequelize.transaction(async (t) => {
        await queryInterface.removeConstraint("clusters", "clusters_ibfk_1", {
          transaction: t,
        });

        await queryInterface.changeColumn(
          "clusters",
          "clusterHeadID",
          {
            type: Sequelize.STRING,
          },
          { transaction: t }
        );
      });
    } catch (error) {
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const result = await queryInterface.sequelize.transaction(async (t) => {
        await queryInterface.changeColumn(
          "clusters",
          "clusterHeadID",
          {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          { transaction: t }
        );

        await queryInterface.addConstraint("clusterHeadID", {
          fields: ["clusterHeadID"],
          type: "foreign key",
          name: "clusters_ibfk_1",
          references: {
            table: "users",
            field: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
          transaction: t,
        });
      });
    } catch (error) {
      throw error;
    }
  },
};
