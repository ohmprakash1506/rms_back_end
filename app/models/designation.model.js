
module.exports = (sequelize, DataTypes) => {
    const Designation = sequelize.define(
      'designation',
      {
        deptID: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        name: {
          type: DataTypes.STRING
        },
        status: {
          type: DataTypes.BOOLEAN
        }
      });
    return Designation;
  }