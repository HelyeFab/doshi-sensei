import detect from 'detect-port';
import { exec } from 'child_process';

const DEFAULT_PORT = 3002;

detect(DEFAULT_PORT).then(port => {
    if (port !== DEFAULT_PORT) {
        console.log(`Port ${DEFAULT_PORT} is in use, using ${port} instead.`);
    } else {
        console.log(`Port ${DEFAULT_PORT} is available!`);
    }
    const child = exec(`next dev -p ${port}`, { stdio: 'inherit' });
    if (child.stdout) child.stdout.pipe(process.stdout);
    if (child.stderr) child.stderr.pipe(process.stderr);
}).catch(err => {
    console.error('Error detecting port:', err);
    process.exit(1);
});
