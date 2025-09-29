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
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss(),
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="user">User Reports</option>
                <option value="message">Message Reports</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Cases Column */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Moderation Cases</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchModerationLogs}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            {/* Cases list (existing markup) */}
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
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.log_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {log.target_type === 'user' ? (
                              <User className="h-5 w-5 text-gray-400 mr-3" />
                            ) : (
                              <MessageSquare className="h-5 w-5 text-gray-400 mr-3" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{log.violation_type.replace('_', ' ')}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{log.violation_description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{log.target_type}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity_level)}`}>{log.severity_level}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>{log.status.replace('_', ' ')}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => setSelectedCase(log)} className="text-blue-600 hover:text-blue-900">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Banned Users Column (collapsible) */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Banned Users</h2>
              <div className="flex items-center space-x-2">
                {/* <button onClick={() => setBannedCollapsed(prev => !prev)} className="px-3 py-1 bg-gray-100 rounded-md">{bannedCollapsed ? 'Expand' : 'Collapse'}</button> */}
                <button onClick={fetchBannedUsers} disabled={bannedLoading} className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${bannedLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {bannedCollapsed ? (
              <div className="p-6 text-center text-sm text-gray-600">Banned users list collapsed.</div>
            ) : bannedLoading ? (
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
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clerk ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bannedUsers.map((u) => {
                      const id = u.user_id || u.clerk_id || u.id;
                      return (
                        <tr key={id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{u.anonymous_handle || u.user_id || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{u.clerk_id || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.account_status || 'banned'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button onClick={() => handleUnbanUser(u)} disabled={actionLoading === id} className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2">
                              <Check className="h-4 w-4" />
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
        </div>
      </div>
    </div>
  );
};

export default ModerationDashboard;