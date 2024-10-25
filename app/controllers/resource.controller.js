const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Op, Sequelize, where } = require("sequelize");
const db = require("../models");
const utils = require("../utils/utils.js");
const enums = require("../utils/enum.js");
const email = require("../utils/emails.js");
const readXlsxFile = require("read-excel-file/node");
const moment = require("moment");
const { update } = require("./cluster.controller");

const Resource = db.resource;
const ProjectResource = db.projectResource;
const ClientResource = db.clientResource;
const Project = db.project;
const Cluster = db.cluster;
const User = db.user;
const MasterEnum = db.masterEnum;
const addResourceUser = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && (isAuth.role < req.body.role || isAuth.role == 1)) {
    try {
      const pass = await bcrypt.hash(utils.generatePassword(), 10);

      let checkEmail = await User.findOne({ where: { email: req.body.email } });
      if (checkEmail) {
        let checkProfile = await Resource.findOne({
          where: { userId: checkEmail.id },
        });
        if (checkProfile) {
          return res.status(400).send({ message: "Email already exist" });
        } else {
          let updateUser = await User.update(
            { role: req.body.role },
            { where: { id: checkEmail.id } }
          );
          delete checkEmail.password;
          return res.status(200).send({ data: checkEmail });
        }
      }
      let user = {
        role: req.body.role, //2:Cluster, 3:HR, 4:resources,
        email: req.body.email,
        password: pass,
        status: 1,
        companyId: isAuth.companyId,
      };

      const usr = await User.create(user);
      delete usr.password;
      // let token = jwt.sign(
      //   {
      //     name: usr.name,
      //     email: usr.email,
      //     userId: usr.id,
      //     role: usr.role,
      //     companyId: usr.companyId
      //   },
      //   process.env.JWT_KEY,
      //   {
      //     expiresIn: "1d"
      //   }
      // )
      // let url = `${process.env.URL}/${token}`
      // let emailOptions = {
      //   from: '"RMS Gloify" <rmsgloify@gmail.com>',
      //   to: req.body.email,
      //   subject: 'Invitation from RMS',
      //   html: email.invitationEmail(req.body.name, isAuth.name, req.body.email, pass, url)
      // }
      // utils.mailSender(emailOptions)
      res.status(200).send({ data: usr });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const addResource = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && (isAuth.role < req.body.role || isAuth.role == 1)) {
    try {
      if (
        req.body.role == 4 &&
        req.body.designation.toLowerCase() == "cluster head"
      ) {
        res
          .status(403)
          .send({ message: "You don't have access to create a cluster head" });
      }
      if (!req.body.userId) {
        return res.status(400).send({ message: "UserId is required" });
      }
      let info = {
        name: req.body.name,
        phone: req.body.phone,
        experience: req.body.experience,
        salary: utils.encrypt(req.body.salary),
        dateOfJoining: req.body.dateOfJoining,
        userId: req.body.userId,
        companyId: isAuth.companyId,
      };
      if (req.body.dob) {
        info.dob = req.body.dob;
      }
      if (req.body.role == 1) {
        info.is_owner = 1;
      }
      if (req.body.lastname) {
        info.lastName = req.body.lastname;
      }
      if (req.body.department) {
        let detDept = await MasterEnum.findOne({
          where: {
            [Op.and]: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("name")),
              Sequelize.fn("lower", req.body.department)
            ),
            type: "department",
            companyId: isAuth.companyId,
          },
        });
        if (detDept) {
          info.department = detDept.name;
        }
      }
      if (req.body.department && req.body.designation) {
        let detDept = await MasterEnum.findOne({
          where: {
            [Op.and]: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("name")),
              Sequelize.fn("lower", req.body.department)
            ),
            type: "department",
            companyId: isAuth.companyId,
          },
        });
        if (detDept) {
          let checkDesignationData = await MasterEnum.findOne({
            where: {
              type: "designation",
              companyId: isAuth.companyId,
              [Op.and]: Sequelize.where(
                Sequelize.fn("lower", Sequelize.col("name")),
                Sequelize.fn("lower", req.body.designation)
              ),
            },
          });
          if (checkDesignationData) {
            info.designation = checkDesignationData.name;
          }
        }
      }
      if (req.body.skills) {
        let skillsArr = req.body.skills.split(",");
        let skills = [];
        if (skillsArr.length > 0) {
          for (let j = 0; j < skillsArr.length; j++) {
            let checkSkillData = await MasterEnum.findOne({
              where: {
                type: "skills",
                status: true,
                companyId: isAuth.companyId,
                [Op.and]: Sequelize.where(
                  Sequelize.fn("lower", Sequelize.col("name")),
                  Sequelize.fn("lower", skillsArr[j])
                ),
              },
            });
            if (checkSkillData) {
              skills.push(checkSkillData.name);
            }
          }
        }
        if (skills.length > 0) {
          info.skills = skills.join(",");
        }
      }
      await Resource.create(info);

      res.status(200).send({ message: "Added successfully" });
    } catch (e) {
      console.log("ddd", e);
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const celebrationFilter = (where, celebration) => {
  var today = moment().date();
  var month = moment().month() + 1;
  let celebrationArr = celebration.split(",");
  if (
    celebrationArr.includes("birthday") &&
    celebrationArr.includes("workAnniversary")
  ) {
    where = {
      ...where,
      [Op.or]: [
        Sequelize.where(Sequelize.fn("day", Sequelize.col("dob")), today),
        Sequelize.where(
          Sequelize.fn("day", Sequelize.col("dateOfJoining")),
          today
        ),
      ],
      [Op.and]: {
        [Op.or]: [
          Sequelize.where(Sequelize.fn("month", Sequelize.col("dob")), month),
          Sequelize.where(
            Sequelize.fn("month", Sequelize.col("dateOfJoining")),
            month
          ),
        ],
      },
    };
    return where;
  } else if (
    celebrationArr.includes("workAnniversary") &&
    !celebrationArr.includes("birthday")
  ) {
    where = {
      ...where,
      [Op.or]: [
        Sequelize.where(
          Sequelize.fn("day", Sequelize.col("dateOfJoining")),
          today
        ),
      ],
      [Op.and]: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn("month", Sequelize.col("dateOfJoining")),
            month
          ),
        ],
      },
    };
    return where;
  } else if (
    celebrationArr.includes("birthday") &&
    !celebrationArr.includes("workAnniversary")
  ) {
    where = {
      ...where,
      [Op.or]: [
        Sequelize.where(Sequelize.fn("day", Sequelize.col("dob")), today),
      ],
      [Op.and]: {
        [Op.or]: [
          Sequelize.where(Sequelize.fn("month", Sequelize.col("dob")), month),
        ],
      },
    };
    return where;
  }
};

