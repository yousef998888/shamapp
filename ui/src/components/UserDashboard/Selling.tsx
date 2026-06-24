import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

export function Selling() {
  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="sold">Sold</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        {/* Active listings content */}
      </TabsContent>
      <TabsContent value="sold">
        {/* Sold listings content */}
      </TabsContent>
    </Tabs>
  );
}