const { pool } = require("../db");

const addToCart = async (req, res) => {
  const { cartId, menuId, quantity } = req.body;
  try {
    const client = await pool.connect();

    // Проверяем, существует ли уже такой товар в корзине
    const existingCartItem = await client.query(
      'SELECT * FROM CartItems WHERE cart_id = $1 AND menu_id = $2',
      [cartId, menuId]
    );

    if (existingCartItem.rows.length > 0) {
      // Если товар уже есть в корзине, увеличиваем количество
      const updateQuantityQuery = `
        UPDATE CartItems 
        SET quantity = quantity + $1 
        WHERE cart_id = $2 AND menu_id = $3
      `;
      const updateQuantityValues = [quantity, cartId, menuId];
      await client.query(updateQuantityQuery, updateQuantityValues);
    } else {
      // Если товара нет в корзине, создаем новую запись
      const insertCartItemQuery = `
        INSERT INTO CartItems (cart_id, menu_id, quantity) 
        VALUES ($1, $2, $3)
      `;
      const insertCartItemValues = [cartId, menuId, quantity];
      await client.query(insertCartItemQuery, insertCartItemValues);
    }

    client.release();

    res.status(201).json({ message: 'Item added to the cart successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while adding item to the cart' });
  }
};


const getTotalPriceByCart = async (req, res) => {
  const { userId } = req.params;

  // Проверим, что p_user_id является числом
  // const userId = isNaN(parseInt(p_user_id, 10)) ? 0 : parseInt(p_user_id, 10);

  try {
    console.log('userId before query:', userId);

    const client = await pool.connect();
    
    // Assuming you want to get menu items for a specific restaurant
    const query = "SELECT calculateCartTotal($1) AS total_price";
    const values = [userId];
    
    const result = await client.query(query, values);
    client.release();

    // Используйте result.rows[0] для доступа к первой строке результата
    const totalPriceObject = { totalPrice: result.rows[0].total_price };

    console.log('Total Price:', totalPriceObject);

    res.json(totalPriceObject);
  } catch (err) {
    console.error(err);
    console.error(err.detail); // Добавляем эту строку для более подробной информации
    res.status(500).json({ error: "Ошибка получения итоговой стоимости", details: err.message });
  }
};




const getCart = async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();
    const query = `
      SELECT ci.id, m.name AS menu_item_name, m.price AS menu_item_price, m.images AS menu_item_images, ci.quantity
      FROM CartItems ci
      JOIN Menu m ON ci.menu_id = m.id
      JOIN Carts c ON ci.cart_id = c.id
      WHERE c.user_id = $1`;
    const values = [id];
    const result = await client.query(query, values);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching items from the cart" });
  }
};

const deleteCartItem = async (req, res) => {
  const { itemId, cartId } = req.body;
  const client = await pool.connect();

  try {
    // Check if the item exists in the cart
    const checkItemQuery = 'SELECT * FROM CartItems WHERE id = $1 AND cart_id = $2';
    const checkItemResult = await client.query(checkItemQuery, [itemId, cartId]);

    if (checkItemResult.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found in the cart' });
    }

    // Decrease the quantity of the item in the cart
    const decreaseQuantityQuery = `
      UPDATE CartItems
      SET quantity = GREATEST(0, quantity - 1)
      WHERE id = $1
    `;
    await client.query(decreaseQuantityQuery, [itemId]);

    // Delete the item from the cart if the quantity becomes 0
    const deleteItemQuery = 'DELETE FROM CartItems WHERE id = $1 AND quantity = 0 RETURNING *';
    const deletedItemResult = await client.query(deleteItemQuery, [itemId]);

    const deletedItem = deletedItemResult.rows[0];

    // Commit the transaction
    await client.query('COMMIT');

    res.status(200).json({
      message: 'Item quantity decreased in the cart successfully',
      deletedItem,
    });
  } catch (error) {
    // Rollback the transaction in case of an error
    await client.query('ROLLBACK');

    console.error('Error while decreasing item quantity in the cart:', error);
    res.status(500).json({
      error: 'An error occurred while decreasing the item quantity in the cart',
    });
  } finally {
    // Release the client back to the pool
    client.release();
  }
};


