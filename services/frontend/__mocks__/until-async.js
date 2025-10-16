// Mock for until-async module to avoid ES module issues in Jest
module.exports = {
  until: async (promise) => {
    try {
      const result = await promise;
      return { error: null, data: result };
    } catch (error) {
      return { error, data: null };
    }
  },
};