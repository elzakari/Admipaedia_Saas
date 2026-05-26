import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  MapPin, 
  User, 
  BookOpen, 
  AlertCircle, 
  X, 
  Loader2, 
  Clock 
} from 'lucide-react';
import api from '@/lib/api';

interface Period {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  order_index: number;
}

interface TimetableSlot {
  id: number;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  period_id: number;
  period_name: string;
  start_time: string;
  end_time: string;
  day_of_week: string;
  term: string;
  academic_year: string;
  room_number: string;
}

interface ClassOption {
  id: number;
  name: string;
}

interface TeacherOption {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

interface SubjectOption {
  id: number;
  name: string;
}

export const TimetableGrid: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data lists
  const [periods, setPeriods] = useState<Period[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  
  // Scoping context
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [validationConflicts, setValidationConflicts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form inputs
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formPeriodId, setFormPeriodId] = useState<string>('');
  const [formDay, setFormDay] = useState<string>('Monday');
  const [formRoom, setFormRoom] = useState<string>('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // 1. Initial Load of Periods, Classes, Teachers, Subjects
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);
      try {
        const [periodResp, classResp, teacherResp, subjectResp] = await Promise.all([
          api.get('/saas/timetable/periods'),
          api.get('/classes', { params: { per_page: 200 } }),
          api.get('/teachers', { params: { per_page: 200 } }),
          api.get('/subjects', { params: { per_page: 200 } })
        ]);

        const periodList = periodResp.data?.data || [];
        setPeriods(periodList);

        const classList = classResp.data?.classes || classResp.data?.data || classResp.data || [];
        setClasses(classList);

        const teacherList = teacherResp.data?.teachers || teacherResp.data?.data || teacherResp.data || [];
        setTeachers(teacherList);

        const subjectList = subjectResp.data?.subjects || subjectResp.data?.data || subjectResp.data || [];
        setSubjects(subjectList);

        if (classList.length > 0) {
          setSelectedClassId(classList[0].id.toString());
        }
      } catch (err: any) {
        console.error('Timetable metadata fetch error:', err);
        setError('Failed to initialize timetable resources.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetadata();
  }, []);

  // 2. Fetch slots for the active class group
  const fetchSlots = async () => {
    if (!selectedClassId) return;
    try {
      const resp = await api.get('/saas/timetable/slots', {
        params: {
          class_id: selectedClassId,
          term: selectedTerm,
          academic_year: selectedYear
        }
      });
      setSlots(resp.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load slots:', err);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedClassId, selectedTerm, selectedYear]);

  // 3. Open modal for create / edit
  const openModal = (day?: string, periodId?: number, slot?: TimetableSlot) => {
    setValidationConflicts([]);
    if (slot) {
      setEditingSlot(slot);
      setFormSubjectId(slot.subject_id.toString());
      setFormTeacherId(slot.teacher_id.toString());
      setFormPeriodId(slot.period_id.toString());
      setFormDay(slot.day_of_week);
      setFormRoom(slot.room_number || '');
    } else {
      setEditingSlot(null);
      setFormSubjectId(subjects[0]?.id.toString() || '');
      setFormTeacherId(teachers[0]?.id.toString() || '');
      setFormPeriodId(periodId?.toString() || periods[0]?.id.toString() || '');
      setFormDay(day || 'Monday');
      setFormRoom('');
    }
    setIsModalOpen(true);
  };

  // 4. Handle Save Slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !formSubjectId || !formTeacherId || !formPeriodId) return;
    
    setSubmitting(true);
    setValidationConflicts([]);

    const payload = {
      class_id: parseInt(selectedClassId),
      subject_id: parseInt(formSubjectId),
      teacher_id: parseInt(formTeacherId),
      period_id: parseInt(formPeriodId),
      day_of_week: formDay,
      term: selectedTerm,
      academic_year: selectedYear,
      room_id: formRoom ? parseInt(formRoom) : null
    };

    try {
      if (editingSlot) {
        await api.put(`/saas/timetable/slots/${editingSlot.id}`, payload);
      } else {
        await api.post('/saas/timetable/slots', payload);
      }
      fetchSlots();
      setIsModalOpen(false);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.conflicts) {
        setValidationConflicts(err.response.data.conflicts);
      } else {
        alert(err.response?.data?.message || 'Failed to schedule slot due to an unexpected error.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Handle Delete Slot
  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm('Are you sure you want to remove this timetabled lesson?')) return;
    try {
      await api.delete(`/saas/timetable/slots/${slotId}`);
      fetchSlots();
    } catch (err) {
      alert('Failed to remove timetable slot.');
    }
  };

  if (loading && periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="text-gray-500 font-medium">Resolving timetable grid...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <p className="text-gray-600 font-medium">{error}</p>
      </div>
    );
  }

  // Helper to get slot at specific day/period
  const getSlotAt = (day: string, periodId: number): TimetableSlot | undefined => {
    return slots.find(s => s.day_of_week === day && s.period_id === periodId);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* A. Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-indigo-600 shrink-0" />
            <span>Timetable Scheduling Board</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Intelligent conflict-free campus timetable scheduler.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Class Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Class Group</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Term Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Academic Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* B. Scheduler Grid */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 w-44 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Interval / Period</th>
                {days.map((day) => (
                  <th key={day} className="p-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {periods.map((period) => (
                <tr key={period.id} className="hover:bg-gray-50/10 transition-colors">
                  {/* Period Header Column */}
                  <td className="p-4 bg-gray-50/20 border-r border-gray-50">
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        period.is_break ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {period.name}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{period.start_time.slice(0, 5)} - {period.end_time.slice(0, 5)}</span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Daily Slots Columns */}
                  {days.map((day) => {
                    const slot = getSlotAt(day, period.id);
                    return (
                      <td key={day} className="p-3 align-middle border-r border-gray-50 text-center min-h-[90px]">
                        {period.is_break ? (
                          <div className="bg-amber-50/50 text-amber-700 py-3 rounded-xl border border-dashed border-amber-200 text-xs font-bold uppercase tracking-wider">
                            Break Timing
                          </div>
                        ) : slot ? (
                          // Scheduled Slot Card
                          <div className="group relative bg-gradient-to-b from-indigo-50/70 to-indigo-50 border border-indigo-100 rounded-xl p-3 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-300">
                            {/* Hover Edit/Delete controls */}
                            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1.5 bg-white border border-indigo-100 rounded-lg p-0.5 shadow-sm">
                              <button 
                                onClick={() => openModal(day, period.id, slot)}
                                className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-md transition-colors"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="space-y-1.5 pr-6">
                              <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-xs">
                                <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate">{slot.subject_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-semibold">
                                <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{slot.teacher_name}</span>
                              </div>
                              {slot.room_number && (
                                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-medium bg-white/60 border border-indigo-50/50 rounded-md px-1.5 py-0.5 w-fit">
                                  <MapPin className="h-3 w-3 text-indigo-400 shrink-0" />
                                  <span>Room: {slot.room_number}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Empty Slot Add Button
                          <button
                            onClick={() => openModal(day, period.id)}
                            className="opacity-0 hover:opacity-100 focus:opacity-100 flex items-center justify-center gap-1 w-full py-4 text-xs font-bold border border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all duration-200 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Schedule</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* C. Scheduler Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {editingSlot ? 'Edit Scheduled Slot' : 'Schedule Timetable Slot'}
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">Assign lessons to days, periods, and rooms conflict-free.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSlot} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Conflict Warnings Warning Alert Banner */}
              {validationConflicts.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-xs text-red-800 leading-relaxed shadow-sm animate-shake">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-red-900 mb-1">Scheduling Collision Detected:</span>
                    <ul className="list-disc list-inside space-y-1">
                      {validationConflicts.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Day of Week */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Day of Week</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Period */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Period Timing</label>
                  <select
                    value={formPeriodId}
                    onChange={(e) => setFormPeriodId(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {periods.filter(p => !p.is_break).map(p => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name} ({p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Subject Assignment</label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id.toString()}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Teacher Scoping</label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {teachers.map(t => {
                    const name = t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Teacher #${t.id}`;
                    return <option key={t.id} value={t.id.toString()}>{name}</option>;
                  })}
                </select>
              </div>

              {/* Room Number */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room Allocation (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 101, 102"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Validating Conflicts...</span>
                    </>
                  ) : (
                    <span>Save Allocation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableGrid;
