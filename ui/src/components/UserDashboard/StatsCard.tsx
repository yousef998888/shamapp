import { Card, CardContent, CardHeader } from '@/components/shadcn/card';

export function StatsCard() {
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">A.H.</span>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            Supporter
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          {['Bought', 'Sold', 'Followers', 'Following'].map((stat, index) => (
            <div key={stat}>
              <div className="text-lg font-bold">{index === 0 ? 1 : 0}</div>
              <div className="text-sm text-muted-foreground">{stat}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
