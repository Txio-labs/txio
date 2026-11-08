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
            return 'rpc';
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
        <div className="flex flex-col h-full bg-surface p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-lg font-semibold text-fg">Transaction Recipes</h1>
                <button onClick={() => setIsWizardOpen(true)} className="text-xs bg-hover text-fg-muted px-3 py-1.5 rounded hover:text-fg flex items-center gap-1">
                    <Plus size={12} /> New Template
                </button>
            </div>

            <div className="border border-line rounded bg-elevated overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800">
                    {templates.map((recipe) => (
                        <div key={recipe.id} className="p-3 flex items-center justify-between hover:bg-hover group">
                            <div className="flex items-center gap-3">
                                <FileCode size={16} className="text-fg-subtle" />
                                <div>
                                    <div className="text-sm font-medium text-fg-muted">{recipe.title}</div>
                                    <div className="text-[12px] text-fg-subtle font-mono">{recipe.type}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    appStore.openTab(recipeTypeToTabType(recipe.type), { name: recipe.title });
                                    appStore.showToast(`Opening "${recipe.title}" as a new tab`, 'info');
                                }}
                                className="px-3 py-1 bg-hover hover:bg-active text-fg-muted text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
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
