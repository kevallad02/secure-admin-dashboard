import { useState, useEffect } from 'react';

export const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Generate sample logs for demonstration
    const sampleLogs = [
      { id: 1, timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'info', message: 'User logged in successfully', user: 'user@example.com' },
      { id: 2, timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'warning', message: 'Failed login attempt', user: 'unknown@example.com' },
      { id: 3, timestamp: new Date(Date.now() - 10800000).toISOString(), level: 'error', message: 'Database connection timeout', user: 'system' },
      { id: 4, timestamp: new Date(Date.now() - 14400000).toISOString(), level: 'info', message: 'User updated profile', user: 'user@example.com' },
      { id: 5, timestamp: new Date(Date.now() - 18000000).toISOString(), level: 'info', message: 'New user registered', user: 'newuser@example.com' },
      { id: 6, timestamp: new Date(Date.now() - 21600000).toISOString(), level: 'warning', message: 'High memory usage detected', user: 'system' },
      { id: 7, timestamp: new Date(Date.now() - 25200000).toISOString(), level: 'info', message: 'Backup completed successfully', user: 'system' },
      { id: 8, timestamp: new Date(Date.now() - 28800000).toISOString(), level: 'error', message: 'API rate limit exceeded', user: 'api@example.com' },
    ];
    setLogs(sampleLogs);
  }, []);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
          <p className="text-gray-600 mt-1">Monitor system activities and events</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Logs</div>
          <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Errors</div>
          <div className="text-2xl font-bold text-red-600">
            {logs.filter(log => log.level === 'error').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Warnings</div>
          <div className="text-2xl font-bold text-yellow-600">
            {logs.filter(log => log.level === 'warning').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.user}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No logs found for the selected filter.
        </div>
      )}
    </div>
  );
};
