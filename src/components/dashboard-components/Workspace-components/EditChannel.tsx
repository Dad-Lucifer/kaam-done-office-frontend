import React, { useState } from 'react';
import { Hash, X, Trash2, Bold, Italic, Strikethrough, Eye, Smile, ChevronDown, Lock } from 'lucide-react';
import './EditChannel.css';

interface EditChannelProps {
  channelId: string;
  initialName: string;
  initialTopic?: string;
  onClose: () => void;
  onSave: (newName: string, newTopic: string) => void;
  onDelete: () => void;
}

const EditChannel: React.FC<EditChannelProps> = ({ channelId: _channelId, initialName, initialTopic, onClose, onSave, onDelete }) => {
  const [name, setName] = useState(initialName);
  const [topic, setTopic] = useState(initialTopic || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions'>('overview');

  // Close on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="edit-channel-overlay">
      {/* Left Sidebar */}
      <div className="ec-sidebar">
        <div className="ec-sidebar-header">
          <Hash size={16} className="ec-hash" />
          <span className="ec-channel-name">{initialName}</span>
        </div>
        
        <nav className="ec-nav">
          <button 
            className={`ec-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`ec-nav-item ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
          <button className="ec-nav-item">Invites</button>
          <button className="ec-nav-item">Integrations</button>
        </nav>

        <div className="ec-sidebar-footer">
          <div className="ec-divider"></div>
          <button className="ec-delete-btn" onClick={onDelete}>
            <span>Delete Channel</span>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ec-main">
        <div className="ec-main-header">
          <div>
            <h1 className="ec-title">{activeTab === 'overview' ? 'Overview' : 'Channel Permissions'}</h1>
            {activeTab === 'permissions' && (
              <p className="ec-subtitle">Use permissions to customise who can do what in this channel.</p>
            )}
          </div>
          <button className="ec-close-btn" onClick={onClose}>
            <div className="ec-close-circle"><X size={18} /></div>
            <span className="ec-close-text">ESC</span>
          </button>
        </div>

        <div className="ec-content">
          {activeTab === 'overview' ? (
            <>
              {/* Channel Name */}
          <div className="ec-form-group">
            <label className="ec-label">Channel Name</label>
            <div className="ec-input-wrapper">
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                onBlur={() => onSave(name, topic)}
                className="ec-input" 
              />
              <Smile size={18} className="ec-input-icon" />
            </div>
          </div>

          {/* Channel Topic */}
          <div className="ec-form-group">
            <label className="ec-label">Channel Topic</label>
            <div className="ec-textarea-container">
              <div className="ec-textarea-toolbar">
                <button className="ec-toolbar-btn"><Bold size={16} /></button>
                <button className="ec-toolbar-btn"><Italic size={16} /></button>
                <button className="ec-toolbar-btn"><Strikethrough size={16} /></button>
                <button className="ec-toolbar-btn"><Eye size={16} /></button>
                <div className="ec-toolbar-spacer"></div>
                <button className="ec-toolbar-btn"><Smile size={16} /></button>
              </div>
              <textarea 
                className="ec-textarea" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onBlur={() => onSave(name, topic)}
                placeholder="Enter channel topic..."
                rows={5}
              ></textarea>
              <div className="ec-textarea-footer">
                <span className="ec-char-count">928</span>
              </div>
            </div>
          </div>

          {/* Slowmode */}
          <div className="ec-form-group">
            <label className="ec-label">Slowmode</label>
            <div className="ec-select-wrapper">
              <select className="ec-select">
                <option>Off</option>
                <option>5s</option>
                <option>10s</option>
              </select>
              <ChevronDown size={18} className="ec-select-icon" />
            </div>
            <p className="ec-help-text">Members will be restricted to sending one message and creating one thread per this interval, unless they have the Bypass Slowmode permission.</p>
          </div>

          {/* Age-Restricted Channel */}
          <div className="ec-form-group ec-flex-row">
            <div className="ec-flex-text">
              <label className="ec-label">Age-Restricted Channel</label>
              <p className="ec-help-text">Users will need to confirm that they are of over the legal age to view the content in this channel. Age-restricted channels are exempt from the explicit content filter.</p>
            </div>
            <label className="ec-toggle">
              <input type="checkbox" />
              <span className="ec-toggle-slider"></span>
            </label>
          </div>

          {/* Hide After Inactivity */}
          <div className="ec-form-group">
            <label className="ec-label">Hide After Inactivity</label>
            <div className="ec-select-wrapper">
              <select className="ec-select">
                <option>3 Days</option>
                <option>1 Week</option>
              </select>
              <ChevronDown size={18} className="ec-select-icon" />
            </div>
            <p className="ec-help-text">New threads will not show in the channel list after being inactive for the specified duration.</p>
          </div>
            </>
          ) : (
            <div className="ec-permissions-tab">
              <div className="ec-permissions-box">
                <div className="ec-box-header">
                  <div className="ec-flex-text">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={18} />
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Private Channel</h3>
                    </div>
                    <p className="ec-help-text" style={{ marginTop: '8px' }}>By making a channel private, only select members and roles will be able to view this channel.</p>
                  </div>
                  <label className="ec-toggle ec-toggle-purple">
                    <input type="checkbox" defaultChecked />
                    <span className="ec-toggle-slider"></span>
                  </label>
                </div>
                
                <div className="ec-box-section ec-add-members">
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Who can access this channel?</span>
                  <button className="ec-btn-primary">Add members or roles</button>
                </div>

                <div className="ec-box-section">
                  <h4 className="ec-section-title">Roles</h4>
                  
                  <div className="ec-role-item">
                    <div className="ec-role-left">
                      <span className="ec-role-color" style={{ backgroundColor: '#e74c3c' }}></span>
                      <span>Admin</span>
                    </div>
                    <div className="ec-role-right">
                      <span className="ec-role-perm">Administrator</span>
                      <X size={14} className="ec-role-remove" />
                    </div>
                  </div>
                </div>

                <div className="ec-box-section">
                  <h4 className="ec-section-title">Members</h4>
                  <div className="ec-role-item">
                    <div className="ec-role-left">
                      <div className="ec-member-avatar-ph"></div>
                      <span>DJ SMASH X</span>
                      <span className="ec-member-tag">djsmashx</span>
                    </div>
                    <div className="ec-role-right">
                      <span className="ec-role-perm">Server Owner</span>
                      <X size={14} className="ec-role-remove" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default EditChannel;
