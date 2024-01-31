const Pool = require('pg').Pool;
const pool = new Pool({
    user: "postgres",
    password: "123",
    host: "localhost",
    port: 5432,
    database: "DeliveryDB"
});

module.exports = {
    pool,
};



pool.query('SELECT * FROM Users', (error, results) => {
    if (error) {
      console.error('Ошибка при выполнении запроса:', error);
    } else {
      console.log('Результат запроса:', results.rows);
    }
  });