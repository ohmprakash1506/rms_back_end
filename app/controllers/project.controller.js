const db = require('../models');
const utils = require("../utils/utils.js");
const { Op, Sequelize } = require("sequelize");
const Project = db.project

const create = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let checkProject = await Project.findOne({
      where: {
        [Op.and]: Sequelize.where(
          Sequelize.fn("lower", Sequelize.col("name")),
          Sequelize.fn("lower", req.body.name)
        ),
        companyId: isAuth.companyId,
        type:req.body.type
      },
    });
    if (checkProject) {
      return res.status(422).json({
        message: "Project name already exists",
      });
    }
    const info = {
      name: req.body.name,
      description: req.body.description,
      type: req.body.type, //1:
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      clusterID: req.body.clusterID,
      companyId: isAuth.companyId,
      status: req.body.status,
    }
    try {
      const pro = await Project.create(info)
      res.status(200).send(pro)
    }
    catch (e) {
      res.status(500).send({ message: e })
    }
  } else {
    res.status(403).send({ message: "You don't have access to create a project" })
  }
}

const updateProject = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let id = req.params.id
    await Project.update(req.body, { where: { id: id } })
    res.status(200).send({ message: 'Updated successfully' })
  } else {
    res.status(403).send({ message: "You don't have access, Please check" })
  }
}

const deleteProject = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let id = req.params.id
    await Project.update({ status: false }, { where: { id: id } })
    res.status(200).send({ message: 'Deleted successfully' })
  } else {
    res.status(403).send({ message: "You don't have access, Please check" })
  }
}

module.exports = {
  create,
  updateProject,
  deleteProject
}