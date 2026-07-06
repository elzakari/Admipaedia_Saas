import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Checkbox, DatePicker, Divider, Form, Input, Radio, Select, Tag, Typography, message } from 'antd';
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

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global (Entire School)' },
  { value: 'class_bound', label: 'Class-Specific' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Roles', description: 'Students, parents, teachers, and administrators within the selected scope.' },
  { value: 'students', label: 'Students', description: 'Only students in the selected scope receive the announcement.' },
  { value: 'parents', label: 'Parents', description: 'Only parents linked to students in the selected scope receive the announcement.' },
  { value: 'teachers', label: 'Teachers', description: 'Only teachers in the selected scope receive the announcement.' },
  { value: 'admins', label: 'Administrators', description: 'Only administrators in the selected scope receive the announcement.' },
];

const EnhancedAnnouncementForm: React.FC<EnhancedAnnouncementFormProps> = ({ classId, onSuccess }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isScheduled, setIsScheduled] = useState(false);
  const previousScopeRef = useRef<'global' | 'class_bound'>(classId ? 'class_bound' : 'global');

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

  const watchedScope = Form.useWatch('scope', form) as 'global' | 'class_bound' | undefined;
  const watchedClassId = Form.useWatch('class_id', form);
  const watchedRoles = Form.useWatch('target_roles', form) as string[] | undefined;
  const effectiveScope = classId ? 'class_bound' : (watchedScope || 'global');

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
    return labels.length > 0 ? labels : ['All Roles'];
  }, [normalizedRoles]);

  const deliveryPreview = useMemo(() => {
    const rolesText = (() => {
      if (normalizedRoles.includes('all')) {
        return 'all roles';
      }

      if (normalizedRoles.length === 1) {
        const onlyRole = normalizedRoles[0];
        if (onlyRole === 'students') return 'Students';
        if (onlyRole === 'parents') return 'Parents';
        if (onlyRole === 'teachers') return 'Teachers';
        if (onlyRole === 'admins') return 'Administrators';
      }

      return normalizedRoles
        .map((role) => AUDIENCE_OPTIONS.find((option) => option.value === role)?.label || role)
        .join(', ');
    })();

    if (effectiveScope === 'global') {
      if (normalizedRoles.includes('all')) {
        return 'This announcement will be delivered to all roles across the entire institution.';
      }
      return `This announcement will be delivered to ${rolesText} across the entire institution.`;
    }

    if (!selectedClassLabel) {
      return 'This announcement will remain class-restricted once you select the target class.';
    }

    if (normalizedRoles.includes('all')) {
      return `This announcement will be restricted to all roles associated with ${selectedClassLabel}.`;
    }

    if (normalizedRoles.length === 1 && normalizedRoles[0] === 'parents') {
      return `This announcement will be restricted to Parents of students enrolled in ${selectedClassLabel}.`;
    }

    return `This announcement will be restricted to ${rolesText} associated with ${selectedClassLabel}.`;
  }, [effectiveScope, normalizedRoles, selectedClassLabel]);

  useEffect(() => {
    const previousScope = previousScopeRef.current;
    if (previousScope === effectiveScope) {
      return;
    }

    if (effectiveScope === 'global') {
      form.setFieldsValue({
        class_id: undefined,
      });
    } else {
      form.setFieldsValue({
        class_id: classId || undefined,
      });
    }

    previousScopeRef.current = effectiveScope;
  }, [classId, effectiveScope, form]);

  // Mutation for creating announcements
  const createMutation = useMutation({
    mutationFn: (data: AdminAnnouncementCreate) => {
      if ((classId && data.scope === 'class_bound') || data.scope === 'class_bound') {
        const { class_id: _, ...rest } = data;
        return announcementService.createClassAnnouncement(classId ?? Number(data.class_id), rest);
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
    const scope = classId ? 'class_bound' : (values.scope || 'global');
    const rolesRaw = values.target_roles;
    const roles: string[] = Array.isArray(rolesRaw) ? rolesRaw : (rolesRaw ? [String(rolesRaw)] : ['all']);
    const normalizedRoles = roles.includes('all') ? ['all'] : roles;
    const selectedClassId = scope === 'class_bound' ? (classId ?? Number(values.class_id)) : null;
    if (scope === 'class_bound' && !selectedClassId) {
      message.error('Please select a class');
      return;
    }

    const data: AdminAnnouncementCreate = {
      scope,
      title: values.title,
      content: values.content,
      class_id: scope === 'class_bound' ? selectedClassId : null,
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
        <div className="text-sm font-medium text-slate-900">Top-down audience scoping</div>
        <div className="mt-1 text-sm text-slate-600">
          Choose the broadcast scope first, then narrow to class and recipient roles so the payload stays explicitly scoped.
        </div>
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          scope: classId ? 'class_bound' : 'global',
          title: '',
          content: '',
          target_roles: ['all'],
          class_id: classId || undefined,
          send_email: false,
          scheduled_date: null
        }}
      >
        {!classId && (
          <Form.Item
            name="scope"
            label="Broadcast Scope"
            extra="Global targets the entire school. Class-Specific enforces class-bound delivery."
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              {SCOPE_OPTIONS.map((option) => (
                <Radio.Button key={option.value} value={option.value}>
                  {option.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
        )}

        {classId && (
          <Form.Item label="Broadcast Scope">
            <Radio.Group value="class_bound" optionType="button" buttonStyle="solid" disabled>
              <Radio.Button value="class_bound">Class-Specific</Radio.Button>
            </Radio.Group>
          </Form.Item>
        )}

        {effectiveScope === 'class_bound' && !classId && (
          <Form.Item
            name="class_id"
            label="Class"
            rules={[{ required: true, message: 'Please select a class' }]}
            extra="This field appears only for class-specific delivery and is required for backend scope binding."
            preserve={false}
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

        {effectiveScope === 'class_bound' && classId && (
          <div className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            Class-specific delivery is locked to <span className="font-semibold">{selectedClassLabel || `Class ${classId}`}</span>
          </div>
        )}

        <Form.Item
          name="target_roles"
          label="Recipient Role"
          extra={effectiveScope === 'global'
            ? 'Global scope means the selected roles are targeted across the entire institution.'
            : 'Class-specific scope limits these roles strictly to the selected class.'}
        >
          <Select
            mode="multiple"
            placeholder="Select recipient roles"
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
                  <span className="text-xs text-slate-500">
                    {effectiveScope === 'global'
                      ? option.description.replace('selected scope', 'entire institution')
                      : option.description.replace('selected scope', 'selected class')}
                  </span>
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
            {deliveryPreview}
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
