import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { existsSync } from 'node:fs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiHealthUrl = process.env.BON_API_HEALTH_URL ?? 'http://127.0.0.1:3000/api/health';
const webUrl = process.env.BON_WEB_URL ?? 'http://127.0.0.1:4200';
const shouldOpenBrowser = !process.argv.includes('--no-open');
const isWindows = process.platform === 'win32';
const windowsShell = process.env.comspec ?? 'cmd.exe';
const apiWorkspace = '@bon-p2p/api';
const webWorkspace = '@bon-p2p/web';
const supportedNodeRanges = [
  { major: 20, minor: 19, patch: 0 },
  { major: 22, minor: 12, patch: 0 }
];

let serviceProcesses = [];
let shuttingDown = false;

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

function parseNodeVersion(version) {
  const clean = version.replace(/^v/, '');
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function isVersionAtLeast(current, minimum) {
  if (current.major !== minimum.major) {
    return current.major > minimum.major;
  }

  if (current.minor !== minimum.minor) {
    return current.minor > minimum.minor;
  }

  return current.patch >= minimum.patch;
}

function validateNodeVersion() {
  const current = parseNodeVersion(process.version);

  if (!current) {
    throw new Error(`Unable to read the current Node.js version: ${process.version}`);
  }

  const supported = supportedNodeRanges.some((minimum) => current.major === minimum.major && isVersionAtLeast(current, minimum));

  if (!supported) {
    throw new Error(
      `Unsupported Node.js version ${process.version}. Use Node 22.12.0+ (recommended) or Node 20.19.0+ before running npm start.`
    );
  }
}

function ensureDependenciesInstalled() {
  const requiredPaths = [
    path.join(rootDir, 'node_modules', '.package-lock.json'),
    path.join(rootDir, 'node_modules', '@bon-p2p', 'api', 'package.json'),
    path.join(rootDir, 'node_modules', '@bon-p2p', 'web', 'package.json')
  ];

  const missing = requiredPaths.some((filePath) => !existsSync(filePath));

  if (missing) {
    throw new Error('Dependencies are missing. Run npm install from the repository root, then run npm start again.');
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use. Stop the existing service on ${host}:${port} and try again.`));
          return;
        }

        if (error.code === 'EACCES' || error.code === 'EPERM') {
          reject(new Error(`Port ${port} cannot be opened on this machine right now (${error.code}).`));
          return;
        }
      }

      reject(error);
    });

    server.listen(port, host, () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });
  });
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

  process.stdout.write(`Browser launch skipped. Open ${url} manually.\n`);
}

function quoteWindowsArg(value) {
  if (/[\s"&()^<>|]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function spawnNpm(args, options = {}) {
  if (isWindows) {
    const command = ['npm.cmd', ...args.map(quoteWindowsArg)].join(' ');

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

function startWorkspaceService(label, workspaceName, scriptName) {
  const child = spawnNpm(['run', scriptName, '-w', workspaceName], {
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

async function main() {
  process.stdout.write('Starting Bank of Namibia P2P challenge app...\n');
  validateNodeVersion();
  ensureDependenciesInstalled();
  await Promise.all([checkPortAvailable(3000), checkPortAvailable(4200)]);

  serviceProcesses = [
    // Run the API directly from source so evaluators only need npm install + npm start.
    startWorkspaceService('api', apiWorkspace, 'dev'),
    startWorkspaceService('web', webWorkspace, 'serve')
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
