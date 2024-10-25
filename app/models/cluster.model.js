
module.exports = (sequelize, DataTypes) => {
  const Cluster = sequelize.define(
    'cluster',
    {
      name: {
        type: DataTypes.STRING
      },
      description: {
        type: DataTypes.STRING
      },
      clusterHeadID: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      colorCode:{
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.BOOLEAN
      }
    });
  return Cluster;
}