const { pool } = require("../db");

const getMenuForRestaurant = async (req, res) => {
  const { id } = req.params; 

  try {
    const client = await pool.connect();
    // Assuming you want to get menu items for a specific restaurant
    const query = "SELECT * FROM Menu WHERE restaurant_id = $1";
    const values = [id];
    const result = await client.query(query, values);
    client.release();
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching menu items" });
  }
};

const getMenu = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT r.name AS restaurant_name,  m.id AS menu_id, m.name AS menu_item_name, m.price AS menu_item_price, m.description AS menu_item_description FROM Restaurants r JOIN Menu m ON r.id = m.restaurant_id');
    client.release();
    res.json(result.rows);
   
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching restaurants" });
  }
};

const deleteMenuItem = async (req, res) => {
  const { restaurantId, menuItemId } = req.params;

  try {
    const client = await pool.connect();

    // Удаление связанных записей в таблице orderitems (каскадное удаление)
    const deleteOrderItemsQuery = 'DELETE FROM orderitems WHERE menu_id = $1';
    await client.query(deleteOrderItemsQuery, [menuItemId]);

    // Удаление связанных записей в таблице cartitems (каскадное удаление)
    const deleteCartItemsQuery = 'DELETE FROM cartitems WHERE menu_id = $1';
    await client.query(deleteCartItemsQuery, [menuItemId]);

    // Удаление записи из таблицы menu
    const deleteMenuItemQuery = 'DELETE FROM menu WHERE id = $1 AND restaurant_id = $2 RETURNING *';
    const deletedMenuItem = await client.query(deleteMenuItemQuery, [menuItemId, restaurantId]);

    client.release();

    if (deletedMenuItem.rows.length > 0) {
      res.json({ message: 'Menu item deleted successfully' });
    } else {
      res.status(404).json({ error: 'Menu item not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while deleting the menu item' });
  }
};





const postMenu = async (req, res) => {
  const { restaurant_id, name, price, description, sale, expiration_date, images } = req.body;

  try {
    const client = await pool.connect();
    const query = 'INSERT INTO Menu (restaurant_id, name, price, description, sale, expiration_date, images) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
    const values = [restaurant_id, name, price, description, sale, expiration_date, images];
    const result = await client.query(query, values);
    client.release();

    const newMenuItemId = result.rows[0].id;

    res.status(201).json({ message: 'Menu item added successfully', menu_item_id: newMenuItemId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while adding the menu item' });
  }
};

const calculateAveragePrice = async (req, res) => {
  const { restaurantId } = req.params;

  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT AVG(price) AS average_price
      FROM Menu
      WHERE restaurant_id = $1
    `, [restaurantId]);
    client.release();

    const averagePrice = result.rows[0].average_price || 0; // Если нет данных, вернем 0

    res.json({ average_price: averagePrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while calculating average price' });
  }
};


module.exports = {
  getMenuForRestaurant,
  calculateAveragePrice,
  postMenu,
  getMenu,
  deleteMenuItem
};
