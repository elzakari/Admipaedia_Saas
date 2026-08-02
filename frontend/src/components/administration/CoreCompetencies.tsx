import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Brain, 
  Lightbulb, 
  MessageSquare, 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';

interface CoreCompetency {
  id: number;
  name: string;
  category: '21st_century' | 'critical_thinking' | 'creativity' | 'communication' | 'collaboration' | string;
  description?: string;
  is_active: boolean;
}

const CoreCompetencies: React.FC = () => {
  const { t } = useTranslation();
  const [competencies, setCompetencies] = useState<CoreCompetency[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<CoreCompetency | null>(null);
  const [showForm, setShowForm] = useState(false);
  const competencyCategories = [
    { value: '21st_century', label: '21st Century Skills', icon: Brain },
    { value: 'critical_thinking', label: 'Critical Thinking', icon: Brain },
    { value: 'creativity', label: 'Creativity', icon: Lightbulb },
    { value: 'communication', label: 'Communication', icon: MessageSquare },
    { value: 'collaboration', label: 'Collaboration', icon: Users }
  ];

  useEffect(() => {
    loadCompetencies();
  }, []);

  const loadCompetencies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/competencies/core-competencies');
      const data = response.data;
      if (data.success) {
        setCompetencies(data.competencies || []);
      }
    } catch (error) {
      toast.error('Failed to load core competencies');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompetency = async (formData: Partial<CoreCompetency>) => {
    try {
      setLoading(true);

      if (formData.id) {
        await api.put(`/competencies/core-competencies/${formData.id}`, formData);
        setCompetencies(prev =>
          prev.map(c => (c.id === formData.id ? { ...c, ...formData } as CoreCompetency : c))
        );
        toast.success('Competency updated successfully');
      } else {
        const response = await api.post('/competencies/core-competencies', formData);
        const created = response.data?.competency ?? response.data?.data ?? null;
        if (created) setCompetencies(prev => [...prev, created as CoreCompetency]);
        toast.success('Competency created successfully');
      }

      setEditingCompetency(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving competency:', error);
      toast.error('Failed to save competency');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompetency = async (id: number) => {
    try {
      setLoading(true);
      await api.delete(`/competencies/core-competencies/${id}`);
      setCompetencies(prev => prev.filter(c => c.id !== id));
      toast.success('Competency deleted successfully');
    } catch (error) {
      console.error('Error deleting competency:', error);
      toast.error('Failed to delete competency');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = competencyCategories.find(cat => cat.value === category);
    const IconComponent = categoryData?.icon || Brain;
    return <IconComponent className="h-5 w-5" />;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      '21st_century': 'bg-blue-100 text-blue-800',
      'critical_thinking': 'bg-purple-100 text-purple-800',
      'creativity': 'bg-yellow-100 text-yellow-800',
      'communication': 'bg-green-100 text-green-800',
      'collaboration': 'bg-pink-100 text-pink-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const CompetencyForm = ({ competency, onSave, onCancel }: {
    competency?: CoreCompetency;
    onSave: (data: Partial<CoreCompetency>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState<Partial<CoreCompetency>>({
      name: competency?.name || '',
      category: competency?.category || '21st_century',
      description: competency?.description || '',
      is_active: competency?.is_active ?? true
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>{competency ? t('common.edit', 'Éditer') : t('common.add', 'Ajouter')} {t('admin_competencies.core_competency', 'une compétence clé')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t('admin_competencies.competency_name', 'Nom de la compétence')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin_competencies.name_placeholder', 'Saisir le nom de la compétence')}
              />
            </div>
            <div>
              <Label htmlFor="category">{t('common.category', 'Catégorie')}</Label>
              <Select
                value={(formData.category ?? '21st_century') as string}
                onValueChange={(value) => setFormData({ ...formData, category: value as CoreCompetency['category'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select_category', 'Sélectionner la catégorie')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="21st_century">{t('admin_competencies.cat_21st_century', 'Compétences du 21e siècle')}</SelectItem>
                  <SelectItem value="critical_thinking">{t('admin_competencies.cat_critical_thinking', 'Pensée critique')}</SelectItem>
                  <SelectItem value="creativity">{t('admin_competencies.cat_creativity', 'Créativité')}</SelectItem>
                  <SelectItem value="communication">{t('admin_competencies.cat_communication', 'Communication')}</SelectItem>
                  <SelectItem value="collaboration">{t('admin_competencies.cat_collaboration', 'Collaboration')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('common.description', 'Description')}</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('admin_competencies.description_placeholder', 'Décrire cette compétence')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('common.status', 'Statut')}</Label>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select_status', 'Sélectionner le statut')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('common.active', 'Actif')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive', 'Inactif')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button onClick={() => onSave(formData)}>
              <Save className="h-4 w-4 mr-2" />
              {t('admin_competencies.save_competency', 'Enregistrer la compétence')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('admin_comp.title', 'Gestion des compétences clés')}</h2>
          <p className="text-gray-600">{t('admin_comp.subtitle', 'Gérer les compétences du 21e siècle et les cadres de compétences')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin_comp.add_competency', 'Ajouter une compétence clé')}
        </Button>
      </div>

      {showForm && (
        <CompetencyForm
          // Pass 'competency' prop only when defined to satisfy exactOptionalPropertyTypes
          {...(editingCompetency ? { competency: editingCompetency } : {})}
          onSave={(data) => {
            void handleSaveCompetency(data);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid gap-4">
        {competencies.map((competency) => (
          <Card key={competency.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getCategoryColor(competency.category)}`}>
                    {getCategoryIcon(competency.category)}
                  </div>
                  <div>
                    <CardTitle>{competency.name}</CardTitle>
                    <CardDescription>{competency.description}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={competency.is_active ? 'default' : 'secondary'}>
                    {competency.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCompetency(competency);
                      setShowForm(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCompetency(competency.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong className="text-sm">Category:</strong>
                  <Badge className={`ml-2 ${getCategoryColor(competency.category)}`}>
                    {competencyCategories.find(cat => cat.value === competency.category)?.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoreCompetencies;
