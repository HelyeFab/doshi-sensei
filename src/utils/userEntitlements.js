
module.exports = {};
module.exports.getEntitlementsForUserType = (userType) => ({
    system: {
      cloudSync: { enabled: userType !== 'guest' },
      progressTracking: { enabled: userType !== 'guest' }
    }
  });
module.exports.getFeatureLimit = (userType, feature, limitType) => {
    const limits = {
      guest: { daily: 0, total: 0 },
      free: { daily: 3, total: 10 },
      monthly: { daily: -1, total: -1 },
      yearly: { daily: -1, total: -1 }
    };
    return limits[userType]?.[limitType] || 0;
  };
