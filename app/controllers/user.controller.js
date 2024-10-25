const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../models");
const utils = require("../utils/utils.js");
const enums = require("../utils/enum");
const emailTemplate = require("../utils/emails.js");
const { Op } = require("sequelize");

const User = db.user;
const Company = db.company;
const Resource = db.resource;
const MasterEnum = db.masterEnum;

const create = async (req, res) => {
  if (
    req.body.email == undefined ||
    req.body.email.length < 4 ||
    req.body.password == undefined ||
    req.body.password.length < 4
  ) {
    res.status(400).json({
      message: "Please check your Email or Password is not correct",
    });
  } else {
    let users = await User.findAll({ where: { email: req.body.email } });
    if (users.length > 0) {
      res.status(422).json({
        message: "User already exists",
      });
      return;
    } else {
      bcrypt.hash(req.body.password, 10, async (err, hash) => {
        if (err) {
          res.status(403).json({
            message: err,
          });
        } else {
          companyDetails = await Company.create({
            name: req.body.companyName,
          });
          const user = await User.create({
            role: req.body.role, // 1: Owner, 2:Cluster, 3:HR,
            email: req.body.email,
            password: hash,
            status: 1,
            companyId: companyDetails.id,
          });
          if (req.body.role == 1) {
            let info = {
              name: req.body.name,
              lastName: req.body.lastName,
              phone: req.body.phone,
              is_owner: 1,
              userId: user.id,
              companyId: companyDetails.id,
            };
            await Resource.create(info);
            if (enums.department && enums.department.length > 0) {
              for (let i = 0; i < enums.department.length; i++) {
                if (
                  enums.department[i].type == "department" &&
                  enums.department[i].data.length > 0
                ) {
                  let dept = enums.department[i].data;
                  for (let j = 0; j < dept.length; j++) {
                    const dpart = await MasterEnum.create({
                      type: enums.department[i].type,
                      name: dept[j].name,
                      companyId: companyDetails.id,
                      parentId: 0,
                      status: 1,
                    });
                    if (
                      dpart &&
                      dept[j].designation &&
                      dept[j].designation.length > 0
                    ) {
                      for (let k = 0; k < dept[j].designation.length; k++) {
                        await MasterEnum.create({
                          type: "designation",
                          name: dept[j].designation[k],
                          companyId: companyDetails.id,
                          parentId: dpart.id,
                          status: 1,
                        });
                      }
                    }
                  }
                }
              }
            }
            if (enums.skills && enums.skills.length > 0) {
              for (let i = 0; i < enums.skills.length; i++) {
                await MasterEnum.create({
                  type: "skills",
                  name: enums.skills[i],
                  companyId: companyDetails.id,
                  parentId: 0,
                  status: 1,
                });
              }
            }
          }
          // let token = jwt.sign(
          //   {
          //     email: user.email,
          //     userId: user._id
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
          //   subject: 'Account Verification',
          //   html: emailTemplate.accountVerificationEmail(req.body.name, req.body.email, url)
          // }
          // utils.mailSender(emailOptions)
          res.status(200).send({ message: "User created successfully" });
        }
      });
    }
  }
};

const confirmUserEmail = async (req, res) => {
  if (req.params.token) {
    try {
      const jwtUser = await jwt.verify(req.params.token, process.env.JWT_KEY);
      if (jwtUser) {
        await User.update({ status: 1 }, { where: { email: jwtUser.email } });
        res.status(200).json({
          message: "Email confirmed successfully",
        });
      }
    } catch {
      res.status(200).json({
        message: "Token expired please try again",
      });
    }
  } else {
    res.status(403).json({
      message: "Authentication failed",
    });
  }
};

const signIn = async (req, res) => {
  if (
    req.body.email == undefined ||
    req.body.email.length < 4 ||
    req.body.password == undefined ||
    req.body.password.length < 4
  ) {
    res.status(400).json({
      message: "Please check your Email or Password is not correct",
    });
  } else {
    let user = await User.findOne({
      where: { email: req.body.email },
      include: [
        {
          model: Resource,
          attributes: ["name", "status"],
        },
      ],
    });
    if (user && user.resource && user.resource.status) {
      bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (result) {
          let token = jwt.sign(
            {
              name: user.resource.name,
              email: user.email,
              userId: user.id,
              role: user.role,
              companyId: user.companyId,
            },
            process.env.JWT_KEY,
            {
              expiresIn: "1d",
            }
          );
          let unm = "";
          if (user.resource && user.resource.name) {
            unm = user.resource.name;
          }
          res.status(200).json({
            message: "Authentication successful",
            token: token,
            userId: user.id,
            userRoll: user.role,
            email: user.email,
            name: unm,
          });
        } else {
          res.status(401).json({
            message: "The password that you've entered is incorrect.",
          });
        }
      });
    } else {
      res.status(203).json({
        message: "This user is blocked or not register",
      });
    }
  }
};

const allUsers = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 2) {
    const data = await User.findAll();
    res.status(200).send(data);
  } else {
    res
      .status(403)
      .send({ message: "You don't have access, Please check with owner" });
  }
};

