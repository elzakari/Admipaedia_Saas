import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, DatePicker, Form, Input, Select, message } from 'antd';
import { SendOutlined, ScheduleOutlined } from '@ant-design/icons';
import announcementService, { AdminAnnouncementCreate } from '../../services/announcementService';
import { format } from 'date-fns';
import api from '../../lib/api';

interface EnhancedAnnouncementFormProps {
  classId?: number; // Optional for class-specific announcements
  onSuccess?: () => void;
}

const { Option } = Select;
const { TextArea } = Input;

const EnhancedAnnouncementForm: React.FC<EnhancedAnnouncementFormProps> = ({ classId, onSuccess }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isScheduled, setIsScheduled] = useState(false);

  const { data: classesResponse } = useQuery({
    queryKey: ['classes', 'announcement-form'],
    queryFn: async () => {
      const res = await api.get('/classes', { params: { per_page: 200 } });
      return res.data as any;
    },
    enabled: !classId
  });

  const classes = useMemo(() => {
    const items = classesResponse?.classes;
    return Array.isArray(items) ? items : [];
  }, [classesResponse]);

  // Mutation for creating announcements
  const createMutation = useMutation({
    mutationFn: (data: AdminAnnouncementCreate) => {
      if (classId) {
        const { class_id: _, ...rest } = data;
        return announcementService.createClassAnnouncement(classId, rest);
      }
      return announcementService.createGlobalAnnouncement(data);
    },
    onSuccess: () => {
      message.success('Announcement created successfully');
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      if (classId) queryClient.invalidateQueries({ queryKey: ['classAnnouncements', classId] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      message.error(`Failed to create announcement: ${error.message}`);
    }
  });

  const handleSubmit = (values: any) => {
    const rolesRaw = values.target_roles;
    const roles: string[] = Array.isArray(rolesRaw) ? rolesRaw : (rolesRaw ? [String(rolesRaw)] : ['all']);
    const normalizedRoles = roles.includes('all') ? ['all'] : roles;

    const selectedClassId = classId ?? Number(values.class_id);
    if (!selectedClassId) {
      message.error('Please select a class');
      return;
    }

    const recipients = (() => {
      if (normalizedRoles.includes('all') || normalizedRoles.length !== 1) return 'all'
      const only = normalizedRoles[0]
      if (['students', 'parents', 'teachers', 'admins'].includes(only)) return only
      return 'all'
    })()

    const data: AdminAnnouncementCreate = {
      title: values.title,
      content: values.content,
      class_id: selectedClassId,
      target_roles: normalizedRoles,
      send_email: Boolean(values.send_email),
      recipients,
      scheduled_date: isScheduled && values.scheduled_date
        ? format(values.scheduled_date.toDate(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
        : null
    };

    createMutation.mutate(data);
  };

  return (
    <Card title={classId ? "Create Class Announcement" : "Create Global Announcement"} className="shadow-md">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          title: '',
          content: '',
          target_roles: ['all'],
          class_id: classId || undefined,
          recipients: 'all',
          send_email: false,
          scheduled_date: null
        }}
      >
        {!classId && (
          <Form.Item name="class_id" label="Class" rules={[{ required: true, message: 'Please select a class' }]}>
            <Select placeholder="Select class">
              {classes.map((c: any) => (
                <Option key={c.id} value={c.id}>
                  {c.name || c.class_name || c.grade_level || `Class ${c.id}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="Announcement title" />
        </Form.Item>

        <Form.Item
          name="content"
          label="Content"
          rules={[{ required: true, message: 'Please enter content' }]}
        >
          <TextArea rows={4} placeholder="Announcement content" />
        </Form.Item>

        {classId && (
          <Form.Item name="recipients" label="Recipients">
            <Select>
              <Option value="all">All Students</Option>
              <Option value="parents">Parents Only</Option>
              <Option value="selected">Selected Students</Option>
            </Select>
          </Form.Item>
        )}

        <Form.Item name="target_roles" label="Target Roles">
          <Select
            mode="multiple"
            placeholder="Select target roles"
            onChange={(vals: string[]) => {
              if (Array.isArray(vals) && vals.includes('all') && vals.length > 1) {
                form.setFieldsValue({ target_roles: ['all'] });
              }
            }}
          >
            <Option value="all">All Roles</Option>
            <Option value="students">Students</Option>
            <Option value="teachers">Teachers</Option>
            <Option value="parents">Parents</Option>
            <Option value="admins">Administrators</Option>
          </Select>
        </Form.Item>

        <Form.Item name="send_email" valuePropName="checked">
          <Checkbox>Send Email Notification</Checkbox>
        </Form.Item>

        <Form.Item>
          <Checkbox checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)}>
            Schedule for later
          </Checkbox>
        </Form.Item>

        {isScheduled && (
          <Form.Item
            name="scheduled_date"
            label="Schedule Date and Time"
            rules={[{ required: isScheduled, message: 'Please select a date and time' }]}
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm" />
          </Form.Item>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={isScheduled ? <ScheduleOutlined /> : <SendOutlined />}
            loading={createMutation.isLoading}
          >
            {isScheduled ? 'Schedule Announcement' : 'Send Announcement'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EnhancedAnnouncementForm;
