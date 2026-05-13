module.exports = {
  apps: [
    {
      name: 'bia-v3-dev',
      script: 'npx',
      // Modo DEV: hot-reload, ideal para sandbox quando build falha por OOM
      // Em produção real, usar ecosystem.config.cjs (next start) com build prévio
      args: 'next dev -p 3000 -H 0.0.0.0',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=700',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '900M',
      out_file: '/home/user/webapp/logs/dev-out.log',
      error_file: '/home/user/webapp/logs/dev-err.log',
      merge_logs: true,
    }
  ]
}
