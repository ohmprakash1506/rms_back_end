
module.exports = (sequelize, DataTypes) => {
  const ProjectResource = sequelize.define(
    'projectResource',
    {
      clientResourceID: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      resourceID: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      usedHours: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      usedBudget: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      resourceHours: {
        type: DataTypes.INTEGER
      },
      startDate: {
        type: DataTypes.DATE
      },
      endDate: {
        type: DataTypes.DATE
      },
    });
  return ProjectResource;
}

