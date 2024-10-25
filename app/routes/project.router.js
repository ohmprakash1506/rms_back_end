const projectController = require('../controllers/project.controller.js');
const projectResourceController = require('../controllers/project.resource.controller.js');

const router = require('express').Router()

router.post('/', projectController.create)
router.put('/:id', projectController.updateProject)
router.delete('/:id', projectController.deleteProject)

router.post('/add-resource-budget', projectResourceController.addResourceBudget)
router.delete('/delete-resource-budget/:id',projectResourceController.deleteResourceBudget)
router.post("/add-resource-budget-bulk",projectResourceController.addResourceBudgetBulk)
router.post('/add-resource', projectResourceController.addResource)
router.delete("/delete-project-resource/:id",projectResourceController.deleteProjectresourceId)
router.get('/', projectResourceController.getAllProject)
router.get('/:id', projectResourceController.getAllProject)
router.get('/:type', projectResourceController.getAllProject)
router.post("/clone-resource",projectResourceController.cloneResources)
module.exports = router;