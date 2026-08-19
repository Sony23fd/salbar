import { Client } from 'ssh2';

const conn = new Client();

const script = `
sudo -u postgres psql -d wms_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wms_user;"
sudo -u postgres psql -d wms_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wms_user;"
sudo -u postgres psql -d wms_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO wms_user;"
sudo -u postgres psql -d wms_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO wms_user;"
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
