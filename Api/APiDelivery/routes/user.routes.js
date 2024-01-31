const express = require('express');
const router = express.Router();

const userController = require('../controller/user.controller');
const restaurantsConroller = require('../controller/restaurants.controller')
const menuController = require('../controller/menu.conroller')
const backupController = require('../controller/backupdb')
const orderController = require('../controller/order.conroller')

// Маршруты
router.post('/users/register', userController.registerUser);
router.post('/users/login', userController.loginUser);
router.get('/logs', userController.getLogs);

router.get('/restaurants/get', restaurantsConroller.getRestaurants);
router.get('/restaurants/search', restaurantsConroller.searchRestaurantByName);
router.post('/restaurants/post', restaurantsConroller.postRestaurant);
router.get('/restaurant/:restaurantId/average-price', menuController.calculateAveragePrice);
router.delete('/restaurants/:id', restaurantsConroller.deleteRestaurant);
router.put('/restaurants', restaurantsConroller.updateRestaurant);

router.get('/menu/:id', menuController.getMenuForRestaurant);
router.get('/menug/get', menuController.getMenu);
router.delete('/menu/:restaurantId/:menuItemId', menuController.deleteMenuItem);

router.get('/cartcount/get/:id', orderController.getCountCart);
router.post('/menu/post', menuController.postMenu);



router.post('/users/loginAdmin', userController.login);

router.get('/backup/create', backupController.getBackUp);
router.get('/get/csv', backupController.getCsv);

router.get('/cart/:id', orderController.getCart);
router.post('/cart', orderController.addToCart);
router.post('/cart/delete', orderController.deleteCartItem);

router.get('/orders', orderController.getOrders);
router.get('/totalprice/:userId', orderController.getTotalPriceByCart);

router.post('/order/place', orderController.placeOrder);
router.put('/order/status', orderController.updateOrderStatus);

router.get('/orders/:userId', orderController.getUserOrders);





module.exports = router;
