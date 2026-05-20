const express = require('express');
const cors = require('cors');
const db = require('./db/database');

const app = express();
app.use(cors());
app.use(express.json());

db.initDb().then(() => {
  const { authenticate, requireAdmin } = require('./middleware/auth');

  app.use('/api/auth',          require('./routes/auth'));
  app.use('/api/products',      authenticate, require('./routes/products'));
  app.use('/api/sales',         authenticate, require('./routes/sales'));
  app.use('/api/reports',       authenticate, requireAdmin, require('./routes/reports'));
  app.use('/api/cash-closings', authenticate, requireAdmin, require('./routes/cash-closings'));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () =>
    console.log(`POS Villanueva backend corriendo en http://localhost:${PORT}`)
  );
}).catch(err => {
  console.error('Error iniciando la base de datos:', err);
  process.exit(1);
});
