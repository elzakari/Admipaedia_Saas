import api from '../lib/api';

export type Pagination = {
  total: number;
  pages: number;
  page: number;
  per_page: number;
  next?: number | null;
  prev?: number | null;
};

export type Facility = {
  id: number;
  name: string;
  facility_type: string;
  location?: string | null;
  capacity?: number | null;
  is_active: boolean;
  maintenance_schedule?: string | null;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MaintenanceRequest = {
  id: number;
  facility_id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  reported_date: string;
  scheduled_date?: string | null;
  completed_date?: string | null;
  notes?: string | null;
  facility?: Pick<Facility, 'id' | 'name' | 'facility_type' | 'location'>;
  created_at?: string;
  updated_at?: string;
};

export type Asset = {
  id: number;
  facility_id?: number | null;
  name: string;
  asset_tag: string;
  category: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  purchase_date?: string | null;
  purchase_cost?: number | string | null;
  current_value?: number | string | null;
  is_active?: boolean;
  facility?: Pick<Facility, 'id' | 'name' | 'facility_type' | 'location'>;
  created_at?: string;
  updated_at?: string;
};

export type InfrastructureSummary = {
  total_facilities?: number;
  active_facilities?: number;
  facilities_under_maintenance?: number;
  total_maintenance_requests?: number;
  pending_maintenance_requests?: number;
  overdue_maintenance_requests?: number;
  total_assets?: number;
  assets_needing_service?: number;
  assets_with_expired_warranty?: number;
  total_asset_value?: number | string | null;
};

const infrastructureService = {
  getFacilities: async (params?: { page?: number; per_page?: number; facility_type?: string; status?: string }) => {
    const response = await api.get('/administration/facilities', { params });
    const data = response.data || {};
    return {
      facilities: data.facilities || [],
      pagination: data.pagination as Pagination | undefined
    } as { facilities: Facility[]; pagination?: Pagination };
  },

  createFacility: async (payload: Pick<Facility, 'name' | 'facility_type'> & Partial<Omit<Facility, 'id' | 'created_at' | 'updated_at'>>) => {
    const response = await api.post('/administration/facilities', payload);
    return (response.data?.facility || response.data) as Facility;
  },

  getMaintenanceRequests: async (params?: { page?: number; per_page?: number; facility_id?: number; status?: string; priority?: string }) => {
    const response = await api.get('/administration/maintenance-requests', { params });
    const data = response.data || {};
    return {
      maintenance_requests: data.maintenance_requests || [],
      pagination: data.pagination as Pagination | undefined
    } as { maintenance_requests: MaintenanceRequest[]; pagination?: Pagination };
  },

  createMaintenanceRequest: async (
    payload: Pick<MaintenanceRequest, 'facility_id' | 'title' | 'description' | 'reported_date'> &
      Partial<Pick<MaintenanceRequest, 'priority' | 'status' | 'scheduled_date' | 'completed_date' | 'notes'>>
  ) => {
    const response = await api.post('/administration/maintenance-requests', payload);
    return (response.data?.maintenance_request || response.data) as MaintenanceRequest;
  },

  getAssets: async (params?: { page?: number; per_page?: number; asset_type?: string; condition?: string; location?: string }) => {
    const response = await api.get('/administration/assets', { params });
    const data = response.data || {};
    return {
      assets: data.assets || [],
      pagination: data.pagination as Pagination | undefined
    } as { assets: Asset[]; pagination?: Pagination };
  },

  createAsset: async (
    payload: Pick<Asset, 'name' | 'asset_tag' | 'category'> &
      Partial<Omit<Asset, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    const response = await api.post('/administration/assets', payload);
    return (response.data?.asset || response.data) as Asset;
  },

  getInfrastructureSummary: async () => {
    const response = await api.get('/administration/infrastructure-summary');
    return (response.data?.infrastructure_summary || response.data) as InfrastructureSummary;
  }
};

export default infrastructureService;

