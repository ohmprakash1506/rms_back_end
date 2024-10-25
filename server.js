const express = require("express");
const cors = require("cors");
const app = express();

var corsOptions = {
  origin: "*"
};
global.__basedir = __dirname;
app.use(cors(corsOptions));
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

//routers
const auth = require('./app/routes/user.router.js')
const cluster = require('./app/routes/cluster.router.js')
const resource = require('./app/routes/resource.router.js')
const project = require('./app/routes/project.router.js')
const department = require("./app/routes/department.router")
app.use('/api/auth', auth)
app.use('/api/cluster', cluster)
app.use('/api/resource', resource)
app.use('/api/project', project)
app.use("/api",department)

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to bezkoder application." });
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
