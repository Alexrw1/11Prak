const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { pool } = require("../db");// Замените на путь к вашему файлу с pool
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Путь для создания бэкапа
const getBackUp =  async (req, res) => {
  try {
    // Указываем параметры подключения к базе данных из вашего pool
    const databaseConfig = {
      user: pool.options.user,
      password: pool.options.password,
      host: pool.options.host,
      port: pool.options.port,
      database: pool.options.database,
    };

    // Генерируем команду для pg_dump
    const command = `pg_dump -U ${databaseConfig.user} -h ${databaseConfig.host} -p ${databaseConfig.port} -d ${databaseConfig.database} -F c > backup.dump`;

    // Выполняем команду в терминале
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Ошибка при создании бэкапа: ${stderr}`);
        return res.status(500).json({ error: 'Ошибка при создании бэкапа' });
      }

      console.log(`Бэкап успешно создан: ${stdout}`);
      res.status(200).json({ success: 'Бэкап успешно создан' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};


const getCsv =  async (req, res) => {
    try {
        // Получаем список всех таблиц в базе данных
        const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    
        // Создаем CSV-файл
        const csvWriter = createCsvWriter({
          path: 'tables.csv',
          header: [{id: 'table_name', title: 'Table Name'}],
        });
    
        // Записываем данные в CSV
        await csvWriter.writeRecords(result.rows);
        // Отправляем CSV-файл в ответе
        res.download('tables.csv', 'tables.csv', (err) => {
          if (err) {
            console.error('Ошибка при отправке CSV файла:', err);
            res.status(500).json({ error: 'Ошибка при отправке CSV файла' });
          } else {
            fs.unlinkSync('tables.csv');
          }
        });
      } catch (error) {
        console.error('Ошибка при экспорте таблиц в CSV:', error);
        res.status(500).json({ error: 'Ошибка при экспорте таблиц в CSV' });
      }
};

module.exports = {
   getBackUp,
   getCsv
  };


