"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../../lib/context/ProfileContext';
import { moderationApi, ModerationLogEntry } from '@/lib/moderationApiClient';
import { toast } from 'sonner';
import { 
  Shield, 
  AlertTriangle, 
  User, 
  MessageSquare, 
  Clock, 
  Check, 
  X, 
  Ban,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react';


const ModerationDashboard = () => {
  const { profile, loading: profileLoading } = useProfile();
  const [moderationLogs, setModerationLogs] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<ModerationLogEntry | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [bannedLoading, setBannedLoading] = useState<boolean>(false);
  const [bannedCollapsed, setBannedCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'cases' | 'banned'>('cases');

  const fetchModerationLogs = useCallback(async () => {
    const userId = profile?.user_id;
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const logs = await moderationApi.getModerationLogs(userId);
      setModerationLogs(logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  const fetchBannedUsers = useCallback(async () => {
    setBannedLoading(true);
    try {
      const users = await moderationApi.getBannedUsers();
      setBannedUsers(users || []);
    } catch (err) {
      console.error('Failed to fetch banned users', err);
      toast.error('Failed to load banned users');
    } finally {
      setBannedLoading(false);
    }
  }, []);

  const handleBanUser = async (logId: string) => {
    // Show confirmation toast
    toast('Are you sure you want to ban this user?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Ban User',
        onClick: async () => {
          setActionLoading(logId);
          try {
            await moderationApi.banUser(logId);
            // Refresh the logs
            await fetchModerationLogs();
            toast.success('User has been banned successfully.');
          } catch (error) {
            console.error('Failed to ban user:', error);
            toast.error('Failed to ban user. Please try again.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    });
  };

  const handleResolveCase = async (logId: string, action: string, notes: string) => {
    setActionLoading(logId);
    try {
      await moderationApi.resolveCase(logId, action, notes);
      // Refresh the logs
      await fetchModerationLogs();
      setSelectedCase(null);
      toast.success('Case resolved successfully.');
    } catch (error) {
      console.error('Failed to resolve case:', error);
      toast.error('Failed to resolve case. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanUser = async (user: any) => {
    const id = user.user_id || user.clerk_id || user.id;
    toast('Are you sure you want to unban this user?', {
      description: 'This will restore the user account and remove banned fingerprints.',
      action: {
        label: 'Unban',
        onClick: async () => {
          setActionLoading(id);
          try {
            // Try unban by user id first
            if (user.user_id) {
              await moderationApi.unbanUser(user.user_id);
            } else if (user.clerk_id) {
              await moderationApi.unbanClerkUser(user.clerk_id);
            } else {
              // fallback: try clerk unban if clerk_id present
              await moderationApi.unbanClerkUser(id);
            }

            await fetchBannedUsers();
            await fetchModerationLogs();
            toast.success('User has been unbanned.');
          } catch (err) {
            console.error('Failed to unban user', err);
            toast.error('Failed to unban user.');
          } finally {
            setActionLoading(null);
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss(),
      },
    });
  };

  useEffect(() => {
    if (profile?.moderator) {
      fetchModerationLogs();
      fetchBannedUsers();
    }
  }, [profile, fetchModerationLogs, fetchBannedUsers]);

  // Check if user is a moderator
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!profile?.moderator) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&#39;t have permission to access the moderation dashboard.</p>
        </div>
      </div>
    );
  }


  const filteredLogs = moderationLogs.filter(log => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (filterType !== 'all' && log.target_type !== filterType) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-600 bg-red-50';
      case 'under_review': return 'text-yellow-600 bg-yellow-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'dismissed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Moderation Dashboard</h1>
                <p className="text-gray-600">Manage reports and moderate content</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{moderationLogs.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Cases</p>
                <p className="text-2xl font-bold text-red-600">
                  {moderationLogs.filter(log => log.status === 'open').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {moderationLogs.filter(log => log.status === 'in_review').length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {moderationLogs.filter(log => log.status === 'resolved').length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">Filters:</span>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 min-w-0">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm flex-1 sm:flex-none"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 min-w-0">Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm flex-1 sm:flex-none"
                >
                  <option value="all">All</option>
                  <option value="user">User Reports</option>
                  <option value="message">Message Reports</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Interface */}
        <div className="flex flex-col lg:flex-row bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Side Navigation */}
          <div className="w-full lg:w-64 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200">
            <nav className="p-4">
              <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2">
                <button
                  onClick={() => setActiveTab('cases')}
                  className={`flex-1 lg:flex-none lg:w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'cases'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <AlertTriangle className="h-5 w-5" />
                    <div className="hidden sm:block">
                      <div className="font-medium">Moderation Cases</div>
                      <div className="text-xs opacity-75">
                        {moderationLogs.length} total cases
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('banned')}
                  className={`flex-1 lg:flex-none lg:w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'banned'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <Ban className="h-5 w-5" />
                    <div className="hidden sm:block">
                      <div className="font-medium">Banned Users</div>
                      <div className="text-xs opacity-75">
                        {bannedUsers.length} banned users
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'cases' && (
              <div>
                <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <h2 className="text-lg font-semibold text-gray-900">Moderation Cases</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={fetchModerationLogs}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading moderation cases...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No moderation cases found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">Case</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell w-20">Type</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Severity</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-24">Status</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell w-28">Created</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.map((log) => (
                          <tr key={log.log_id} className="hover:bg-gray-50">
                            <td className="px-3 md:px-6 py-4 w-80">
                              <div className="flex items-center">
                                {log.target_type === 'user' ? (
                                  <User className="h-5 w-5 text-gray-400 mr-2 md:mr-3 flex-shrink-0" />
                                ) : (
                                  <MessageSquare className="h-5 w-5 text-gray-400 mr-2 md:mr-3 flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 truncate">{log.violation_type.replace('_', ' ')}</div>
                                  <div className="text-sm text-gray-500 truncate max-w-xs" title={log.violation_description}>
                                    {log.violation_description.length > 100 
                                      ? `${log.violation_description.substring(0, 100)}...` 
                                      : log.violation_description
                                    }
                                  </div>
                                  {/* Show type and status on mobile */}
                                  <div className="sm:hidden mt-1 space-y-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                                      {log.target_type}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                                      {log.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden sm:table-cell w-20">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{log.target_type}</span>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap w-24">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity_level)}`}>{log.severity_level}</span>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden md:table-cell w-24">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>{log.status.replace('_', ' ')}</span>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell w-28">{new Date(log.created_at).toLocaleDateString()}</td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium w-20">
                              <button onClick={() => setSelectedCase(log)} className="text-blue-600 hover:text-blue-900 px-2 py-1">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'banned' && (
              <div>
                <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <h2 className="text-lg font-semibold text-gray-900">Banned Users</h2>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={fetchBannedUsers} 
                      disabled={bannedLoading} 
                      className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      <RefreshCw className={`h-4 w-4 ${bannedLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>

                {bannedLoading ? (
                  <div className="p-6 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading banned users...</p>
                  </div>
                ) : bannedUsers.length === 0 ? (
                  <div className="p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No banned users found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handle</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Clerk ID</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bannedUsers.map((u) => {
                          const id = u.user_id || u.clerk_id || u.id;
                          return (
                            <tr key={id} className="hover:bg-gray-50">
                              <td className="px-3 md:px-6 py-4">
                                <div className="text-sm text-gray-900 font-mono truncate">{u.anonymous_handle || u.user_id || '-'}</div>
                                {/* Show clerk ID and status on mobile */}
                                <div className="sm:hidden mt-1 space-y-1">
                                  <div className="text-xs text-gray-500 font-mono">{u.clerk_id || '-'}</div>
                                  <div className="text-xs text-gray-600">{u.account_status || 'banned'}</div>
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono hidden sm:table-cell">{u.clerk_id || '-'}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">{u.account_status || 'banned'}</td>
                              <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onClick={() => handleUnbanUser(u)} disabled={actionLoading === id} className="px-2 md:px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                                  <Check className="h-3 w-3 md:h-4 md:w-4" />
                                  <span>Unban</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Case Detail Modal */}
        {selectedCase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Case Details</h3>
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Case ID</label>
                    <p className="text-sm text-gray-900 font-mono break-all">{selectedCase.log_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedCase.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Target Type</label>
                    <p className="text-sm text-gray-900">{selectedCase.target_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Violation Type</label>
                    <p className="text-sm text-gray-900">{selectedCase.violation_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Severity</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedCase.severity_level)}`}>
                      {selectedCase.severity_level}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCase.status)}`}>
                      {selectedCase.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Automated Detection</label>
                    <p className="text-sm text-gray-900">{selectedCase.automated_detection ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reported User ID</label>
                    <p className="text-sm text-gray-900 font-mono break-all">{selectedCase.reported_user_id}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md break-words">
                    {selectedCase.violation_description}
                  </p>
                </div>

                {selectedCase.system_context && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">System Context</label>
                    <pre className="text-xs md:text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedCase.system_context, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedCase.status !== 'resolved' && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Resolve Case</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => handleResolveCase(selectedCase.log_id, 'warning', 'Warning issued to user')}
                        disabled={actionLoading === selectedCase.log_id}
                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
                      >
                        Issue Warning
                      </button>
                      <button
                        onClick={() => handleBanUser(selectedCase.log_id)}
                        disabled={actionLoading === selectedCase.log_id}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Ban className="h-4 w-4" />
                        <span>Ban User</span>
                      </button>
                      <button
                        onClick={() => handleResolveCase(selectedCase.log_id, 'no_action', 'Case dismissed - no violation found')}
                        disabled={actionLoading === selectedCase.log_id}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
                      >
                        Dismiss Case
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationDashboard;