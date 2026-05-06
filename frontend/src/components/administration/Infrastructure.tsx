import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Loader2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import infrastructureService, { Asset, Facility, MaintenanceRequest } from '../../services/infrastructureService';

export const Infrastructure = () => {
  const [activeTab, setActiveTab] = useState('facilities');
  const queryClient = useQueryClient();

  const { data: facilitiesResp, isLoading: facilitiesLoading, isError: facilitiesError } = useQuery({
    queryKey: ['infrastructure', 'facilities'],
    queryFn: () => infrastructureService.getFacilities({ page: 1, per_page: 100 }),
    staleTime: 60_000
  });

  const { data: requestsResp, isLoading: requestsLoading, isError: requestsError } = useQuery({
    queryKey: ['infrastructure', 'maintenance-requests'],
    queryFn: () => infrastructureService.getMaintenanceRequests({ page: 1, per_page: 100 }),
    staleTime: 60_000
  });

  const { data: assetsResp, isLoading: assetsLoading, isError: assetsError } = useQuery({
    queryKey: ['infrastructure', 'assets'],
    queryFn: () => infrastructureService.getAssets({ page: 1, per_page: 100 }),
    staleTime: 60_000
  });

  const facilities: Facility[] = facilitiesResp?.facilities || [];
  const requests: MaintenanceRequest[] = requestsResp?.maintenance_requests || [];
  const assets: Asset[] = assetsResp?.assets || [];

  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);

  const [newFacility, setNewFacility] = useState<{
    name: string;
    facility_type: string;
    location: string;
    capacity: number;
    is_active: boolean;
    last_maintenance_date: string;
  }>({
    name: '',
    facility_type: 'classroom',
    location: '',
    capacity: 0,
    is_active: true,
    last_maintenance_date: ''
  });

  const [newRequest, setNewRequest] = useState<{
    facility_id: number;
    title: string;
    description: string;
    reported_date: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }>({
    facility_id: 0,
    title: '',
    description: '',
    reported_date: new Date().toISOString().slice(0, 10),
    priority: 'medium'
  });

  const [newAsset, setNewAsset] = useState<{
    name: string;
    asset_tag: string;
    category: string;
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
    facility_id?: number | null;
    purchase_date: string;
    purchase_cost: number;
    current_value: number;
  }>({
    name: '',
    asset_tag: '',
    category: '',
    condition: 'good',
    facility_id: null,
    purchase_date: '',
    purchase_cost: 0,
    current_value: 0
  });

  const createFacilityMutation = useMutation({
    mutationFn: () =>
      infrastructureService.createFacility({
        name: newFacility.name.trim(),
        facility_type: newFacility.facility_type as any,
        location: newFacility.location.trim() || undefined,
        capacity: newFacility.capacity || undefined,
        is_active: newFacility.is_active,
        last_maintenance_date: newFacility.last_maintenance_date || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure', 'facilities'] });
      toast.success('Facility created');
      setFacilityDialogOpen(false);
    },
    onError: () => toast.error('Failed to create facility')
  });

  const createRequestMutation = useMutation({
    mutationFn: () =>
      infrastructureService.createMaintenanceRequest({
        facility_id: newRequest.facility_id,
        title: newRequest.title.trim(),
        description: newRequest.description.trim(),
        reported_date: newRequest.reported_date,
        priority: newRequest.priority
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure', 'maintenance-requests'] });
      toast.success('Request created');
      setRequestDialogOpen(false);
    },
    onError: () => toast.error('Failed to create request')
  });

  const createAssetMutation = useMutation({
    mutationFn: () =>
      infrastructureService.createAsset({
        name: newAsset.name.trim(),
        asset_tag: newAsset.asset_tag.trim(),
        category: newAsset.category.trim(),
        condition: newAsset.condition,
        facility_id: newAsset.facility_id || undefined,
        purchase_date: newAsset.purchase_date || undefined,
        purchase_cost: newAsset.purchase_cost || undefined,
        current_value: newAsset.current_value || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure', 'assets'] });
      toast.success('Asset created');
      setAssetDialogOpen(false);
    },
    onError: () => toast.error('Failed to create asset')
  });

  const totalAssetValue = useMemo(() => {
    return assets.reduce((sum, a) => {
      const v = a.current_value ?? a.purchase_cost ?? 0;
      return sum + Number(v || 0);
    }, 0);
  }, [assets]);

  const titleCase = (value?: string | null) => {
    if (!value) return '';
    const s = String(value).replace(/_/g, ' ').toLowerCase();
    return s
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>
        
        <TabsContent value="facilities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">School Facilities</h3>
            <Button
              className="glass-button"
              onClick={() => {
                setNewFacility({
                  name: '',
                  facility_type: 'classroom',
                  location: '',
                  capacity: 0,
                  is_active: true,
                  last_maintenance_date: ''
                });
                setFacilityDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Facility
            </Button>
          </div>
          
          {(facilitiesLoading || facilitiesError) && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {facilitiesLoading ? 'Loading facilities...' : 'Failed to load facilities.'}
              </CardContent>
            </Card>
          )}

          {!facilitiesLoading && !facilitiesError && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {facilities.map((facility) => (
                <Card key={facility.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{facility.name}</CardTitle>
                        <CardDescription>{titleCase(facility.facility_type)}</CardDescription>
                      </div>
                      <Badge variant={facility.is_active ? 'success' : 'secondary'}>
                        {facility.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Location:</span>
                        <span className="text-sm">{facility.location || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Capacity:</span>
                        <span className="text-sm">{facility.capacity ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Last Maintenance:</span>
                        <span className="text-sm">{facility.last_maintenance_date || '—'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {facilities.length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-500">No facilities.</div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Maintenance Requests</h3>
            <Button
              className="glass-button"
              onClick={() => {
                setNewRequest({
                  facility_id: facilities[0]?.id || 0,
                  title: '',
                  description: '',
                  reported_date: new Date().toISOString().slice(0, 10),
                  priority: 'medium'
                });
                setRequestDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {(requestsLoading || requestsError) ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {requestsLoading ? 'Loading maintenance requests...' : 'Failed to load maintenance requests.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facility</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.facility?.name || `#${r.facility_id}`}</TableCell>
                        <TableCell className="max-w-[420px] truncate">{r.title}</TableCell>
                        <TableCell>
                          <Badge variant={r.priority === 'high' || r.priority === 'urgent' ? 'destructive' : r.priority === 'medium' ? 'warning' : 'secondary'}>
                            {titleCase(r.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'default' : 'secondary'}>
                            {titleCase(r.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.reported_date}</TableCell>
                      </TableRow>
                    ))}
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">No requests.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Assets Register</h3>
              <p className="text-sm text-gray-500">Total asset value: {totalAssetValue.toLocaleString()}</p>
            </div>
            <Button
              className="glass-button"
              onClick={() => {
                setNewAsset({
                  name: '',
                  asset_tag: '',
                  category: '',
                  condition: 'good',
                  facility_id: facilities[0]?.id || null,
                  purchase_date: '',
                  purchase_cost: 0,
                  current_value: 0
                });
                setAssetDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {(assetsLoading || assetsError) ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {assetsLoading ? 'Loading assets...' : 'Failed to load assets.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.asset_tag}</TableCell>
                        <TableCell>{a.category}</TableCell>
                        <TableCell>{titleCase(a.condition)}</TableCell>
                        <TableCell>{a.facility?.name || (a.facility_id ? `#${a.facility_id}` : '—')}</TableCell>
                        <TableCell className="text-right">
                          {Number(a.current_value ?? a.purchase_cost ?? 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {assets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">No assets.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Infrastructure Planning</h3>
              <p className="text-sm text-gray-500">Upcoming maintenance and inspection planning</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Next Inspections</CardTitle>
                <CardDescription>Review facilities inspection cadence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {facilities
                    .slice()
                    .sort((a, b) => String(a.next_maintenance_date || '').localeCompare(String(b.next_maintenance_date || '')))
                    .slice(0, 5)
                    .map((f) => (
                    <div key={f.id} className="flex items-center justify-between">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-sm text-gray-500">Next: {f.next_maintenance_date || '—'}</div>
                    </div>
                  ))}
                  {facilities.length === 0 && (
                    <div className="text-sm text-gray-500">No facilities.</div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Open Requests</CardTitle>
                <CardDescription>Track pending work orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requests
                    .filter((r) => r.status !== 'completed' && r.status !== 'cancelled')
                    .slice(0, 6)
                    .map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.facility?.name || `#${r.facility_id}`}</div>
                        <div className="text-xs text-gray-500 truncate">{r.title}</div>
                      </div>
                      <Badge variant={r.priority === 'high' || r.priority === 'urgent' ? 'destructive' : r.priority === 'medium' ? 'warning' : 'secondary'}>
                        {titleCase(r.priority)}
                      </Badge>
                    </div>
                  ))}
                  {requests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length === 0 && (
                    <div className="text-sm text-gray-500">No open requests.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add facility</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="bg-white" value={newFacility.name} onChange={(e) => setNewFacility((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newFacility.facility_type} onValueChange={(v) => setNewFacility((p) => ({ ...p, facility_type: v }))}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classroom">Classroom</SelectItem>
                      <SelectItem value="laboratory">Laboratory</SelectItem>
                      <SelectItem value="library">Library</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="auditorium">Auditorium</SelectItem>
                      <SelectItem value="gymnasium">Gymnasium</SelectItem>
                      <SelectItem value="cafeteria">Cafeteria</SelectItem>
                      <SelectItem value="dormitory">Dormitory</SelectItem>
                      <SelectItem value="playground">Playground</SelectItem>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newFacility.is_active ? 'active' : 'inactive'} onValueChange={(v) => setNewFacility((p) => ({ ...p, is_active: v === 'active' }))}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input className="bg-white" value={newFacility.location} onChange={(e) => setNewFacility((p) => ({ ...p, location: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input type="number" className="bg-white" value={newFacility.capacity} onChange={(e) => setNewFacility((p) => ({ ...p, capacity: Number(e.target.value || 0) }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Last maintenance</Label>
                <Input type="date" className="bg-white" value={newFacility.last_maintenance_date} onChange={(e) => setNewFacility((p) => ({ ...p, last_maintenance_date: e.target.value }))} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setFacilityDialogOpen(false)}>Cancel</Button>
              <Button
                className="glass-button"
                onClick={() => {
                  const name = newFacility.name.trim();
                  if (!name) return;
                  createFacilityMutation.mutate();
                }}
              >
                {createFacilityMutation.isPending ? (
                  <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</span>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>New maintenance request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Facility</Label>
                  <Select value={newRequest.facility_id ? String(newRequest.facility_id) : ''} onValueChange={(v) => setNewRequest((p) => ({ ...p, facility_id: Number(v) }))}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select facility" /></SelectTrigger>
                    <SelectContent>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="bg-white" value={newRequest.reported_date} onChange={(e) => setNewRequest((p) => ({ ...p, reported_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input className="bg-white" value={newRequest.title} onChange={(e) => setNewRequest((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newRequest.description} onChange={(e) => setNewRequest((p) => ({ ...p, description: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newRequest.priority} onValueChange={(v) => setNewRequest((p) => ({ ...p, priority: v as any }))}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
              <Button
                className="glass-button"
                onClick={() => {
                  if (!newRequest.facility_id) return;
                  const title = newRequest.title.trim();
                  const description = newRequest.description.trim();
                  if (!title || !description || !newRequest.reported_date) return;
                  createRequestMutation.mutate();
                }}
              >
                {createRequestMutation.isPending ? (
                  <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</span>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="bg-white" value={newAsset.name} onChange={(e) => setNewAsset((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Asset tag</Label>
                  <Input className="bg-white" value={newAsset.asset_tag} onChange={(e) => setNewAsset((p) => ({ ...p, asset_tag: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Facility</Label>
                  <Select value={newAsset.facility_id ? String(newAsset.facility_id) : ''} onValueChange={(v) => setNewAsset((p) => ({ ...p, facility_id: v ? Number(v) : null }))}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input className="bg-white" value={newAsset.category} onChange={(e) => setNewAsset((p) => ({ ...p, category: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={newAsset.condition} onValueChange={(v) => setNewAsset((p) => ({ ...p, condition: v as any }))}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase cost</Label>
                  <Input type="number" className="bg-white" value={newAsset.purchase_cost} onChange={(e) => setNewAsset((p) => ({ ...p, purchase_cost: Number(e.target.value || 0) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Current value</Label>
                  <Input type="number" className="bg-white" value={newAsset.current_value} onChange={(e) => setNewAsset((p) => ({ ...p, current_value: Number(e.target.value || 0) }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase date</Label>
                  <Input type="date" className="bg-white" value={newAsset.purchase_date} onChange={(e) => setNewAsset((p) => ({ ...p, purchase_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAssetDialogOpen(false)}>Cancel</Button>
              <Button
                className="glass-button"
                onClick={() => {
                  const name = newAsset.name.trim();
                  const tag = newAsset.asset_tag.trim();
                  const category = newAsset.category.trim();
                  if (!name || !tag || !category) return;
                  createAssetMutation.mutate();
                }}
              >
                {createAssetMutation.isPending ? (
                  <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</span>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
      </Tabs>
    </div>
  );
};

export default Infrastructure;
