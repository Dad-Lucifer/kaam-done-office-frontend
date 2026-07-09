import React from 'react';
import PermissionsComponent from './PermissionsComponent';

/**
 * RoleManage is now powered entirely by the Enterprise PermissionsComponent
 * which integrates role creation and deep permission matrix management.
 */
const RoleManage: React.FC = () => {
  return <PermissionsComponent />;
};

export default RoleManage;
