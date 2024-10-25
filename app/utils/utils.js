const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const moment = require("moment");
const crypto = require("crypto");
var algorithm = "aes256"; // or any other algorithm supported by OpenSSL
var key = "password";

//check user is authenticated
exports.isAuthenticated = (token) => {
  if (token) {
    return jwt.verify(
      token.split("Bearer ")[1],
      process.env.JWT_KEY,
      (err, authorizedData) => {
        if (err) {
          return false;
        } else {
          return authorizedData;
        }
      }
    );
  } else {
    return false;
  }
};

exports.capitalizeFirstLetter = (string) => {
  if (string && string != "") {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } else {
    return "";
  }
};

//Email sender
exports.mailSender = (emailOptions) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.sendMail(emailOptions, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log(result);
      console.log("result");
    }
  });
};

exports.projectDetails = (projectResourceMap) => {
  return projectResourceMap.map((project) => {
    let totalBudget = 0;
    let usedBudget = 0;
    const resArr = [];
    let endDate =
      project.endDate && project.endDate <= new Date()
        ? moment(project.endDate)
        : moment(new Date());
    let startDate = project.startDate
      ? moment(project.startDate)
      : moment.now();
    let betweenMonths = [];
    if (startDate < endDate) {
      var date = endDate.endOf("month");
      while (date > startDate.startOf("month")) {
        betweenMonths.push({
          month: date.format("MMMM-YYYY"),
          monthNumber: date.month(),
          year: date.year(),
        });
        date.subtract(1, "month");
      }
    }
    for (let j = 0; j < project.clientResources.length; j++) {
      const resource = project.clientResources[j];
      if (resource.projectResources && resource.projectResources.length > 0) {
        for (let i = 0; i < resource.projectResources.length; i++) {
          const pres = resource.projectResources[i];
          let finalres = {};
          if (pres.resource) {
            finalres = {
              ...finalres,
              ...{
                resourceID: pres.resource.id,
                phone: pres.resource.phone,
                salary: this.decrypt(pres.resource.salary),
                experience: pres.resource.experience,
                skills: pres.resource.skills,
                name: this.capitalizeFirstLetter(pres.resource.name),
                lastName: this.capitalizeFirstLetter(pres.resource.lastName),
                email: pres.resource.user.email,
              },
            };
          }
          finalres = {
            ...finalres,
            ...{
              projectResourceID: pres.id,
              usedBudget: pres.usedBudget,
              usedHours: pres.usedHours,
              resourceStartDate: pres.startDate,
              resourceEndDate: pres.endDate,
              resourceEndDate: pres.endDate,
              clientResourceID: resource.id,
              month: resource.month,
              designation: resource.designation,
              resourceBudget: resource.resourceBudget,
              resourceHours: resource.resourceHours,
              clientStartDate: resource.startDate,
              clientEndDate: resource.endDate,
            },
          };
          resArr.push(finalres);
        }
      }
    }

    const budgets = project.clientResources.map((budget) => {
      let prDetails = {};
      if (budget.projectResources && budget.projectResources.length > 0) {
        let uBudget = 0;
        let uHours = 0;
        budget.projectResources.map((res) => {
          uBudget = uBudget + res.usedBudget;
          uHours = uHours + res.usedHours;
        });
        usedBudget = usedBudget + uBudget;
        prDetails = {
          usedBudget: uBudget,
          usedHours: uHours,
        };
      }
      totalBudget = totalBudget + budget.resourceBudget;
      return {
        clientResourceID: budget.id,
        month: budget.month,
        designation: budget.designation,
        resourceBudget: budget.resourceBudget,
        resourceHours: budget.resourceHours,
        clientStartDate: budget.startDate,
        clientEndDate: budget.endDate,
        ...prDetails,
      };
    });
    let resourceCount = 0;
    if (
      project &&
      project.clientResources &&
      project.clientResources.length > 0
    ) {
      resourceCount = project.clientResources.length;
    }
    return {
      projectID: project.id,
      projectName: project.name,
      projectDescription: project.description,
      projectType: project.type,
      projectStartDate: project.startDate,
      projectEndDate: project.endDate,
      clusterID: project.clusterID,
      totalBudget: totalBudget,
      usedBudget: usedBudget,
      resourceCount: resourceCount,
      resources: resArr.filter((item) => item),
      budgets: budgets.filter((item) => item),
      monthRange: betweenMonths,
    };
  });
};

exports.getValidPageSize = (value) => {
  if (typeof value == "string" && !Number.isNaN(value)) {
    value = Number(value);
  }
  // if ([1,5,10,15,20, 30, 40, 50, 100, 200, 500, 1000, 10000].includes(value)) {
  //   return value;
  // }
  if (value > 0) {
    return value;
  } else {
    return 20;
  }
};

//Encrypting text
exports.encrypt = (text) => {
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(String(text), "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

// Decrypting text
exports.decrypt = (encryptedData) => {
  if (encryptedData && encryptedData.length > 20) {
    const decipher = crypto.createDecipher(algorithm, key);
    let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
    decryptedData += decipher.final("utf8");
    return decryptedData;
  } else {
    return encryptedData;
  }
};

//sort resource
exports.sortResource = (property, type) => {
  return function (obj1, obj2) {
    if (
      typeof obj1[property] === typeof obj2[property] &&
      typeof obj1[property] == "number"
    ) {
      if (type == "asc") {
        return obj1[property] - obj2[property];
      } else {
        return obj2[property] - obj1[property];
      }
    } else {
      return undefined;
    }
  };
};

exports.hexToRgbA = (hex, opacity) => {
  var c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split("");
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255},${opacity})`;
  }
  throw new Error("Bad Hex");
};

exports.generatePassword = (
  length = 8,
  wishlist = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$"
) => {
  return Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((x) => wishlist[x % wishlist.length])
    .join("");
};
