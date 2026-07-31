import React, { useState, useEffect } from 'react';
import { User, Task, TaskStatus, TaskPriority } from '../types/wms';
import { api } from '../lib/api';
import { ClipboardList, Plus, Search, Calendar, User as UserIcon, Clock, MessageSquare, AlertCircle, CheckCircle2, ChevronRight, LayoutGrid, List, X } from 'lucide-react';

interface TaskManagerProps {
  currentUser: User;
  allUsers: User[];
  onRefresh?: () => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ currentUser, allUsers }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createTask({
        title,
        description,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined
      });
      setShowTaskModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('NORMAL');
    setAssigneeId('');
    setDueDate('');
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      fetchTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await api.addTaskComment(selectedTask.id, newComment);
      setNewComment('');
      fetchTasks();
      const updated = await api.getTasks();
      const st = updated.find(t => t.id === selectedTask.id);
      if (st) setSelectedTask(st);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPriorityColor = (p: TaskPriority) => {
    switch(p) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'NORMAL': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOW': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'TODO', label: 'Хийх', color: 'border-slate-200 bg-slate-50' },
    { id: 'IN_PROGRESS', label: 'Хийгдэж буй', color: 'border-blue-200 bg-blue-50' },
    { id: 'REVIEW', label: 'Шалгах', color: 'border-amber-200 bg-amber-50' },
    { id: 'DONE', label: 'Дууссан', color: 'border-emerald-200 bg-emerald-50' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Ажлын төлөвлөгөө
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Даалгавар үүсгэх, хуваарилах болон гүйцэтгэлийг хянах
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'KANBAN' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Самбар харагдац"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'LIST' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Жагсаалт харагдац"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => { resetForm(); setSelectedTask(null); setShowTaskModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Шинэ ажил
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ажил хайх..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : viewMode === 'KANBAN' ? (
        /* Kanban View */
        <div className="flex overflow-x-auto pb-4 gap-6 snap-x">
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className={`flex-shrink-0 w-80 bg-slate-50/50 rounded-2xl border ${col.color} flex flex-col max-h-[70vh] snap-start`}>
                <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-white/50 rounded-t-2xl">
                  <h3 className="font-bold text-sm text-slate-800">{col.label}</h3>
                  <span className="bg-white text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                    {colTasks.length}
                  </span>
                </div>
                <div className="p-3 overflow-y-auto flex-1 space-y-3">
                  {colTasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.comments && task.comments.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <MessageSquare className="w-3 h-3" /> {task.comments.length}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          {task.assignee?.name || 'Оноогоогүй'}
                        </div>
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-[10px] font-bold ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500' : 'text-slate-400'}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Ажил</th>
                <th className="p-4">Төлөв</th>
                <th className="p-4">Зэрэг</th>
                <th className="p-4">Хариуцагч</th>
                <th className="p-4">Хугацаа</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Ажил олдсонгүй.</td></tr>
              ) : (
                filteredTasks.map(task => (
                  <tr key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="p-4 font-bold text-slate-900">{task.title}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {task.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">
                        {task.assignee?.name.charAt(0) || '?'}
                      </div>
                      {task.assignee?.name || 'Оноогоогүй'}
                    </td>
                    <td className="p-4 font-mono text-slate-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" /> Шинэ ажил үүсгэх
              </h3>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Гарчиг *</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Тайлбар</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Зэрэг</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="LOW">Бага (Low)</option>
                    <option value="NORMAL">Хэвийн (Normal)</option>
                    <option value="HIGH">Өндөр (High)</option>
                    <option value="URGENT">Яаралтай (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Дуусах хугацаа</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Хариуцагч</label>
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- Оноогоогүй --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Болих</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50">Үүсгэх</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && !showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                    {selectedTask.status}
                  </span>
                </div>
                <h3 className="font-bold text-xl text-slate-900">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Тайлбар</h4>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedTask.description || <span className="text-slate-400 italic">Тайлбар оруулаагүй байна.</span>}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Хэлэлцүүлэг & Үр дүн</h4>
                  <div className="space-y-4 mb-4">
                    {selectedTask.comments?.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                          {comment.user?.name.charAt(0) || '?'}
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100 flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-900">{comment.user?.name}</span>
                            <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-700">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                      <p className="text-xs text-slate-400 text-center py-4">Одоогоор коммент байхгүй байна.</p>
                    )}
                  </div>
                  
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Сэтгэгдэл эсвэл ажлын үр дүн бичих..."
                      className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="submit" disabled={isSubmitting || !newComment.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-indigo-700">
                      Илгээх
                    </button>
                  </form>
                </div>
              </div>

              <div className="w-full md:w-64 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ажлын төлөв</h4>
                  <select 
                    value={selectedTask.status} 
                    onChange={e => handleUpdateStatus(selectedTask.id, e.target.value as TaskStatus)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
                  >
                    <option value="TODO">Хийх (To-do)</option>
                    <option value="IN_PROGRESS">Хийгдэж буй (In Progress)</option>
                    <option value="REVIEW">Шалгах (Review)</option>
                    <option value="DONE">Дууссан (Done)</option>
                  </select>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Мэдээлэл</h4>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">Хариуцагч</span>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        {selectedTask.assignee?.name || 'Оноогоогүй'}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">Үүсгэсэн</span>
                      <div className="text-sm text-slate-700">
                        {selectedTask.creator?.name}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">Дуусах хугацаа</span>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
