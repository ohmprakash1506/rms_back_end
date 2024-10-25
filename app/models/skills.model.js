
module.exports = (sequelize, DataTypes) => {
    const Skills = sequelize.define(
      'skills',
      { 
        name: {
          type: DataTypes.STRING
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
          type: DataTypes.BOOLEAN
        }
      });
    return Skills;
  }