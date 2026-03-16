import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

function waitForProcess(child, label) {
  return new Promise((resolve, reject) => {
    child.on('error', (error) => reject(new Error(`${label} failed to start: ${error.message}`)));
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with ${signal ?? `code ${code ?? 'unknown'}`}.`));
    });
  });
}

async function installWorkspace(label, relativeDir) {
  process.stdout.write(`${label}...\n`);
  const child = spawn(npmCommand, ['install'], {
    cwd: path.join(rootDir, relativeDir),
    shell: false,
    stdio: 'inherit'
  });
  await waitForProcess(child, label);
}

async function main() {
  await installWorkspace('Installing API dependencies', path.join('apps', 'api'));
  await installWorkspace('Installing web dependencies', path.join('apps', 'web'));
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
