const { pool } = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const logs = [];

const addLog = (message) => {
  const log = { id: new Date().toISOString(), message };
  logs.push(log);
  return log;
};

const getLogs = (req, res) => {
  res.json(logs);
};
// Функция для создания JWT-токена
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const secretKey = "your-secret-key"; // Замените на ваш секретный ключ
  const expiresIn = "1h"; // Время жизни токена

  return jwt.sign(payload, secretKey, { expiresIn });
};
const registerUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { username, email, password } = req.body;

    // Check if the email already exists
    const checkEmailQuery = "SELECT * FROM Users WHERE email = $1";
    const emailExists = await client.query(checkEmailQuery, [email]);

    if (emailExists.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user
    const insertUserQuery =
      "INSERT INTO Users (username, email, password) VALUES ($1, $2, $3) RETURNING *";
    const userResult = await client.query(insertUserQuery, [
      username,
      email,
      hashedPassword,
    ]);

    const newUser = userResult.rows[0];

    // Create a cart for the new user
    const createCartQuery =
      "INSERT INTO Carts (user_id) VALUES ($1) RETURNING *";
    const cartResult = await client.query(createCartQuery, [newUser.id]);

    const newCart = cartResult.rows[0];

    // Commit the transaction
    await client.query("COMMIT");

    // Generate JWT token
    const token = generateToken(newUser);
    addLog(`Зарегистрировался  пользователь: ${email}`);
    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
      token,
      cart: newCart,
    });
  } catch (error) {
    // Rollback the transaction in case of an error
    await client.query("ROLLBACK");

    console.error("Error during user registration:", error);
    res.status(500).json({ message: "Error during user registration" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
};
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Поиск пользователя по email
    const findUserQuery = "SELECT * FROM Users WHERE email = $1";
    const result = await pool.query(findUserQuery, [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Проверка пароля
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Неверный пароль" });
    }

    // Получение корзины пользователя
    const getCartQuery = "SELECT id FROM Carts WHERE user_id = $1";
    const cartResult = await pool.query(getCartQuery, [user.id]);
    const cartId = cartResult.rows[0]?.id;

    // Генерация JWT-токена
    const token = generateToken(user);
    addLog(`Залогинился пользователь: ${email}`);

    res.status(200).json({ message: "Успешная аутентификация", user, token, cartId });
  } catch (error) {
    console.error("Ошибка при аутентификации пользователя:", error);
    res.status(500).json({ message: "Ошибка при аутентификации пользователя" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя по email
    const findUserQuery = "SELECT * FROM Users WHERE email = $1";
    const result = await pool.query(findUserQuery, [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Убрать проверку пароля

    // Проверка роли пользователя
    if (user.role !== "admin") {
      return res.status(403).json({ message: "У вас нет прав доступа" });
    }

    // Генерация JWT-токена
    const token = generateToken(user);

    res.status(200).json({ message: "Успешная аутентификация", user, token });
  } catch (error) {
    console.error("Ошибка при аутентификации пользователя:", error);
    res.status(500).json({ message: "Ошибка при аутентификации пользователя" });
  }
};


module.exports = {
  registerUser,
  loginUser,
  login,
  getLogs
};
