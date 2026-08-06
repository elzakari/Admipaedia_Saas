import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn, formatDate, formatDateTime, getInitials } from "../../lib/utils";
import { useToast } from "../ui/use-toast";
import type {
  Lesson,
  LessonComment,
  LessonResource,
  LessonAcknowledgement,
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

  useImperativeHandle(ref, () => ({
    open: (lesson: Lesson) => {
      setCurrentLesson(lesson);
      setComments(lesson.comments || []);
      setAcknowledgements(lesson.acknowledgements || []);
      setLiveViewerCount(lesson.liveViewerCount || 0);
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
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-5 border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HomeIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          🏠 Homework / Practice
                        </h4>
                      </div>
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
                    <div className="whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-200 leading-relaxed bg-white/60 dark:bg-slate-900/40 rounded-lg p-4">
                      {currentLesson.homework}
                    </div>
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
  );
});

LessonDetailViewer.displayName = "LessonDetailViewer";

export default LessonDetailViewer;
