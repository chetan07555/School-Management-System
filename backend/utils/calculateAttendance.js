module.exports = (records) => {
  const total = records.length;
  const present = records.filter(r => r.status === "Present").length;

  return total === 0 ? 0 : ((present / total) * 100).toFixed(2);
};