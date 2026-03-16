import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const windowsShell = process.env.comspec ?? 'cmd.exe';
const apiHealthUrl = process.env.BON_API_HEALTH_URL ?? 'http://127.0.0.1:3000/api/health';
const webUrl = process.env.BON_WEB_URL ?? 'http://127.0.0.1:4200';

let child;
let shuttingDown = false;

function spawnNpm(args, options = {}) {
  if (isWindows) {
    const command = ['npm.cmd', ...args.map((value) => (/[\s"&()^<>|]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value))].join(' ');

    return spawn(windowsShell, ['/d', '/s', '/c', command], {
      cwd: rootDir,
      shell: false,
      ...options
    });
  }

  return spawn('npm', args, {
    cwd: rootDir,
    shell: false,
    ...options
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, label, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        process.stdout.write(`${label} ready at ${url}\n`);
        return;
      }
    } catch {
      // Service is still starting.
    }

    await delay(1000);
  }

  throw new Error(`${label} did not become ready within ${timeoutMs / 1000} seconds.`);
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (child && !child.killed) {
    child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(code), 250);
}

async function main() {
  process.stdout.write('Running startup smoke test...\n');

  child = spawnNpm(['start', '--', '--no-open'], {
    env: {
      ...process.env,
      BROWSER: 'none'
    },
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      process.stderr.write(`Startup process exited early with ${signal ?? `code ${code ?? 'unknown'}`}\n`);
      shutdown(code ?? 1);
    }
  });

  await Promise.all([waitForUrl(apiHealthUrl, 'API'), waitForUrl(webUrl, 'Web')]);
  process.stdout.write('Startup smoke test passed.\n');
  shutdown(0);
}

process.on('SIGINT', () => shutdown(1));
process.on('SIGTERM', () => shutdown(1));

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  shutdown(1);
});
