const db = require("../models");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
const utils = require("../utils/utils.js");
const enums = require("../utils/enum.js");
const { response } = require("express");
const Cluster = db.cluster;
const Project = db.project;
const ClientResource = db.clientResource;
const ProjectResource = db.projectResource;
const Resource = db.resource;
const User = db.user;

const create = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    let checkCluster = await Cluster.findOne({
      where: {
        [Op.and]: Sequelize.where(
          Sequelize.fn("lower", Sequelize.col("name")),
          Sequelize.fn("lower", req.body.name)
        ),
        companyId: isAuth.companyId,
      },
    });
    if (checkCluster) {
      return res.status(422).json({
        message: "Cluster name already exists",
      });
    }
    let info = {
      name: req.body.name,
      description: req.body.description,
      clusterHeadID: req.body.clusterHeadID,
      status: req.body.status,
      companyId: isAuth.companyId,
    };
    let randomColor =
      enums.clusterColors[
        Math.floor(Math.random() * enums.clusterColors.length)
      ];
    if (randomColor && randomColor.id) {
      info.colorCode = randomColor.id;
    }
    try {
      await Cluster.create(info);
      res.status(200).send({ message: "Cluster created successfully" });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a cluster" });
  }
};
const update = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    try {
      const id = req.params.id;
      const getCluster = await Cluster.findOne({ where: { id: id } });
      if (!getCluster) {
        res.status(400).send({ message: "Cluster not found" });
      }
      if (getCluster.colorCode == 0) {
        let randomColor =
          enums.clusterColors[
            Math.floor(Math.random() * enums.clusterColors.length)
          ];
        if (randomColor && randomColor.id) {
          req.body.colorCode = randomColor.id;
        }
      }
      await Cluster.update(req.body, { where: { id: id } });
      res.status(200).send({ message: "Cluster details updated successfully" });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a cluster" });
  }
};

