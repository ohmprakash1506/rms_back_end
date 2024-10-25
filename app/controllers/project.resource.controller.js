const db = require("../models");
const utils = require("../utils/utils.js");
const enums = require("../utils/enum.js");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
const Cluster = db.cluster;
const Resource = db.resource;
const Project = db.project;
const ProjectResource = db.projectResource;
const ClientResource = db.clientResource;
const User = db.user;

const addResourceBudget = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    if (req.body.clientResourceID) {
      let checkClient = await ClientResource.findOne({
        where: { id: req.body.clientResourceID },
      });
      if (checkClient) {
        const info = {
          projectID: req.body.projectID,
          month: req.body.month,
          designation: req.body.designation,
          resourceBudget: req.body.resourceBudget,
          resourceHours: req.body.resourceHours,
          startDate: req.body.startDate,
          endDate: req.body.endDate,
        };
        try {
          await ClientResource.update(info, {
            where: { id: req.body.clientResourceID },
          });
          res.status(200).send({ message: "Update resource successfully" });
        } catch (e) {
          res.status(500).send({ message: e });
        }
      } else {
        res.status(400).json({
          message: "Please check clientResourceID is not correct",
        });
      }
    } else {
      const info = {
        projectID: req.body.projectID,
        month: req.body.month,
        designation: req.body.designation,
        resourceBudget: req.body.resourceBudget,
        resourceHours: req.body.resourceHours,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      };
      try {
        await ClientResource.create(info);
        res.status(200).send({ message: "Added resource successfully" });
      } catch (e) {
        res.status(500).send({ message: e });
      }
    }
  } else {
    res.status(403).send({ message: "You don't have access" });
  }
};

const deleteResourceBudget = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let id = req.params.id;
    let idList = [];
    if (id) {
      idList = id.split(",");
    }
    if (idList.length > 0) {
      for (let i = 0; i < idList.length; i++) {
        let checkResourceBudget = await ClientResource.findOne({
          where: { id: idList[i] },
        });
        if (checkResourceBudget) {
          await ClientResource.destroy({ where: { id: idList[i] } });
          let checkResource = await ProjectResource.findAll({
            where: { clientResourceID: id },
          });
          if (checkResource.length > 0) {
            for (let j = 0; j < checkResource.length; j++) {
              if (checkResource[j].id) {
                await ProjectResource.destroy({
                  where: { id: checkResource[j].id },
                });
              }
            }
          }
        }
      }
      res.status(200).send({ message: "Resource Budget delete successfully" });
    } else {
      res.status(400).json({
        message: "Project resource budget not found",
      });
    }
  } else {
    res.status(403).send({ message: "You don't have access" });
  }
};

const addResourceBudgetBulk = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    if (req.body.budgets == undefined) {
      return res.status(400).send({ message: "Budgets data is empty!" });
    }
    // else if(typeof req.body.budgets == "object" && req.body.budgets.length == 0){
    //   return res.status(400).send({ message: "Budgets accept only array" })
    // }
    for (let i = 0; i < req.body.budgets.length; i++) {
      let budget = req.body.budgets[i];
      let info = {};
      if (
        budget.projectID &&
        budget.designation &&
        budget.resourceBudget &&
        budget.resourceHours
      ) {
        info = {
          ...info,
          projectID: budget.projectID,
          designation: budget.designation,
          resourceBudget: budget.resourceBudget,
          resourceHours: budget.resourceHours,
        };
      }
      if (budget.month) {
        info.month = budget.month;
      }
      if (budget.startDate) {
        info.startDate = budget.startDate;
      }
      if (budget.endDate) {
        info.endDate = budget.endDate;
      }
      if (budget.clientResourceID) {
        let checkClient = await ClientResource.findOne({
          where: { id: budget.clientResourceID },
        });
        if (checkClient) {
          await ClientResource.update(info, {
            where: { id: budget.clientResourceID },
          });
        }
      } else {
        if (
          info.projectID &&
          info.designation &&
          info.resourceBudget &&
          info.resourceHours
        ) {
          await ClientResource.create(info);
        }
      }
    }
    res.status(200).send({ message: "Add resource budget successfully" });
  } else {
    res.status(403).send({ message: "You don't have access" });
  }
};

