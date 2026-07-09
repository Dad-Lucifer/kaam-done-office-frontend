import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Shield, LogOut, RefreshCcw } from 'lucide-react';
import MembersManage from '../../components/dashboard-components/Workspace-components/MembersManage';
import RoleManage from '../../components/dashboard-components/Workspace-components/RoleManage';
import AuditLogs from '../../components/dashboard-components/Workspace-components/AuditLogs';
import { memberLogout } from '../../api/auditLogs';
import { fetchRoles, deleteRole } from '../../api/roles';
import { fetchChannels, deleteChannel } from '../../api/channels';
import { fetchVoiceChannels, deleteVoiceChannel } from '../../api/voiceChannels';
import { fetchTaskChannels, deleteTaskChannel } from '../../api/taskChannels';
import { getAiHrChannels, deleteAiHrChannel } from '../../api/aiHr';
import { fetchCategories, deleteCategory } from '../../api/categories';
import { fetchMembers, deleteMember } from '../../api/members';
import './WorkspaceSettings.css';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  isTeamMember: boolean;
}

interface WorkspaceSettingsProps {
  workspaceName: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  currentUser: CurrentUser | null;
}

const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ workspaceName, onNameChange, onClose, currentUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('server-profile');
  const [name, setName] = useState(workspaceName);
  const [description, setDescription] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>(localStorage.getItem('active_plan') || 'Free');
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetServer = async () => {
    setIsResetting(true);
    try {
      const [
        roles,
        channels,
        voiceChannels,
        taskChannels,
        aiHrChannels,
        categories,
        members
      ] = await Promise.all([
        fetchRoles().catch(() => []),
        fetchChannels().catch(() => []),
        fetchVoiceChannels().catch(() => []),
        fetchTaskChannels().catch(() => []),
        getAiHrChannels().catch(() => []),
        fetchCategories().catch(() => []),
        fetchMembers().catch(() => [])
      ]);

      const deletePromises: Promise<any>[] = [];
      roles.forEach((r: any) => deletePromises.push(deleteRole(r.id).catch(console.error)));
      channels.forEach((c: any) => deletePromises.push(deleteChannel(c.roomId).catch(console.error)));
      voiceChannels.forEach((c: any) => deletePromises.push(deleteVoiceChannel(c.roomId).catch(console.error)));
      taskChannels.forEach((c: any) => deletePromises.push(deleteTaskChannel(c.roomId).catch(console.error)));
      aiHrChannels.forEach((c: any) => deletePromises.push(deleteAiHrChannel(c.roomId).catch(console.error)));
      categories.forEach((c: any) => deletePromises.push(deleteCategory(c.categoryId).catch(console.error)));
      members.forEach((m: any) => deletePromises.push(deleteMember(m.id).catch(console.error)));

      await Promise.allSettled(deletePromises);
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset server:", error);
    } finally {
      setIsResetting(false);
      setShowResetPopup(false);
    }
  };

  // Close on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);



  return (
    <div className="ws-overlay">
      <div className="ws-sidebar">
        <div className="ws-sidebar-content">
          <div className="ws-sidebar-header">{workspaceName.toUpperCase()}</div>
          
          <nav className="ws-nav">
            <button 
              className={`ws-nav-item ${activeTab === 'server-profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('server-profile')}
            >
              Server Profile
            </button>

            <div className="ws-nav-divider">PEOPLE</div>
            <button 
              className={`ws-nav-item ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
            <button 
              className={`ws-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              Roles
            </button>
            <button 
              className={`ws-nav-item ${activeTab === 'block' ? 'active' : ''}`}
              onClick={() => setActiveTab('block')}
            >
              Block
            </button>

            <div className="ws-nav-divider">MODERATION</div>
            <button 
              className={`ws-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Audit Log
            </button>

            <div className="ws-nav-divider"></div>

            {currentUser?.role === 'admin' && (
              <button className="ws-nav-item ws-nav-danger" onClick={() => setShowResetPopup(true)}>
                Reset to default server
                <RefreshCcw size={14} style={{ marginLeft: 'auto' }} />
              </button>
            )}
            <button className="ws-nav-item ws-nav-danger" onClick={async () => {
              if (currentUser?.isTeamMember) {
                try { await memberLogout(); } catch (e) { console.warn('[WS] member-logout failed:', e); }
              }
              sessionStorage.removeItem('accessToken');
              sessionStorage.removeItem('isTeamMember');
              if (currentUser?.role === 'admin') {
                navigate('/', { replace: true });
              } else {
                navigate('/login', { replace: true });
              }
            }}>
              Logout
              <LogOut size={14} style={{ marginLeft: 'auto' }} />
            </button>
          </nav>
        </div>
      </div>

      <div className="ws-main">
        <div className="ws-content-wrapper">
          {activeTab === 'server-profile' && (
            <div className="ws-profile-layout">
              <div className="ws-profile-left">
                <h1 className="ws-title">Server Profile</h1>
                <p className="ws-subtitle">Customise how your server appears in invite links and, if enabled, in Server Discovery and Announcement Channel messages</p>

                <div className="ws-section">
                  <label className="ws-label">Name</label>
                  <input 
                    type="text" 
                    className="ws-input" 
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      onNameChange(e.target.value);
                    }}
                  />
                </div>

                <div className="ws-section-divider"></div>

                <div className="ws-section">
                  <label className="ws-label">Description</label>
                  <p className="ws-help-text">How did your server get started? Why should people join?</p>
                  <textarea 
                    className="ws-textarea" 
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>

              </div>
              
              <div className="ws-profile-right">
                <div className="ws-subscription-card">
                  <h3 className="ws-sub-title">Server Boost Status</h3>
                  {subscriptionPlan === 'Free' ? (
                    <div className="ws-sub-content">
                      <div className="ws-sub-status">
                        <span className="ws-sub-badge free">Free Plan</span>
                      </div>
                      <p className="ws-sub-desc">
                        Upgrade your server to unlock better audio quality, more custom emojis, and a custom server banner!
                      </p>
                      <button 
                        className="ws-btn-upgrade"
                        onClick={() => {
                          setSubscriptionPlan('Pro');
                          localStorage.setItem('active_plan', 'Pro');
                        }}
                      >
                        Upgrade Now
                      </button>
                    </div>
                  ) : (
                    <div className="ws-sub-content">
                      <div className="ws-sub-status">
                        <span className="ws-sub-badge pro">{subscriptionPlan} Plan Active</span>
                      </div>
                      <p className="ws-sub-desc">
                        Your server is boosted! Enjoy your premium perks, enhanced audio, and custom aesthetics.
                      </p>
                      <button 
                        className="mm-btn-secondary"
                        style={{ marginTop: '12px', width: '100%', padding: '10px' }}
                        onClick={() => {
                          setSubscriptionPlan('Free');
                          localStorage.setItem('active_plan', 'Free');
                        }}
                      >
                        Manage Subscription
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && <MembersManage />}
          {activeTab === 'roles' && <RoleManage />}
          {activeTab === 'block' && <h1 className="ws-title">Blocked Users</h1>}
          {activeTab === 'logs' && <AuditLogs currentUser={currentUser} />}
        </div>
        
        <div className="ws-close-rail">
          <button className="ws-close-btn" onClick={onClose}>
            <div className="ws-close-circle"><X size={18} /></div>
            <span className="ws-close-text">ESC</span>
          </button>
        </div>
      </div>

      {showResetPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.1)] p-6 rounded-2xl shadow-2xl max-w-md w-full relative">
            <h2 className="text-white text-xl font-bold mb-4 font-display text-red-500 flex items-center gap-2">
              <Shield size={24} /> Reset Server
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              Are you absolutely sure you want to reset the server? This will permanently delete all Roles, Channels, Categories, AI HR, Task Managers, and Team Members. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 text-text-tertiary hover:text-white transition-colors"
                onClick={() => setShowResetPopup(false)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-[rgba(255,63,63,0.1)] hover:bg-[rgba(255,63,63,0.2)] text-[#FF3F3F] rounded-lg font-medium transition-colors border border-[rgba(255,63,63,0.2)] flex items-center gap-2"
                onClick={handleResetServer}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettings;
