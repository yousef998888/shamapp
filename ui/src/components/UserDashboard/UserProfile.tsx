import { Button } from "@/components/shadcn/button"

export function UserProfile() {
  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" className="flex-1">
          {/* <Icons.share className="mr-2 h-4 w-4" /> */}
          Share
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          {/* <Icons.edit className="mr-2 h-4 w-4" /> */}
          Edit profile
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        Joined August 2017
      </div>
    </div>
  )
}