import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Target, ClipboardList, Paperclip, GraduationCap, Home, Radio,
  Save, X, Plus, Trash2, Check, Clock, Link, Send, MessageSquare,
  ThumbsUp, BarChart3, Users, Eye, PlayCircle, FileText, Square,
  ChevronUp, BarChart2, GripVertical
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerFooter
} from '../ui/drawer';
import {
  Accordion, AccordionContent, AccordionItem,
  AccordionTrigger
} from '../ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue
} from '../ui/select';
import { DatePicker } from '../ui/date-picker';
import { Upload } from '../ui/upload';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { cn, getInitials } from '../../lib/utils';
import classService, { Lesson, LessonData } from '../../services/classService';
import type {
  LessonBroadcast, LiveLessonStats, LessonAttachment,
  LessonComment, BroadcastStatus
} from '../../types/lesson';
import WebSocketService, {
  LESSONS_NAMESPACE,
  LessonViewersUpdatedPayload
} from '../../services/websocketService';

interface LessonStudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  subjects: Array<{ id: number; name: string; teachers?: Array<{ id: number; name: string }> }>;
  lesson: Lesson | null;
  prefillData?: Partial<LessonData> | null;
  onSave?: () => void;
}

interface ObjectiveItem {
  id: string;
  text: string;
  completed?: boolean;
}

interface ClassworkStep {
  id: string;
  title: string;
  duration: number;
  description: string;
}

interface ViewerHistoryPoint {
  time: string;
  viewers: number;
}

const createEmptyFormState = (): LessonData => ({
  title: '',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  status: 'planned',
  subject_id: undefined,
  objectives: undefined,
  classwork: undefined,
  homework: undefined,
  resources: [],
  materials: [],
  notes: '',
});

