import { useTranslation } from 'react-i18next';
import { Button } from "@/components/shadcn/button"

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="text-center space-y-4 py-8">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">{t('search.noResults')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('search.tryDifferentKeywords')}
        </p>
      </div>
      <Button>{t('common.create')} {t('listing.create.title').toLowerCase()}</Button>
    </div>
  );
}