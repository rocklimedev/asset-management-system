import { networkUuid } from './network.ids';
import { upgradeNetwork } from './network.legacy';
import { validateNetwork } from './network.validation';
import { clearTopology, persistTopology } from './network.storage';

type Database = {
  execute(sql: string, values?: any[]): Promise<any>;
  query(sql: string, values?: any[]): Promise<any>;
  beginTransaction(): Promise<void>; commit(): Promise<void>; rollback(): Promise<void>;
};
const quote = (identifier: string) => {
  if(!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error('Unexpected schema identifier.');
  return '`'+identifier+'`';
};

// Run with the backend stopped: MySQL column/FK DDL commits independently.
// Conversion of documents, backups and all graph references is transactional.
// Schema definitions come from the versioned SQL files, allowing interrupted DDL to be rerun.
export async function upgradeNetworkUuids(db: Database, schema: string) {
  const definitions = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (network_\w+)\s*\(([\s\S]*?)\) ENGINE=InnoDB;/g)]
    .map(match=>({table:match[1],body:match[2]}));
  const tables = definitions.map(d=>d.table);
  const query = (sql: string, values: any[]) => db.execute(sql,values);
  await db.beginTransaction();
  try {
    const [maps] = await db.execute('SELECT * FROM network_maps ORDER BY id FOR UPDATE');
    const targets = new Set<string>();
    for(const map of maps) {
      const id=networkUuid('maps',map.id);
      if(targets.has(id)) throw new Error('Duplicate target map UUID; no maps were changed.');
      targets.add(id);
    }
    for(const map of maps) {
      const current=typeof map.document==='string'?JSON.parse(map.document):map.document;
      const document=upgradeNetwork(current);validateNetwork(document);
      const id=networkUuid('maps',map.id),json=JSON.stringify(document);
      const changed=id!==map.id || json!==JSON.stringify(current),revision=Number(map.revision)+(changed?1:0);
      if(id!==map.id) {
        await query('INSERT INTO network_maps (id,document,revision,createdAt,updatedAt) VALUES (?,?,?,?,NOW())',[id,json,revision,map.createdAt]);
        await query('UPDATE network_map_legacy_backups SET map_id = ? WHERE map_id = ?',[id,map.id]);
      } else if(changed) {
        await query('UPDATE network_maps SET document=?,revision=?,updatedAt=NOW() WHERE id=?',[json,revision,id]);
      }
      if(changed) await query('INSERT IGNORE INTO network_map_legacy_backups (map_id,revision,document,backed_up_at) VALUES (?,?,?,NOW())',[id,map.revision,JSON.stringify(current)]);
      await persistTopology(query,id,document);
      if(id!==map.id) { await clearTopology(query,map.id);await query('DELETE FROM network_maps WHERE id = ?',[map.id]); }
    }
    await db.commit();
  } catch(error) { await db.rollback();throw error; }

  const [columns] = await db.query(`SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName,
    DATA_TYPE AS dataType, CHARACTER_MAXIMUM_LENGTH AS size, COLLATION_NAME AS collationName
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`);
  const alterations: {table:string;column:string;nullable:boolean}[]=[];
  const expectedForeignKeys: {table:string;columns:string[];target:string;targetColumns:string[]}[]=[];
  for(const {table,body} of definitions) {
    for(const match of body.matchAll(/^\s*(\w+) CHAR\(36\) CHARACTER SET ascii COLLATE ascii_bin (NOT NULL|NULL)/gm)) {
      const column=columns.find((c:any)=>c.tableName===table&&c.columnName===match[1]);
      if(!column) throw new Error(`Missing ${table}.${match[1]}; apply network schema first.`);
      if(column.dataType!=='char'||Number(column.size)!==36||column.collationName!=='ascii_bin')
        alterations.push({table,column:match[1],nullable:match[2]==='NULL'});
    }
    for(const match of body.matchAll(/FOREIGN KEY\(([^)]+)\) REFERENCES (\w+)\(([^)]+)\)/g))
      expectedForeignKeys.push({table,columns:match[1].split(','),target:match[2],targetColumns:match[3].split(',')});
  }
  const getKeys=async()=>{
    const [rows]=await db.query(`SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName,
      COLUMN_NAME AS columnName, REFERENCED_TABLE_NAME AS targetTable, REFERENCED_COLUMN_NAME AS targetColumn
      FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`);
    return rows.filter((r:any)=>tables.includes(r.tableName));
  };
  if(alterations.length) {
    const seen=new Set<string>();
    for(const row of await getKeys()) {
      const key=row.tableName+':'+row.constraintName;if(seen.has(key))continue;seen.add(key);
      await db.query(`ALTER TABLE ${quote(row.tableName)} DROP FOREIGN KEY ${quote(row.constraintName)}`);
    }
    for(const {table,column,nullable} of alterations)
      await db.query(`ALTER TABLE ${quote(table)} MODIFY ${quote(column)} CHAR(36) CHARACTER SET ascii COLLATE ascii_bin ${nullable?'NULL':'NOT NULL'}`);
  }
  const keys=await getKeys();
  for(const [index,fk] of expectedForeignKeys.entries()) {
    const groups=new Map<string,any[]>();
    for(const row of keys.filter((r:any)=>r.tableName===fk.table))groups.set(row.constraintName,[...(groups.get(row.constraintName)||[]),row]);
    const exists=[...groups.values()].some(rows=>rows.length===fk.columns.length&&rows.every((r,i)=>r.columnName===fk.columns[i]&&r.targetTable===fk.target&&r.targetColumn===fk.targetColumns[i]));
    if(!exists) await db.query(`ALTER TABLE ${quote(fk.table)} ADD CONSTRAINT ${quote('network_uuid_fk_'+index)} FOREIGN KEY (${fk.columns.map(quote).join(',')}) REFERENCES ${quote(fk.target)} (${fk.targetColumns.map(quote).join(',')})`);
  }
}
