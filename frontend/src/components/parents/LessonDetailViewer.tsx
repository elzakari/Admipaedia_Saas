import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Heart,
  Home as HomeIcon,
  MessageSquare,
  MessageCircle,
  Paperclip,
  Send,
  Share2,
  X,
  Link,
  Upload as UploadIcon,
  FileUp,
  Award,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Upload } from "../ui/upload";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "../ui/drawer";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn, formatDate, formatDateTime, getInitials } from "../../lib/utils";
import { useToast } from "../ui/use-toast";
import { toast as sonnerToast } from "sonner";
import classService, { HomeworkSubmission, HomeworkSubmissionType } from "../../services/classService";
import type {
  Lesson,
  LessonComment,
  LessonResource,
  LessonAcknowledgement,
  HomeworkStatus,
} from "./DailyLessonsTab";

export interface LessonDetailViewerHandle {
  open: (lesson: Lesson) => void;
  close: () => void;
}

interface LessonDetailViewerProps {
  viewerRole: "parent" | "student";
  onAcknowledge?: (lessonId: string, role: "parent" | "student") => void;
}

type ReactionType = "thumbsup" | "happy" | "question" | "thinking";

const REACTIONS: Record<ReactionType, { emoji: string; label: string; icon: string }> = {
  thumbsup: { emoji: "👍", label: "Helpful", icon: "thumbsup" },
  happy: { emoji: "😀", label: "Great!", icon: "happy" },
  question: { emoji: "❓", label: "Question", icon: "question" },
  thinking: { emoji: "🤔", label: "Thinking", icon: "thinking" },
};

const REACTION_LIST: ReactionType[] = ["thumbsup", "happy", "question", "thinking"];

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "bg-blue-500",
  English: "bg-purple-500",
  Science: "bg-green-500",
  "Social Studies": "bg-amber-500",
  "Creative Arts": "bg-pink-500",
  ICT: "bg-cyan-500",
  "Physical Education": "bg-orange-500",
  French: "bg-rose-500",
  "Religious Education": "bg-indigo-500",
  General: "bg-slate-500",
};

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.General;
}

const LessonDetailViewer = forwardRef<
  LessonDetailViewerHandle,
  LessonDetailViewerProps
