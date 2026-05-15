import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, List, Tag, Input, Button, Tabs, Empty, Skeleton, Dropdown, Menu, Modal, Form, Select, Switch, DatePicker, message } from 'antd';
import { SearchOutlined, FilterOutlined, BellOutlined, CalendarOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import announcementService, { Announcement } from '../../services/announcementService';
import { useAnnouncementWebSocket } from '../../services/announcementWebSocketService';
import { useAuth } from '../../contexts/AuthContext';
import EnhancedAnnouncementForm from '../../components/admin/EnhancedAnnouncementForm';
import AnnouncementCalendarIntegration from '../../components/calendar/AnnouncementCalendarIntegration';
import calendarService from '../../services/calendarService';
import dayjs from 'dayjs';

const { Search } = Input;
const { TextArea } = Input;
const { Option } = Select;

const AnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('all');
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [editForm] = Form.useForm();
  
  // Get announcements from API
  const { data: apiAnnouncements, isLoading } = useQuery({
    queryKey: ['announcements', currentPage, pageSize],
    queryFn: () => announcementService.getAnnouncements({ page: currentPage, per_page: pageSize }),
    placeholderData: keepPreviousData
  });
  
  // Get real-time announcements from WebSocket
  const { announcements: wsAnnouncements } = useAnnouncementWebSocket(
    undefined, // No specific class
    user?.role // User role for role-based announcements
  );
  
  // Get calendar events
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => calendarService.getEvents(),
    enabled: activeTab === 'calendar'
  });
  
  // Combine API and WebSocket announcements
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  
  useEffect(() => {
    if (apiAnnouncements) {
      // Combine and deduplicate announcements
      const apiData = apiAnnouncements.announcements || [];
      const wsData = wsAnnouncements || [];
      
      // Create a map of announcements by ID
      const announcementMap = new Map();
      
      // Add API announcements to the map
      apiData.forEach((announcement: { id: any; }) => {
        announcementMap.set(announcement.id, announcement);
      });
      
      // Add or update with WebSocket announcements
      wsData.forEach(announcement => {
        announcementMap.set(announcement.id, announcement);
      });
      
      // Convert map back to array and sort by date (newest first)
      const combined = Array.from(announcementMap.values()).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setAllAnnouncements(combined);
    }
  }, [apiAnnouncements, wsAnnouncements]);
  
  // Filter announcements based on search and active tab
  useEffect(() => {
    let filtered = [...allAnnouncements];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        announcement =>
          announcement.title.toLowerCase().includes(query) ||
          announcement.content.toLowerCase().includes(query)
      );
    }
    
    // Apply tab filter
    if (activeTab === 'scheduled') {
      filtered = filtered.filter(announcement => 
        announcement.scheduled_date && new Date(announcement.scheduled_date) > new Date()
      );
    } else if (activeTab === 'email') {
      filtered = filtered.filter(announcement => announcement.send_email);
    }
    
    setFilteredAnnouncements(filtered);
  }, [allAnnouncements, searchQuery, activeTab]);
  
  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on new search
  };
  
  // Handle tab change
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setCurrentPage(1); // Reset to first page on tab change
  };
  
  // Render announcement item
  const renderAnnouncementItem = (announcement: Announcement) => {
    const isScheduled = announcement.scheduled_date && new Date(announcement.scheduled_date) > new Date();
    const canManage = user?.role === 'admin' || user?.role === 'teacher';

    const openView = () => {
      setSelected(announcement);
      setViewOpen(true);
    };

    const openEdit = () => {
      setSelected(announcement);
      editForm.setFieldsValue({
        title: announcement.title,
        content: announcement.content,
        recipients: announcement.recipients || 'all',
        send_email: Boolean(announcement.send_email),
        is_published: announcement.is_published !== false,
        scheduled_date: announcement.scheduled_date ? dayjs(announcement.scheduled_date) : null
      });
      setEditOpen(true);
    };

    const doDelete = async () => {
      if (!confirm('Delete this announcement?')) return;
      try {
        await announcementService.deleteAnnouncement(announcement.id);
        message.success('Announcement deleted');
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      } catch (e: any) {
        message.error(e?.message || 'Failed to delete announcement');
      }
    };
    
    return (
      <List.Item
        key={announcement.id}
        className="cursor-pointer"
        onClick={openView}
        actions={[
          <span key="date">
            {new Date(announcement.created_at).toLocaleDateString()}
          </span>
          ,
          ...(canManage ? [
            <Button key="edit" type="link" onClick={(e) => { e.stopPropagation(); openEdit(); }}>
              Edit
            </Button>,
            <Button key="delete" type="link" danger onClick={(e) => { e.stopPropagation(); doDelete(); }}>
              Delete
            </Button>
          ] : [])
        ]}
      >
        <List.Item.Meta
          title={
            <div className="flex items-center">
              <span className="mr-2">{announcement.title}</span>
              {isScheduled && (
                <Tag color="orange">
                  <CalendarOutlined /> Scheduled: {new Date(announcement.scheduled_date!).toLocaleString()}
                </Tag>
              )}
              {announcement.send_email && (
                <Tag color="blue">
                  <MailOutlined /> Email
                </Tag>
              )}
            </div>
          }
          description={announcement.content}
        />
      </List.Item>
    );
  };
  
  // Render mobile filter menu
  const mobileFilterMenu = {
    items: [
      { key: 'all', label: 'All Announcements' },
      { key: 'scheduled', label: 'Scheduled' },
      { key: 'email', label: 'Email Notifications' },
      { key: 'calendar', label: 'Calendar View' }
    ],
    onClick: ({ key }: { key: string }) => handleTabChange(key)
  };
  
  return (
    <div className="announcements-page p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Button 
            icon={<BellOutlined />} 
            type="link" 
            onClick={() => navigate('/dashboard')}
            className="mr-2"
          >
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold m-0">Announcements</h1>
        </div>
        
        <div className="flex w-full md:w-auto">
          <Search
            placeholder="Search announcements"
            onSearch={handleSearch}
            onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setSearchQuery(e.target.value)}
            className="mr-2 w-full md:w-64"
            allowClear
          />
          
          {isMobile ? (
            <Dropdown menu={mobileFilterMenu as any} trigger={['click']}>
              <Button icon={<FilterOutlined />} />
            </Dropdown>
          ) : null}
          
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Button 
              type="primary" 
              onClick={() => setCreateOpen(true)}
              className="ml-2"
            >
              Create
            </Button>
          )}
        </div>
      </div>
      
      <div className="announcement-content">
        {isMobile ? (
          // Mobile view - just show the list with dropdown filter
          <Card>
            {activeTab === 'calendar' ? (
              <AnnouncementCalendarIntegration
                announcements={allAnnouncements}
                events={calendarEvents}
                userRole={user?.role || ''}
              />
            ) : (
              <>
                <Skeleton loading={isLoading} active paragraph={{ rows: 4 }}>
                  {filteredAnnouncements.length > 0 ? (
                    <List
                      dataSource={filteredAnnouncements}
                      renderItem={renderAnnouncementItem}
                      pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: apiAnnouncements?.pagination?.total || 0,
                        onChange: (page: React.SetStateAction<number>) => setCurrentPage(page),
                        showSizeChanger: false
                      }}
                    />
                  ) : (
                    <Empty description="No announcements found" />
                  )}
                </Skeleton>
              </>
            )}
          </Card>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            className="announcement-tabs"
            items={[
              {
                key: 'all',
                label: 'All Announcements',
                children: (
                  <Card>
                    <Skeleton loading={isLoading} active paragraph={{ rows: 4 }}>
                      {filteredAnnouncements.length > 0 ? (
                        <List
                          dataSource={filteredAnnouncements}
                          renderItem={renderAnnouncementItem}
                          pagination={{
                            current: currentPage,
                            pageSize,
                            total: apiAnnouncements?.pagination?.total || 0,
                            onChange: (page: React.SetStateAction<number>) => setCurrentPage(page),
                            onShowSizeChange: (_current: number, size: number) => setPageSize(size),
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20', '50']
                          }}
                        />
                      ) : (
                        <Empty description="No announcements found" />
                      )}
                    </Skeleton>
                  </Card>
                )
              },
              {
                key: 'scheduled',
                label: (
                  <span>
                    <CalendarOutlined /> Scheduled
                  </span>
                ),
                children: (
                  <Card>
                    <Skeleton loading={isLoading} active paragraph={{ rows: 4 }}>
                      {filteredAnnouncements.length > 0 ? (
                        <List
                          dataSource={filteredAnnouncements}
                          renderItem={renderAnnouncementItem}
                          pagination={{
                            current: currentPage,
                            pageSize,
                            total: filteredAnnouncements.length,
                            onChange: (page: React.SetStateAction<number>) => setCurrentPage(page),
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20', '50']
                          }}
                        />
                      ) : (
                        <Empty description="No scheduled announcements found" />
                      )}
                    </Skeleton>
                  </Card>
                )
              },
              {
                key: 'email',
                label: (
                  <span>
                    <MailOutlined /> Email Notifications
                  </span>
                ),
                children: (
                  <Card>
                    <Skeleton loading={isLoading} active paragraph={{ rows: 4 }}>
                      {filteredAnnouncements.length > 0 ? (
                        <List
                          dataSource={filteredAnnouncements}
                          renderItem={renderAnnouncementItem}
                          pagination={{
                            current: currentPage,
                            pageSize,
                            total: filteredAnnouncements.length,
                            onChange: (page: React.SetStateAction<number>) => setCurrentPage(page),
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20', '50']
                          }}
                        />
                      ) : (
                        <Empty description="No email announcements found" />
                      )}
                    </Skeleton>
                  </Card>
                )
              },
              {
                key: 'calendar',
                label: (
                  <span>
                    <CalendarOutlined /> Calendar View
                  </span>
                ),
                children: (
                  <Card>
                    <AnnouncementCalendarIntegration
                      announcements={allAnnouncements}
                      events={calendarEvents}
                      userRole={user?.role || ''}
                      onCreateEvent={() => navigate('/calendar')}
                    />
                  </Card>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal
        title="Create Announcement"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <EnhancedAnnouncementForm
          onSuccess={() => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
          }}
        />
      </Modal>

      <Modal
        title={selected?.title || 'Announcement'}
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={[
          (user?.role === 'admin' || user?.role === 'teacher') ? (
            <Button key="edit" type="primary" onClick={() => { setViewOpen(false); if (selected) { 
              editForm.setFieldsValue({
                title: selected.title,
                content: selected.content,
                recipients: selected.recipients || 'all',
                send_email: Boolean(selected.send_email),
                is_published: selected.is_published !== false,
                scheduled_date: selected.scheduled_date ? dayjs(selected.scheduled_date) : null
              });
              setEditOpen(true);
            } }}>
              Edit
            </Button>
          ) : null,
          <Button key="close" onClick={() => setViewOpen(false)}>Close</Button>
        ]}
        destroyOnHidden
      >
        {selected ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-500">{new Date(selected.created_at).toLocaleString()}</div>
            <div className="whitespace-pre-wrap">{selected.content}</div>
            <div className="flex gap-2 flex-wrap">
              {selected.recipients ? <Tag>Recipients: {selected.recipients}</Tag> : null}
              {selected.send_email ? <Tag color="blue">Email</Tag> : null}
              {selected.scheduled_date ? <Tag color="orange">Scheduled: {new Date(selected.scheduled_date).toLocaleString()}</Tag> : null}
              {selected.is_published === false ? <Tag color="red">Unpublished</Tag> : <Tag color="green">Published</Tag>}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="Edit Announcement"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        okText="Save"
        onOk={async () => {
          const values = await editForm.validateFields();
          if (!selected) return;
          try {
            await announcementService.updateAnnouncement(selected.id, {
              title: values.title,
              content: values.content,
              recipients: values.recipients,
              send_email: Boolean(values.send_email),
              is_published: Boolean(values.is_published),
              scheduled_date: values.scheduled_date ? values.scheduled_date.toISOString() : null
            });
            message.success('Announcement updated');
            setEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
          } catch (e: any) {
            message.error(e?.message || 'Failed to update announcement');
          }
        }}
        width={760}
        destroyOnHidden
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true, message: 'Content is required' }]}>
            <TextArea rows={5} />
          </Form.Item>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="recipients" label="Recipients" rules={[{ required: true, message: 'Recipients is required' }]}>
              <Select>
                <Option value="all">all</Option>
                <Option value="students">students</Option>
                <Option value="parents">parents</Option>
                <Option value="teachers">teachers</Option>
                <Option value="admins">admins</Option>
              </Select>
            </Form.Item>
            <Form.Item name="scheduled_date" label="Scheduled date" help="Leave empty to publish immediately">
              <DatePicker showTime className="w-full" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="send_email" label="Send email" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_published" label="Published" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
