module.exports = {
  apps: [
    {
      name: 'games-backend',
      script: 'index.js',
      cwd: '/var/www/Aakda/Games/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=460',
      kill_timeout: 30000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
      },
    },
  ],
};
