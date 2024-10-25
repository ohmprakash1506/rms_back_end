module.exports = (sequelize, DataTypes) => {
  const MasterEnum = sequelize.define("master_enum", {
    type: {
      type: DataTypes.STRING,
    },
    name: {
      type: DataTypes.STRING,
    },
    parentId: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
    },
    min_salary: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_salary: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });
  return MasterEnum;
};
