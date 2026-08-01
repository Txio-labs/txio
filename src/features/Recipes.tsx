import React, { useEffect, useState } from 'react';
import { FileCode, Play, Plus } from 'lucide-react';
import { appStore } from '@/lib/store';
import { apiService } from '@/services/api';
import { NewTemplateModal, NewTemplateInput } from '@/components/NewTemplateModal';
import { FeatureId, RecipeTemplate } from '@/types';

// Built-in starter templates. These render even for brand-new users/offline
// sessions but are not persisted (no backend id, cannot be deleted via API).
const SEED_TEMPLATES: RecipeTemplate[] = [
    { id: 'local-1', title: 'Transfer Coins', type: 'PTB', isBuiltIn: true },
    { id: 'local-2', title: 'Split & Transfer', type: 'PTB', isBuiltIn: true },
    { id: 'local-3', title: 'Move Call', type: 'MoveCall', isBuiltIn: true },
    { id: 'local-4', title: 'Publish Package', type: 'Publish', isBuiltIn: true },
    { id: 'local-5', title: 'Stake to Validator', type: 'MoveCall', isBuiltIn: true },
    { id: 'local-6', title: 'Batch Operations', type: 'PTB', isBuiltIn: true },
];

function recipeTypeToTabType(type: string): FeatureId {
    switch (type) {
        case 'MoveCall':
        case 'Publish':
        case 'PTB':
        default:
            return 'ptb';
    }
}

export const Recipes: React.FC = () => {
    const [templates, setTemplates] = useState<RecipeTemplate[]>(SEED_TEMPLATES);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        let cancelled = false;

        apiService
            .getRecipeTemplates()
            .then((saved) => {
                if (!cancelled) setTemplates([...SEED_TEMPLATES, ...saved]);
            })
            .catch(() => {
                // Offline or unauthenticated: fall back to seed templates only.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleCreate = async (input: NewTemplateInput) => {
        setIsCreating(true);

        try {
            const created = await apiService.createRecipeTemplate(
                input.title,
                input.type,
                input.description || undefined
            );

            setTemplates((prev) => [...prev, created]);
            setIsWizardOpen(false);
            appStore.showToast(`Template "${created.title}" created`, 'success');
        } catch (err: any) {
            appStore.showToast(err?.message || 'Failed to create template', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-near-black p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-lg font-bold text-slate-200">Transaction Recipes</h1>
                <button onClick={() => setIsWizardOpen(true)} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:text-white flex items-center gap-1">
                    <Plus size={12} /> New Template
                </button>
            </div>

            <div className="border border-white/5 rounded bg-dark-indigo-glow overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-slate-800">
                    {templates.map((recipe) => (
                        <div key={recipe.id} className="p-3 flex items-center justify-between hover:bg-white/5/50 group">
                            <div className="flex items-center gap-3">
                                <FileCode size={16} className="text-slate-500" />
                                <div>
                                    <div className="text-sm font-medium text-slate-300">{recipe.title}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{recipe.type}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    appStore.openTab(recipeTypeToTabType(recipe.type), { name: recipe.title });
                                    appStore.showToast(`Opening "${recipe.title}" as a new tab`, 'info');
                                }}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                            >
                                <Play size={10} /> Load
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <NewTemplateModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onCreate={handleCreate}
                isSubmitting={isCreating}
            />
        </div>
    );
};
