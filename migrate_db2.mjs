import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== 1. Exporting data from Supabase ==="
PGPASSWORD="Aliwdansaa23" /usr/lib/postgresql/17/bin/pg_dump -h db.vxmpzhfbnnkhtpobwfex.supabase.co -U postgres -d postgres -n public --no-owner --no-privileges -f /tmp/wms_dump_clean.sql
echo "Dump successful. File size:"
ls -lh /tmp/wms_dump_clean.sql

echo "=== 2. Cleaning VPS Database ==="
sudo -u postgres psql -d wms_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO wms_user; GRANT ALL ON SCHEMA public TO public;"

echo "=== 3. Importing data to VPS ==="
sudo -u postgres psql -d wms_db -f /tmp/wms_dump_clean.sql > /tmp/import_log2.txt 2>&1
echo "Import completed. Check /tmp/import_log2.txt for details."

echo "=== 4. Verifying Import ==="
sudo -u postgres psql -d wms_db -c "SELECT count(*) AS user_count FROM users; SELECT count(*) AS product_count FROM products;"

echo "=== DONE ==="
`;

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '13.140.175.47',
  port: 22,
  username: 'root',
  password: 'Aliwdansaa23'
});