const addResource = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    const { month, year } = req.query;
    if (!req.body.usedBudget && !req.body.usedHours) {
      res
        .status(200)
        .send({ message: "allocated hours and salary is required" });
    }
    if (req.body.projectResourceID != undefined) {
      const getProjectResource = await ProjectResource.findOne({
        where: { id: req.body.projectResourceID },
      });
      if (getProjectResource) {
        let utilizedHours = 0;
        let freeHours = 0;
        const getResource = await ProjectResource.findAll({
          include: [
            {
              model: Resource,
              where: { id: req.body.resourceID },
            },
            {
              model: ClientResource,
              where: {
                month: month ? month : moment().month(),
                [Op.and]: Sequelize.where(
                  Sequelize.fn(
                    "YEAR",
                    Sequelize.col("clientResource.createdAt")
                  ),
                  year ? year : moment().year()
                ),
              },
            },
          ],
        });
        if (getResource && getResource.length > 0) {
          getResource.forEach((val) => {
            if (val.id != req.body.projectResourceID) {
              utilizedHours = utilizedHours + val.usedHours;
            }
          });
          freeHours = enums.totalWorkingHours - utilizedHours;
        }
        if (utilizedHours > 0) {
          if (utilizedHours == enums.totalWorkingHours) {
            if (getProjectResource.usedHours !== req.body.usedHours) {
              return res.status(400).json({
                message: "160 hours allowcated in current month",
              });
            }
          }
          if (freeHours > 0 && req.body.usedHours > freeHours) {
            return res.status(400).json({
              message: `Only ${freeHours} available in current month`,
            });
          }
        }
        if (
          utilizedHours + Number(req.body.usedHours) >
          enums.totalWorkingHours
        ) {
          return res.status(400).json({
            message: "160 hours allowcated in current month",
          });
        }
        const info = {
          clientResourceID: req.body.clientResourceID,
          resourceID: req.body.resourceID,
          usedHours: req.body.usedHours,
          usedBudget: req.body.usedBudget, //need to put the logic
          resourceHours: req.body.resourceHours,
          // designation: req.body.designation,
          startDate: req.body.startDate,
        };
        if (req.body.endDate) {
          info["endDate"] = req.body.endDate;
        }
        try {
          await ProjectResource.update(info, {
            where: { id: getProjectResource.id },
          });
          res.status(200).send({ message: "Update resource successfully" });
        } catch (e) {
          res.status(500).send({ message: e });
        }
      } else {
        res.status(400).json({
          message: "Please check projectResourceId is not correct",
        });
      }
    } else {
      const info = {
        clientResourceID: req.body.clientResourceID,
        resourceID: req.body.resourceID,
        usedHours: req.body.usedHours,
        usedBudget: req.body.usedBudget, //need to put the logic
        resourceHours: req.body.resourceHours,
        // designation: req.body.designation,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      };
      try {
        await ProjectResource.create(info);
        res.status(200).send({ message: "Added resource successfully" });
      } catch (e) {
        res.status(500).send({ message: e });
      }
    }
  } else {
    res.status(403).send({ message: "You don't have access" });
  }
};

const deleteProjectresourceId = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let id = req.params.id;
    let checkResource = await ProjectResource.findOne({ where: { id: id } });
    if (!checkResource) {
      res.status(400).json({
        message: "Project resource not found",
      });
    }
    try {
      await ProjectResource.destroy({ where: { id: id } });
      res.status(200).send({ message: "Prject resource delete successfully" });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res.status(403).send({ message: "You don't have access" });
  }
};

