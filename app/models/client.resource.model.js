
module.exports = (sequelize, DataTypes) => {
  const ClientResource = sequelize.define(
    'clientResource',
    {
      projectID: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      month: {
        type: DataTypes.INTEGER
      },
      designation: {
        type: DataTypes.STRING
      },
      resourceBudget: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      resourceHours: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATE
      },
      endDate: {
        type: DataTypes.DATE
      },
    });
  return ClientResource;
}