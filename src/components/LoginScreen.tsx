import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Workflow, AlertCircle } from 'lucide-react';

export function LoginScreen() {
    const { login, isLoading, error } = useAuth();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                        <Workflow className="h-10 w-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Maestro Process Portal</h1>
                        <p className="text-muted-foreground mt-2">
                            Sign in with your UiPath account to view and manage your Maestro processes
                        </p>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Button
                    onClick={login}
                    disabled={isLoading}
                    className="w-full h-12 text-lg"
                    size="lg"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            <span>Signing in...</span>
                        </div>
                    ) : (
                        'Sign in with UiPath'
                    )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    You will be redirected to UiPath to authenticate
                </p>
            </div>
        </div>
    );
}
