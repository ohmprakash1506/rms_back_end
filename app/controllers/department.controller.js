const db = require("../models");
const { Op, Sequelize, where } = require("sequelize");
const readXlsxFile = require("read-excel-file/node");
const utils = require("../utils/utils.js");
const enums = require("../utils/enum.js");
const Company = db.company;
const Resource = db.resource;
const MasterEnum = db.masterEnum;

const getDepartment = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth) {
    try {
      const id = req.params.id;
      let where = {};
      where.companyId = isAuth.companyId;
      where.type = "department";
      if (id != undefined) {
        where.id = id;
      } else {
        if (id != "all") {
          where.status = true;
        }
      }
      const departments = await MasterEnum.findAll({ where: where });
      res.status(200).send(departments);
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const getDesignation = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth) {
    try {
      const id = req.params.id;
      let where = {};
      where.companyId = isAuth.companyId;
      where.parentId = { [Op.ne]: 0 };
      where.type = "designation";
      if (id != undefined) {
        where.id = id;
      } else {
        if (id != "all") {
          where.status = true;
        }
      }
      const designations = await MasterEnum.findAll({
        where: where,
      });
      res.status(200).send(designations);
    } catch (e) {
      console.log(e);
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const getDesignationByDepartment = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth) {
    try {
      const id = req.params.deptID;
      let designations = [];
      if (id && id != undefined) {
        designations = await MasterEnum.findAll({
          where: { parentId: id, status: true },
        });
      }
      res.status(200).send(designations);
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const getSkills = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth) {
    try {
      const id = req.params.id;
      let where = {};
      where.type = "skills";
      if (id == "all") {
        where.companyId = isAuth.companyId;
      } else if (id != undefined) {
        where.companyId = isAuth.companyId;
        where.id = id;
      } else {
        where.companyId = isAuth.companyId;
        where.status = true;
      }
      const skills = await MasterEnum.findAll({ where: where });
      res.status(200).send(skills);
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const deleteDepartment = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).send({ message: "Deparment id is required" });
      }
      let getDepartment = await MasterEnum.findOne({
        where: { id: id, type: "department", companyId: isAuth.companyId },
      });
      if (!getDepartment) {
        return res.status(400).send({ message: "Deparment not found" });
      }
      let getdesig = await MasterEnum.findAll({
        where: {
          parentId: getDepartment.id,
          type: "designation",
          companyId: isAuth.companyId,
        },
      });
      if (getdesig.length > 0) {
        for (let i = 0; i < getdesig.length; i++) {
          let des = getdesig[i];
          await MasterEnum.destroy({ where: { id: des.id } });
          // await MasterEnum.update({ status: false }, { where: { id: des.id } })
        }
      }
      await MasterEnum.destroy({ where: { id: getDepartment.id } });
      const getAllResource = await Resource.findOne({
        attributes: [
          [Sequelize.fn("GROUP_CONCAT", Sequelize.col("id")), "id_list"],
        ],
        group: ["department"],
        where: {
          status: true,
          companyId: isAuth.companyId,
          [Op.and]: Sequelize.where(
            Sequelize.fn("lower", Sequelize.col("department")),
            Sequelize.fn("lower", getDepartment.name)
          ),
        },
      });
      if (
        getAllResource &&
        getAllResource.dataValues &&
        getAllResource.dataValues.id_list
      ) {
        let resoursIds = getAllResource.dataValues.id_list.split(",");
        if (resoursIds.length > 0) {
          await Resource.update(
            {
              department: "",
              designation: "",
            },
            {
              where: {
                id: {
                  [Op.in]: resoursIds,
                },
              },
            }
          );
        }
      }
      // await MasterEnum.update({ status: false }, { where: { id: getDepartment.id } })
      res.status(200).send({ message: "Department delete successfully" });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const updateMaterdata = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    try {
      const id = req.params.id;
      const { type, name } = req.body;
      if (!id) {
        return res.status(400).send({ message: "Id field is required" });
      } else if (type == undefined) {
        return res.status(400).send({ message: "Type field is required" });
      } else if (name == undefined) {
        return res.status(400).send({ message: "Name field is required" });
      }
      let getData = await MasterEnum.findOne({
        where: { id: id, type: type, companyId: isAuth.companyId },
      });
      if (!getData) {
        return res.status(400).send({ message: "Data not found" });
      }
      await MasterEnum.update({ name: name }, { where: { id: getData.id } });
      res.status(200).send({
        message: `${capitalizeFirstLetter(type)} update successfully`,
      });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const deleteMasterDataByType = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    try {
      const id = req.params.id;
      const { type } = req.query;
      if (!id) {
        return res.status(400).send({ message: "Id is missing" });
      } else if (type == undefined) {
        return res.status(400).send({ message: "Type is missing" });
      }
      let getData = await MasterEnum.findOne({
        where: { id: id, type: type, companyId: isAuth.companyId },
      });

      if (!getData) {
        res
          .status(400)
          .send({ message: `${capitalizeFirstLetter(type)} not found` });
      }
      await MasterEnum.destroy({ where: { id: getData.id } });
      if (type == "designation") {
        const getAllResource = await Resource.findOne({
          attributes: [
            [Sequelize.fn("GROUP_CONCAT", Sequelize.col("id")), "id_list"],
          ],
          group: ["designation"],
          where: {
            status: true,
            companyId: isAuth.companyId,
            [Op.and]: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("designation")),
              Sequelize.fn("lower", getData.name)
            ),
          },
        });
        if (
          getAllResource &&
          getAllResource.dataValues &&
          getAllResource.dataValues.id_list
        ) {
          let resoursIds = getAllResource.dataValues.id_list.split(",");
          if (resoursIds.length > 0) {
            await Resource.update(
              {
                designation: "",
              },
              {
                where: {
                  id: {
                    [Op.in]: resoursIds,
                  },
                },
              }
            );
          }
        }
      } else if (type == "skills") {
        const getAllResource = await Resource.findAll({
          where: {
            status: true,
            companyId: isAuth.companyId,
            [Op.and]: Sequelize.fn(
              "FIND_IN_SET",
              getData.name,
              Sequelize.col("skills")
            ),
          },
        });
        if (getAllResource.length > 0) {
          for (let i = 0; i < getAllResource.length; i++) {
            let resource = getAllResource[i];
            let uSkills = [];
            if (getAllResource[i].skills) {
              uSkills = getAllResource[i].skills.toLocaleLowerCase().split(",");
              if (uSkills.length > 0) {
                const index = uSkills.indexOf(getData.name.toLocaleLowerCase());
                if (index > -1) {
                  uSkills.splice(index, 1);
                }
              }
            }
            await Resource.update(
              { skills: uSkills.join(",") },
              { where: { id: resource.id } }
            );
          }
        }
      }
      return res.status(200).send({
        message: `${capitalizeFirstLetter(type)} delete successfully`,
      });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const addMasterData = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    try {
      const { name, type, parentId } = req.body;
      if (name == undefined) {
        return res.status(400).send({ message: "Name field is required" });
      } else if (type == undefined) {
        return res.status(400).send({ message: "Type field is required" });
      }
      if (type.toLowerCase() == "department") {
        let checkData = await MasterEnum.findOne({
          where: {
            type: "department",
            companyId: isAuth.companyId,
            [Op.and]: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("name")),
              Sequelize.fn("lower", name)
            ),
          },
        });
        if (checkData) {
          return res.status(400).send({ message: "Department already exists" });
        }
        await MasterEnum.create({
          type: type.toLowerCase(),
          name: capitalizeFirstLetter(name),
          companyId: isAuth.companyId,
          parentId: 0,
          status: 1,
        });
      } else if (type.toLowerCase() == "skills") {
        let checkData = await MasterEnum.findOne({
          where: {
            type: "skills",
            companyId: isAuth.companyId,
            [Op.and]: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("name")),
              Sequelize.fn("lower", name)
            ),
          },
        });
        if (checkData) {
          return res.status(400).send({ message: "Skill already exists" });
        }
        await MasterEnum.create({
          type: type.toLowerCase(),
          name: capitalizeFirstLetter(name),
          companyId: isAuth.companyId,
          parentId: 0,
          status: 1,
        });
      } else if (type.toLowerCase() == "designation") {
        if (parentId == undefined) {
          return res
            .status(400)
            .send({ message: "parentId field is required" });
        }
        let detDept = await MasterEnum.findOne({
          where: {
            id: parentId,
            type: "department",
            companyId: isAuth.companyId,
          },
        });
        if (!detDept) {
          return res.status(400).send({ message: "parentId is invalid" });
        }
        let checkData = await MasterEnum.findOne({
          where: {
            type: "designation",
            companyId: isAuth.companyId,
            [Op.and]: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("name")),
              Sequelize.fn("lower", name)
            ),
          },
        });
        if (checkData) {
          return res
            .status(400)
            .send({ message: "Designation already exists" });
        }
        await MasterEnum.create({
          type: type.toLowerCase(),
          name: capitalizeFirstLetter(name),
          companyId: isAuth.companyId,
          parentId: detDept.id,
          status: 1,
        });
      }
      res
        .status(200)
        .send({ message: `${capitalizeFirstLetter(type)} add successfully` });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const addBulkMasterData = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    try {
      const { names, type, parentId } = req.body;
      if (names == undefined) {
        return res.status(400).send({ message: "Name data is empty!" });
      } else if (typeof names == "object" && names.length == 0) {
        return res.status(400).send({ message: "Names accept only array" });
      } else if (type == undefined) {
        return res.status(400).send({ message: "Type field is required" });
      }
      if (type.toLowerCase() == "department") {
        for (let i = 0; i < names.length; i++) {
          let checkData = await MasterEnum.findOne({
            where: {
              type: "department",
              status: true,
              companyId: isAuth.companyId,
              [Op.and]: Sequelize.where(
                Sequelize.fn("lower", Sequelize.col("name")),
                Sequelize.fn("lower", names[i])
              ),
            },
          });
          if (!checkData) {
            await MasterEnum.create({
              type: type.toLowerCase(),
              name: capitalizeFirstLetter(names[i]),
              companyId: isAuth.companyId,
              parentId: 0,
              status: 1,
            });
          }
        }
      } else if (type.toLowerCase() == "skills") {
        for (let i = 0; i < names.length; i++) {
          let checkData = await MasterEnum.findOne({
            where: {
              type: "skills",
              status: true,
              companyId: isAuth.companyId,
              [Op.and]: Sequelize.where(
                Sequelize.fn("lower", Sequelize.col("name")),
                Sequelize.fn("lower", names[i])
              ),
            },
          });
          if (!checkData) {
            await MasterEnum.create({
              type: type.toLowerCase(),
              name: capitalizeFirstLetter(names[i]),
              companyId: isAuth.companyId,
              parentId: 0,
              status: 1,
            });
          }
        }
      } else if (type.toLowerCase() == "designation") {
        for (let i = 0; i < names.length; i++) {
          if (parentId != undefined) {
            let detDept = await MasterEnum.findOne({
              where: {
                id: parentId,
                type: "department",
                companyId: isAuth.companyId,
              },
            });
            if (detDept) {
              let checkData = await MasterEnum.findOne({
                where: {
                  type: "designation",
                  status: true,
                  companyId: isAuth.companyId,
                  parentId: detDept.id,
                  [Op.and]: Sequelize.where(
                    Sequelize.fn("lower", Sequelize.col("name")),
                    Sequelize.fn("lower", names[i])
                  ),
                },
              });
              if (!checkData) {
                await MasterEnum.create({
                  type: type.toLowerCase(),
                  name: capitalizeFirstLetter(names[i]),
                  companyId: isAuth.companyId,
                  parentId: detDept.id,
                  status: 1,
                });
              }
            }
          }
        }
      }
      res
        .status(200)
        .send({ message: `${capitalizeFirstLetter(type)} add successfully` });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    res
      .status(403)
      .send({ message: "You don't have access to use master data" });
  }
};

