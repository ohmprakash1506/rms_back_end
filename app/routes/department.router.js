const departmentController = require('../controllers/department.controller');
const upload = require("../middleware/uploadExcel");
const router = require('express').Router()

router.get('/department', departmentController.getDepartment)
router.get('/department/:id', departmentController.getDepartment)
router.get("/designation",departmentController.getDesignation)
router.get("/designation/:id",departmentController.getDesignation)
router.get('/designationBydepartment/:deptID',departmentController.getDesignationByDepartment)
router.get('/skills',departmentController.getSkills)
router.delete('/delete-department/:id',departmentController.deleteDepartment)
router.put('/update-mater-data/:id',departmentController.updateMaterdata)
router.delete('/delete-master-data/:id',departmentController.deleteMasterDataByType)
router.post('/add-master-data',departmentController.addMasterData)
router.post('/add-master-data-bulk',departmentController.addBulkMasterData)
router.post('/bulk-master-data-add',upload.single("file"),departmentController.bulkUploadMasterdata)
module.exports = router;