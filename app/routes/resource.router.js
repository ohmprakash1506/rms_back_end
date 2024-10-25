const resourceController = require('../controllers/resource.controller.js');
const upload = require("../middleware/uploadExcel");

const router = require('express').Router()
router.post('/', resourceController.addResource)
router.post('/user-add',resourceController.addResourceUser)
router.get('/', resourceController.getAllResource)
router.get('/enum', resourceController.getEnum)
router.get('/:id', resourceController.getAllResource)
router.put('/:id', resourceController.updateResource)
router.delete('/:id', resourceController.deleteResource)
router.get('/search/:id', resourceController.freeResourceList)
router.post('/bulk-upload', upload.single("file"), resourceController.bulkUpload);
router.put("/change-status/:id",resourceController.updateStatusResource)
router.put("/change-role/:id",resourceController.updateResourceRole)
router.get("/user/name-data",resourceController.getUserName)
module.exports = router;