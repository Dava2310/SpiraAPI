export default () => ({
  jwt: {
    secret: process.env.ACCESS_TOKEN_SECRET || 'secret',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'refresh',
    accessTokenExpiresIn: '2h',
    refreshTokenExpiresIn: '4h',
  },
});
