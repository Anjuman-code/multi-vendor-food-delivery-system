const express = require('express');
const router = express.Router();
const {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getFeaturedRestaurants
} = require('../controllers/restaurantController');

// Define routes
router.route('/')
  .get(getAllRestaurants)
  .post(createRestaurant);

router.route('/:id')
  .get(getRestaurantById)
  .put(updateRestaurant)
  .delete(deleteRestaurant);

// Additional routes
router.route('/featured').get(getFeaturedRestaurants);

module.exports = router;