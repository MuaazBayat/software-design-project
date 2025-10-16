const React = require('react');

// Simple mock for ldrs/react LineSpinner component
exports.LineSpinner = function LineSpinner({ size, stroke, speed, color }) {
  return React.createElement('div', {
    'data-testid': 'line-spinner',
    'data-size': size,
    'data-stroke': stroke,
    'data-speed': speed,
    'data-color': color,
  }, 'Loading spinner mock');
};
