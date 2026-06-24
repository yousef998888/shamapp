import { useTranslation } from 'react-i18next';
import { UserDashboardLayout } from '@/components/UserDashboard/Layout';
import { Card } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function WatchlistPage() {
  const { t } = useTranslation();
  
  return (
    <UserDashboardLayout>
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{t('navigation.watchlist')}</h3>
          <Button variant="outline">{t('common.actions')}</Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          {t('search.noResults')}
        </div>
      </Card>
    </UserDashboardLayout>
  );
}