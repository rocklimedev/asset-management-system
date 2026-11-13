require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    if (process.argv.includes('--migrate') || process.argv.includes('--upgrade')) {
      const schemaFiles=['009_network_maps.sql','010_network_topology.sql'];
      const schema=schemaFiles.map(file=>fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8')).join('\n');
      if(process.argv.includes('--migrate')) {
        for (const statement of schema.split(';').map(s => s.trim()).filter(Boolean)) await db.query(statement);
      }
      await require('../dist/modules/network/network.uuid-migration').upgradeNetworkUuids(db,schema);
      console.log('Network schema and existing maps now use UUIDs. Run seed:network for a new map.');return;
    }
    const {OFFICE_NETWORK_ID} = require('../dist/modules/network/network.ids');
    const {validateNetwork} = require('../dist/modules/network/network.validation');
    const {persistTopology} = require('../dist/modules/network/network.storage');
    const query=(sql,values)=>db.execute(sql,values);
    await db.beginTransaction();
    try {
      const [rows]=await db.execute('SELECT * FROM network_maps WHERE id=? FOR UPDATE',[OFFICE_NETWORK_ID]);
      if(rows.length) {console.log('Existing map preserved.');await db.commit();return;}
      // Prevent creating a second map if the UUID migration has not yet been run.
      const [legacy]=await db.execute("SELECT id FROM network_maps WHERE id='office' FOR UPDATE");
      if(legacy.length)throw new Error('Run migrate:network first to convert the existing office map UUID.');
      const document=JSON.parse(fs.readFileSync(path.join(__dirname,'../seeds/network-map.json'),'utf8'));validateNetwork(document);
      await db.execute('INSERT INTO network_maps (id,document,revision,createdAt,updatedAt) VALUES (?,?,1,NOW(),NOW())',[OFFICE_NETWORK_ID,JSON.stringify(document)]);
      await persistTopology(query,OFFICE_NETWORK_ID,document);await db.commit();console.log('Office topology seeded with UUIDs.');
    } catch(error) {await db.rollback();throw error;}
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
