module.exports = {
  apps: [
    {
      name: 'bia-v3',
      script: 'npx',
      // Modo PRODUÇÃO: leve em RAM, sem hot-reload (sandbox 1GB)
      args: 'next start -p 3000 -H 0.0.0.0',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '900M',
      out_file: '/home/user/webapp/logs/out.log',
      error_file: '/home/user/webapp/logs/err.log',
      merge_logs: true,
    }
  ]
}
