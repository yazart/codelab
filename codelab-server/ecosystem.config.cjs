module.exports = {
  apps: [
    {
      name: 'codelab-server',
      cwd: '/var/www/codelab/server',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3300,
      },
    },
  ],
};
