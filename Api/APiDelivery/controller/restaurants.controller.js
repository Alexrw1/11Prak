const { pool } = require("../db");

const getRestaurants = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM Restaurants");
    client.release();
    res.json(result.rows);
   
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching restaurants" });
  }
};

const postRestaurant = async (req, res) => {
  const { name, description, address, type, images } = req.body;

  try {
    const client = await pool.connect();
    const query =
      "INSERT INTO Restaurants (name, description, address, type, images) VALUES ($1, $2, $3, $4, $5) RETURNING id";
    const values = [name, description, address,type, images];
    const result = await client.query(query, values);
    client.release();
    const newRestaurantId = result.rows[0].id;
    res
      .status(201)
      .json({
        message: "Restaurant added successfully",
        restaurant_id: newRestaurantId,
      });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while adding the restaurant" });
  }
};

const deleteRestaurant = async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();

    // Cascade delete: Delete associated cart items
    const deleteCartItemsQuery = 'DELETE FROM cartitems WHERE menu_id IN (SELECT id FROM menu WHERE restaurant_id = $1)';
    await client.query(deleteCartItemsQuery, [id]);

    // Cascade delete: Delete associated order items
    const deleteOrderItemsQuery = 'DELETE FROM orderitems WHERE menu_id IN (SELECT id FROM menu WHERE restaurant_id = $1)';
    await client.query(deleteOrderItemsQuery, [id]);

    // Cascade delete: Delete associated menu items
    const deleteMenuQuery = 'DELETE FROM menu WHERE restaurant_id = $1';
    await client.query(deleteMenuQuery, [id]);

    // Now, delete the restaurant
    const deleteRestaurantQuery = 'DELETE FROM restaurants WHERE id = $1 RETURNING *';
    const deletedRestaurant = await client.query(deleteRestaurantQuery, [id]);

    client.release();

    if (deletedRestaurant.rows.length > 0) {
      res.j+son({ message: 'Restaurant and associated menu items deleted successfully' });
    } else {
      res.status(404).json({ error: 'Restaurant not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while deleting the restaurant' });
  }
};

const searchRestaurantByName = async (req, res) => {
  const { name } = req.query;

  try {
    const result = await pool.query('SELECT * FROM Restaurants WHERE name ILIKE $1', [`%${name}%`]);
    const restaurants = result.rows;
    res.json(restaurants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while searching for restaurants' });
  }
};

const updateRestaurant = async (req, res) => {

  const { name, description, address, type, images, id } = req.body;

  try {
    const client = await pool.connect();
    const query =
      "UPDATE Restaurants SET name = $1, description = $2, address = $3, type = $4, images = $5 WHERE id = $6";
    const values = [name, description, address, type, images, id];
    await client.query(query, values);
    client.release();

    res.json({ message: "Restaurant updated successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the restaurant" });
  }
};


module.exports = {
  getRestaurants,
  postRestaurant,
  updateRestaurant,
  deleteRestaurant,
  searchRestaurantByName
};
