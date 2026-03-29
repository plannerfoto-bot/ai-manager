module.exports = {
  apps: [
    {
      name: 'robo-metadata',
      script: 'scripts/repair_metadata.js',
      args: '--commit',
      cwd: 'c:/Users/Bigas/NuvemShop - MCP - ANTIGRAVITY/ai-manager',
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
      log_file: 'logs/pm2-metadata.log',
      time: true
    },
    {
      name: 'robo-seo',
      script: 'scripts/repair_seo.js',
      args: '--commit',
      cwd: 'c:/Users/Bigas/NuvemShop - MCP - ANTIGRAVITY/ai-manager',
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
      log_file: 'logs/pm2-seo.log',
      time: true
    },
    {
      name: 'visualizer-server',
      script: 'visualizer/server.js',
      cwd: 'c:/Users/Bigas/NuvemShop - MCP - ANTIGRAVITY/ai-manager',
      autorestart: true,
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'visualizer-ui',
      script: 'npx.cmd',
      args: 'vite --port 5173 --host 0.0.0.0',
      cwd: 'c:/Users/Bigas/NuvemShop - MCP - ANTIGRAVITY/ai-manager/visualizer/frontend',
      autorestart: true,
      env: { NODE_ENV: 'development' }
    }
  ]
};
