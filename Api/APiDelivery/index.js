const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
const userRoutes = require('./routes/user.routes'); // Импортируйте маршруты для пользователей

// Разрешить запросы с определенных источников
const allowedOrigins = ['http://localhost:56093' ];
const corsOptions = {
  origin: '*',
};

app.use(cors(corsOptions));

// Используйте маршруты для пользователей
app.use('/', userRoutes);



// Далее настройка других маршрутов и middleware

app.listen(8080, () => {
  console.log('Сервер запущен на порту 8080');
});
