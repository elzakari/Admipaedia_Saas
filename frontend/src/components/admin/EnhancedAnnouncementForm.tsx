import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, DatePicker, Divider, Form, Input, Select, Tag, Typography, message } from 'antd';
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
const { Text } = Typography;

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Entire class audience', description: 'Students, parents, teachers, and administrators connected to this class.' },
  { value: 'students', label: 'Students only', description: 'Only students in the selected class receive the announcement.' },
  { value: 'parents', label: 'Parents only', description: 'Only parents linked to students in the selected class receive it.' },
  { value: 'teachers', label: 'Teachers only', description: 'Only teachers linked to this class receive it.' },
  { value: 'admins', label: 'Administrators only', description: 'Only school administrators see this announcement.' },
];

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

  const watchedClassId = Form.useWatch('class_id', form);
  const watchedRoles = Form.useWatch('target_roles', form) as string[] | undefined;

  const selectedClassLabel = useMemo(() => {
    if (classId) {
      const matched = classes.find((item: any) => Number(item.id) === Number(classId));
      return matched?.name || matched?.class_name || `Class ${classId}`;
    }
    const matched = classes.find((item: any) => Number(item.id) === Number(watchedClassId));
    return matched?.name || matched?.class_name || null;
  }, [classId, classes, watchedClassId]);

  const normalizedRoles = useMemo(() => {
    const roles = Array.isArray(watchedRoles) && watchedRoles.length > 0 ? watchedRoles : ['all'];
    return roles.includes('all') ? ['all'] : roles;
  }, [watchedRoles]);

  const audiencePreview = useMemo(() => {
    const labels = AUDIENCE_OPTIONS
      .filter((option) => normalizedRoles.includes(option.value))
      .map((option) => option.label);
    return labels.length > 0 ? labels : ['Entire class audience'];
  }, [normalizedRoles]);

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
      scheduled_date: isScheduled && values.scheduled_date
        ? format(values.scheduled_date.toDate(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
        : null
    };

    createMutation.mutate(data);
  };

  return (
    <Card
      title="Create Announcement"
      className="shadow-md border-0"
      styles={{ body: { paddingTop: 12 } }}
    >
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm font-medium text-slate-900">Class-first targeting</div>
        <div className="mt-1 text-sm text-slate-600">
          Select the class first, then choose exactly who in that class should receive the announcement.
        </div>
      </div>
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
          <Form.Item
            name="class_id"
            label="Class"
            rules={[{ required: true, message: 'Please select a class' }]}
            extra="Choose the class before defining the audience."
          >
            <Select
              placeholder="Select class"
              showSearch
              optionFilterProp="children"
            >
              {classes.map((c: any) => (
                <Option key={c.id} value={c.id}>
                  {c.name || c.class_name || (typeof c.grade_level === 'object' && c.grade_level !== null ? c.grade_level.name : c.grade_level) || `Class ${c.id}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}
        {classId && (
          <div className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            Sending to <span className="font-semibold">{selectedClassLabel || `Class ${classId}`}</span>
          </div>
        )}

        <Form.Item
          name="target_roles"
          label="Target Audience"
          extra="Default is the entire class audience. Choose a narrower audience if needed."
        >
          <Select
            mode="multiple"
            placeholder="Select target audience"
            maxTagCount="responsive"
            onChange={(vals: string[]) => {
              if (!Array.isArray(vals) || vals.length === 0) {
                form.setFieldsValue({ target_roles: ['all'] });
                return;
              }
              if (vals.includes('all') && vals.length > 1) {
                form.setFieldsValue({ target_roles: ['all'] });
              }
            }}
          >
            {AUDIENCE_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-slate-500">{option.description}</span>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-sm font-medium text-slate-900">Delivery preview</div>
          <div className="mb-2 flex flex-wrap gap-2">
            {audiencePreview.map((label) => (
              <Tag key={label} color="blue">
                {label}
              </Tag>
            ))}
          </div>
          <Text type="secondary">
            {selectedClassLabel
              ? `This announcement will be scoped to ${selectedClassLabel}.`
              : 'Select a class to scope the announcement.'}
          </Text>
        </div>

        <Divider className="mt-0" />

        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="e.g. Midterm briefing for parents" />
        </Form.Item>

        <Form.Item
          name="content"
          label="Content"
          rules={[{ required: true, message: 'Please enter content' }]}
        >
          <TextArea rows={5} placeholder="Write the announcement message that recipients should read." />
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
            loading={createMutation.isPending}
          >
            {isScheduled ? 'Schedule Announcement' : 'Send Announcement'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EnhancedAnnouncementForm;
