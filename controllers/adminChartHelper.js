/**
 * Helper functions for preparing chart data in the admin controller
 * These functions ensure proper formatting and handling of empty data for charts
 */

/**
 * Formats monthly revenue data for charts
 * @param {Object} revenueData - The raw revenue data from the database
 * @param {Number} months - Number of months to include
 * @returns {Array} Formatted data for rendering in charts
 */
exports.formatMonthlyRevenueData = (revenueData, months = 6) => {
  const formattedData = [];
  
  // If we have revenue data
  if (revenueData && typeof revenueData === 'object' && Object.keys(revenueData).length > 0) {
    // Use actual data if available
    Object.entries(revenueData)
      .map(([month, amount]) => ({ month, revenue: amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .forEach(entry => formattedData.push(entry));
  }
  
  // Ensure we have at least the requested number of months (default: 6)
  if (formattedData.length < months) {
    const existingMonths = formattedData.map(item => item.month);
    
    // Generate the recent months
    const placeholderMonths = Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }).reverse();
    
    // Merge, giving priority to existing data
    placeholderMonths.forEach(month => {
      if (!existingMonths.includes(month)) {
        formattedData.push({ month, revenue: 0 });
      }
    });
    
    // Sort by month
    formattedData.sort((a, b) => a.month.localeCompare(b.month));
  }
  
  // Take only the most recent months if we have too many
  return formattedData.slice(-months);
};

/**
 * Formats user registration data by month
 * @param {Array} userData - Raw user data from the database
 * @param {Number} months - Number of months to include
 * @returns {Array} Formatted data for rendering in charts
 */
exports.formatUserRegistrationData = (userData = [], months = 6) => {
  // Create a map to hold data by month
  const monthlyData = new Map();
  
  // Generate the recent months
  const placeholderMonths = Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return month;
  }).reverse();
  
  // Initialize all months with 0 count
  placeholderMonths.forEach(month => {
    monthlyData.set(month, { month, count: 0, name: month });
  });
  
  // Add actual user data if available
  if (Array.isArray(userData) && userData.length > 0) {
    userData.forEach(item => {
      const month = item.month || (item._id && `${item._id.year}-${String(item._id.month).padStart(2, '0')}`);
      if (month && monthlyData.has(month)) {
        monthlyData.set(month, { 
          month, 
          count: item.count || 0,
          name: month
        });
      }
    });
  }
  
  return Array.from(monthlyData.values());
};

/**
 * Formats subscription data for pie charts
 * @param {Object} subscriptions - Raw subscription data from the database
 * @returns {Array} Formatted data for rendering in pie charts
 */
exports.formatSubscriptionData = subscriptions => {
  // Default data with all plans set to 0
  const defaultData = [
    { name: 'Free', value: 0 },
    { name: 'Premium', value: 0 },
    { name: 'VIP', value: 0 }
  ];
  
  // If no subscription data, return default empty data
  if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
    return defaultData;
  }
  
  // Map subscription data to expected format
  const mappedData = subscriptions.map(sub => {
    // Handle case where _id might be null or a string or object
    let planName = 'Unknown';
    if (sub._id) {
      if (typeof sub._id === 'string') {
        planName = sub._id.charAt(0).toUpperCase() + sub._id.slice(1).toLowerCase();
      } else if (sub._id.plan_name) {
        planName = sub._id.plan_name;
      }
    }
    
    return {
      name: planName,
      value: sub.count || 0
    };
  });
  
  // Check if we have any meaningful data
  const hasData = mappedData.some(item => item.value > 0);
  
  return hasData ? mappedData : defaultData;
};

/**
 * Checks if chart data is empty
 * @param {Array} data - The chart data to check
 * @param {String} valueKey - The key containing the value to check
 * @returns {Boolean} True if data is empty, false otherwise
 */
exports.isChartDataEmpty = (data, valueKey = 'value') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return true;
  }
  
  // Check if all values are 0 or null
  return data.every(item => !item[valueKey] || item[valueKey] === 0);
};
