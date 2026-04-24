import { execFile, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { promisify } from 'node:util';

const ANSI = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

const execFileAsync = promisify(execFile);

const toPort = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }

  return fallback;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const canBindPort = (port) =>
  new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });

const waitUntilPortBindable = async (port, timeoutMs = 4000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canBindPort(port)) {
      return true;
    }

    await sleep(200);
  }

  return false;
};

const getDevCommand = (target) => {
  const frontendCommand = `npm run dev -- --port ${target.port} --strictPort`;
  const commandText =
    target.name === 'frontend' ? frontendCommand : 'npm run dev';

  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', commandText],
    };
  }

  if (target.name === 'frontend') {
    return {
      command: 'npm',
      args: ['run', 'dev', '--', '--port', String(target.port), '--strictPort'],
    };
  }

  return {
    command: 'npm',
    args: ['run', 'dev'],
  };
};

const targets = [
  {
    name: 'backend',
    cwd: 'backend',
    color: ANSI.cyan,
    port: toPort(process.env.BACKEND_PORT, 2002),
  },
  {
    name: 'frontend',
    cwd: 'frontend',
    color: ANSI.magenta,
    port: toPort(process.env.FRONTEND_PORT, 5173),
  },
];

let shuttingDown = false;
const children = [];

const writeTaggedOutput = (stream, targetName, color, writer) => {
  let pending = '';

  stream.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';

    for (const line of lines) {
      writer.write(`${color}[${targetName}]${ANSI.reset} ${line}\n`);
    }
  });

  stream.on('end', () => {
    if (pending.length > 0) {
      writer.write(`${color}[${targetName}]${ANSI.reset} ${pending}\n`);
    }
  });
};

const shutdown = (reason) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  process.stdout.write(
    `${ANSI.yellow}Stopping dev servers (${reason})...${ANSI.reset}\n`,
  );

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
};

const getListeningPidsOnWindows = async (port) => {
  try {
    const { stdout } = await execFileAsync(process.env.ComSpec || 'cmd.exe', [
      '/d',
      '/s',
      '/c',
      `netstat -ano -p tcp | findstr :${port}`,
    ]);

    const pids = new Set();
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 5) {
        continue;
      }

      const [protocol, localAddress, , state, pidRaw] = parts;
      if (protocol !== 'TCP' || state !== 'LISTENING') {
        continue;
      }

      if (!localAddress.endsWith(`:${port}`)) {
        continue;
      }

      const pid = Number.parseInt(pidRaw, 10);
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
        pids.add(pid);
      }
    }

    return [...pids];
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 1
    ) {
      return [];
    }

    throw error;
  }
};

const getListeningPidsOnUnix = async (port) => {
  try {
    const { stdout } = await execFileAsync('lsof', [
      '-nP',
      `-iTCP:${port}`,
      '-sTCP:LISTEN',
      '-t',
    ]);

    return [
      ...new Set(
        stdout
          .split(/\r?\n/)
          .map((line) => Number.parseInt(line.trim(), 10))
          .filter(
            (pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid,
          ),
      ),
    ];
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 1
    ) {
      return [];
    }

    throw error;
  }
};

const getListeningPids = async (port) => {
  if (process.platform === 'win32') {
    return getListeningPidsOnWindows(port);
  }

  return getListeningPidsOnUnix(port);
};

const killPid = async (pid) => {
  if (process.platform === 'win32') {
    await execFileAsync(process.env.ComSpec || 'cmd.exe', [
      '/d',
      '/s',
      '/c',
      `taskkill /PID ${pid} /F`,
    ]);
    return;
  }

  process.kill(pid, 'SIGTERM');
};

const ensurePortAvailable = async (target) => {
  const bindableNow = await canBindPort(target.port);
  if (bindableNow) {
    return;
  }

  const pids = await getListeningPids(target.port);

  process.stdout.write(
    `${ANSI.yellow}[${target.name}] port ${target.port} is in use. Releasing it...${ANSI.reset}\n`,
  );

  if (pids.length > 0) {
    for (const pid of pids) {
      await killPid(pid);
      process.stdout.write(
        `${ANSI.yellow}[${target.name}] terminated PID ${pid} on port ${target.port}.${ANSI.reset}\n`,
      );
    }
  }

  const isBindableAfterCleanup = await waitUntilPortBindable(target.port);
  if (!isBindableAfterCleanup) {
    const remainingPids = await getListeningPids(target.port);
    throw new Error(
      remainingPids.length > 0
        ? `[${target.name}] port ${target.port} is still in use by PID(s): ${remainingPids.join(', ')}.`
        : `[${target.name}] port ${target.port} is unavailable and could not be released.`,
    );
  }
};

const ensurePortsAvailable = async () => {
  for (const target of targets) {
    await ensurePortAvailable(target);
  }
};

try {
  await ensurePortsAvailable();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${ANSI.red}${message}${ANSI.reset}\n`);
  process.exit(1);
}

for (const target of targets) {
  const { command, args } = getDevCommand(target);

  const targetEnv = {
    ...process.env,
    ...(target.name === 'backend' ? { PORT: String(target.port) } : {}),
  };

  const child = spawn(command, args, {
    cwd: target.cwd,
    env: targetEnv,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  });

  children.push(child);

  if (child.stdout) {
    writeTaggedOutput(child.stdout, target.name, target.color, process.stdout);
  }

  if (child.stderr) {
    writeTaggedOutput(child.stderr, target.name, ANSI.red, process.stderr);
  }

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }

    process.stderr.write(
      `${ANSI.red}[${target.name}] failed to start: ${error.message}.${ANSI.reset}\n`,
    );
    process.exitCode = 1;
    shutdown(`${target.name} failed to start`);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = code ?? 1;
    const reason = signal ? `signal ${signal}` : `code ${exitCode}`;
    process.stderr.write(
      `${ANSI.red}[${target.name}] exited with ${reason}.${ANSI.reset}\n`,
    );

    process.exitCode = exitCode;
    shutdown(`${target.name} exited`);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