>(({ viewerRole, onAcknowledge }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<LessonAcknowledgement[]>([]);
  const [liveViewerCount, setLiveViewerCount] = useState<number>(0);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const [homeworkDrawerOpen, setHomeworkDrawerOpen] = useState(false);
  const [hwSubmissionType, setHwSubmissionType] = useState<HomeworkSubmissionType>('text');
  const [hwTextContent, setHwTextContent] = useState('');
  const [hwLinkUrl, setHwLinkUrl] = useState('');
  const [hwFile, setHwFile] = useState<File | null>(null);
  const [hwSubmissions, setHwSubmissions] = useState<HomeworkSubmission[]>([]);
  const [viewedHwStatus, setViewedHwStatus] = useState<HomeworkStatus | undefined>(undefined);
  const [viewedHwGrade, setViewedHwGrade] = useState<number | undefined>(undefined);
  const [viewedHwFeedback, setViewedHwFeedback] = useState<string | undefined>(undefined);
  const [viewedHwSubmittedAt, setViewedHwSubmittedAt] = useState<string | undefined>(undefined);
  const [viewedHwGradedAt, setViewedHwGradedAt] = useState<string | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    open: (lesson: Lesson) => {
      setCurrentLesson(lesson);
      setComments(lesson.comments || []);
      setAcknowledgements(lesson.acknowledgements || []);
      setLiveViewerCount(lesson.liveViewerCount || 0);
      setViewedHwStatus(lesson.homeworkStatus as HomeworkStatus | undefined);
      setViewedHwGrade(lesson.homeworkGrade);
      setViewedHwFeedback(lesson.homeworkFeedback);
      setViewedHwSubmittedAt(lesson.homeworkSubmittedAt);
      setViewedHwGradedAt(lesson.homeworkGradedAt);
      setHwTextContent('');
      setHwLinkUrl('');
      setHwFile(null);
      setHwSubmissionType('text');
      setHwSubmissions([]);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setCurrentLesson(null);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    },
  }));

  useEffect(() => {
    if (isOpen && currentLesson?.isLive) {
      heartbeatIntervalRef.current = setInterval(() => {
        setHeartbeatActive(true);
        setLiveViewerCount((prev) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          return Math.max(1, prev + delta);
        });
        setTimeout(() => setHeartbeatActive(false), 400);
      }, 5000);
    } else {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isOpen, currentLesson?.isLive]);

  const hasAcknowledged = useMemo(() => {
    return acknowledgements.some((a) => a.role === viewerRole);
  }, [acknowledgements, viewerRole]);

  const handleAcknowledge = useCallback(async () => {
    if (!currentLesson || hasAcknowledged || isAcknowledging) return;
    setIsAcknowledging(true);
    try {
      const newAck: LessonAcknowledgement = {
        id: `ack-${Date.now()}`,
        userId: "current-user",
        userName: viewerRole === "parent" ? "Parent" : "Student",
        role: viewerRole,
        timestamp: new Date().toISOString(),
      };
      setAcknowledgements((prev) => [...prev, newAck]);
      onAcknowledge?.(currentLesson.id, viewerRole);
      toast({
        title: viewerRole === "parent" ? "Acknowledged" : "Marked as reviewed",
        description:
          viewerRole === "parent"
            ? "You have confirmed your child reviewed this lesson."
            : "You have marked this lesson as reviewed.",
        variant: "default",
      });
    } finally {
      setTimeout(() => setIsAcknowledging(false), 500);
    }
  }, [currentLesson, hasAcknowledged, isAcknowledging, onAcknowledge, toast, viewerRole]);

  const handleSendComment = useCallback(() => {
    if (!currentLesson || !commentText.trim()) return;
    const newComment: LessonComment = {
      id: `comment-${Date.now()}`,
      userId: "current-user",
      userName: viewerRole === "parent" ? "Parent" : "Student",
      userRole: viewerRole,
      content: commentText.trim(),
      timestamp: new Date().toISOString(),
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
    toast({
      title: "Comment posted",
      description: "Your comment has been posted successfully.",
      variant: "default",
    });
  }, [commentText, currentLesson, toast, viewerRole]);

  const handleReact = useCallback(
    (reaction: ReactionType) => {
      if (!currentLesson) return;
      const newComment: LessonComment = {
        id: `reaction-${Date.now()}`,
        userId: "current-user",
        userName: viewerRole === "parent" ? "Parent" : "Student",
        userRole: viewerRole,
        content: "",
        reaction,
        timestamp: new Date().toISOString(),
      };
      setComments((prev) => [newComment, ...prev]);
    },
    [currentLesson, viewerRole]
  );

  const handleDownloadPDF = useCallback(() => {
    if (!currentLesson) return;
    toast({
      title: "Generating PDF",
      description: "Preparing your PDF download...",
      variant: "default",
    });
  }, [currentLesson, toast]);

  const handleShareWhatsApp = useCallback(() => {
    if (!currentLesson) return;
    const text = encodeURIComponent(
      `📚 *${currentLesson.title}\n\nSubject: ${currentLesson.subject}\nDate: ${formatDate(currentLesson.date)}\n\n${currentLesson.description || ""}\n\n${currentLesson.homework ? `🏠 Homework:\n${currentLesson.homework}` : ""}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    toast({
      title: "Opening WhatsApp",
      description: "Share window opened.",
      variant: "default",
    });
  }, [currentLesson, toast]);

  const numericLessonId = currentLesson?.id ? Number(currentLesson.id) : 0;

  const { refetch: refetchHomework } = useQuery({
    queryKey: ["lesson-homework", numericLessonId],
    queryFn: async () => {
      if (!numericLessonId) return null;
      const result = await classService.getHomeworkForLesson(numericLessonId);
      return result.data || null;
    },
    enabled: !!numericLessonId && homeworkDrawerOpen,
    refetchInterval: (data: any) => {
      if (data && Array.isArray(data) && data.length > 0 && (data[0] as any).status === 'submitted') {
        return 5000;
      }
      return false;
    },
    onSuccess: (data: any) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const submissions = data as HomeworkSubmission[];
        setHwSubmissions(submissions);
        const sub = submissions[0];
        setViewedHwStatus(((sub.status as any) || 'submitted') as HomeworkStatus);
        if ((sub as any).grade !== undefined && (sub as any).grade !== null) setViewedHwGrade(Number((sub as any).grade));
        if ((sub as any).feedback) setViewedHwFeedback(String((sub as any).feedback));
        if ((sub as any).submitted_at) setViewedHwSubmittedAt(String((sub as any).submitted_at));
        if ((sub as any).graded_at) setViewedHwGradedAt(String((sub as any).graded_at));
      }
    },
  } as any);

  const submitHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (!numericLessonId) throw new Error("No lesson selected");
      const payload: any = { submission_type: hwSubmissionType };
      if (hwSubmissionType === 'text') {
        if (!hwTextContent.trim()) throw new Error("Please enter homework text");
        payload.content = hwTextContent.trim();
      } else if (hwSubmissionType === 'link') {
        if (!hwLinkUrl.trim()) throw new Error("Please enter a link URL");
        payload.link_url = hwLinkUrl.trim();
      } else if (hwSubmissionType === 'file') {
        if (!hwFile) throw new Error("Please select a file");
        payload.file = hwFile;
      }
      return classService.submitHomework(numericLessonId, payload);
    },
    onMutate: () => {
      sonnerToast.loading("Submitting homework...", { id: 'hw-submit' });
    },
    onSuccess: () => {
      sonnerToast.success("Homework submitted!", { id: 'hw-submit', description: 'Waiting for teacher to grade.' });
      setViewedHwStatus('submitted');
      setViewedHwSubmittedAt(new Date().toISOString());
      setHomeworkDrawerOpen(false);
      setHwTextContent('');
      setHwLinkUrl('');
      setHwFile(null);
      refetchHomework();
    },
    onError: (err) => {
      sonnerToast.error("Failed to submit", { id: 'hw-submit', description: err?.message || 'Unknown error' });
    },
  });

  const canSubmitHomework = useMemo(() => {
    if (!currentLesson?.homework) return false;
    if (viewedHwStatus === 'submitted' || viewedHwStatus === 'graded') return false;
    return viewerRole === 'student' || viewerRole === 'parent';
  }, [currentLesson, viewedHwStatus, viewerRole]);

  const getHomeworkStatusVariant = (status?: HomeworkStatus) => {
    switch (status) {
      case 'graded': return 'default';
      case 'submitted': return 'secondary';
      case 'overdue': return 'destructive';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getHomeworkStatusText = (status?: HomeworkStatus) => {
    switch (status) {
      case 'graded': return 'Graded';
      case 'submitted': return 'Submitted';
      case 'overdue': return 'Overdue';
      case 'pending': return 'Pending';
      case 'not-set': return 'Not Assigned';
      default: return 'Not Started';
    }
  };

  const renderSection = (
    icon: React.ReactNode,
    title: string,
    content?: string,
    accentClass: string = "bg-slate-50 dark:bg-slate-800/50"
  ) => {
    if (!content) return null;
    return (
      <div className={cn("rounded-xl p-5", accentClass)}>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {title}
          </h4>
        </div>
        <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {content}
        </div>
      </div>
    );
  };

  const renderResourceIcon = (type: LessonResource["type"]) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "video":
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case "document":
        return <ClipboardList className="h-4 w-4 text-blue-500" />;
      default:
        return <Paperclip className="h-4 w-4 text-slate-500" />;
    }
  };

  if (!currentLesson) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (ref && typeof ref !== "function") {
          ref.current?.close();
        }
      }
      setIsOpen(open);
    }}>
      <DialogContent className="!max-w-[98vw] !w-[98vw] !h-[96vh] !p-0 !rounded-2xl overflow-hidden !gap-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">{currentLesson.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Lesson details for {currentLesson.subject} on {formatDate(currentLesson.date)}
        </DialogDescription>
        <div className="flex flex-col h-full bg-background text-foreground">
          {currentLesson.isLive && (
            <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span
                    className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75",
                      heartbeatActive && "animate-pulse"
                    )}
                  />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white" />
                </span>
                <span className="font-bold tracking-wide">
                  LIVE 🔴 BROADCAST IN PROGRESS
                </span>
                <Separator orientation="vertical" className="h-5 bg-white/30" />
                <div className="flex items-center gap-2 text-sm text-rose-100">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium tabular-nums">
                    {liveViewerCount}
                  </span>
                  <span>watching now</span>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-white/10 text-white border-0 gap-1"
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5",
                    heartbeatActive && "scale-125 transition-transform duration-300"
                  )}
                />
                Live
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="hidden sm:flex items-start gap-3 flex-shrink-0">
                <Avatar className="h-12 w-12 border-2 border-slate-100 dark:border-slate-800">
                  {currentLesson.teacherAvatar ? (
                    <AvatarImage
                      src={currentLesson.teacherAvatar}
                      alt={currentLesson.teacherName || "Teacher"}
                    />
                  ) : null}
                  <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
                    {currentLesson.teacherName
                      ? getInitials(currentLesson.teacherName)
                      : "T"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full flex-shrink-0",
                      getSubjectColor(currentLesson.subject)
                    )}
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    {currentLesson.subject}
                  </span>
                  {currentLesson.className && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0">
                      {currentLesson.className}
                    </Badge>
                  )}
                  {currentLesson.childWasAbsent && (
                    <Badge variant="warning" className="gap-1 text-[10px] px-2 py-0">
                      <AlertTriangle className="h-3 w-3" />
                      Catch-up
                    </Badge>
                  )}
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 flex-shrink-0" />
                  {currentLesson.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  {currentLesson.teacherName && (
                    <span className="inline-flex items-center gap-1">
                      👤 {currentLesson.teacherName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    📅 {formatDate(currentLesson.date, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {(currentLesson.startTime || currentLesson.endTime) && (
                    <span className="inline-flex items-center gap-1">
                      ⏰ {currentLesson.startTime}
                      {currentLesson.endTime
                        ? ` – ${currentLesson.endTime}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareWhatsApp}
                      className="gap-1 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 hover:text-green-800"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share via WhatsApp</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="gap-1"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download as PDF</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (ref && typeof ref !== "function") {
                    ref.current?.close();
                  }
                }}
                className="ml-1"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 min-w-0 border-r border-slate-200 dark:border-slate-800">
              <div className="max-w-3xl mx-auto space-y-5">
                {currentLesson.description && (
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900 p-5 border border-indigo-100 dark:border-indigo-900/30">
                  <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentLesson.description}
                  </p>
                </div>
                )}

                {renderSection(
                  <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
                  "🎯 Learning Objectives",
                  currentLesson.objectives
                )}

                {renderSection(
                  <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
                  "📝 Classwork & Activities",
                  currentLesson.classwork,
                  "bg-blue-50 dark:bg-blue-950/20"
                )}

                {Array.isArray(currentLesson.resources) &&
                  currentLesson.resources.length > 0 && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Paperclip className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          📎 Learning Resources
                        </h4>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {currentLesson.resources.length} file
                          {currentLesson.resources.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {currentLesson.resources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all group"
                          >
                            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                              {renderResourceIcon(resource.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                {resource.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                {resource.type}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                {renderSection(
                  <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
                  "📊 Assessment & Evaluation",
                  currentLesson.assessment,
                  "bg-purple-50 dark:bg-purple-950/20"
                )}

                {currentLesson.homework && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-5 border border-amber-100 dark:border-amber-900/30 space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <HomeIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          🏠 Homework / Practice
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {viewedHwStatus && (
                          <Badge variant={getHomeworkStatusVariant(viewedHwStatus) as any} className="text-[10px] gap-1">
                            {viewedHwStatus === 'graded' && <Award className="h-3 w-3" />}
                            {viewedHwStatus === 'submitted' && <Send className="h-3 w-3" />}
                            {viewedHwStatus === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                            {getHomeworkStatusText(viewedHwStatus)}
                          </Badge>
                        )}
                        {currentLesson.homeworkDueDate && (
                          <Badge variant="warning" className="text-[10px]">
                            Due:{" "}
                            {formatDate(currentLesson.homeworkDueDate, {
                              month: "short",
                              day: "numeric",
                            })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-200 leading-relaxed bg-white/60 dark:bg-slate-900/40 rounded-lg p-4">
                      {currentLesson.homework}
                    </div>

                    {viewedHwStatus === 'graded' && viewedHwGrade !== undefined && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <h5 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                              Teacher Feedback
                            </h5>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
                              {viewedHwGrade}%
                            </div>
                            {viewedHwGradedAt && (
                              <div className="text-[10px] text-emerald-600/70 dark:text-emerald-300/70 mt-0.5">
                                Graded {formatDate(viewedHwGradedAt, { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                        {viewedHwFeedback && (
                          <>
                            <Separator className="bg-emerald-200/60 dark:bg-emerald-800/60" />
                            <div className="text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                              {viewedHwFeedback}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {viewedHwStatus === 'submitted' && viewedHwGrade === undefined && (
                      <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-sky-200/50 dark:bg-sky-800/50 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                              Submitted successfully
                            </div>
                            {viewedHwSubmittedAt && (
                              <div className="text-xs text-sky-700/70 dark:text-sky-300/70 mt-0.5">
                                {formatDateTime(viewedHwSubmittedAt)} • Waiting for teacher review
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {canSubmitHomework && (
                      <div className="flex items-center gap-3 pt-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm"
                          onClick={() => setHomeworkDrawerOpen(true)}
                        >
                          <FileUp className="h-4 w-4" />
                          Submit Homework
                        </Button>
                        <span className="text-xs text-amber-800/70 dark:text-amber-200/70">
                          Submit text, a link, or a file attachment
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {currentLesson.notes && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-5 border border-rose-100 dark:border-rose-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        💬 {viewerRole === "parent"
                          ? "Parent Support Notes"
                          : "Teacher Notes"}
                      </h4>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-rose-900 dark:text-rose-200 leading-relaxed">
                      {currentLesson.notes}
                    </div>
                  </div>
                )}

                <div className="pt-6 pb-4">
                  <Button
                    size="lg"
                    variant={hasAcknowledged ? "secondary" : "default"}
                    disabled={hasAcknowledged || isAcknowledging}
                    onClick={handleAcknowledge}
                    className="w-full gap-2 text-base py-6"
                  >
                    {hasAcknowledged ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        {viewerRole === "parent"
                          ? "Child review confirmed"
                          : "Marked as reviewed"}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        {viewerRole === "parent"
                          ? "Confirm my child reviewed this lesson"
                          : "Mark reviewed for myself"}
                      </>
                    )}
                  </Button>
                  {hasAcknowledged && acknowledgements.length > 0 && (
                    <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                      {acknowledgements.length} person
                      {acknowledgements.length !== 1 ? "s" : ""} have
                      marked this as reviewed
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 lg:w-96 flex flex-col border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0 min-h-0">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-indigo-500" />
                  Discussion
                </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {comments.length}
                  </Badge>
                </div>

                <div className="flex items-center justify-center gap-1">
                  {REACTION_LIST.map((reactionType) => {
                  const r = REACTIONS[reactionType];
                  return (
                    <TooltipProvider key={reactionType}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleReact(reactionType)}
                            className="h-9 w-9 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
                            aria-label={r.label}
                          >
                            {r.emoji}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{r.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
                </div>
              </div>

              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={
                      viewerRole === "parent"
                        ? "Ask the teacher a question..."
                        : "Ask a question or share your thoughts..."
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                    className="min-h-[60px] resize-none text-sm"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleSendComment}
                    disabled={!commentText.trim()}
                    className="gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
                {comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <MessageCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      No comments yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      Be the first to react or ask a question
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback
                            className={cn(
                              "text-xs font-semibold",
                              comment.userRole === "teacher"
                                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                                : comment.userRole === "parent"
                                ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                                : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                            )}
                          >
                            {getInitials(comment.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {comment.userName}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 capitalize"
                            >
                              {comment.userRole}
                            </Badge>
                            <span className="text-[10px] text-slate-400 ml-auto">
                              {formatDateTime(comment.timestamp, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {comment.reaction ? (
                            <div className="mt-1 p-2 rounded-lg bg-white dark:bg-slate-800 text-2xl inline-block">
                              {REACTIONS[comment.reaction].emoji}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 break-words">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {acknowledgements.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    ✓ Review Acknowledgements ({acknowledgements.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {acknowledgements.map((ack) => (
                      <Badge
                        key={ack.id}
                        variant="success"
                        className="text-[10px] gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {ack.userName} ({ack.role})
                    </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Drawer open={homeworkDrawerOpen} onOpenChange={setHomeworkDrawerOpen}>
      <DrawerContent className="h-[88vh] max-h-[88vh] flex flex-col">
        <DrawerHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <DrawerTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Submit Homework
              </DrawerTitle>
              <DrawerDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {currentLesson?.title}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              Submission Type
            </Label>
            <RadioGroup
              value={hwSubmissionType}
              onValueChange={(v) => setHwSubmissionType(v as HomeworkSubmissionType)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="text"
                  id="hw-type-text"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="hw-type-text"
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/70 cursor-pointer transition-all peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 dark:peer-data-[state=checked]:bg-amber-950/30 peer-data-[state=checked]:shadow-sm"
                >
                  <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Text</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">Type your answer</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="link"
                  id="hw-type-link"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="hw-type-link"
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/70 cursor-pointer transition-all peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 dark:peer-data-[state=checked]:bg-amber-950/30 peer-data-[state=checked]:shadow-sm"
                >
                  <Link className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Link</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">Google Docs etc.</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="file"
                  id="hw-type-file"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="hw-type-file"
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/70 cursor-pointer transition-all peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 dark:peer-data-[state=checked]:bg-amber-950/30 peer-data-[state=checked]:shadow-sm"
                >
                  <UploadIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">File</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">PDF, images, zip</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator className="bg-slate-200 dark:bg-slate-800" />

          {hwSubmissionType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="hw-text" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Your Answer <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="hw-text"
                value={hwTextContent}
                onChange={(e) => setHwTextContent(e.target.value)}
                placeholder="Write your homework answer here..."
                className="min-h-[200px] resize-y bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-400 dark:focus:border-amber-600 text-slate-800 dark:text-slate-200"
              />
              <div className="flex justify-end">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {hwTextContent.length} characters
                </span>
              </div>
            </div>
          )}

          {hwSubmissionType === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="hw-link" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Link URL <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="hw-link"
                  type="url"
                  value={hwLinkUrl}
                  onChange={(e) => setHwLinkUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-400 dark:focus:border-amber-600 text-slate-800 dark:text-slate-200"
                />
              </div>
              {hwLinkUrl && (
                <a
                  href={hwLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open link
                </a>
              )}
            </div>
          )}

          {hwSubmissionType === 'file' && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Upload File <span className="text-rose-500">*</span>
              </Label>
              <Upload
                onFileSelect={(files: FileList | null) => {
                  if (files && files.length > 0) setHwFile(files.item(0) || files[0]);
                }}
                accept="application/pdf,image/*,video/*,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                maxSize={25 * 1024 * 1024}
                multiple={false}
                className="min-h-[140px] border-dashed"
              />
              {hwFile && (
                <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-amber-200 dark:border-amber-800 flex-shrink-0">
                      <Paperclip className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {hwFile.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {(hwFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHwFile(null)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentLesson?.homework && (
            <Card className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <CardHeader className="px-4 py-3 pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <HomeIcon className="h-3.5 w-3.5 text-amber-600" />
                  Homework Task (Reference)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1">
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {currentLesson.homework}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DrawerFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 pt-4 pb-5 flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setHomeworkDrawerOpen(false)}
            disabled={submitHomeworkMutation.isPending}
            className="min-w-[96px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => submitHomeworkMutation.mutate()}
            disabled={submitHomeworkMutation.isPending}
            className="gap-2 min-w-[140px] bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm"
          >
            {submitHomeworkMutation.isPending ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Homework
              </>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
    </>
  );
});

LessonDetailViewer.displayName = "LessonDetailViewer";

export default LessonDetailViewer;
