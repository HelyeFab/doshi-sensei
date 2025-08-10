import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-gray-500" />
          </div>
          <CardTitle className="text-xl">You're Offline</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            It looks like you've lost your internet connection. Some features
            may not be available.
          </p>
          <p className="text-sm text-gray-500">
            Don't worry! Many features of Doshi Sensei work offline, including
            your saved vocabulary and practice drills.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
