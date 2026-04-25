export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">Loading</p>
          <p className="text-sm text-muted-foreground">Preparing your learning experience...</p>
        </div>
      </div>
    </div>
  );
}
