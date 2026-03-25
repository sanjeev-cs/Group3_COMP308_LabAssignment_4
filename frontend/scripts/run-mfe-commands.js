import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteEntryPoint = resolve(rootDirectory, 'node_modules/vite/bin/vite.js');

const remoteApps = [
  { label: 'auth', config: 'apps/auth/vite.config.js' },
  { label: 'progress', config: 'apps/progress/vite.config.js' },
];

const hostApp = { label: 'host', config: 'apps/host/vite.config.js' };

const runVite = (args) =>
  spawn(process.execPath, [viteEntryPoint, ...args], {
    cwd: rootDirectory,
    stdio: 'inherit',
  });

const waitForExit = (childProcess, label) =>
  new Promise((resolvePromise, rejectPromise) => {
    childProcess.on('error', rejectPromise);
    childProcess.on('exit', (code, signal) => {
      if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${label} exited with code ${code ?? 'unknown'}.`));
    });
  });

const stopChildren = (children) => {
  children.forEach((childProcess) => {
    if (!childProcess.killed) {
      childProcess.kill('SIGTERM');
    }
  });
};

const command = process.argv[2] ?? 'dev';

if (command === 'build') {
  for (const remoteApp of remoteApps) {
    const remoteBuild = runVite(['build', '--config', remoteApp.config]);
    await waitForExit(remoteBuild, `${remoteApp.label} build`);
  }
  const hostBuild = runVite(['build', '--config', hostApp.config]);
  await waitForExit(hostBuild, 'host build');
  process.exit(0);
}

if (command === 'dev') {
  const childProcesses = [runVite(['--config', hostApp.config])];

  const handleExitSignal = () => stopChildren(childProcesses);
  process.on('SIGINT', handleExitSignal);
  process.on('SIGTERM', handleExitSignal);

  try {
    await Promise.all(childProcesses.map((childProcess) => waitForExit(childProcess, hostApp.label)));
  } catch (error) {
    stopChildren(childProcesses);
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.error(`Unsupported command "${command}". Use "dev" or "build".`);
  process.exit(1);
}
