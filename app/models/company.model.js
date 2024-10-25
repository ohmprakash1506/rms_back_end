
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    'company',
    {
      name: {
        type: DataTypes.STRING,
      },
      description: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.BOOLEAN
      }
    });
  return Company;
}