module.exports = {
  apps: [
    {
      name: "chlivek-achievements",
      script: "npm",
      args: "start",
      cwd: "/var/www/chlivek.fredrik.cz",
      env: {
        PORT: 3100,
      },
    },
  ],
};
