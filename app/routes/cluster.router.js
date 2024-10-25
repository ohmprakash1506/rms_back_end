const clusterController = require('../controllers/cluster.controller.js');

const router = require('express').Router()

router.get('/chart',clusterController.getChartAll)
router.get('/chart/:id',clusterController.getChartAll)
router.get('/cluster_chart/',clusterController.clusterChart)
router.post('/', clusterController.create)
router.put('/:id', clusterController.update)
router.get('/', clusterController.getAll)
router.get('/:id', clusterController.getAll)
router.delete('/:id', clusterController.deleteCluster)

module.exports = router;