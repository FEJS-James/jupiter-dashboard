module.exports = {
  apps: [
    {
      name: 'dashboard',
      script: './node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/Users/jupiter/.openclaw/workspace/project',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/Users/jupiter/.pm2/logs/dashboard-error.log',
      out_file: '/Users/jupiter/.pm2/logs/dashboard-out.log',
      log_file: '/Users/jupiter/.pm2/logs/dashboard.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}