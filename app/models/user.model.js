
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'user',
    {
      email: {
        type: DataTypes.STRING
      },
      role: {
        type: DataTypes.INTEGER
      },
      password: {
        type: DataTypes.STRING
      },
      companyId: {
        type: DataTypes.STRING
      }
    });
  return User;
}