const getAll = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let { page, page_size, sort, sort_type, name, month, year } = req.query;
    // page = Number(page) || 1
    // page_size = utils.getValidPageSize(page_size)
    // let offset = 0
    // if (page > 1) {
    //   offset = ((page - 1) * page_size)
    // }
    let date = new Date();
    let firstDayMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    let lastDayMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    //let projectWhere = {}
    // projectWhere.startDate = { [Op.between]: [firstDayMonth, lastDayMonth]}
    let where = { companyId: isAuth.companyId };
    if (isAuth.role == 2 && isAuth.userId) {
      where.clusterHeadID = isAuth.userId;
    }
    //name sorting
    if (name && name != undefined) {
      where = { ...where, name: { [Op.like]: `%${name}%` } };
    }
    //cluster sorting
    if (!sort) {
      sort = "id";
    }

    if (!sort_type) {
      sort_type = "desc";
    }
    if (sort != undefined && (sort || ("name" && sort) || "noOfProject")) {
      sort = sort;
    } else {
      sort = "id";
    }
    try {
      const id = req.params.id;
      let clusterData;
      if (id == "all") {
        clusterData = await Cluster.findAll({
          where: where,
          include: [
            {
              model: Project,
              include: [
                {
                  model: ClientResource,
                  include: [
                    {
                      model: ProjectResource,
                      include: [
                        {
                          model: Resource,
                          include: [
                            {
                              model: User,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          // offset:offset,
          // limit:page_size
        });
      } else if (id != undefined) {
        where.id = id;
        let checkProject = await Project.findAll({ where: { clusterID: id } });
        if (checkProject.length > 0) {
          clusterData = await Cluster.findAll({
            where: where,
            include: [
              {
                model: Project,
                include: [
                  {
                    model: ClientResource,
                    where: {
                      month: month ? month : moment().month(),
                      [Op.and]: Sequelize.where(
                        Sequelize.fn(
                          "YEAR",
                          Sequelize.col("projects->clientResources.createdAt")
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
                            include: [
                              {
                                model: User,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          });
        } else {
          clusterData = await Cluster.findAll({
            where: where,
            include: [
              {
                model: Project,
                include: [
                  {
                    model: ClientResource,
                    include: [
                      {
                        model: ProjectResource,
                        include: [
                          {
                            model: Resource,
                            include: [
                              {
                                model: User,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          });
        }
      } else {
        where.status = true;
        clusterData = await Cluster.findAll({
          where: where,
          attributes: {
            include: [
              "*",
              [
                Sequelize.literal(
                  "(SELECT COUNT(*) from projects where projects.clusterID=cluster.id)"
                ),
                "noOfProject",
              ],
            ],
          },
          include: [
            {
              model: Project,
              include: [
                {
                  model: ClientResource,
                  where:{month: moment().month()},
                  include: [
                    {
                      model: ProjectResource,
                      include: [
                        {
                          model: Resource,
                          include: [
                            {
                              model: User,
                            },
                          ],
                        },
                      ],
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
      // return res.send(clusterData);
      let resData = clusterData.map((cluster) => {
        const projects = utils.projectDetails(cluster.projects);
        let colorCode = {};
        if (cluster.colorCode != 0) {
          let cCode = enums.clusterColors.find(
            (itm) => itm.id == cluster.colorCode
          );
          if (cCode) {
            colorCode.colorCode = cCode.color;
          }
        }
        return {
          clusterID: cluster.id,
          name: cluster.name,
          description: cluster.description,
          clusterHeadID: cluster.clusterHeadID,
          projects: projects,
          noOfProject: projects.length,
          createdAt: cluster.createdAt,
          ...colorCode,
        };
      });
      if (resData.length == 1 && resData[0].projects.length > 0) {
        const monthRange = [];
        let endDate = moment(new Date());
        let startDate = resData[0].createdAt
          ? moment(resData[0].createdAt)
          : moment.now();
        if (startDate < endDate) {
          var dateR = endDate.endOf("month");
          while (dateR > startDate.startOf("month")) {
            monthRange.push({
              month: dateR.format("MMMM-YYYY"),
              monthNumber: dateR.month(),
              year: dateR.year(),
            });
            dateR.subtract(1, "month");
          }
        }

        // resData[0].projects.forEach(item => {
        //   if(item.monthRange && item.monthRange.length > 0){
        //     item.monthRange.forEach(itm => {
        //       rangeArr.push(itm)
        //     })
        //   }
        // })
        // const MonthRangeUnique = [
        //   ...new Map(rangeArr.map((item) => [item["month"], item])).values(),
        // ];
        resData[0]["monthRange"] = monthRange;
      }
      // if (req.query.sort == "noOfProject") {
      //   resData.sort(utils.sortResource("noOfProject", req.query.sort_type));
      // }
      res.status(200).send(resData);
    } catch (e) {
      console.log("dddd", e);
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a cluster" });
  }
};

const deleteCluster = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    try {
      const id = req.params.id;
      await Cluster.update({ status: false }, { where: { id: id } });
      res.status(200).send({ message: "Deleted successfully" });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a cluster" });
  }
};

const getChartAll = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let { month, start_date, end_date } = req.query;
    let id = req.params.id;
    let where = {};
    let cluster_where = { companyId: isAuth.companyId };
    if (isAuth.role == 2 && isAuth.userId) {
      cluster_where.clusterHeadID = isAuth.userId;
    }
    let begin_month =
      start_date != undefined
        ? moment(start_date)
        : month != undefined && Number.isInteger(parseInt(month))
        ? moment().subtract(month - 1, "month")
        : moment().month(0);

    let last_month = end_date != undefined ? moment(end_date) : moment();
    try {
      if (id != undefined) {
        let checkCluster = await Cluster.findAll({
          where: { id: id, companyId: isAuth.companyId, status: true },
        });
        if (!(checkCluster.length > 0)) {
          return res.status(404).send({ message: "Invalid Cluster Id." });
        }
        where.clusterID = id;
      }
      where.companyId = isAuth.companyId;
      where.status = true;
      const labels = [];
      const totalBudgetArray = [];
      const usedBudgetArray = [];
      let current_month = begin_month;
      while (
        moment(current_month).format("MMMM-YYYY") !=
        moment(last_month).add(1, "month").format("MMMM-YYYY")
      ) {
        let total_budget = 0;
        let used_budget = 0;
        var totlBudgetData = await Cluster.findAll({
          where: { ...cluster_where },
          include: [
            {
              model: Project,
              where: where,
              required: false,
              include: [
                {
                  model: ClientResource,
                  where: {
                    month: moment(current_month).month(),
                    [Op.and]: Sequelize.where(
                      Sequelize.fn(
                        "YEAR",
                        Sequelize.col("projects.clientResources.createdAt")
                      ),
                      moment(current_month).year()
                    ),
                  },
                  attributes: ["resourceBudget", "month"],
                  required: true,
                },
              ],
            },
          ],
        });
        totlBudgetData.forEach((el) => {
          el.projects.forEach((project) => {
            project.clientResources.forEach((budget) => {
              total_budget += budget.resourceBudget;
            });
          });
        });
        var usedBudgetData = await Cluster.findAll({
          where: cluster_where,
          include: [
            {
              model: Project,
              where: where,
              include: [
                {
                  model: ClientResource,
                  where: {
                    month: moment(current_month).month(),
                    [Op.and]: Sequelize.where(
                      Sequelize.fn(
                        "YEAR",
                        Sequelize.col("projects.clientResources.createdAt")
                      ),
                      moment(current_month).year()
                    ),
                  },
                  attributes: ["month"],
                  required: true,
                  include: [
                    {
                      model: ProjectResource,
                      attributes: ["usedBudget"],
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        });
        usedBudgetData.forEach((el) => {
          el.projects.forEach((project) => {
            project.clientResources.forEach((cResource) => {
              cResource.projectResources.forEach((pResource) => {
                used_budget += pResource.usedBudget;
              });
            });
          });
        });
        if (
          total_budget > 0 ||
          used_budget > 0 ||
          totalBudgetArray.length > 0
        ) {
          labels.push(moment(current_month).format("MMMM-YYYY"));
          totalBudgetArray.push(total_budget);
          usedBudgetArray.push(used_budget);
        }
        current_month = moment(current_month).add(1, "month");
      }
      return res.send({
        labels,
        dataset: [
          {
            label: "Total Budget",
            data: totalBudgetArray,
            fill: true,
            backgroundColor: "rgba(177, 133, 249, 0.5)",
            borderColor: "rgba(177, 133, 249, 1)",
            lineTension: 0.4,
            radius: 6,
          },
          {
            label: "Utilized Budget",
            data: usedBudgetArray,
            fill: true,
            backgroundColor: "rgba(2, 124, 255, 0.5)",
            borderColor: "rgba(2, 124, 255, 1)",
            lineTension: 0.4,
            radius: 6,
          },
        ],
      });
    } catch (e) {
      console.log("----------------------", e);
      return res.status(500).send({ message: e });
    }
  } else {
    return res
      .status(403)
      .send({ message: "You don't have access to this operation." });
  }
};

const clusterChart = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    let { month, start_date, end_date } = req.query;
    let begin_month =
      start_date != undefined
        ? moment(start_date)
        : month != undefined && Number.isInteger(parseInt(month))
        ? moment().subtract(month - 1, "month")
        : moment().month(0);

    let last_month = end_date != undefined ? moment(end_date) : moment();
    // let current_month = moment().month();
    try {
      let cluster_where = {};
      if (isAuth.role == 2 && isAuth.userId) {
        cluster_where.clusterHeadID = isAuth.userId;
      }
      let clusters = await Cluster.findAll({
        where: { ...cluster_where, companyId: isAuth.companyId, status: true },
      });
      const labels = [];
      let dataset = [];
      let current_month = begin_month;
      while (
        moment(current_month).format("MMMM-YYYY") !=
        moment(last_month).add(1, "month").format("MMMM-YYYY")
      ) {
        labels.push(moment(current_month).format("MMMM-YYYY"));
        current_month = moment(current_month).add(1, "month");
      }
      let where = {};
      await Promise.all(
        clusters.map(async (cluster) => {
          let cluster_id = cluster.id;
          let totalBudgetArray = [];
          let current_month = begin_month;
          while (
            moment(current_month).format("MMMM-YYYY") !=
            moment(last_month).add(1, "month").format("MMMM-YYYY")
          ) {
            let total_budget = 0;
            var totlBudgetData = await Project.findAll({
              attributes: [],
              where: {
                ...where,
                clusterID: cluster_id,
                companyId: isAuth.companyId,
              },
              include: [
                {
                  model: ClientResource,
                  where: {
                    month: moment(current_month).month(),
                    [Op.and]: Sequelize.where(
                      Sequelize.fn(
                        "YEAR",
                        Sequelize.col("clientResources.createdAt")
                      ),
                      moment(current_month).year()
                    ),
                  },
                  attributes: ["resourceBudget", "month"],
                  required: true,
                },
              ],
            });
            totlBudgetData.forEach((el) => {
              el.clientResources.forEach((budget) => {
                total_budget += budget.resourceBudget;
              });
            });
            totalBudgetArray.push(total_budget);
            current_month = moment(current_month).add(1, "month");
          }
          let red = Math.floor(Math.random() * 256);
          let green = Math.floor(Math.random() * 256);
          let blue = Math.floor(Math.random() * 256);
          dataset.push({
            label: utils.capitalizeFirstLetter(cluster.name),
            data: totalBudgetArray,
            fill: true,
            borderColor: utils.hexToRgbA(
              enums.clusterColors[clusters.indexOf(cluster)].color,
              1
            ),
            backgroundColor: utils.hexToRgbA(
              enums.clusterColors[clusters.indexOf(cluster)].color,
              0.2
            ),
            lineTension: 0.4,
            radius: 6,
          });
        })
      );
      let length = labels.length;
      let del = true;
      let flag = true;
      for (let index = 0; index < length; index++) {
        dataset.forEach((dataObj) => {
          if (dataObj.data[index] > 0) {
            del = false;
            flag = false;
          }
        });
        if (del && flag) {
          labels[index] = -1;
          dataset.forEach((dataObj) => {
            dataObj.data[index] = -1;
          });
        }
      }
      dataset.forEach((dataObj) => {
        dataObj.data = dataObj.data.filter((ele) => {
          return ele != -1;
        });
      });
      let label1 = labels.filter((ele) => {
        return ele != -1;
      });
      return res.send({ labels: label1, dataset });
    } catch (e) {
      console.log("----------------", e);
      return res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to this operation." });
  }
};

module.exports = {
  create,
  update,
  getAll,
  deleteCluster,
  getChartAll,
  clusterChart,
};
