import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== 0. Installing PostgreSQL 17 client ==="
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc >/dev/null
sudo apt update
sudo apt install -y postgresql-client-17

echo "=== 1. Exporting data from Supabase ==="
PGPASSWORD="Aliwdansaa23" /usr/lib/postgresql/17/bin/pg_dump -h db.vxmpzhfbnnkhtpobwfex.supabase.co -U postgres -d postgres -n public --clean --if-exists --no-owner --no-privileges -f /tmp/wms_dump.sql
echo "Dump successful. File size:"
ls -lh /tmp/wms_dump.sql

echo "=== 2. Importing data to Contabo VPS ==="
sudo -u postgres psql -d wms_db -f /tmp/wms_dump.sql > /tmp/import_log.txt 2>&1
echo "Import completed. Check /tmp/import_log.txt for details."

echo "=== 3. Verifying Import ==="
sudo -u postgres psql -d wms_db -c "SELECT count(*) AS user_count FROM \\"User\\"; SELECT count(*) AS product_count FROM \\"Product\\";"

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
