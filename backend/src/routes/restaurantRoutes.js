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

// Specific routes first (to avoid conflicts with dynamic routes)
router.route('/featured').get(getFeaturedRestaurants);

// Dynamic routes last
router.route('/:id')
  .get(getRestaurantById)
  .put(updateRestaurant)
  .delete(deleteRestaurant);

module.exports = router;