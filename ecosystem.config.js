// ecosystem.config.js — PM2 configuration
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'ar-library',
      script: 'server.js',
      instances: 1,
      autorestart: true,       // crash hone pe auto restart
      watch: false,            // production mein false rakho
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      // Logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      time: true,

      // Restart delay (crash loop avoid karne ke liye)
      restart_delay: 3000,
      max_restarts: 10,
    }
  ]
};