const getAllProject = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let {
      page,
      page_size,
      cluster,
      status,
      sort,
      sort_type,
      name,
      month,
      year,
    } = req.query;
    // page = Number(page) || 1
    // page_size = utils.getValidPageSize(page_size)
    // let offset = 0
    // if (page > 1) {
    //   offset = ((page - 1) * page_size)
    // }
    let date = new Date();
    let firstDayMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    let lastDayMonth = new Date(date.getFullYear(), date.getMonth() + 3, 0);
    const id = req.params.id;
    let where = { companyId: isAuth.companyId };

    if (cluster && cluster != undefined && cluster != "all") {
      let cldids = cluster.split(",");
      if (cldids && cldids.length > 0) {
        where.clusterID = { [Op.in]: cldids };
      }
    }
    //name sorting
    if (name && name != undefined) {
      where = { ...where, name: { [Op.like]: `%${name}%` } };
    }
    if (status && status != undefined) {
      let statusArr = status.split(",").map(Number);
      if (statusArr.includes(1) && statusArr.includes(0)) {
        where = {
          ...where,
          [Op.or]: [
            {
              status: {
                [Op.eq]: true,
              },
            },
            {
              status: {
                [Op.eq]: false,
              },
            },
          ],
        };
      } else if (statusArr.includes(1) && !statusArr.includes(0)) {
        where = {
          ...where,
          status: {
            [Op.eq]: true,
          },
        };
      } else if (statusArr.includes(0) && !statusArr.includes(1)) {
        where = {
          ...where,
          status: {
            [Op.eq]: false,
          },
        };
      }
    } else {
      where = {
        ...where,
        status: {
          [Op.eq]: true,
        },
      };
    }
    if (isAuth.role == 2 && !cluster) {
      let clusterIds = [];
      let getCluster = await Cluster.findOne({
        where: { clusterHeadID: isAuth.userId },
        attributes: [[Sequelize.fn("GROUP_CONCAT", Sequelize.col("id")), "id"]],
        group: ["clusterHeadID"],
      });
      if (getCluster && getCluster.id) {
        clusterIds = getCluster.id.split(",").map(Number);
      }
      where.clusterID = {
        [Op.in]: clusterIds,
      };
    }
    //project sorting
    if (!sort) {
      sort = "id";
    }

    if (!sort_type) {
      sort_type = "desc";
    }
    if (
      sort != undefined &&
      (sort === "name" || sort === "type" || sort === "startDate")
    ) {
      sort = sort;
    } else {
      sort = "id";
    }
    let projectResourceMap;
    if (id == "all") {
      projectResourceMap = await Project.findAll({
        where: where,
        include: [
          {
            model: ClientResource,
            include: [
              {
                model: ProjectResource,
                include: [
                  {
                    model: Resource,
                    include: [User],
                  },
                ],
              },
            ],
          },
        ],
        // offset:offset,
        //limit:page_size,
        order: [[sort, sort_type]],
      });
    } else if (id != undefined) {
      projectResourceMap = await Project.findAll({
        where: { id: id, companyId: isAuth.companyId },
        include: [
          {
            model: ClientResource,
            required: false,
            where: {
              month: month ? month : moment().month(),
              [Op.and]: Sequelize.where(
                Sequelize.fn(
                  "YEAR",
                  Sequelize.col("clientResources.createdAt")
                ),
                year ? year : moment().year()
              ),
            },
            include: [
              {
                model: ProjectResource,
                include: [
                  {
                    model: Resource,
                    include: [User],
                  },
                ],
              },
            ],
          },
        ],
      });
      
    } else {
      // where.status = true
      projectResourceMap = await Project.findAll({
        where: where,
        include: [
          {
            model: ClientResource,
            required: false,
            // where: { month: moment().month() },
            include: [
              {
                model: ProjectResource,
                include: [
                  {
                    model: Resource,
                    include: [User],
                  },
                ],
              },
            ],
          },
        ],
        // offset:offset,
        // limit:page_size,
        order: [[sort, sort_type]],
      });
    }
    projectDetails = utils.projectDetails(projectResourceMap);
    if (
      req.query.sort === "totalBudget" ||
      req.query.sort === "usedBudget" ||
      req.query.sort === "resourceCount"
    ) {
      await projectDetails.sort(
        utils.sortResource(req.query.sort, req.query.sort_type)
      );
    }
    if(id != undefined && projectDetails.length == 1 && month && year){
      if(projectDetails[0].budgets.length == 0){
        const chekPreMonth = await ClientResource.findAll({
          where:{
            projectID:projectDetails[0].projectID,
            month: month > 0 ? month-1 : 11,
            [Op.and]: Sequelize.where(
              Sequelize.fn(
                "YEAR",
                Sequelize.col("clientResource.createdAt")
              ),
              year ? year : moment().year()
            ),
          }
        })
        if(chekPreMonth.length > 0){
          projectDetails[0].clone = true
        }else{
          projectDetails[0].clone = false
        }
      }else{
        projectDetails[0].clone = false
      }
      
    }
    res.status(200).send(projectDetails);
  } else {
    res.status(403).send({ message: "You don't have access, Please check" });
  }
};

