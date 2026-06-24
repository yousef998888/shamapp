import { useTranslation } from 'react-i18next';
import { UserDashboardLayout } from '@/components/UserDashboard/Layout';
import { Card } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

export default function ReviewsPage() {
  const { t } = useTranslation();
  
  return (
    <UserDashboardLayout>
      <Card className="p-6">
        <Tabs defaultValue="received">
          <TabsList>
            <TabsTrigger value="received">{t('reviews.title')} (1)</TabsTrigger>
            <TabsTrigger value="given">{t('reviews.title')}</TabsTrigger>
          </TabsList>
          <TabsContent value="received">
            <div className="py-4">
              {/* Review component would go here */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="font-medium">{t('reviews.title')}!</div>
                  <div className="text-sm text-muted-foreground">5 {t('reviews.rating')}</div>
                </div>
                <p className="text-sm">{t('reviews.title')}</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="given">
            <div className="py-4 text-muted-foreground text-center">
              {t('search.noResults')}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </UserDashboardLayout>
  );
}