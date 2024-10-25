const dbConfig = require('../config/db.config.js');
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
  dbConfig.DB,
  dbConfig.USER,
  dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: false,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
}
)

sequelize.authenticate()
  .then(() => {
    console.log('connected..')
  })
  .catch(err => {
    console.log('Error' + err)
  })

const db = {}

db.Sequelize = Sequelize
db.sequelize = sequelize

db.user = require('./user.model.js')(sequelize, DataTypes)
db.company = require('./company.model.js')(sequelize, DataTypes)
db.cluster = require('./cluster.model.js')(sequelize, DataTypes)
db.resource = require('./resource.model.js')(sequelize, DataTypes)
db.project = require('./project.model.js')(sequelize, DataTypes)
db.projectResource = require('./project.resource.model.js')(sequelize, DataTypes)
db.clientResource = require('./client.resource.model.js')(sequelize, DataTypes)
// db.department = require("./department.model")(sequelize, DataTypes)
// db.designation = require("./designation.model")(sequelize, DataTypes)
// db.skills = require("./skills.model")(sequelize, DataTypes)
db.masterEnum = require("./master.enum.model")(sequelize, DataTypes)

db.sequelize.sync({ force: false })
  .then(() => {
    console.log('yes re-sync done!')
  })



// 1 to Many Relation

db.project.hasMany(db.clientResource, {
  foreignKey: 'projectID',
})

db.clientResource.belongsTo(db.project, {
  foreignKey: 'projectID',
})


db.clientResource.hasMany(db.projectResource, {
  foreignKey: 'clientResourceID',
})

db.projectResource.belongsTo(db.clientResource, {
  foreignKey: 'clientResourceID',
})

db.resource.hasMany(db.projectResource, {
  foreignKey: 'resourceID',
})

db.projectResource.belongsTo(db.resource, {
  foreignKey: 'resourceID',
})

db.user.hasOne(db.resource, {
  foreignKey: 'userId',
})

db.resource.belongsTo(db.user, {
  foreignKey: 'userId',
})
// db.user.hasOne(db.cluster, {
//   foreignKey: 'clusterHeadID',
// })


// db.cluster.belongsTo(db.user, {
//   foreignKey: 'clusterHeadID',
// })


db.cluster.hasMany(db.project, {
  foreignKey: 'clusterID',
})

db.project.belongsTo(db.cluster, {
  foreignKey: 'clusterID',
})

module.exports = db