const update = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    try {
      const id = req.params.id;
      await User.update(req.body, { where: { id: id } });
      res.status(200).send({ message: "User details updated successfully" });
    } catch (e) {
      res.status(200).send({ message: e });
    }
  } else {
    res.status(403).send({ message: "You don't have access to update a user" });
  }
};

const resetPassword = (req, res, next) => {
  if (req.params.token) {
    const jwtUser = jwt.verify(req.params.token, process.env.JWT_KEY);
    bcrypt.hash(req.body.password, 10, (err, hash) => {
      if (err) {
        res.status(500).json({
          message: err,
        });
      } else {
        const id = jwtUser.id;

        User.update({ password: hash }, { where: { id: id } });
        res.status(200).send({ message: "Password reset successfully" });
      }
    });
  } else {
    res.status(403).json({
      message: "Authentication failed",
    });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email, host } = req.body;
    if (email == undefined) {
      return res.status(400).json({
        message: "Email address is required",
      });
    } else if (host == undefined) {
      return res.status(400).json({
        message: "Host is required",
      });
    }
    const userCheck = await User.findOne({
      where: { email: email },
      include: [
        {
          model: Resource,
          attributes: ["name", "status"],
        },
      ],
    });
    if (!userCheck) {
      return res.status(400).json({
        message: "User not found",
      });
    }
    if (userCheck.resource) {
      const payload = {
        email: userCheck.email,
        id: userCheck.id,
        password: userCheck.password,
      };
      const token = jwt.sign(payload, process.env.JWT_KEY, {
        expiresIn: "1h",
      });
      const url = `${host}/ResetPassword/${token}`;
      let emailOptions = {
        from: '"RMS Gloify" <rms@gloify.com>',
        to: email,
        subject: "Forget Password",
        html: emailTemplate.resetPasswordEmail(userCheck.resource.name, url),
      };
      await utils.mailSender(emailOptions);
      res
        .status(200)
        .send({ message: "Forget password mail send successfully" });
    } else {
      return res.status(400).json({
        message: "User not found",
      });
    }
  } catch (e) {
    console.log("ddd", e);
    res.status(500).send({ message: e });
  }
};

const CheckLogin = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (!isAuth) {
    return res.status(400).json({
      message: "Token is expired",
    });
  } else {
    res.status(200).send(isAuth);
  }
};

const checkToken = async (req, res) => {
  try {
    if (req.params.token) {
      const jwtUser = jwt.verify(req.params.token, process.env.JWT_KEY);
      const userId = jwtUser.id;
      const ckeckUser = await User.findOne({
        where: { id: userId, password: jwtUser.password },
        attributes: ["id", "email", "role", "companyId"],
      });
      if (!ckeckUser) {
        return res.status(400).json({
          message: "Token is expired",
        });
      }
      res.status(200).send(ckeckUser);
    }
  } catch (e) {
    res.status(500).send({ message: e });
  }
};

const changePassword = async (req, res) => {
  try {
    if (req.params.token) {
      const jwtUser = jwt.verify(req.params.token, process.env.JWT_KEY);
      if (jwtUser) {
        const { password, confirmPassword } = req.body;
        if (password == undefined) {
          return res.status(400).json({
            message: "Password is required",
          });
        } else if (confirmPassword == undefined) {
          return res.status(400).json({
            message: "Confirm password is required",
          });
        }
        if (password == undefined || password.length < 4) {
          res.status(403).send({ message: "Please enter valid password" });
        }
        if (password !== confirmPassword) {
          return res.status(400).send({ message: "Password  not matcted" });
        }
        bcrypt.hash(password, 10, async (err, hash) => {
          if (err) {
            res.status(500).json({
              message: err,
            });
          } else {
            const id = jwtUser.id;
            await User.update({ password: hash }, { where: { id: id } });
            // jwt.destroy(req.params.token)
            return res
              .status(200)
              .json({ message: "Password reset successfully" });
          }
        });
      } else {
        return res.status(400).send({ message: "Token is expired" });
      }
    }
  } catch (e) {
    res.status(500).send({ message: e });
  }
};

//random password genrate
const randomPasswordUpdate = async (req, res) => {
  const isAuth = utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role == 1) {
    try {
      const { emails } = req.body;
      if (!emails) {
        res.status(400).send({ message: "Emails is required" });
      }
      const getUsers = await User.findAll({
        where: {
          companyId:isAuth.companyId,
          email: {
            [Op.in]: emails.split(","),
          },
        },
      });
      if (getUsers.length > 0) {
        for (let i = 0; i < getUsers.length; i++) {
          const pass = await bcrypt.hash(utils.generatePassword(), 10);
          await User.update(
            { password: pass },
            { where: { id: getUsers[i].id } }
          );
        }
      }
      res.status(200).json({ message: "Password update successfully" });
    } catch (e) {
      res.status(500).send({ message: e });
    }
  } else {
    return res.status(403).send({ message: "You don't have access" });
  }
};

module.exports = {
  create,
  confirmUserEmail,
  signIn,
  allUsers,
  update,
  resetPassword,
  forgetPassword,
  changePassword,
  checkToken,
  CheckLogin,
  randomPasswordUpdate,
};
