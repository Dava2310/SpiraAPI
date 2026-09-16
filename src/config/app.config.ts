export default () => ({
  app: {
    port: parseInt(process.env.PORT || '5000', 10),
  },
});