const cloneResources = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    const { projectId } = req.body;
    const { month, year } = req.query;
    if (projectId == undefined) {
      return res.status(403).send({ message: "Project id is required" });
    }
    const startOfMonth = moment([year, month - 1]).format("YYYY-MM-DD");
    const endOfMonth = moment(startOfMonth).endOf('month').format("YYYY-MM-DD");
  
    const checkProject = await Project.findOne({
      where: { id: projectId, companyId: isAuth.companyId },
    });
    if (!checkProject) {
      return res.status(403).send({ message: "Please enter valid projectId" });
    }
    let checkMonth = 11;
    if (month) {
      checkMonth = month - 1;
    } else {
      if (moment().month() > 0) {
        checkMonth = moment().month() - 1;
      }
    }
    let preMonth = 0;
    if (month) {
      preMonth = month;
    } else {
      if (moment().month() > 0) {
        preMonth = moment().month();
      }
    }
    const checkClient = await ClientResource.findAll({
      where: {
        projectId: checkProject.id,
        month: month ? month : moment().month(),
        [Op.and]: Sequelize.where(
          Sequelize.fn(
            "YEAR",
            Sequelize.col("clientResource.createdAt")
          ),
          year ? year : moment().year()
        ),
      },
    });
    if (checkClient.length == 0) {
      const getClient = await ClientResource.findAll({
        where: { projectId: checkProject.id, month: checkMonth },
      });
      if (getClient.length > 0) {
        for (let i = 0; i < getClient.length; i++) {
          const info = {
            projectID: projectId,
            month: month ? month : moment().month(),
            designation: getClient[i].designation,
            resourceBudget: getClient[i].resourceBudget,
            resourceHours: getClient[i].resourceHours,
            startDate: startOfMonth,
            endDate: endOfMonth
          };
          const cClient = await ClientResource.create(info);
          if (cClient) {
            const getRes = await ProjectResource.findAll({
              where: {
                clientResourceID: getClient[i].id
              }
            });
            if (getRes.length > 0) {
              for (let j = 0; j < getRes.length; j++) {
                const insDt = {
                  clientResourceID: cClient.id,
                  resourceID: getRes[j].resourceID,
                  usedHours: getRes[j].usedHours,
                  usedBudget: getRes[j].usedBudget,
                  resourceHours: getRes[j].resourceHours,
                  startDate: startOfMonth,
                  endDate: endOfMonth,
                };
                await ProjectResource.create(insDt);
              }
            }
          }
        }
      }
    }
    return res.status(200).send({ message: "Resource clone successfully" });
  } else {
    res.status(403).send({ message: "You don't have access" });
  }
};

module.exports = {
  addResourceBudget,
  addResource,
  getAllProject,
  addResourceBudgetBulk,
  cloneResources,
  deleteProjectresourceId,
  deleteResourceBudget,
};