const getAllResource = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 3) {
    try {
      let {
        page,
        page_size,
        designation,
        cluster,
        celebration,
        status,
        sort,
        sort_type,
        name,
        lastName,
        month,
        year,
      } = req.query;
      page = Number(page) || 1;
      page_size = utils.getValidPageSize(page_size);
      const firstDayMonth = new Date(
        moment().clone().startOf("month").format("YYYY-MM-DD")
      );
      const lastDayMonth = new Date(
        moment().clone().endOf("month").format("YYYY-MM-DD")
      );
      var today = moment().date();
      var cur_month = moment().month() + 1;
      var cur_year = moment().year();
      let offset = 0;
      let monthRange = [];

      if (page > 1) {
        offset = (page - 1) * page_size;
      }
      let projectWhere = {};
      projectWhere.startDate = { [Op.between]: [firstDayMonth, lastDayMonth] };
      let where = {};
      if (isAuth.role != 1) {
        where.is_owner = { [Op.ne]: 1 };
      }
      if (designation && designation != undefined) {
        where.designation = designation;
      }
      if (celebration && celebration != undefined) {
        let celebrationArr = celebration.split(",");
        if (
          celebrationArr.includes("birthday") &&
          celebrationArr.includes("workAnniversary")
        ) {
          where = {
            ...where,
            [Op.or]: [
              {
                [Op.and]: [
                  Sequelize.where(
                    Sequelize.fn("day", Sequelize.col("dob")),
                    today
                  ),
                  Sequelize.where(
                    Sequelize.fn("month", Sequelize.col("dob")),
                    cur_month
                  ),
                ],
              },
              {
                [Op.and]: [
                  Sequelize.where(
                    Sequelize.fn("day", Sequelize.col("dateOfJoining")),
                    today
                  ),
                  Sequelize.where(
                    Sequelize.fn("month", Sequelize.col("dateOfJoining")),
                    cur_month
                  ),
                  Sequelize.where(
                    Sequelize.fn("year", Sequelize.col("dateOfJoining")),
                    { [Op.ne]: cur_year }
                  ),
                ],
              },
            ],
          };
        } else if (
          celebrationArr.includes("workAnniversary") &&
          !celebrationArr.includes("birthday")
        ) {
          where = {
            ...where,
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn("day", Sequelize.col("dateOfJoining")),
                today
              ),
              Sequelize.where(
                Sequelize.fn("month", Sequelize.col("dateOfJoining")),
                cur_month
              ),
              Sequelize.where(
                Sequelize.fn("year", Sequelize.col("dateOfJoining")),
                { [Op.ne]: cur_year }
              ),
            ],
          };
        } else if (
          celebrationArr.includes("birthday") &&
          !celebrationArr.includes("workAnniversary")
        ) {
          where = {
            ...where,
            [Op.and]: [
              Sequelize.where(Sequelize.fn("day", Sequelize.col("dob")), today),
              Sequelize.where(
                Sequelize.fn("month", Sequelize.col("dob")),
                cur_month
              ),
            ],
          };
        }
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
      //name sorting
      if (name && name != undefined) {
        where = { ...where, name: { [Op.like]: `%${name}%` } };
      }
      const id = req.params.id;
      const role = isAuth.role == 1 ? [1, 2, 3, 4] : [2, 3, 4];
      if (isAuth.userId) {
        where = { ...where, userId: { [Op.ne]: `${isAuth.userId}` } };
      }
      //sorting
      if (!sort) {
        sort = "id";
      }

      if (!sort_type) {
        sort_type = "desc";
      }
      if (
        sort != undefined &&
        (sort === "name" ||
          sort === "lastName" ||
          sort === "dateOfJoining" ||
          sort === "designation" ||
          sort === "department" ||
          sort === "experience")
      ) {
        sort = sort;
      } else {
        sort = "id";
      }
      let userData;
      if (id == "all") {
        userData = await User.findAll({
          where: { companyId: isAuth.companyId, role: role },
          include: [
            {
              model: Resource,
              where: where,
              include: [
                {
                  model: ProjectResource,
                  where: projectWhere,
                  required: false,
                  include: [
                    {
                      model: ClientResource,
                      include: [
                        {
                          model: Project,
                          include: [
                            {
                              model: Cluster,
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
          offset: offset,
          limit: page_size,
        });
      } else if (id != undefined) {
        userData = await User.findAll({
          where: { id: id, companyId: isAuth.companyId, role: role },
          include: [
            {
              model: Resource,
              include: [
                {
                  model: ProjectResource,
                  required: false,
                  include: [
                    {
                      model: ClientResource,
                      required: false,
                      where: {
                        month: month ? month : moment().month(),
                        [Op.and]: Sequelize.where(
                          Sequelize.fn(
                            "YEAR",
                            Sequelize.col(
                              "resource.projectResources.clientResource.createdAt"
                            )
                          ),
                          year ? year : moment().year()
                        ),
                      },
                      include: [
                        {
                          model: Project,
                          include: [
                            {
                              model: Cluster,
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
        where.companyId = isAuth.companyId;
        // where.status = true
        if (
          (cluster && cluster != undefined) ||
          req.query.sort === "utilisation" ||
          req.query.sort == "salary" ||
          req.query.sort === "projects"
        ) {
          offset = null;
          page_size = null;
        }
        let { count, rows } = await Resource.findAndCountAll({
          where: where,
          distinct: true,
          include: [
            {
              model: User,
              where: { role: role },
            },
            {
              model: ProjectResource,
              required: false,
              include: [
                {
                  model: ClientResource,
                  required: false,
                  where: {
                    month: moment().month(),
                    // year: moment().year()
                  },
                  include: [
                    {
                      model: Project,
                      include: [
                        {
                          model: Cluster,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          offset: offset,
          limit: page_size,
          order: [[sort, sort_type]],
        });
        if (rows.length > 0) {
          let cldIds = [];
          if (cluster && cluster != undefined) {
            count = 0;
            cldIds = cluster.split(",").map(Number);
          }

          const rsList = rows
            .map((resource) => {
              let projects = 0;
              let usedHours = 0;
              let userHours = enums.totalWorkingHours;
              let clusters;
              let clid;
              if (resource.projectResources) {
                // projects = resource.projectResources.length;
                rData = resource.projectResources.map((project) => {
                  if (
                    project.clientResource &&
                    project.clientResource.month == moment().month() &&
                    moment(project.clientResource.createdAt).year() ==
                      moment().year()
                  ) {
                    usedHours += project.usedHours;
                    projects += 1;
                  }

                  if (
                    project.clientResource &&
                    project.clientResource.project &&
                    project.clientResource.project.cluster
                  ) {
                    clusters = project.clientResource.project.cluster.name;
                    clid = project.clientResource.project.cluster.id;
                  }
                });
              }
              if (
                cldIds.length > 0 &&
                clid != undefined &&
                cldIds.includes(clid)
              ) {
                let gexp = 0;
                if (resource.dateOfJoining) {
                  count++;
                  let cDate = new Date();
                  var startMonth =
                    new Date(resource.dateOfJoining).getFullYear() * 12 +
                    new Date(resource.dateOfJoining).getMonth();
                  var endMonth = cDate.getFullYear() * 12 + cDate.getMonth();
                  var monthInterval = endMonth - startMonth;

                  var yearsOfExperience = Math.floor(monthInterval / 12);
                  var monthsOfExperience = monthInterval % 12;
                  if (yearsOfExperience > 0) {
                    gexp = yearsOfExperience;
                  }
                }
                if (isAuth.role == 1) {
                  return {
                    resourceID: resource.id,
                    userId: resource.userId,
                    name: utils.capitalizeFirstLetter(resource.name),
                    lastName: utils.capitalizeFirstLetter(resource.lastName),
                    cluster: clusters,
                    utilisation: parseFloat(
                      ((usedHours / userHours) * 100).toFixed(2)
                    ),
                    free: Math.abs(usedHours - userHours),
                    department: resource.department,
                    designation: resource.designation,
                    projects: projects,
                    skills: resource.skills,
                    experience: resource.experience,
                    gexperience: gexp,
                    salary: Number(utils.decrypt(resource.salary)),
                  };
                } else {
                  return {
                    resourceID: resource.id,
                    userId: resource.userId,
                    name: utils.capitalizeFirstLetter(resource.name),
                    lastName: utils.capitalizeFirstLetter(resource.lastName),
                    cluster: cluster,
                    utilisation: parseFloat(
                      ((usedHours / userHours) * 100).toFixed(2)
                    ),
                    free: Math.abs(usedHours - userHours),
                    department: resource.department,
                    designation: resource.designation,
                    projects: projects,
                    skills: resource.skills,
                    experience: resource.experience,
                    gexperience: gexp,
                  };
                }
              }
              if (cldIds.length == 0) {
                let gexp = 0;
                if (resource.dateOfJoining) {
                  let cDate = new Date();
                  var startMonth =
                    new Date(resource.dateOfJoining).getFullYear() * 12 +
                    new Date(resource.dateOfJoining).getMonth();
                  var endMonth = cDate.getFullYear() * 12 + cDate.getMonth();
                  var monthInterval = endMonth - startMonth;

                  var yearsOfExperience = Math.floor(monthInterval / 12);
                  var monthsOfExperience = monthInterval % 12;
                  if (yearsOfExperience > 0) {
                    gexp = yearsOfExperience;
                  }
                }
                if (isAuth.role == 1) {
                  return {
                    resourceID: resource.id,
                    userId: resource.userId,
                    name: utils.capitalizeFirstLetter(resource.name),
                    lastName: utils.capitalizeFirstLetter(resource.lastName),
                    cluster: clusters,
                    utilisation: parseFloat(
                      ((usedHours / userHours) * 100).toFixed(2)
                    ),
                    free: Math.abs(usedHours - userHours),
                    department: resource.department,
                    designation: resource.designation,
                    projects: projects,
                    skills: resource.skills,
                    experience: resource.experience,
                    gexperience: gexp,
                    salary: Number(utils.decrypt(resource.salary)),
                  };
                } else {
                  return {
                    resourceID: resource.id,
                    userId: resource.userId,
                    name: utils.capitalizeFirstLetter(resource.name),
                    lastName: utils.capitalizeFirstLetter(resource.lastName),
                    cluster: cluster,
                    utilisation: parseFloat(
                      ((usedHours / userHours) * 100).toFixed(2)
                    ),
                    free: Math.abs(usedHours - userHours),
                    department: resource.department,
                    designation: resource.designation,
                    projects: projects,
                    skills: resource.skills,
                    experience: resource.experience,
                    gexperience: gexp,
                  };
                }
              }
            })
            .filter(function (el) {
              return el != null;
            });
          if (
            req.query.sort === "utilisation" ||
            req.query.sort == "salary" ||
            req.query.sort == "projects"
          ) {
            rsList.sort(
              utils.sortResource(req.query.sort, req.query.sort_type)
            );
          }
          return res
            .status(200)
            .send({ results: rsList, total: count, page: page });
        }
      }
      if (userData) {
        const rsList = userData.map((user) => {
          if (id != "all" && id != undefined) {
            let endDate = moment(new Date());
            let startDate = user.resource.dateOfJoining
              ? moment(user.resource.dateOfJoining)
              : moment.now();
            if (startDate < endDate) {
              var date = endDate.endOf("month");
              while (date > startDate.startOf("month")) {
                monthRange.push({
                  month: date.format("MMMM-YYYY"),
                  monthNumber: date.month(),
                  year: date.year(),
                });
                date.subtract(1, "month");
              }
            }
          }
          let projects = [];
          let usedHours = 0;
          let usedBudget = 0;
          let userHours = enums.totalWorkingHours;
          let clusterIds;
          if (user.resource && user.resource.projectResources) {
            projects = user.resource.projectResources
              .map((project) => {
                if (project.clientResource) {
                  if (project.clientResource.project.clusterID) {
                    clusterIds = project.clientResource.project.clusterID;
                  }
                  usedHours += project.usedHours;
                  usedBudget += project.usedBudget;
                  return {
                    usedBudget: project.usedBudget,
                    usedHours: project.usedHours,
                    projectID: project.clientResource.projectID,
                    resourceHours: project.resourceHours,
                    resourceStartDate: project.startDate,
                    resourceEndDate: project.endDate,
                    resourceBudget: project.clientResource.resourceBudget,
                    hours: project.clientResource.resourceHours,
                    startDate: project.clientResource.startDate,
                    endDate: project.clientResource.endDate,
                    name: project.clientResource.project.name,
                    description: project.clientResource.project.description,
                    type: project.clientResource.project.type,
                    clusterID: project.clientResource.project.clusterID,
                    status: project.clientResource.project.status,
                  };
                }
              })
              .filter(function (el) {
                return el;
              });
          }
          let salary = 0;
          if (isAuth.role == 1) {
            if (user.resource && user.resource.salary) {
              salary = utils.decrypt(user.resource.salary);
            }
          } else if (isAuth.role == 2 && user.role > 2) {
            if (user.resource && user.resource.salary) {
              salary = utils.decrypt(user.resource.salary);
            }
          } else if (isAuth.role == 3 && user.role > 3) {
            if (user.resource && user.resource.salary) {
              salary = utils.decrypt(user.resource.salary);
            }
          }
          let gexp = 0;
          if (user.resource && user.resource.dateOfJoining) {
            let cDate = new Date();
            var startMonth =
              new Date(user.resource.dateOfJoining).getFullYear() * 12 +
              new Date(user.resource.dateOfJoining).getMonth();
            var endMonth = cDate.getFullYear() * 12 + cDate.getMonth();
            var monthInterval = endMonth - startMonth;

            var yearsOfExperience = Math.floor(monthInterval / 12);
            var monthsOfExperience = monthInterval % 12;
            if (yearsOfExperience > 0 || monthsOfExperience > 0) {
              gexp = { year: yearsOfExperience, months: monthsOfExperience };
            }
          }
          return {
            resourceID: user.id,
            name: utils.capitalizeFirstLetter(user.resource.name),
            lastName: utils.capitalizeFirstLetter(user.resource.lastName),
            email: user.email,
            role: user.role,
            designation: user.resource.designation,
            phone: user.resource.phone,
            experience: user.resource.experience,
            salary: salary,
            dateOfJoining: user.resource.dateOfJoining,
            gexperience: gexp,
            skills: user.resource.skills,
            projects: projects,
            status: user.resource.status,
            dob: user.resource.dob,
            department: user.resource.department,
            clusterID: clusterIds,
            utilisation: parseFloat(((usedHours / userHours) * 100).toFixed(2)),
            usedBudget: usedBudget,
            monthRange,
          };
        });
        if (req.query.sort === "utilisation") {
          await rsList.sort(
            utils.sortResource(req.query.sort, req.query.sort_type)
          );
        }
        res.status(200).send(rsList);
      } else {
        if (id == undefined) {
          return res.status(200).send({ results: [], total: 0, page: 0 });
        } else {
          res.status(200).send([]);
        }
      }
    } catch (e) {
      console.log("ddd", e);
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const updateStatusResource = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth) {
    let id = req.params.id;
    const { status } = req.body;
    if (!id && id == undefined) {
      return res.status(400).send({ message: "Resource id is required" });
    } else if (!status && status == undefined) {
      return res.status(400).send({ message: "User id is required" });
    }
    let checkUser = await Resource.findOne({ where: { userId: id } });
    if (!checkUser) {
      return res.status(400).send({ message: "User not found" });
    }
    await Resource.update({ status: status }, { where: { userId: id } });
    res.status(200).send({ message: "Status change successfully" });
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

//chnage resource role
const updateResourceRole = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    let id = req.params.id;
    const { role } = req.body;
    if (!id && id == undefined) {
      return res.status(400).send({ message: "User id is required" });
    } else if (!role && role == undefined) {
      return res.status(400).send({ message: "Role is required" });
    }
    let checkUser = await User.findOne({ where: { id: id } });
    if (!checkUser) {
      return res.status(400).send({ message: "User not found" });
    }
    let checkResource = await Resource.findOne({ where: { userId: id } });

    await User.update({ role: role }, { where: { id: id } });
    if (checkResource) {
      let upData = {};
      if (role == 1) {
        upData.is_owner = 1;
        await Resource.update(upData, { where: { userId: id } });
      }
    }
    res.status(200).send({ message: "Role change successfully" });
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const updateResource = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 3) {
    let id = req.params.id;
    if (!id && id == undefined) {
      return res.status(400).send({ message: "Resource id is required" });
    }
    let checkResource = await Resource.findOne({ where: { userId: id } });
    if (!checkResource) {
      return res.status(400).send({ message: "Resource not found" });
    }
    if (
      req.body.role == 4 &&
      req.body.designation &&
      req.body.designation.toLowerCase() == "cluster head"
    ) {
      return res
        .status(403)
        .send({ message: "You don't have access to create a cluster head" });
    }
    let resourceUpdate = {};
    const {
      designation,
      department,
      phone,
      experience,
      salary,
      dateOfJoining,
      skills,
      name,
      lastname,
      dob,
    } = req.body;
    if (name && name != undefined) {
      resourceUpdate.name = name;
    }
    if (lastname && lastname != undefined) {
      resourceUpdate.lastName = lastname;
    } else {
      resourceUpdate.lastName = "";
    }
    if (department && department != undefined) {
      resourceUpdate.department = department;
    }
    if (designation != undefined) {
      if (department && designation) {
        let detDept = await MasterEnum.findOne({
          where: {
            [Op.and]: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("name")),
              Sequelize.fn("lower", department)
            ),
            type: "department",
            companyId: isAuth.companyId,
          },
        });
        if (detDept) {
          let checkDesignationData = await MasterEnum.findOne({
            where: {
              type: "designation",
              companyId: isAuth.companyId,
              [Op.and]: Sequelize.where(
                Sequelize.fn("lower", Sequelize.col("name")),
                Sequelize.fn("lower", designation)
              ),
            },
          });
          if (checkDesignationData) {
            resourceUpdate.designation = checkDesignationData.name;
          }
        }
      } else {
        resourceUpdate.designation = "";
      }
    }
    if (phone != undefined) {
      resourceUpdate.phone = phone;
    }
    if (experience != undefined) {
      resourceUpdate.experience = experience;
    }
    if (salary && salary != undefined) {
      resourceUpdate.salary = utils.encrypt(salary);
    }
    if (dateOfJoining && dateOfJoining != undefined) {
      resourceUpdate.dateOfJoining = dateOfJoining;
    }
    if (skills && skills != undefined) {
      resourceUpdate.skills = skills;
    }
    if (dob && dob != undefined) {
      resourceUpdate.dob = dob;
    }
    await Resource.update(resourceUpdate, { where: { id: checkResource.id } });

    res.status(200).send({ message: "Updated successfully" });
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const deleteResource = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 3) {
    let id = req.params.id;
    await User.update({ status: false }, { where: { id: id } });
    res.status(200).send({ message: "Deleted successfully" });
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const freeResourceList = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 3) {
    const projectId = req.params.id;
    let { page, page_size, name, cluster, designation, month, year } =
      req.query;
    page = Number(page) || 1;
    page_size = Number(page_size) || 5;
    let offset = 0;
    if (page > 1) {
      offset = (page - 1) * page_size;
    }
    let userData = [];
    let totalRecords = 0;
    if (name && name != undefined) {
      let { count, rows } = await User.findAndCountAll({
        distinct: true,
        where: {
          role: { [Op.gte]: 2 },
          companyId: isAuth.companyId,
        },
        include: [
          {
            model: Resource,
            where: {
              name: { [Op.like]: `%${name}%` },
              is_owner: { [Op.ne]: 1 },
            },
          },
        ],
        offset: offset,
        limit: page_size,
      });
      userData = rows;
      totalRecords = count;
    } else if (cluster && cluster != undefined) {
      let { count, rows } = await User.findAndCountAll({
        distinct: true,
        where: {
          role: { [Op.gte]: 2 },
          companyId: isAuth.companyId,
        },
        offset: offset,
        limit: page_size,

        include: [
          {
            model: Resource,
            where: {
              is_owner: { [Op.ne]: 1 },
            },
          },
          {
            model: Cluster,
            where: {
              name: { [Op.like]: `%${cluster}%` },
            },
          },
        ],
      });
      userData = rows;
      totalRecords = count;
    } else if (designation && designation != undefined) {
      let { count, rows } = await User.findAndCountAll({
        distinct: true,
        where: {
          role: { [Op.gte]: 2 },
          companyId: isAuth.companyId,
        },
        offset: offset,
        limit: page_size,
        include: [
          {
            model: Resource,
            where: {
              designation: { [Op.like]: `%${designation}%` },
              is_owner: { [Op.ne]: 1 },
            },
          },
        ],
      });
      userData = rows;
      totalRecords = count;
    } else {
      let { count, rows } = await User.findAndCountAll({
        distinct: true,
        where: {
          role: { [Op.gte]: 2 },
          companyId: isAuth.companyId,
        },
        offset: offset,
        limit: page_size,
        include: [
          {
            model: Resource,
            where: {
              is_owner: { [Op.ne]: 1 },
            },
          },
        ],
      });
      userData = rows;
      totalRecords = count;
    }

    let data = [];
    for (let i = 0; i < userData.length; i++) {
      let res = {};
      const uData = userData[i];
      let utilizedHours = 0;
      let freeHours = 0;
      const getResource = await ProjectResource.findAll({
        include: [
          {
            model: Resource,
            where: { userId: uData.id },
          },
          {
            model: ClientResource,
            where: {
              month: month ? month : moment().month(),
              [Op.and]: Sequelize.where(
                Sequelize.fn("YEAR", Sequelize.col("clientResource.createdAt")),
                year ? year : moment().year()
              ),
            },
          },
        ],
      });

      if (getResource && getResource.length > 0) {
        getResource.forEach((val) => {
          utilizedHours = utilizedHours + val.usedHours;
        });
        freeHours = enums.totalWorkingHours - utilizedHours;
      } else {
        if (projectId != undefined) {
          let getClient = await Project.findOne({
            where: { id: projectId, companyId: isAuth.companyId },
            include: [
              {
                model: ClientResource,
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
              },
            ],
          });
          if (getClient && getClient.clientResources.length > 0) {
            getClient.clientResources.forEach((itm) => {
              // if (uData.designation.toLowerCase() == itm.toLowerCase()) {
              //   utilizedHours = 0

              // }
              utilizedHours = 0;
            });
          }
          freeHours = enums.totalWorkingHours;
        }
      }
      if (uData.resource) {
        res = {
          id: uData.resource.id,
          name: uData.resource.name,
          lastName: uData.resource.lastName,
          designation: uData.resource.designation,
          phone: uData.resource.phone,
          experience: uData.resource.experience,
          salary: utils.decrypt(uData.resource.salary),
          dateOfJoining: uData.resource.dateOfJoining,
          skills: uData.resource.skills,
          userId: uData.resource.userId,
          utilizedHours: utilizedHours,
          freeHours: freeHours,
        };
        if (uData.cluster && uData.cluster.name) {
          res.clusterName = uData.cluster.name;
        }
        data.push(res);
      }
    }
    res.status(200).send({ data: data, totalRecords: totalRecords });
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const getMasterData = async (isAuth, type) => {
  let masterDataArr = [];

  if (type) {
    const masterdata = await MasterEnum.findOne({
      attributes: [
        [Sequelize.fn("GROUP_CONCAT", Sequelize.col("name")), "name_list"],
      ],
      group: ["type"],
      where: {
        type: type,
        status: true,
        companyId: isAuth.companyId,
      },
    });

    if (masterdata.dataValues && masterdata.dataValues.name_list) {
      let mArr = masterdata.dataValues.name_list.split(",");
      if (mArr.length > 0) {
        masterDataArr = mArr;
      }
    }
  }
  return masterDataArr;
};

const getEnum = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    try {
      const clusters = await Cluster.findAll({
        where: { companyId: isAuth.companyId, status: true },
      });
      const clusterHeads = await User.findAll({
        where: { companyId: isAuth.companyId, role: { [Op.in]: [1, 2] } },
        attributes: {
          exclude: ["role", "password", "companyId", "createdAt", "updatedAt"],
        },
        include: [
          {
            model: Resource,
            required: true,
            attributes: ["name", "lastName"],
          },
        ],
      });
      let clustersData = [];
      let clusterId = [];
      if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
          var clusterDt = clusters[i];
          if (clusterDt.clusterHeadID) {
            let clusteIds = clusterDt.clusterHeadID.split(",");
            if (clusteIds.length > 0) {
              clusteIds.forEach((item) => {
                if (!clusterId.includes(item)) {
                  clusterId.push(item);
                }
              });
            }
          }
        }
      }
      if (clusterId.length > 0) {
        const getUsers = await User.findAll({
          where: { id: clusterId },
          include: [{ model: Resource }],
        });
        if (getUsers.length > 0) {
          const uData = getUsers.map((user) => {
            let nm = user.resource.name;
            if (nm && user.resource.lastName && user.resource.lastName != "") {
              nm += " " + user.resource.lastName;
            }
            return {
              clusterHeadName: nm,
              clusterHeadEmail: user.email,
              clusterHeadPhone: user.resource.phone,
              id: user.id,
            };
          });

          for (let i = 0; i < clusters.length; i++) {
            var clusterDt = clusters[i];
            let res = {};
            res.clusterID = clusterDt.id;
            res.clusterName = clusterDt.name;
            res.clusterDescription = clusterDt.description;
            res.clusterHeadID = clusterDt.clusterHeadID;
            let clNames = [];
            let clemail = [];
            let clPhone = [];
            if (clusterDt.clusterHeadID) {
              let clArr = clusterDt.clusterHeadID.split(",");
              if (clArr.length > 0) {
                clArr.forEach((item) => {
                  const getUsr = uData.find((itm) => itm.id == item);
                  if (getUsr) {
                    clNames.push(getUsr.clusterHeadName);
                    clemail.push(getUsr.clusterHeadEmail);
                    clPhone.push(getUsr.clusterHeadPhone);
                  }
                });
              }
            }
            res.clusterHeadName = clNames.join(",");
            res.clusterHeadEmail = clemail.join(",");
            res.clusterHeadPhone = clPhone.join(",");
            clustersData.push(res);
          }
        }
      }
      const msData = await getMasterData(isAuth, "designation");
      res.status(200).send({
        clusters: clustersData,
        clusterHeads: clusterHeads,
        role: enums.role,
        profiles: msData,
      });
    } catch (e) {
      console.log("ddd", e);
      res.status(500).send({ message: e });
    }
  } else if (isAuth && (isAuth.role == 2 || isAuth.role == 3)) {
    try {
      let clusterHeads = [];
      if (isAuth.role == 2) {
        clusterHeads = await User.findAll({
          where: { companyId: isAuth.companyId, role: 2, id: isAuth.userId },
          attributes: {
            exclude: [
              "role",
              "password",
              "companyId",
              "createdAt",
              "updatedAt",
            ],
          },
          include: [
            {
              model: Resource,
              attributes: ["name", "lastName"],
            },
          ],
        });
      }
      const clusters = await Cluster.findAll({
        where: { companyId: isAuth.companyId },
      });
      let clustersData = [];
      let clusterId = [];
      if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
          var clusterDt = clusters[i];
          if (clusterDt.clusterHeadID) {
            let clusteIds = clusterDt.clusterHeadID.split(",");
            if (clusteIds.length > 0) {
              clusteIds.forEach((item) => {
                if (!clusterId.includes(item)) {
                  clusterId.push(item);
                }
              });
            }
          }
        }
      }
      if (clusterId.length > 0) {
        const getUsers = await User.findAll({
          where: { id: clusterId },
          include: [{ model: Resource }],
        });
        if (getUsers.length > 0) {
          const uData = getUsers.map((user) => {
            let nm = user.resource.name;
            if (nm && user.resource.lastName && user.resource.lastName != "") {
              nm += " " + user.resource.lastName;
            }
            return {
              clusterHeadName: nm,
              clusterHeadEmail: user.email,
              clusterHeadPhone: user.resource.phone,
              id: user.id,
            };
          });

          for (let i = 0; i < clusters.length; i++) {
            var clusterDt = clusters[i];
            let res = {};
            res.clusterID = clusterDt.id;
            res.clusterName = clusterDt.name;
            res.clusterDescription = clusterDt.description;
            res.clusterHeadID = clusterDt.clusterHeadID;
            let clNames = [];
            let clemail = [];
            let clPhone = [];
            if (clusterDt.clusterHeadID) {
              let clArr = clusterDt.clusterHeadID.split(",");
              if (clArr.length > 0) {
                clArr.forEach((item) => {
                  const getUsr = uData.find((itm) => itm.id == item);
                  if (getUsr) {
                    clNames.push(getUsr.clusterHeadName);
                    clemail.push(getUsr.clusterHeadEmail);
                    clPhone.push(getUsr.clusterHeadPhone);
                  }
                });
              }
            }
            res.clusterHeadName = clNames.join(",");
            res.clusterHeadEmail = clemail.join(",");
            res.clusterHeadPhone = clPhone.join(",");
            clustersData.push(res);
          }
        }
      }
      let roles = {};
      for (const [key, value] of Object.entries(enums.role)) {
        if (value != "Owner" && value != "Cluster Head") {
          roles[key] = value;
        }
      }
      res.status(200).send({
        clusters: clustersData,
        clusterHeads: clusterHeads,
        role: roles,
        profiles: enums.profiles.filter((itm) => itm !== "Cluster Head"),
      });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a cluster" });
  }
};

const bulkUpload = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role < req.body.role) {
    try {
      if (req.file == undefined) {
        return res
          .status(400)
          .send({ message: "Please upload an excel file!" });
      } else if (req.body.role == undefined) {
        return res.status(400).send({ message: "Role filed required!" });
      } else if (req.body.status == undefined) {
        return res.status(400).send({ message: "Status field required!" });
      }

      let path = `${__basedir}/uploads/${req.file.filename}`;
      await readXlsxFile(path).then(async (rows) => {
        // skip header
        if (
          rows[0].length > 0 &&
          rows[0][0].toLowerCase().trim() == "first name" &&
          rows[0][1].toLowerCase().trim() == "last name" &&
          rows[0][2].toLowerCase().trim() == "email" &&
          rows[0][3].toLowerCase().trim() == "salary" &&
          rows[0][4].toLowerCase().trim() == "department" &&
          rows[0][5].toLowerCase().trim() == "designation" &&
          rows[0][6].toLowerCase().trim() == "skill" &&
          rows[0][7].trim() == "Experience (Years)"
        ) {
          rows.shift();
          let resources = [];
          const pass = await bcrypt.hash(utils.generatePassword(), 10);
          rows.forEach((row) => {
            // const pass = (Math.random() + 1).toString(36).substring(3);
            let resource = {
              name: row[0],
              lastName: row[1],
              role: req.body.role, //2:Cluster, 3:HR, 4:resources,
              email: row[2],
              password: pass,
              status: req.body.status,
              companyId: isAuth.companyId,
              salary: utils.encrypt(row[3]),
              department: row[4],
              designation: row[5],
              skills: row[6],
              experience: row[7],
              phone: row[8],
            };
            if (row[9] && row[9] != "") {
              resource.dateOfJoining = moment(row[9], "DD/MM/YYYY")
                .toDate()
                .toString();
            }
            if (row[10] && row[10] != "") {
              resource.dob = moment(row[10], "DD/MM/YYYY").toDate().toString();
            }
            resources.push(resource);
          });
          if (resources.length > 0) {
            for (let i = 0; i < resources.length; i++) {
              let resource = resources[i];
              let checkEmail = await User.findOne({
                where: { email: resource.email, companyId: isAuth.companyId },
              });
              if (!checkEmail) {
                let user = {
                  role: resource.role, //2:Cluster, 3:HR, 4:resources,
                  email: resource.email,
                  password: resource.password,
                  status: resource.status,
                  companyId: isAuth.companyId,
                };
                const usr = await User.create(user);
                if (usr) {
                  // let token = jwt.sign(
                  //   {
                  //     name: usr.name,
                  //     email: usr.email,
                  //     userId: usr.id,
                  //     role: usr.role,
                  //     companyId: usr.companyId
                  //   },
                  //   process.env.JWT_KEY,
                  //   {
                  //     expiresIn: "1d"
                  //   }
                  // )
                  // let url = `${process.env.URL}/${token}`
                  // let emailOptions = {
                  //   from: '"RMS Gloify" <rmsgloify@gmail.com>',
                  //   to: resource.email,
                  //   subject: 'Invitation from RMS',
                  //   html: email.invitationEmail(resource.name, isAuth.name, resource.email,resource.password, url)
                  // }
                  // utils.mailSender(emailOptions)

                  let info = {
                    name: resource.name,
                    lastName: resource.lastName,
                    experience: resource.experience,
                    salary: resource.salary,
                    userId: usr.id,
                    companyId: isAuth.companyId,
                    dateOfJoining: resource.dateOfJoining,
                    dob: resource.dob,
                  };
                  if (resource.department) {
                    let detDept = await MasterEnum.findOne({
                      where: {
                        [Op.and]: Sequelize.where(
                          Sequelize.fn("lower", Sequelize.col("name")),
                          Sequelize.fn("lower", resource.department)
                        ),
                        type: "department",
                        companyId: isAuth.companyId,
                      },
                    });
                    if (detDept) {
                      info.department = detDept.name;
                    }
                  }
                  if (resource.department && resource.designation) {
                    let detDept = await MasterEnum.findOne({
                      where: {
                        [Op.and]: Sequelize.where(
                          Sequelize.fn("lower", Sequelize.col("name")),
                          Sequelize.fn("lower", resource.department)
                        ),
                        type: "department",
                        companyId: isAuth.companyId,
                      },
                    });
                    if (detDept) {
                      let checkDesignationData = await MasterEnum.findOne({
                        where: {
                          type: "designation",
                          companyId: isAuth.companyId,
                          [Op.and]: Sequelize.where(
                            Sequelize.fn("lower", Sequelize.col("name")),
                            Sequelize.fn("lower", resource.designation)
                          ),
                        },
                      });
                      if (checkDesignationData) {
                        info.designation = checkDesignationData.name;
                      }
                    }
                  }
                  if (resource.skills) {
                    let skillsArr = resource.skills.split(",");
                    let skills = [];
                    if (skillsArr.length > 0) {
                      for (let j = 0; j < skillsArr.length; j++) {
                        let checkSkillData = await MasterEnum.findOne({
                          where: {
                            type: "skills",
                            status: true,
                            companyId: isAuth.companyId,
                            [Op.and]: Sequelize.where(
                              Sequelize.fn("lower", Sequelize.col("name")),
                              Sequelize.fn("lower", skillsArr[j])
                            ),
                          },
                        });
                        if (checkSkillData) {
                          skills.push(checkSkillData.name);
                        }
                      }
                    }
                    if (skills.length > 0) {
                      info.skills = skills.join(",");
                    }
                  }
                  await Resource.create(info);
                }
              } else {
                let getResource = await Resource.findOne({
                  where: { userId: checkEmail.id },
                });
                if (getResource) {
                  let info = {
                    name: resource.name,
                    lastName: resource.lastName,
                    experience: resource.experience,
                    salary: resource.salary,
                    userId: getResource.userId,
                    companyId: isAuth.companyId,
                    dateOfJoining: resource.dateOfJoining,
                    dob: resource.dob,
                  };
                  if (resource.department) {
                    let detDept = await MasterEnum.findOne({
                      where: {
                        [Op.and]: Sequelize.where(
                          Sequelize.fn("lower", Sequelize.col("name")),
                          Sequelize.fn("lower", resource.department)
                        ),
                        type: "department",
                        companyId: isAuth.companyId,
                      },
                    });
                    if (detDept) {
                      info.department = detDept.name;
                    } else {
                      info.department = "";
                    }
                  }
                  if (resource.department && resource.designation) {
                    let detDept = await MasterEnum.findOne({
                      where: {
                        [Op.and]: Sequelize.where(
                          Sequelize.fn("lower", Sequelize.col("name")),
                          Sequelize.fn("lower", resource.department)
                        ),
                        type: "department",
                        companyId: isAuth.companyId,
                      },
                    });
                    if (detDept) {
                      let checkDesignationData = await MasterEnum.findOne({
                        where: {
                          type: "designation",
                          companyId: isAuth.companyId,
                          [Op.and]: Sequelize.where(
                            Sequelize.fn("lower", Sequelize.col("name")),
                            Sequelize.fn("lower", resource.designation)
                          ),
                        },
                      });
                      if (checkDesignationData) {
                        info.designation = checkDesignationData.name;
                      } else {
                        info.designation = "";
                      }
                    } else {
                      info.designation = "";
                    }
                  }
                  if (resource.skills) {
                    let skillsArr = resource.skills.split(",");
                    let skills = [];
                    if (skillsArr.length > 0) {
                      for (let j = 0; j < skillsArr.length; j++) {
                        let checkSkillData = await MasterEnum.findOne({
                          where: {
                            type: "skills",
                            status: true,
                            companyId: isAuth.companyId,
                            [Op.and]: Sequelize.where(
                              Sequelize.fn("lower", Sequelize.col("name")),
                              Sequelize.fn("lower", skillsArr[j])
                            ),
                          },
                        });
                        if (checkSkillData) {
                          skills.push(checkSkillData.name);
                        }
                      }
                    }
                    if (skills.length > 0) {
                      info.skills = skills.join(",");
                    } else {
                      info.skills = "";
                    }
                  }
                  await Resource.update(info, {
                    where: { id: getResource.id },
                  });
                }
              }
            }
          }
          res.status(200).send({ message: "Resource add successfully!" });
        } else {
          res.status(400).send({ message: "Excel data mismatch" });
        }
      });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

const getUserName = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    try {
      const useData = await Resource.findAll({
        where: {
          is_owner: { [Op.ne]: 1 },
          status: true,
          companyId: isAuth.companyId,
        },
        attributes: ["id", "name"],
        include: [
          {
            model: User,
            where: { role: { [Op.ne]: 1 } },
            attributes: [],
          },
        ],
      });
      res.status(200).send(useData);
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to create a resource" });
  }
};

module.exports = {
  addResourceUser,
  addResource,
  getAllResource,
  updateResource,
  deleteResource,
  freeResourceList,
  getEnum,
  bulkUpload,
  updateStatusResource,
  getUserName,
  updateResourceRole,
};
