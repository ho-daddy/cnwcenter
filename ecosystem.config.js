module.exports = {
  apps: [{
    name: 'cnwcenter',
    script: 'npm',
    args: 'start',
    cwd: '/home/deploy/cnwcenter',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/deploy/cnwcenter/logs/error.log',
    out_file: '/home/deploy/cnwcenter/logs/output.log',
    merge_logs: true
  }]
}
