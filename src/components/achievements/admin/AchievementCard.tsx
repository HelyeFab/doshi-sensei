import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Achievement = {
  id: string;
  title: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  status: 'active' | 'inactive';
  type: 'default' | 'custom';
};

interface AchievementCardProps {
  achievement: Achievement;
}

export const AchievementCard = ({ achievement }: AchievementCardProps) => {
  const rarityColor = {
    common: 'bg-gray-500',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-yellow-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate pr-2">{achievement.title}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Category</span>
          <span>{achievement.category}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Type</span>
          <Badge variant={achievement.type === 'custom' ? 'secondary' : 'outline'}>{achievement.type}</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Badge className={`${rarityColor[achievement.rarity]}`}>{achievement.rarity}</Badge>
        <Badge variant={achievement.status === 'active' ? 'default' : 'destructive'}>{achievement.status}</Badge>
      </CardFooter>
    </Card>
  );
};