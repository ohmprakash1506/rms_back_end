
module.exports = (sequelize, DataTypes) => {
    const Department = sequelize.define(
        'department',
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
    return Department;
}