export function LessonStudioDrawer({
  isOpen, onClose, classId, subjects, lesson, prefillData, onSave
}: LessonStudioDrawerProps) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocketService | null>(null);
  const viewerUnsubRef = useRef<(() => void) | null>(null);

  const [form, setForm] = useState<LessonData>(createEmptyFormState());
  const [objectives, setObjectives] = useState<ObjectiveItem[]>([]);
  const [classworkSteps, setClassworkSteps] = useState<ClassworkStep[]>([]);
  const [assessment, setAssessment] = useState<{ type: string; content: string; pass_mark?: number }>({
    type: 'formative', content: '', pass_mark: 50
  });
  const [homework, setHomework] = useState<{ content: string; due_date?: string | null }>({
    content: '', due_date: null
  });
  const [dueDatePicker, setDueDatePicker] = useState<Date | undefined>(undefined);
  const [newResource, setNewResource] = useState({ title: '', url: '' });

  const [broadcastTab, setBroadcastTab] = useState<'status' | 'qa' | 'actions'>('status');
  const [broadcast, setBroadcast] = useState<LessonBroadcast | null>(null);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [viewerHistory, setViewerHistory] = useState<ViewerHistoryPoint[]>([]);
  const [liveStats, setLiveStats] = useState<LiveLessonStats | null>(null);
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [newComment, setNewComment] = useState('');

  const parseList = (text?: string | Record<string, unknown> | Record<string, unknown>[]): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (Array.isArray(text)) return text.map((t) => typeof t === 'string' ? t : JSON.stringify(t)).join('\n');
    return JSON.stringify(text);
  };

  const initFromData = () => {
    const base = createEmptyFormState();
    if (lesson) {
      setForm({
        ...base,
        title: lesson.title || '',
        description: lesson.description || '',
        date: lesson.date || format(new Date(), 'yyyy-MM-dd'),
        status: (lesson.status as any) || 'planned',
        subject_id: lesson.subject_id || undefined,
        objectives: lesson.objectives as any,
        classwork: lesson.classwork as any,
        homework: lesson.homework as any,
        resources: lesson.resources || [],
        materials: lesson.materials || [],
        notes: (lesson as any).notes || '',
        period_number: (lesson as any).period_number,
        start_time: (lesson as any).start_time,
        end_time: (lesson as any).end_time,
      } as LessonData);

      const objText = parseList(lesson.objectives as any);
      setObjectives(
        objText
          ? objText.split('\n').filter(Boolean).map((text, i) => ({
            id: `obj-${Date.now()}-${i}`,
            text: text.replace(/^[-*•]\s*/, '').trim(),
            completed: false,
          }))
          : []
      );

      const cwText = parseList(lesson.classwork as any);
      setClassworkSteps(
        cwText
          ? cwText.split('\n').filter(Boolean).map((text, i) => ({
            id: `cw-${Date.now()}-${i}`,
            title: `Step ${i + 1}`,
            duration: 10,
            description: text.replace(/^[-*•\d.]\s*/, '').trim(),
          }))
          : []
      );

      const hwText = parseList(lesson.homework as any);
      setHomework({
        content: hwText,
        due_date: (lesson as any).homework_due_date || null,
      });
    } else if (prefillData) {
      setForm({ ...base, ...prefillData } as LessonData);
      setObjectives([]);
      setClassworkSteps([]);
      setHomework({ content: '', due_date: null });
    } else {
      setForm(base);
      setObjectives([]);
      setClassworkSteps([]);
      setHomework({ content: '', due_date: null });
    }

    if (dueDatePicker === undefined) {
      const due = (lesson as any)?.homework_due_date;
      setDueDatePicker(due ? new Date(due) : undefined);
    }
  };

  useEffect(() => {
    if (isOpen) {
      initFromData();
      setViewerHistory([]);
      setLiveStats(null);
      setComments([]);
      setBroadcast(null);
      setBroadcastTab('status');
    }
    return () => {
      if (viewerUnsubRef.current) {
        viewerUnsubRef.current();
        viewerUnsubRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lesson, prefillData]);

  const lessonId = lesson?.id;

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['lesson-comments', lessonId],
    queryFn: () => classService.getLessonComments(lessonId!),
    enabled: !!lessonId && isOpen && broadcastTab === 'qa',
  });

  useEffect(() => {
    if (commentsData?.data) {
      setComments(commentsData.data as unknown as LessonComment[]);
    }
  }, [commentsData]);

  const fetchLiveStats = async (silent = true) => {
    if (!lessonId) return;
    try {
      const res = await classService.getLessonLiveStats(classId, lessonId);
      if (res.data) {
        setLiveStats(res.data);
        setViewerHistory((prev) => {
          const newPoint: ViewerHistoryPoint = {
            time: format(new Date(), 'HH:mm:ss'),
            viewers: res.data!.active_viewers || 0,
          };
          const next = [...prev, newPoint].slice(-20);
          return next;
        });
      }
    } catch (e) {
      if (!silent) console.error(e);
    }
  };

  const startWebSocketHeartbeat = () => {
    if (!lessonId) return;
    try {
      const ws = WebSocketService.getInstance(LESSONS_NAMESPACE);
      wsRef.current = ws;
      ws.connectLessonsNamespace();
      ws.joinLessonRoom({ lesson_id: lessonId, class_id: classId });

      if (viewerUnsubRef.current) viewerUnsubRef.current();
      viewerUnsubRef.current = ws.startHeartbeatLoop(
        lessonId,
        (payload: LessonViewersUpdatedPayload) => {
          setLiveStats((prev) =>
            prev
              ? { ...prev, active_viewers: payload.active_viewers, peak_viewers: payload.peak_viewers }
              : {
                lesson_id: lessonId,
                active_viewers: payload.active_viewers,
                peak_viewers: payload.peak_viewers,
                viewer_count: payload.peak_viewers,
                acknowledgement_count: 0,
                comment_count: 0,
                attachment_count: 0,
                timestamp: new Date().toISOString(),
              }
          );
          setViewerHistory((prev) => {
            const newPoint: ViewerHistoryPoint = {
              time: format(new Date(), 'HH:mm:ss'),
              viewers: payload.active_viewers,
            };
            return [...prev, newPoint].slice(-20);
          });
        }
      );
    } catch (e) {
      console.error('WS setup error', e);
    }
  };

  useEffect(() => {
    if (!isOpen || !lessonId) return;
    fetchLiveStats(false);
    const interval = setInterval(() => fetchLiveStats(true), 5000);
    return () => clearInterval(interval);
  }, [isOpen, lessonId, classId]);

  const broadcastStatus: BroadcastStatus | undefined = broadcast?.status || liveStats?.broadcast_status;
  const isLive = broadcastStatus === 'live';
  const viewerCount = liveStats?.active_viewers || broadcast?.viewer_count || 0;
  const peakViewers = liveStats?.peak_viewers || broadcast?.peak_viewers || 0;

  const saveLessonMutation = useMutation({
    mutationFn: async (payload: LessonData) => {
      const objectivesText = objectives.map((o) => `• ${o.text}`).join('\n');
      const classworkText = classworkSteps
        .map((s, i) => `${i + 1}. ${s.title} (${s.duration}min): ${s.description}`)
        .join('\n');

      const finalPayload: LessonData = {
        ...payload,
        objectives: objectivesText || undefined,
        classwork: classworkText || undefined,
        homework: homework.content || undefined,
      } as any;

      (finalPayload as any).homework_due_date = homework.due_date;

      if (lesson?.id) {
        return classService.updateClassLesson(classId, lesson.id, finalPayload);
      }
      return classService.createClassLesson(classId, finalPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-lessons', classId] });
      toast.success(lesson?.id ? 'Lesson updated' : 'Lesson created');
      onSave?.();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save lesson'),
  });

  const startBroadcastMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) throw new Error('Save lesson first');
      const res = await classService.startLessonBroadcast(classId, lessonId);
      return res.data!;
    },
    onSuccess: (b) => {
      setBroadcast(b);
      toast.success('Broadcast is LIVE 🔴');
      fetchLiveStats(false);
      startWebSocketHeartbeat();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to go live'),
  });

  const endBroadcastMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) throw new Error('No lesson');
      const res = await classService.endLessonBroadcast(classId, lessonId);
      return res.data!;
    },
    onSuccess: (b) => {
      setBroadcast(b);
      toast.success('Broadcast ended');
      fetchLiveStats(false);
      if (viewerUnsubRef.current) {
        viewerUnsubRef.current();
        viewerUnsubRef.current = null;
      }
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to end broadcast'),
  });

  const approveCommentMutation = useMutation({
    mutationFn: (id: number) => classService.approveLessonComment(id),
    onSuccess: () => {
      toast.success('Comment approved');
      refetchComments();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => classService.deleteLessonComment(id),
    onSuccess: () => {
      toast.success('Comment removed');
      refetchComments();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const postCommentMutation = useMutation({
    mutationFn: (content: string) =>
      classService.createLessonComment(lessonId!, { content, visibility: 'class' }),
    onSuccess: () => {
      setNewComment('');
      refetchComments();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to post'),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File | { link_url: string; filename: string }) =>
      classService.uploadLessonAttachment(lessonId!, file),
    onSuccess: () => {
      toast.success('Attachment uploaded');
      fetchLiveStats(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Upload failed'),
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Lesson title is required');
      return;
    }
    saveLessonMutation.mutate(form);
  };

  const addObjective = () => {
    setObjectives((prev) => [
      ...prev,
      { id: `obj-new-${Date.now()}`, text: '', completed: false },
    ]);
  };

  const updateObjective = (id: string, text: string) => {
    setObjectives((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const removeObjective = (id: string) => {
    setObjectives((prev) => prev.filter((o) => o.id !== id));
  };

  const addClassworkStep = () => {
    setClassworkSteps((prev) => [
      ...prev,
      { id: `cw-new-${Date.now()}`, title: `Step ${prev.length + 1}`, duration: 10, description: '' },
    ]);
  };

  const updateClassworkStep = (id: string, field: keyof ClassworkStep, value: any) => {
    setClassworkSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeClassworkStep = (id: string) => {
    setClassworkSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const moveClassworkStep = (index: number, dir: -1 | 1) => {
    setClassworkSteps((prev) => {
      const arr = [...prev];
      const next = index + dir;
      if (next < 0 || next >= arr.length) return arr;
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  const addResourceLink = () => {
    if (!newResource.url.trim()) return;
    setForm((prev) => ({
      ...prev,
      resources: [...(prev.resources || []), newResource.url.trim()],
    }));
    setNewResource({ title: '', url: '' });
  };

  const removeResource = (i: number) => {
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).filter((_, idx) => idx !== i),
    }));
  };

  const totalClassworkMinutes = useMemo(
    () => classworkSteps.reduce((sum, s) => sum + (s.duration || 0), 0),
    [classworkSteps]
  );

  const handleGoLive = async () => {
    if (!lessonId) {
      saveLessonMutation.mutate(form, {
        onSuccess: () => {
          toast.message('Lesson saved. Now going live...');
        },
      });
      return;
    }
    setIsGoingLive(true);
    try {
      await startBroadcastMutation.mutateAsync();
    } finally {
      setIsGoingLive(false);
    }
  };

  const handleEndBroadcast = () => {
    if (!window.confirm('End the live broadcast now?')) return;
    endBroadcastMutation.mutate();
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent side="right" className="flex flex-col h-full">
        <DrawerHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="pr-8">
              <DrawerTitle className="text-xl flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                {lesson ? 'Edit Lesson Studio' : 'New Lesson Studio'}
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                Plan objectives, classwork timeline, resources, assessment, homework, and go live.
              </DrawerDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ls-title">Lesson Title</Label>
              <Input
                id="ls-title"
                placeholder="e.g., Fractions on the number line"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={form.subject_id ? String(form.subject_id) : ''}
                onValueChange={(v) =>
                  setForm({ ...form, subject_id: v ? Number(v) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <DatePicker
                date={form.date ? new Date(form.date) : undefined}
                setDate={(d) =>
                  setForm({ ...form, date: d ? format(d, 'yyyy-MM-dd') : form.date })
                }
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="ls-description">Lesson Summary</Label>
            <Textarea
              id="ls-description"
              placeholder="Summarize today's coverage"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-6">
          <Accordion type="multiple" defaultValue={['objectives']} className="w-full">
            <AccordionItem value="objectives">
              <AccordionTrigger className="gap-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                    <Target className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <div className="font-semibold">Objectives</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {objectives.length} learning outcome{objectives.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {objectives.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No objectives yet. Add measurable learning outcomes below.
                    </p>
                  )}
                  {objectives.map((obj, i) => (
                    <div key={obj.id} className="flex items-start gap-2">
                      <div className="pt-2.5">
                        <GripVertical className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="h-6 shrink-0">
                            {i + 1}
                          </Badge>
                          <Input
                            placeholder="By the end of this lesson, students will be able to..."
                            value={obj.text}
                            onChange={(e) => updateObjective(obj.id, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeObjective(obj.id)}
                            className="shrink-0 text-slate-500 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addObjective}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Objective
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="classwork">
              <AccordionTrigger className="gap-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <div className="font-semibold">Classwork Timeline</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {classworkSteps.length} step{classworkSteps.length === 1 ? '' : 's'} · {totalClassworkMinutes} min
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {classworkSteps.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Build the flow of the lesson with timed activities.
                    </p>
                  )}
                  {classworkSteps.map((step, i) => (
                    <div key={step.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="h-4 w-4 text-slate-400 shrink-0" />
                        <Badge variant="secondary" className="shrink-0">
                          Step {i + 1}
                        </Badge>
                        <Input
                          placeholder="Activity title"
                          value={step.title}
                          onChange={(e) =>
                            updateClassworkStep(step.id, 'title', e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <Input
                            type="number"
                            min={1}
                            value={step.duration}
                            onChange={(e) =>
                              updateClassworkStep(step.id, 'duration', Number(e.target.value))
                            }
                            className="h-8 w-16 text-sm px-2"
                          />
                          <span className="text-xs text-slate-500">min</span>
                        </div>
                        <div className="flex shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveClassworkStep(i, -1)}
                            disabled={i === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveClassworkStep(i, 1)}
                            disabled={i === classworkSteps.length - 1}
                          >
                            <ChevronUp className="h-4 w-4 rotate-180" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-red-500 shrink-0"
                          onClick={() => removeClassworkStep(step.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Describe what learners do during this step..."
                        value={step.description}
                        onChange={(e) =>
                          updateClassworkStep(step.id, 'description', e.target.value)
                        }
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addClassworkStep}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Timeline Step
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="resources">
              <AccordionTrigger className="gap-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
                    <Paperclip className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <div className="font-semibold">Resources & Attachments</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {((form.resources?.length) || 0) + (liveStats?.attachment_count || 0)} item
                      {(((form.resources?.length) || 0) + (liveStats?.attachment_count || 0)) === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <Upload
                    accept="application/pdf,image/*,video/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    multiple
                    showPreview
                    maxSize={25 * 1024 * 1024}
                    onFileSelect={(files) => {
                      if (!files || files.length === 0) return;
                      if (!lessonId) {
                        toast.warning('Save the lesson first before uploading files');
                        return;
                      }
                      Array.from(files).forEach((f) => uploadAttachmentMutation.mutate(f));
                    }}
                  />
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm">Quick Link</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="https://..."
                        value={newResource.url}
                        onChange={(e) =>
                          setNewResource((p) => ({ ...p, url: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResourceLink())}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addResourceLink}
                        disabled={!newResource.url.trim()}
                      >
                        <Link className="h-4 w-4 mr-1.5" />
                        Attach Link
                      </Button>
                    </div>
                  </div>
                  {(form.resources?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Saved Links</Label>
                      {form.resources!.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                        >
                          <a
                            href={r}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:underline min-w-0 flex-1"
                          >
                            <Link className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{r}</span>
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-slate-500 hover:text-red-500"
                            onClick={() => removeResource(i)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="assessment">
              <AccordionTrigger className="gap-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <div className="font-semibold">Assessment</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {assessment.type} · {assessment.pass_mark}% pass mark
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Assessment Type</Label>
                      <Select
                        value={assessment.type}
                        onValueChange={(v) => setAssessment({ ...assessment, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formative">Formative (in-class)</SelectItem>
                          <SelectItem value="summative">Summative quiz/test</SelectItem>
                          <SelectItem value="observational">Observational checklist</SelectItem>
                          <SelectItem value="peer">Peer assessment</SelectItem>
                          <SelectItem value="exit-ticket">Exit ticket</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pass Mark (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={assessment.pass_mark ?? 50}
                        onChange={(e) =>
                          setAssessment({ ...assessment, pass_mark: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Questions / Tasks / Rubric</Label>
                    <Textarea
                      placeholder="List assessment questions, tasks, or rubric criteria..."
                      value={assessment.content}
                      onChange={(e) =>
                        setAssessment({ ...assessment, content: e.target.value })
                      }
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="homework">
              <AccordionTrigger className="gap-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300">
                    <Home className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <div className="font-semibold">Homework</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {homework.content ? 'Set' : 'Not set'}
                      {homework.due_date && ` · Due ${homework.due_date}`}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Task / Follow-up</Label>
                    <Textarea
                      placeholder="Take-home exercise, reading, or revision task..."
                      value={homework.content}
                      onChange={(e) => setHomework({ ...homework, content: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <DatePicker
                      date={dueDatePicker}
                      setDate={(d) => {
                        setDueDatePicker(d ?? undefined);
                        setHomework({
                          ...homework,
                          due_date: d ? format(d, 'yyyy-MM-dd') : null,
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="broadcast">
              <AccordionTrigger className="gap-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    isLive
                      ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 animate-pulse"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}>
                    <Radio className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <div className="font-semibold flex items-center gap-2">
                      Broadcast
                      {isLive && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                          </span>
                          LIVE 🔴
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {isLive
                        ? `${viewerCount} viewer${viewerCount === 1 ? '' : 's'} · Peak ${peakViewers}`
                        : broadcastStatus
                          ? `${broadcastStatus}`
                          : 'Not streaming'}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Tabs value={broadcastTab} onValueChange={(v) => setBroadcastTab(v as any)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="status" className="flex-1">
                      <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                      Status
                    </TabsTrigger>
                    <TabsTrigger value="qa" className="flex-1">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Q&A {comments.filter((c) => !c.is_approved && !c.is_deleted).length > 0 && (
                        <Badge variant="destructive" className="ml-1.5 h-4 px-1.5 text-[10px]">
                          {comments.filter((c) => !c.is_approved && !c.is_deleted).length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="flex-1">
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Quick Actions
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="status" className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className={cn(
                        "relative overflow-hidden",
                        isLive && "ring-2 ring-red-500 dark:ring-red-600"
                      )}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Broadcast</p>
                              <p className="mt-1 text-2xl font-bold flex items-center gap-2">
                                {isLive ? 'ON AIR' : broadcast ? broadcastStatus : 'Offline'}
                              </p>
                            </div>
                            {isLive ? (
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={handleEndBroadcast}
                                disabled={endBroadcastMutation.isPending}
                              >
                                <Square className="h-4 w-4 mr-1.5" />
                                {endBroadcastMutation.isPending ? 'Ending...' : 'End'}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="destructive"
                                size="lg"
                                onClick={handleGoLive}
                                disabled={isGoingLive || startBroadcastMutation.isPending}
                                className={cn(
                                  "gap-2 font-bold",
                                  !isGoingLive && !startBroadcastMutation.isPending &&
                                    "animate-pulse hover:animate-none"
                                )}
                              >
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                </span>
                                🔴 GO LIVE
                              </Button>
                            )}
                          </div>

                          {!lessonId && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                              ⚠️ Lesson must be saved first. GO LIVE will auto-save.
                            </p>
                          )}

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-2">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                                <Eye className="h-3 w-3" /> Now
                              </div>
                              <div className="text-lg font-bold mt-0.5">{viewerCount}</div>
                            </div>
                            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-2">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                                <Users className="h-3 w-3" /> Peak
                              </div>
                              <div className="text-lg font-bold mt-0.5">{peakViewers}</div>
                            </div>
                            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-2">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                                <ThumbsUp className="h-3 w-3" /> Ack
                              </div>
                              <div className="text-lg font-bold mt-0.5">
                                {liveStats?.acknowledgement_count ?? 0}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <BarChart2 className="h-4 w-4 text-indigo-600" />
                              Viewer Sparkline
                            </p>
                            <Badge variant="outline" className="text-[10px]">
                              {viewerHistory.length} pts
                            </Badge>
                          </div>
                          <div className="h-40 w-full">
                            {viewerHistory.length > 1 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={viewerHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="vwGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
                                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} />
                                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} allowDecimals={false} />
                                  <Tooltip
                                    contentStyle={{
                                      borderRadius: 8,
                                      border: '1px solid #e2e8f0',
                                      fontSize: 12,
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="viewers"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    fill="url(#vwGrad)"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
                                Go live to collect viewer metrics
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {liveStats && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                            <div>
                              <div className="text-xs text-muted-foreground">Comments</div>
                              <div className="text-xl font-bold mt-1">{liveStats.comment_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Attachments</div>
                              <div className="text-xl font-bold mt-1">{liveStats.attachment_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Total Views</div>
                              <div className="text-xl font-bold mt-1">{liveStats.viewer_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Duration</div>
                              <div className="text-xl font-bold mt-1">
                                {liveStats.duration_seconds
                                  ? `${Math.floor(liveStats.duration_seconds / 60)}m${liveStats.duration_seconds % 60}s`
                                  : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Status</div>
                              <div className="text-sm font-bold mt-2">
                                <Badge variant={isLive ? 'destructive' : 'outline'}>
                                  {liveStats.broadcast_status || 'idle'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="qa" className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-indigo-600" />
                        <Label>Post Announcement / Pin a Slide Note</Label>
                      </div>
                      <div className="p-3 flex flex-col sm:flex-row gap-2">
                        <Textarea
                          placeholder="Type a pinned message for the class..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[60px] flex-1"
                          disabled={!lessonId}
                        />
                        <Button
                          type="button"
                          onClick={() => postCommentMutation.mutate(newComment)}
                          disabled={!lessonId || !newComment.trim() || postCommentMutation.isPending}
                          className="sm:self-end"
                        >
                          <Send className="h-4 w-4 mr-1.5" />
                          Post
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Moderated Questions / Comments</Label>
                        <span className="text-xs text-muted-foreground">
                          {comments.filter((c) => !c.is_deleted).length} total
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {comments.filter((c) => !c.is_deleted).length === 0 ? (
                          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground italic">
                            No comments yet. Questions from learners appear here for moderation.
                          </div>
                        ) : (
                          comments
                            .filter((c) => !c.is_deleted)
                            .map((c) => (
                              <div
                                key={c.id}
                                className={cn(
                                  "rounded-xl border p-3 transition-all",
                                  c.is_approved
                                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                                    : "border-amber-200 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-950/20"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={c.author_avatar} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(c.author_name || 'S')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold">
                                        {c.author_name || 'Student'}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                        {c.author_role || 'learner'}
                                      </Badge>
                                      {c.is_approved ? (
                                        <Badge variant="success" className="text-[10px] h-4 px-1.5 flex items-center gap-0.5">
                                          <Check className="h-2.5 w-2.5" /> Approved
                                        </Badge>
                                      ) : (
                                        <Badge variant="warning" className="text-[10px] h-4 px-1.5">
                                          Pending
                                        </Badge>
                                      )}
                                      <span className="text-[10px] text-muted-foreground ml-auto">
                                        {c.created_at ? format(new Date(c.created_at), 'p') : ''}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                                      {c.content}
                                    </p>
                                    <div className="mt-2 flex gap-2 justify-end">
                                      {!c.is_approved && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                          onClick={() => approveCommentMutation.mutate(c.id)}
                                          disabled={approveCommentMutation.isPending}
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          Approve
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                                        onClick={() =>
                                          window.confirm('Soft-delete this comment?') &&
                                          deleteCommentMutation.mutate(c.id)
                                        }
                                        disabled={deleteCommentMutation.isPending}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="actions" className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button type="button" variant="outline" className="h-auto flex-col p-4 gap-2" disabled={!lessonId || !isLive}>
                        <FileText className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-sm">Post Slide</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Share a slide/whiteboard snapshot
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto flex-col p-4 gap-2"
                        disabled={!lessonId}
                        onClick={() => {
                          if (!lessonId) return;
                          const fileInput = document.createElement('input');
                          fileInput.type = 'file';
                          fileInput.accept = '*';
                          fileInput.onchange = (ev) => {
                            const f = (ev.target as HTMLInputElement).files?.[0];
                            if (f) uploadAttachmentMutation.mutate(f);
                          };
                          fileInput.click();
                        }}
                      >
                        <Paperclip className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-sm">Attachment</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Drop file to class instantly
                        </span>
                      </Button>
                      <Button type="button" variant="outline" className="h-auto flex-col p-4 gap-2" disabled={!lessonId || !isLive}>
                        <BarChart2 className="h-5 w-5 text-violet-600" />
                        <span className="font-semibold text-sm">Launch Poll</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Quick multiple-choice check
                        </span>
                      </Button>
                    </div>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Radio className="h-4 w-4 text-red-500" />
                            WebSocket Heartbeat
                          </p>
                          <Badge variant={isLive ? 'success' : 'outline'} className="text-[10px]">
                            {isLive ? 'Connected & Heartbeating' : lessonId ? 'Ready (starts on LIVE)' : 'Save lesson first'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          connectWebSocket loop fires viewer_heartbeat every 15s and syncs active_viewers via
                          lesson_viewers_updated. HTTP polling (5s) runs as phase-1 fallback until socket layer
                          is fully propagated.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-2">
                            <div className="text-[10px] text-muted-foreground">Socket Namespace</div>
                            <div className="text-xs font-mono font-bold mt-0.5">{LESSONS_NAMESPACE}</div>
                          </div>
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-2">
                            <div className="text-[10px] text-muted-foreground">Heartbeat</div>
                            <div className="text-xs font-bold mt-0.5">15 000 ms</div>
                          </div>
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-2">
                            <div className="text-[10px] text-muted-foreground">HTTP Poll</div>
                            <div className="text-xs font-bold mt-0.5">5 000 ms</div>
                          </div>
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-2">
                            <div className="text-[10px] text-muted-foreground">Room</div>
                            <div className="text-xs font-mono font-bold mt-0.5">
                              {lessonId ? `lesson_${lessonId}` : '—'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>

        <DrawerFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleSave()}
            disabled={saveLessonMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saveLessonMutation.isPending ? 'Saving...' : lesson ? 'Update Lesson' : 'Save Lesson'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