const bulkUploadMasterdata = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    try {
      if (req.file == undefined) {
        return res
          .status(400)
          .send({ message: "Please upload an excel file!" });
      }
      let path = `${__basedir}/uploads/${req.file.filename}`;
      await readXlsxFile(path).then(async (rows) => {
        if (
          rows[0].length > 0 &&
          rows[0][0].toLowerCase().trim() == "department" &&
          rows[0][1].toLowerCase().trim() == "designation" &&
          rows[0][2].toLowerCase().trim() == "skill" &&
          rows[0][3].toLowerCase().trim() == "descriptions" &&
          rows[0][4].toLowerCase().trim() == "min salary" &&
          rows[0][5].toLowerCase().trim() == "max salary"
        ) {
          rows.shift();
          if (rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
              if (rows[i][0] != null) {
                let detDept = await MasterEnum.findOne({
                  where: {
                    [Op.and]: Sequelize.where(
                      Sequelize.fn("lower", Sequelize.col("name")),
                      Sequelize.fn("lower", rows[i][0])
                    ),
                    type: "department",
                    companyId: isAuth.companyId,
                  },
                });
                if (!detDept) {
                  await MasterEnum.create({
                    type: "department",
                    name: capitalizeFirstLetter(rows[i][0]),
                    companyId: isAuth.companyId,
                    parentId: 0,
                    status: 1,
                  });
                }
                if(rows[i][1] != null){  
                  let detDept = await MasterEnum.findOne({
                    where: {
                      [Op.and]: Sequelize.where(
                        Sequelize.fn("lower", Sequelize.col("name")),
                        Sequelize.fn("lower", rows[i][0])
                      ),
                      type: "department",
                      companyId: isAuth.companyId,
                    },
                  });
                  if (detDept) {
                    let checkDesignationData = await MasterEnum.findOne({
                      where: {
                        type: "designation",
                        parentId:detDept.id,
                        companyId: isAuth.companyId,
                        status:1,
                        [Op.and]: Sequelize.where(
                          Sequelize.fn("lower", Sequelize.col("name")),
                          Sequelize.fn("lower", rows[i][1])
                        ),
                      },
                    });
                    let payload = {
                        type: "designation",
                        name: capitalizeFirstLetter(rows[i][1]),
                        companyId: isAuth.companyId,
                        parentId: detDept.id,
                        status: 1
                    } 
                    if(rows[i][3] != ''){
                      payload.description = rows[i][3]
                    }
                    if(rows[i][4] != ''){
                      payload.min_salary = rows[i][4]
                    }
                    if(rows[i][5] != ''){
                      payload.max_salary = rows[i][5]
                    }
                    if (!checkDesignationData) {
                      await MasterEnum.create(payload);
                    }else{
                      await MasterEnum.update(payload,{where:{id:checkDesignationData.id}})
                    }
                  }
                }
              }else if (rows[i][2] != null){
                let checkSkillData = await MasterEnum.findOne({
                  where: {
                    type: "skills",
                    status: true,
                    companyId: isAuth.companyId,
                    [Op.and]: Sequelize.where(
                      Sequelize.fn("lower", Sequelize.col("name")),
                      Sequelize.fn("lower", rows[i][2])
                    ),
                  },
                });
                if(!checkSkillData){
                  await MasterEnum.create({
                    type: 'skills',
                    name: capitalizeFirstLetter(rows[i][2]),
                    companyId: isAuth.companyId,
                    parentId: 0,
                    status: 1,
                  });
                }
              }
            }
            res.status(200).send({ message: "Master data add successfully!" });
          }else{
            res.status(400).send({ message: "No data found" });
          }
          
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

module.exports = {
  getDepartment,
  getDesignation,
  getDesignationByDepartment,
  getSkills,
  deleteDepartment,
  updateMaterdata,
  deleteMasterDataByType,
  addMasterData,
  addBulkMasterData,
  bulkUploadMasterdata,
};
