import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import net from 'node:net';

const DEFAULT_PORT = 6006;
const MAX_PORT = 65535;
const require = createRequire(import.meta.url);

const requestedPort = parsePort(process.env.STORYBOOK_PORT ?? process.env.PORT, DEFAULT_PORT);
const extraArgs = process.argv.slice(2);

const port = await findAvailablePort(requestedPort);

if (port === requestedPort) {
  console.log(`[storybook] Starting on port ${port}.`);
} else {
  console.log(`[storybook] Port ${requestedPort} is unavailable. Starting on port ${port} instead.`);
}

const child = spawn(process.execPath, [resolveStorybookBin(), 'dev', '-p', String(port), ...extraArgs], {
  env: {
    ...process.env,
    STORYBOOK: 'true',
    STORYBOOK_PORT: String(port),
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`[storybook] Failed to start Storybook: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }

  process.exit(code ?? 1);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

function parsePort(value, fallback) {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`Invalid Storybook port: ${value}`);
  }

  return port;
}

function resolveStorybookBin() {
  if (process.env.STORYBOOK_BIN) {
    return process.env.STORYBOOK_BIN;
  }

  return join(dirname(require.resolve('storybook/package.json')), 'dist/bin/dispatcher.js');
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port <= MAX_PORT; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${MAX_PORT}.`);
}

async function isPortAvailable(port) {
  for (const host of ['0.0.0.0', '127.0.0.1', '::1']) {
    if (!(await canListen(port, host))) {
      return false;
    }
  }

  return true;
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.once('error', (error) => {
      if (error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT') {
        resolve(true);
        return;
      }

      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen({ host, port });
  });
}
