
module.exports = (sequelize, DataTypes) => {
  const Resource = sequelize.define(
    'resource',
    {
      name: {
        type: DataTypes.STRING
      },
      lastName: {
        type: DataTypes.STRING
      },
      avtar:{
        type:DataTypes.STRING
      },
      dob:{
        type:DataTypes.DATE
      },
      department: {
        type: DataTypes.STRING
      },
      designation: {
        type: DataTypes.STRING
      },
      phone: {
        type: DataTypes.STRING
      },
      experience: {
        type: DataTypes.FLOAT
      },
      salary: {
        type: DataTypes.TEXT
      },
      dateOfJoining: {
        type: DataTypes.DATE
      },
      skills: {
        type: DataTypes.STRING
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      is_owner:{
        type:DataTypes.BOOLEAN,
        defaultValue: false
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    });
  return Resource;
}