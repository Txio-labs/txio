import React, { useCallback, useEffect, useState } from 'react';
import { FileCode, Play, Plus, Trash2 } from 'lucide-react';
import { appStore } from '@/lib/store';
import { apiService } from '@/services/api';
import { FeatureId, RecipeTemplate, RecipeTemplateType } from '@/types';
import { NewTemplateModal } from '@/components/NewTemplateModal';

function recipeTypeToTabType(type: RecipeTemplateType): FeatureId {
    switch (type) {
        case 'MoveCall':
        case 'Publish':
        case 'PTB':
        default:
            return 'ptb';
    }
}

export const Recipes: React.FC = () => {
    const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getRecipeTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load recipe templates:', error);
            appStore.showToast('Failed to load templates', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
        loadTemplates();
    }, [loadTemplates]);

    const handleCreate = async (title: string, type: RecipeTemplateType) => {
        const created = await apiService.createRecipeTemplate(title, type);
        setTemplates((prev) => [...prev, created]);
        appStore.showToast(`Created "${created.title}"`, 'success');
    };

    const handleDelete = async (template: RecipeTemplate) => {
        try {
            await apiService.deleteRecipeTemplate(template.id);
            setTemplates((prev) => prev.filter((t) => t.id !== template.id));
        } catch (error) {
            console.error('Failed to delete template:', error);
            appStore.showToast('Failed to delete template', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-near-black p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-lg font-bold text-slate-200">Transaction Recipes</h1>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:text-white flex items-center gap-1"
                >
                    <Plus size={12} /> New Template
                </button>
            </div>

            <div className="border border-white/5 rounded bg-dark-indigo-glow overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center text-xs text-slate-500">Loading templates...</div>
                ) : templates.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                        No templates yet. Create one to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 divide-y divide-slate-800">
                        {templates.map((template) => (
                            <div key={template.id} className="p-3 flex items-center justify-between hover:bg-white/5/50 group">
                                <div className="flex items-center gap-3">
                                    <FileCode size={16} className="text-slate-500" />
                                    <div>
                                        <div className="text-sm font-medium text-slate-300">{template.title}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{template.type}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDelete(template)}
                                        className="p-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded transition-colors"
                                        aria-label={`Delete ${template.title}`}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            appStore.openTab(recipeTypeToTabType(template.type));
                                            appStore.showToast(`Opening "${template.title}" as a new tab`, 'info');
                                        }}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded flex items-center gap-2"
                                    >
                                        <Play size={10} /> Load
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <NewTemplateModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onCreate={handleCreate}
            />
        </div>
    );
};
