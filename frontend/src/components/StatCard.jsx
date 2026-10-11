import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <p>{title}</p>
        <h3>{value !== undefined ? value : '--'}</h3>
      </div>
      <div className={`stat-icon ${color}`}>
        {Icon && <Icon size={24} />}
      </div>
    </div>
  );
};

export default StatCard;
