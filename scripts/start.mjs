import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiHealthUrl = process.env.BON_API_HEALTH_URL ?? 'http://127.0.0.1:3000/api/health';
const webUrl = process.env.BON_WEB_URL ?? 'http://127.0.0.1:4200';
const shouldSkipInstall = process.argv.includes('--skip-install');
const shouldOpenBrowser = !process.argv.includes('--no-open');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

let serviceProcesses = [];
let shuttingDown = false;

function resolvePackageManager() {
  const candidates = [
    { label: 'pnpm', command: isWindows ? 'pnpm.cmd' : 'pnpm', prefix: [] },
    { label: 'corepack pnpm', command: isWindows ? 'corepack.cmd' : 'corepack', prefix: ['pnpm'] },
    {
      label: 'npx pnpm',
      command: isWindows ? 'npx.cmd' : 'npx',
      prefix: ['-y', 'pnpm@10.26.2']
    }
  ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.prefix, '--version'], {
      cwd: rootDir,
      stdio: 'ignore'
    });

    if (result.status === 0) {
      return candidate;
    }
  }

  throw new Error('Unable to locate pnpm. Install pnpm or ensure npm can run npx.');
}

function packageManagerArgs(packageManager, args) {
  return [...packageManager.prefix, ...args];
}

function runPackageManager(packageManager, args, options = {}) {
  return spawn(packageManager.command, packageManagerArgs(packageManager, args), {
    cwd: rootDir,
    shell: false,
    ...options
  });
}

function prefixStream(label, stream, target) {
  if (!stream) {
    return;
  }

  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;

    while (buffer.includes('\n')) {
      const newlineIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
      buffer = buffer.slice(newlineIndex + 1);
      target.write(`[${label}] ${line}\n`);
    }
  });

  stream.on('end', () => {
    const line = buffer.replace(/\r$/, '');
    if (line) {
      target.write(`[${label}] ${line}\n`);
    }
  });
}

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
      // Service is still starting up.
    }

    await delay(1000);
  }

  throw new Error(`${label} did not become ready within ${timeoutMs / 1000} seconds.`);
}

function openBrowser(url) {
  const launchers =
    process.platform === 'darwin'
      ? [{ command: 'open', args: [url] }]
      : process.platform === 'win32'
        ? [{ command: 'cmd', args: ['/c', 'start', '', url] }]
        : [{ command: 'xdg-open', args: [url] }];

  for (const launcher of launchers) {
    const result = spawnSync(launcher.command, launcher.args, {
      cwd: rootDir,
      stdio: 'ignore'
    });

    if (result.status === 0) {
      process.stdout.write(`Opened ${url} in your browser.\n`);
      return;
    }
  }

  process.stdout.write(`Open ${url} manually if your browser did not launch.\n`);
}

function startService(label, cwd) {
  const child = spawn(npmCommand, ['run', 'serve'], {
    cwd,
    shell: false,
    env: {
      ...process.env,
      BROWSER: 'none'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  prefixStream(label, child.stdout, process.stdout);
  prefixStream(label, child.stderr, process.stderr);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    process.stderr.write(`${label} exited with ${signal ?? `code ${code ?? 'unknown'}`}. Stopping the launcher.\n`);
    shutdown(code ?? 1);
  });

  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of serviceProcesses) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    process.exit(code);
  }, 250);
}

async function installDependencies(packageManager) {
  process.stdout.write('Installing workspace dependencies...\n');
  const installProcess = runPackageManager(packageManager, ['install', '--frozen-lockfile'], {
    stdio: 'inherit'
  });
  await waitForProcess(installProcess, 'Dependency installation');
}

async function runNpmScript(label, cwd, scriptName) {
  process.stdout.write(`${label}...\n`);
  const child = spawn(npmCommand, ['run', scriptName], {
    cwd,
    shell: false,
    stdio: 'inherit'
  });
  await waitForProcess(child, label);
}

async function main() {
  process.stdout.write('Bootstrapping Bank of Namibia P2P challenge app...\n');

  if (!shouldSkipInstall) {
    const packageManager = resolvePackageManager();
    await installDependencies(packageManager);
  } else {
    process.stdout.write('Skipping dependency installation.\n');
  }

  await runNpmScript('Building API', path.join(rootDir, 'apps', 'api'), 'build');

  serviceProcesses = [
    startService('api', path.join(rootDir, 'apps', 'api')),
    startService('web', path.join(rootDir, 'apps', 'web'))
  ];

  await Promise.all([waitForUrl(apiHealthUrl, 'API'), waitForUrl(webUrl, 'Web')]);

  if (shouldOpenBrowser) {
    openBrowser(webUrl.replace('127.0.0.1', 'localhost'));
  }

  process.stdout.write('Application is ready.\n');
  process.stdout.write('Press Ctrl+C to stop both services.\n');
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  shutdown(1);
});
