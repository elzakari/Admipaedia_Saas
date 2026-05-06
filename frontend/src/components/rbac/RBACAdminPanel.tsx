import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
import {
  Security,
  People,
  VpnKey,
  Dashboard,
  Settings,
  Add,
  Edit,
  Delete,
  Visibility,
  ExpandMore,
  AdminPanelSettings,
  Group,
  Lock,
  CheckCircle,
  Warning,
  Info,
  Refresh,
  Download,
  Upload
} from '@mui/icons-material';
import { useRBAC, useRoles, usePermissions } from '../../hooks/useRBAC';
import { RBACRole, RBACPermission, UserRoleAssignment, ResourceType, PermissionType } from '../../types/rbac';
import { RoleManagement } from './RoleManagement';
import { PermissionManagement } from './PermissionManagement';
import { UserRoleManagement } from './UserRoleManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rbac-tabpanel-${index}`}
      aria-labelledby={`rbac-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface RBACStats {
  totalRoles: number;
  totalPermissions: number;
  totalUsers: number;
  activeAssignments: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

export const RBACAdminPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<RBACStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializeDialog, setInitializeDialog] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const { hasPermission, hasRole, loading: rbacLoading } = useRBAC();
  const { roles, loading: rolesLoading, refreshRoles } = useRoles();
  const { permissions, loading: permissionsLoading, refreshPermissions } = usePermissions();

  // Check if user has admin permissions
  const canManageRoles = hasPermission('role', 'manage') || hasRole('super_admin');
  const canManagePermissions = hasPermission('permission', 'manage') || hasRole('super_admin');
  const canManageUsers = hasPermission('user', 'manage') || hasRole('super_admin');
  const canViewSystem = hasPermission('system', 'read') || hasRole('admin');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // This would be an API call to get RBAC statistics
      const response = await fetch('/api/v1/rbac/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to load RBAC statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInitializeSystem = async () => {
    try {
      setInitializing(true);
      const response = await fetch('/api/v1/rbac/system/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadStats();
        await refreshRoles();
        await refreshPermissions();
        setInitializeDialog(false);
      } else {
        throw new Error('Failed to initialize RBAC system');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize system');
    } finally {
      setInitializing(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadStats(),
      refreshRoles(),
      refreshPermissions()
    ]);
  };

  if (!canViewSystem) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          You don't have permission to access the RBAC Admin Panel.
        </Alert>
      </Container>
    );
  }

  if (loading || rbacLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <AdminPanelSettings color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              RBAC Admin Panel
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
            {canManageRoles && (
              <Button
                variant="contained"
                startIcon={<Settings />}
                onClick={() => setInitializeDialog(true)}
              >
                Initialize System
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Group color="primary" />
                    <Box>
                      <Typography variant="h6">{stats.totalRoles}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Roles
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <VpnKey color="primary" />
                    <Box>
                      <Typography variant="h6">{stats.totalPermissions}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Permissions
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <People color="primary" />
                    <Box>
                      <Typography variant="h6">{stats.totalUsers}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    {stats.systemHealth === 'healthy' && <CheckCircle color="success" />}
                    {stats.systemHealth === 'warning' && <Warning color="warning" />}
                    {stats.systemHealth === 'error' && <Warning color="error" />}
                    <Box>
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {stats.systemHealth}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        System Health
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="RBAC admin tabs">
            <Tab
              label="Dashboard"
              icon={<Dashboard />}
              iconPosition="start"
              id="rbac-tab-0"
              aria-controls="rbac-tabpanel-0"
            />
            {canManageRoles && (
              <Tab
                label="Roles"
                icon={<Group />}
                iconPosition="start"
                id="rbac-tab-1"
                aria-controls="rbac-tabpanel-1"
              />
            )}
            {canManagePermissions && (
              <Tab
                label="Permissions"
                icon={<VpnKey />}
                iconPosition="start"
                id="rbac-tab-2"
                aria-controls="rbac-tabpanel-2"
              />
            )}
            {canManageUsers && (
              <Tab
                label="User Roles"
                icon={<People />}
                iconPosition="start"
                id="rbac-tab-3"
                aria-controls="rbac-tabpanel-3"
              />
            )}
          </Tabs>
        </Box>

        {/* Dashboard Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Overview
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Group />
                      </ListItemIcon>
                      <ListItemText
                        primary="Roles"
                        secondary={`${roles?.length || 0} roles configured`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <VpnKey />
                      </ListItemIcon>
                      <ListItemText
                        primary="Permissions"
                        secondary={`${permissions?.length || 0} permissions available`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Security />
                      </ListItemIcon>
                      <ListItemText
                        primary="Security Status"
                        secondary={stats?.systemHealth === 'healthy' ? 'All systems operational' : 'Attention required'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {canManageRoles && (
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setTabValue(1)}
                      >
                        Create New Role
                      </Button>
                    )}
                    {canManagePermissions && (
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setTabValue(2)}
                      >
                        Create New Permission
                      </Button>
                    )}
                    {canManageUsers && (
                      <Button
                        variant="outlined"
                        startIcon={<People />}
                        onClick={() => setTabValue(3)}
                      >
                        Manage User Roles
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Roles Tab */}
        {canManageRoles && (
          <TabPanel value={tabValue} index={1}>
            <RoleManagement />
          </TabPanel>
        )}

        {/* Permissions Tab */}
        {canManagePermissions && (
          <TabPanel value={tabValue} index={2}>
            <PermissionManagement />
          </TabPanel>
        )}

        {/* User Roles Tab */}
        {canManageUsers && (
          <TabPanel value={tabValue} index={3}>
            <UserRoleManagement />
          </TabPanel>
        )}
      </Paper>

      {/* Initialize System Dialog */}
      <Dialog open={initializeDialog} onClose={() => setInitializeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Initialize RBAC System</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            This will initialize the RBAC system with default roles and permissions. 
            This action is safe to run multiple times and will not overwrite existing data.
          </Typography>
          <Alert severity="info">
            Default roles that will be created: Super Admin, Admin, Teacher, Student, Parent, Staff
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInitializeDialog(false)}>Cancel</Button>
          <Button
            onClick={handleInitializeSystem}
            variant="contained"
            disabled={initializing}
            startIcon={initializing ? <CircularProgress size={20} /> : <Settings />}
          >
            {initializing ? 'Initializing...' : 'Initialize'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RBACAdminPanel;