const placeOrder = async (req, res) => {
  const { userId, cartId, deliveryAddress } = req.body;

  try {
    const client = await pool.connect();
    let orderId;

    try {
      // Create an order with the initial status set to 'New'
      const createOrderQuery = 'INSERT INTO Orders (user_id, total_price, status, delivery_address) VALUES ($1, 0, $2, $3) RETURNING id';
      const createOrderValues = [userId, 'Новый', deliveryAddress];
      const orderResult = await client.query(createOrderQuery, createOrderValues);
      orderId = orderResult.rows[0].id;

      // Move cart items to order items
      const moveItemsQuery = 'INSERT INTO OrderItems (order_id, menu_id, quantity) SELECT $1, menu_id, quantity FROM CartItems WHERE cart_id = $2';
      const moveItemsValues = [orderId, cartId];
      await client.query(moveItemsQuery, moveItemsValues);

      // Calculate and update total price of the order
      const totalOrderPrice = await calculateOrderTotal(orderId);
      const updateTotalQuery = 'UPDATE Orders SET total_price = $1 WHERE id = $2';
      const updateTotalValues = [totalOrderPrice, orderId];
      await client.query(updateTotalQuery, updateTotalValues);

      // Insert order status history
      const insertStatusHistoryQuery = 'INSERT INTO OrderStatusHistory (order_id, status_id) VALUES ($1, (SELECT id FROM OrderStatuses WHERE name = $2))';
      const insertStatusHistoryValues = [orderId, 'В обработке'];
      await client.query(insertStatusHistoryQuery, insertStatusHistoryValues);

      // Clear the user's cart
      const clearCartQuery = 'DELETE FROM CartItems WHERE cart_id = $1';
      const clearCartValues = [cartId];
      await client.query(clearCartQuery, clearCartValues);

      client.release();

      res.status(201).json({ message: 'Order placed successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while placing the order' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while connecting to the database' });
  }
};




const getUserOrders = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch user orders from the database
    const userOrdersQuery = 'SELECT * FROM Orders WHERE user_id = $1';
    const userOrdersValues = [userId];
    const userOrdersResult = await pool.query(userOrdersQuery, userOrdersValues);
    const userOrders = userOrdersResult.rows;

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const orderItemsQuery = 'SELECT * FROM OrderItems WHERE order_id = $1';
        const orderItemsValues = [order.id];
        const orderItemsResult = await pool.query(orderItemsQuery, orderItemsValues);
        const orderItems = orderItemsResult.rows;

        return {
          ...order,
          items: orderItems,
        };
      })
    );

    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching user orders' });
  }
};


const getOrders = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM Orders");
    client.release();
    res.json(result.rows);
   
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching restaurants" });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId, newStatus } = req.body;
  try {
    const client = await pool.connect();

    // Update the status of the order
    const updateStatusQuery = 'UPDATE Orders SET status = $1 WHERE id = $2';
    const updateStatusValues = [newStatus, orderId];
    await client.query(updateStatusQuery, updateStatusValues);

    client.release();
  } catch (error) {
    console.error(error);
    throw new Error('Error updating order status');
  }
};

const getCountCart = async(req, res) =>{
  try {
    const { cart_id } = req.params;

    // Вызываем вашу функцию countItemsInCart с использованием пула подключений
    const result = await pool.query(
      'SELECT countItemsInCartsss($1) AS item_count',
      [cart_id]
    );

    const item_count = result.rows[0].item_count;

    res.status(200).json({ item_count });
  } catch (error) {
    console.error('Ошибка при получении количества товаров в корзине:', error);
    res.status(500).json({ error: 'Ошибка при обработке запроса' });
  }
}

const calculateOrderTotal = async (orderId) => {
  try {
    const client = await pool.connect();

    // Query to calculate the total price of the order
    const query = `
      SELECT SUM(menu.price * order_items.quantity) AS total_price
      FROM OrderItems order_items
      JOIN Menu menu ON order_items.menu_id = menu.id
      WHERE order_items.order_id = $1`;

    const values = [orderId];
    const result = await client.query(query, values);

    client.release();

    // Return the calculated total price
    return result.rows[0].total_price || 0; // If no data, return 0
  } catch (error) {
    console.error(error);
    throw new Error("Error calculating order total");
  }
};

module.exports = {
  placeOrder,
  getCart,
  addToCart,
  calculateOrderTotal,
  deleteCartItem,
  getUserOrders,
  updateOrderStatus,
  getCountCart,
  getOrders,
  getTotalPriceByCart
};
