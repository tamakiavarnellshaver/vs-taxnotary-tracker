import { createDb } from './db.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || 'data.sqlite';

const db = createDb(DB_PATH);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`VS TaxNotary tracker API listening on port ${PORT}`);
});
